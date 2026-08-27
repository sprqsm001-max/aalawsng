import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireStaffOrAdmin, enforceClientScope } from '../middleware/auth';
import { createAuditLog } from '../middleware/audit';

const router = Router();
router.use(authenticate);

function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const seq = Math.floor(Math.random() * 90000) + 10000;
  return `INV-${year}-${seq}`;
}

// GET /api/v1/invoices
router.get('/', enforceClientScope, async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status as string;
    const clientId = req.query.clientId as string;

    const where: any = {
      ...(status && { status }),
      ...(clientId && { clientId }),
      ...(req.user?.tier === 'CLIENT' && { clientId: req.user.clientId! }),
    };

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { firstName: true, lastName: true } },
          matter: { select: { referenceNumber: true, title: true } },
          lineItems: true,
          _count: { select: { payments: true } },
        },
      }),
      prisma.invoice.count({ where }),
    ]);
    res.json({ invoices, total, page, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// GET /api/v1/invoices/:id
router.get('/:id', enforceClientScope, async (req: Request, res: Response): Promise<void> => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        client: true,
        matter: true,
        lineItems: true,
        payments: true,
      },
    });
    if (!invoice) { res.status(404).json({ error: 'Invoice not found' }); return; }
    // Client scope: enforce own invoices only
    if (req.user?.tier === 'CLIENT' && invoice.clientId !== req.user.clientId) {
      res.status(403).json({ error: 'Access denied' }); return;
    }
    res.json(invoice);
  } catch {
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// POST /api/v1/invoices — Generate invoice from time entries + expenses
router.post('/', requireStaffOrAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { matterId, clientId, dueDate, paymentDestination, timeEntryIds, expenseIds, extraLineItems, notes } = req.body;

    // Gather line items
    const lineItems: any[] = [];
    let subtotal = 0;

    if (timeEntryIds?.length) {
      const entries = await prisma.timeEntry.findMany({
        where: { id: { in: timeEntryIds }, matterId, isBilled: false },
      });
      for (const e of entries) {
        const amount = e.totalAmount || (Number(e.hours) * Number(e.hourlyRate));
        subtotal += amount;
        lineItems.push({ description: e.description, quantity: e.hours, unitPrice: Number(e.hourlyRate), amount, type: 'TIME' });
      }
    }

    if (expenseIds?.length) {
      const expenses = await prisma.expense.findMany({ where: { id: { in: expenseIds }, matterId } });
      for (const ex of expenses) {
        subtotal += Number(ex.amount);
        lineItems.push({ description: ex.description, quantity: 1, unitPrice: Number(ex.amount), amount: Number(ex.amount), type: 'EXPENSE' });
      }
    }

    if (extraLineItems?.length) {
      for (const li of extraLineItems) {
        subtotal += li.amount;
        lineItems.push(li);
      }
    }

    const totalAmount = subtotal + (req.body.taxAmount || 0);

    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          invoiceNumber: generateInvoiceNumber(),
          matterId,
          clientId,
          subtotal,
          taxAmount: req.body.taxAmount || 0,
          totalAmount,
          paymentDestination: paymentDestination || 'OPERATING',
          dueDate: new Date(dueDate),
          notes,
          createdById: req.user!.userId,
          lineItems: { create: lineItems },
        },
        include: { lineItems: true },
      });

      // Mark time entries as billed
      if (timeEntryIds?.length) {
        await tx.timeEntry.updateMany({
          where: { id: { in: timeEntryIds } },
          data: { isBilled: true, invoiceId: inv.id },
        });
      }
      return inv;
    });

    await createAuditLog({
      userId: req.user!.userId, action: 'CREATE', entityType: 'Invoice',
      entityId: invoice.id, module: 'M07',
      newValue: { invoiceNumber: invoice.invoiceNumber, amount: invoice.totalAmount }, ipAddress: req.ip,
    });

    res.status(201).json(invoice);
  } catch {
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// PATCH /api/v1/invoices/:id/status — Update status (send, void, etc.)
router.patch('/:id/status', requireStaffOrAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const updated = await prisma.invoice.update({
      where: { id: req.params.id },
      data: {
        status: req.body.status,
        sentAt: req.body.status === 'SENT' ? new Date() : undefined,
      },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update invoice status' });
  }
});

export default router;
