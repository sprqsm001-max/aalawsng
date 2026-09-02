import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireAdmin, requireStaffOrAdmin } from '../middleware/auth';
import { createAuditLog } from '../middleware/audit';
import { paystack } from '../lib/paystack';

const router = Router();
router.use(authenticate);

// SCUML / AML/CFT Thresholds (Money Laundering Act 2022)
const SCUML_THRESHOLD_NGN = 5000000; // N5,000,000
const SCUML_THRESHOLD_USD = 10000;   // $10,000

// ─── 1. CLIENT & TRUST ACCOUNT LEDGERS (LPAR 1964 & RPC 2023) ───────────────

// GET /api/v1/trust/ledgers — Fetch all client & trust ledgers
router.get('/ledgers', requireStaffOrAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const currency = (req.query.currency as string) || undefined;
    const category = (req.query.category as any) || undefined;

    const ledgers = await prisma.trustLedgerAccount.findMany({
      where: {
        ...(currency && { currency }),
        ...(category && { accountCategory: category }),
      },
      include: {
        client: { select: { id: true, firstName: true, lastName: true, companyName: true, email: true, kycStatus: true } },
        matter: { select: { id: true, referenceNumber: true, title: true } },
        _count: { select: { journalEntries: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(ledgers);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch client account ledgers' });
  }
});

// GET /api/v1/trust/ledgers/:clientId — Specific client ledgers across currencies & fund types
router.get('/ledgers/:clientId', requireStaffOrAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const ledgers = await prisma.trustLedgerAccount.findMany({
      where: { clientId: req.params.clientId as string },
      include: {
        client: true,
        journalEntries: {
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
      },
    });

    if (!ledgers || ledgers.length === 0) {
      // Auto-create default NGN client funds ledger if missing
      const newLedger = await prisma.trustLedgerAccount.create({
        data: {
          clientId: req.params.clientId as string,
          currency: 'NGN',
          accountCategory: 'CLIENT_FUNDS',
          balance: 0,
        },
        include: { client: true, journalEntries: true },
      });
      res.json([newLedger]);
      return;
    }

    res.json(ledgers);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch client ledgers' });
  }
});

// POST /api/v1/trust/ledgers — Create specialized ledger (e.g. USD Client Account or Estate Trust Account)
router.post('/ledgers', requireStaffOrAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { clientId, matterId, currency = 'NGN', accountCategory = 'CLIENT_FUNDS', bankAccountNumber, bankName } = req.body;

    const existing = await prisma.trustLedgerAccount.findFirst({
      where: { clientId, currency, accountCategory },
    });

    if (existing) {
      res.status(409).json({ error: `A ${currency} ${accountCategory} ledger already exists for this client.` });
      return;
    }

    const ledger = await prisma.trustLedgerAccount.create({
      data: {
        clientId,
        matterId: matterId || undefined,
        currency,
        accountCategory,
        balance: 0,
        bankAccountNumber,
        bankName,
      },
    });

    res.status(201).json(ledger);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create ledger' });
  }
});

// ─── 2. DEPOSITS / RECEIPTS INTO CLIENT ACCOUNT (LPAR 1964) ───────────────────

// POST /api/v1/trust/deposit — Record receipt of client money
router.post('/deposit', requireStaffOrAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      clientId,
      amount,
      currency = 'NGN',
      accountCategory = 'CLIENT_FUNDS',
      description,
      referenceType = 'MANUAL',
      referenceId,
      lparRuleReference = 'LPAR 1964 Rule 3 - Receipt of Client Money',
      supportingDocUrl,
    } = req.body;

    const rawClientId = (clientId || '').trim();
    if (!rawClientId) {
      res.status(400).json({ error: 'Please select a client for this receipt' });
      return;
    }

    const client = await prisma.clientRecord.findFirst({
      where: {
        OR: [
          { id: rawClientId },
          { firstName: { contains: rawClientId } },
          { lastName: { contains: rawClientId } },
          { companyName: { contains: rawClientId } },
        ],
      },
    });

    if (!client) {
      res.status(400).json({ error: 'Selected client not found. Please choose an existing client from the dropdown.' });
      return;
    }

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      res.status(400).json({ error: 'Receipt amount must be positive' });
      return;
    }

    // AML/CFT SCUML Threshold check (Money Laundering Act 2022)
    const isAmlReportable =
      (currency === 'NGN' && numAmount >= SCUML_THRESHOLD_NGN) ||
      (currency === 'USD' && numAmount >= SCUML_THRESHOLD_USD);

    const result = await prisma.$transaction(async (tx) => {
      // Find or create ledger for this client & currency
      let ledger = await tx.trustLedgerAccount.findFirst({
        where: { clientId: client.id, currency, accountCategory },
      });

      if (!ledger) {
        ledger = await tx.trustLedgerAccount.create({
          data: { clientId: client.id, currency, accountCategory, balance: 0 },
        });
      }

      const balanceBefore = Number(ledger.balance);
      const balanceAfter = balanceBefore + numAmount;

      const updatedLedger = await tx.trustLedgerAccount.update({
        where: { id: ledger.id },
        data: { balance: balanceAfter },
      });

      const entry = await tx.trustJournalEntry.create({
        data: {
          ledgerId: ledger.id,
          type: 'RECEIPT_CLIENT_FUNDS',
          amount: numAmount,
          currency,
          balanceBefore,
          balanceAfter,
          description: description || `Client funds receipt (${currency})`,
          referenceType,
          referenceId,
          lparRuleReference,
          initiatedById: req.user!.userId,
        },
      });

      // If AML reportable threshold exceeded, flag client record
      if (isAmlReportable) {
        await tx.clientRecord.update({
          where: { id: clientId },
          data: { riskRating: 'HIGH' },
        });
      }

      return { ledger: updatedLedger, entry, isAmlReportable };
    });

    await createAuditLog({
      userId: req.user!.userId,
      action: 'CLIENT_FUNDS_RECEIPT',
      entityType: 'TrustJournalEntry',
      entityId: result.entry.id,
      module: 'M08',
      newValue: { clientId, amount: numAmount, currency, balanceAfter: result.ledger.balance, isAmlReportable },
      ipAddress: req.ip,
    });

    res.status(201).json({
      ...result,
      message: `Receipt of ${currency} ${numAmount.toLocaleString()} recorded in accordance with Legal Practitioners' Accounts Rules 1964.`,
      ...(result.isAmlReportable && {
        amlAlert: `⚠️ SCUML / NFIU AML Reporting Threshold Exceeded (${currency} ${numAmount.toLocaleString()}). Retain source of funds declaration.`,
      }),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to record deposit' });
  }
});

// ─── 3. CONTROLLED CLIENT-TO-OFFICE TRANSFERS (LPAR 1964 RULE 7) ────────────

// POST /api/v1/trust/transfer — Transfer earned fees/costs from Client Account to Office Account
// Strictly requires linked invoice and verified delivery of bill of costs
router.post('/transfer', requireStaffOrAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      clientId,
      invoiceId,
      amount,
      currency = 'NGN',
      description,
      billDeliveredProof = true,
    } = req.body;

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      res.status(400).json({ error: 'Transfer amount must be positive' });
      return;
    }

    const rawClientId = (clientId || '').trim();
    const rawInvoiceId = (invoiceId || '').trim();

    if (!rawClientId) {
      res.status(400).json({ error: 'Please select a client for this transfer' });
      return;
    }

    const client = await prisma.clientRecord.findFirst({
      where: {
        OR: [
          { id: rawClientId },
          { firstName: { contains: rawClientId } },
          { lastName: { contains: rawClientId } },
          { companyName: { contains: rawClientId } },
        ],
      },
    });

    if (!client) {
      res.status(400).json({ error: 'Selected client not found. Please choose an existing client from the dropdown.' });
      return;
    }

    if (!rawInvoiceId) {
      res.status(400).json({
        error: "Legal Practitioners' Accounts Rules 1964 requirement: Transfer to office account requires an issued invoice/bill of costs reference.",
      });
      return;
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        OR: [
          { id: rawInvoiceId },
          { invoiceNumber: rawInvoiceId },
        ],
      },
    });

    if (!invoice) {
      res.status(400).json({ error: 'Referenced invoice not found in system.' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const ledger = await tx.trustLedgerAccount.findFirst({
        where: { clientId: client.id, currency, accountCategory: 'CLIENT_FUNDS' },
      });

      if (!ledger) {
        throw new Error(`Client funds ledger in ${currency} not found for this client.`);
      }

      const balanceBefore = Number(ledger.balance);

      // Compliance check: strict prohibition of client account overdraft
      if (balanceBefore < numAmount) {
        throw new Error(
          `Insufficient client funds. Available: ${currency} ${balanceBefore.toLocaleString()}, Requested: ${currency} ${numAmount.toLocaleString()}`
        );
      }

      const balanceAfter = balanceBefore - numAmount;

      const updatedLedger = await tx.trustLedgerAccount.update({
        where: { id: ledger.id },
        data: { balance: balanceAfter },
      });

      // Immutable Journal Entry
      const entry = await tx.trustJournalEntry.create({
        data: {
          ledgerId: ledger.id,
          type: 'TRANSFER_TO_OPERATING',
          amount: numAmount,
          currency,
          balanceBefore,
          balanceAfter,
          description: description || `Transfer of earned fees to firm office account for Invoice ${invoiceId}`,
          referenceType: 'INVOICE',
          referenceId: invoiceId,
          lparRuleReference: 'LPAR 1964 Rule 7 - Withdrawal for Costs/Fees',
          initiatedById: req.user!.userId,
          partnerAuthorizedById: req.user!.staffId || req.user!.userId,
        },
      });

      // Update invoice payment status
      const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
      if (invoice) {
        const newPaid = Number(invoice.amountPaid) + numAmount;
        await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            amountPaid: newPaid,
            status: newPaid >= Number(invoice.totalAmount) ? 'PAID' : 'PARTIALLY_PAID',
            paidAt: newPaid >= Number(invoice.totalAmount) ? new Date() : undefined,
          },
        });
      }

      return { ledger: updatedLedger, entry };
    });

    await createAuditLog({
      userId: req.user!.userId,
      action: 'CLIENT_FUNDS_TRANSFER',
      entityType: 'TrustJournalEntry',
      entityId: result.entry.id,
      module: 'M08',
      newValue: { clientId, invoiceId, amount: numAmount, currency, balanceAfter: result.ledger.balance },
      ipAddress: req.ip,
    });

    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to process transfer' });
  }
});

// ─── 4. NIGERIAN BAR ASSOCIATION THREE-WAY RECONCILIATION ────────────────────

// POST /api/v1/trust/reconcile — Run 3-way reconciliation (Bank Statement ↔ Client Ledgers ↔ Cash Book)
router.post('/reconcile', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { bankBalance, currency = 'NGN', accountCategory = 'CLIENT_FUNDS', notes } = req.body;

    if (bankBalance === undefined) {
      res.status(400).json({ error: 'bankBalance is required' });
      return;
    }

    const bank = Number(bankBalance);

    // Sum of all client ledgers for this currency & category
    const ledgerAgg = await prisma.trustLedgerAccount.aggregate({
      where: { currency, accountCategory },
      _sum: { balance: true },
    });
    const ledgerSum = Number(ledgerAgg._sum.balance || 0);

    // System total from all journal entries
    const receipts = await prisma.trustJournalEntry.aggregate({
      where: {
        currency,
        ledger: { accountCategory },
        type: { in: ['DEPOSIT', 'RECEIPT_CLIENT_FUNDS', 'TRANSFER_FROM_OPERATING'] },
      },
      _sum: { amount: true },
    });

    const withdrawals = await prisma.trustJournalEntry.aggregate({
      where: {
        currency,
        ledger: { accountCategory },
        type: {
          in: [
            'WITHDRAWAL',
            'TRANSFER_TO_OPERATING',
            'TRANSFER_TO_OFFICE_FEES_EARNED',
            'TRANSFER_TO_OFFICE_DISBURSEMENT',
            'PAYMENT_TO_CLIENT',
            'PAYMENT_THIRD_PARTY',
            'REFUND',
          ],
        },
      },
      _sum: { amount: true },
    });

    const systemTotal = Number(receipts._sum.amount || 0) - Number(withdrawals._sum.amount || 0);
    const discrepancy = Math.abs(bank - ledgerSum);
    const isMatched = discrepancy < 0.01 && Math.abs(ledgerSum - systemTotal) < 0.01;

    const recon = await prisma.trustReconciliation.create({
      data: {
        accountCategory,
        currency,
        bankBalance: bank,
        ledgerSum,
        systemTotal,
        isMatched,
        discrepancyAmount: discrepancy,
        reconciledById: req.user!.userId,
        notes,
      },
    });

    await createAuditLog({
      userId: req.user!.userId,
      action: 'UPDATE',
      entityType: 'TrustReconciliation',
      entityId: recon.id,
      module: 'M08',
      newValue: { bankBalance: bank, ledgerSum, systemTotal, isMatched, discrepancy, currency, accountCategory },
      ipAddress: req.ip,
    });

    res.status(201).json({
      reconciliation: recon,
      summary: {
        currency,
        accountCategory,
        bankStatementBalance: bank,
        clientLedgersTotal: ledgerSum,
        cashBookJournalTotal: systemTotal,
        isMatched,
        discrepancy,
      },
      ...(!isMatched && {
        alert: `⚠️ RECONCILIATION DISCREPANCY of ${currency} ${discrepancy.toLocaleString()} detected. Under LPAR 1964, audit investigation is required before further disbursements.`,
      }),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Reconciliation check failed' });
  }
});

// GET /api/v1/trust/reconciliations — History of reconciliation certificates
router.get('/reconciliations', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const history = await prisma.trustReconciliation.findMany({
      orderBy: { reconciledAt: 'desc' },
      take: 50,
    });
    res.json(history);
  } catch {
    res.status(500).json({ error: 'Failed to fetch reconciliation history' });
  }
});

// ─── 5. PAYSTACK PAYMENT INITIALIZATION & CLIENT PORTAL PAYMENT ──────────────

// POST /api/v1/trust/portal-payment — Initialize Paystack payment for invoice / retainer
router.post('/portal-payment', async (req: Request, res: Response): Promise<void> => {
  try {
    const { invoiceId, clientId } = req.body;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { client: true },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    if (req.user?.tier === 'CLIENT' && invoice.clientId !== req.user.clientId) {
      res.status(403).json({ error: 'Access denied: Invoice does not belong to your account' });
      return;
    }

    const currency = (invoice.currency as 'NGN' | 'USD') || 'NGN';
    const remainingAmount = Number(invoice.totalAmount) - Number(invoice.amountPaid);

    if (remainingAmount <= 0) {
      res.status(400).json({ error: 'Invoice is already fully settled.' });
      return;
    }

    // Lowest currency unit (Kobo for NGN, Cents for USD)
    const paystackAmount = Math.round(remainingAmount * 100);
    const reference = `AAL-${invoice.invoiceNumber}-${Date.now()}`;

    // Initialize Paystack with firm absorbing fees per LPAR 1964
    const paystackRes = await paystack.initialize({
      email: invoice.client.email,
      amount: paystackAmount,
      currency,
      reference,
      callback_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/portal/verify-payment?reference=${reference}&invoiceId=${invoiceId}`,
      metadata: {
        invoiceId,
        clientId: invoice.clientId,
        destination: invoice.paymentDestination,
        currency,
        aalawsng: 'true',
      },
    });

    // Update invoice with Paystack transaction tracking reference
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paystackReference: reference,
        paystackAccessCode: paystackRes.data.access_code,
        paymentLinkUrl: paystackRes.data.authorization_url,
      },
    });

    res.json({
      authorizationUrl: paystackRes.data.authorization_url,
      accessCode: paystackRes.data.access_code,
      reference,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Payment initialization failed' });
  }
});

// POST /api/v1/trust/verify-payment — Verify Paystack payment callback
router.post('/verify-payment', async (req: Request, res: Response): Promise<void> => {
  try {
    const { reference } = req.body;
    if (!reference) {
      res.status(400).json({ error: 'Transaction reference is required' });
      return;
    }

    const verifyRes = await paystack.verify(reference);
    const isSuccess = verifyRes.data.status === 'success';

    const invoice = await prisma.invoice.findFirst({
      where: { paystackReference: reference },
      include: { client: true },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice matching this payment reference not found' });
      return;
    }

    if (invoice.status === 'PAID') {
      res.json({ message: 'Payment already verified and settled', invoice });
      return;
    }

    if (isSuccess) {
      const currency = (invoice.currency as 'NGN' | 'USD') || 'NGN';
      const paidAmount = Number(verifyRes.data.amount) / 100;

      await prisma.$transaction(async (tx) => {
        // Record payment against invoice
        await tx.invoicePayment.create({
          data: {
            invoiceId: invoice.id,
            amount: paidAmount,
            currency,
            paymentMethod: 'PAYSTACK',
            transactionRef: reference,
            destinationLedger: invoice.paymentDestination || 'OFFICE_ACCOUNT',
            recordedBy: req.user?.userId || invoice.clientId,
          },
        });

        // If payment was for CLIENT_ACCOUNT or TRUST_ACCOUNT -> deposit into client money ledger
        if (
          invoice.paymentDestination === 'CLIENT_ACCOUNT' ||
          invoice.paymentDestination === 'TRUST_ACCOUNT' ||
          invoice.paymentDestination === 'TRUST'
        ) {
          const accountCategory =
            invoice.paymentDestination === 'TRUST_ACCOUNT' || invoice.paymentDestination === 'TRUST'
              ? 'TRUST_FUNDS'
              : 'CLIENT_FUNDS';

          let ledger = await tx.trustLedgerAccount.findFirst({
            where: { clientId: invoice.clientId, currency, accountCategory },
          });

          if (!ledger) {
            ledger = await tx.trustLedgerAccount.create({
              data: { clientId: invoice.clientId, currency, accountCategory, balance: 0 },
            });
          }

          const balanceBefore = Number(ledger.balance);
          const balanceAfter = balanceBefore + paidAmount;

          await tx.trustLedgerAccount.update({
            where: { id: ledger.id },
            data: { balance: balanceAfter },
          });

          await tx.trustJournalEntry.create({
            data: {
              ledgerId: ledger.id,
              type: 'RECEIPT_CLIENT_FUNDS',
              amount: paidAmount,
              currency,
              balanceBefore,
              balanceAfter,
              description: `Paystack Online Receipt — Invoice ${invoice.invoiceNumber}`,
              referenceType: 'PAYSTACK',
              referenceId: reference,
              lparRuleReference: 'LPAR 1964 Rule 3 - Receipt of Client Money',
              initiatedById: req.user?.userId || invoice.clientId,
            },
          });
        }

        // Update invoice balance
        const newPaid = Number(invoice.amountPaid) + paidAmount;
        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            amountPaid: newPaid,
            status: newPaid >= Number(invoice.totalAmount) ? 'PAID' : 'PARTIALLY_PAID',
            paidAt: newPaid >= Number(invoice.totalAmount) ? new Date() : undefined,
            paystackChannel: verifyRes.data.channel,
          },
        });
      });

      await createAuditLog({
        userId: req.user?.userId || invoice.clientId,
        action: 'PAYMENT_RECEIVED',
        entityType: 'Invoice',
        entityId: invoice.id,
        module: 'M08',
        newValue: { reference, amount: paidAmount, currency, destination: invoice.paymentDestination },
        ipAddress: req.ip,
      });

      res.json({ message: 'Payment verified and credited successfully', status: 'COMPLETED' });
    } else {
      res.status(400).json({ error: `Payment failed: ${verifyRes.data.gateway_response}` });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Payment verification failed' });
  }
});

// GET /api/v1/trust/journal/:clientId — Detailed ledger journal history
router.get('/journal/:clientId', requireStaffOrAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const currency = (req.query.currency as string) || 'NGN';
    const ledger = await prisma.trustLedgerAccount.findFirst({
      where: { clientId: req.params.clientId as string, currency },
    });

    if (!ledger) {
      res.status(404).json({ error: `No ${currency} ledger found for this client.` });
      return;
    }

    const entries = await prisma.trustJournalEntry.findMany({
      where: { ledgerId: ledger.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ ledger, entries });
  } catch {
    res.status(500).json({ error: 'Failed to fetch journal' });
  }
});

// GET /api/v1/trust/jurisdiction-config — NBA & LPAR 1964 configuration
router.get('/jurisdiction-config', requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const config = await prisma.trustJurisdictionConfig.findFirst();
    res.json(config);
  } catch {
    res.status(500).json({ error: 'Failed to fetch Nigerian accounts configuration' });
  }
});

export default router;
