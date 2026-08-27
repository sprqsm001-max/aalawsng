import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, enforceClientScope } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Client Portal routes (M14) — scoped strictly to own matters only
// Every query below enforces clientId = req.user.clientId server-side

// GET /api/v1/portal/overview — Client's portal home
router.get('/overview', enforceClientScope, async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user?.tier !== 'CLIENT') {
      res.status(403).json({ error: 'Portal is for client users only' }); return;
    }
    const clientId = req.user.clientId!;

    const [client, matters, invoices, unreadMessages] = await Promise.all([
      prisma.clientRecord.findUnique({
        where: { id: clientId },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          trustLedgers: { select: { balance: true, currency: true, accountCategory: true } },
        },
      }),
      prisma.matter.findMany({
        where: { clientId, status: { not: 'ARCHIVED' } },
        select: { id: true, referenceNumber: true, title: true, status: true, openedAt: true },
        orderBy: { openedAt: 'desc' },
        take: 10,
      }),
      prisma.invoice.findMany({
        where: { clientId, status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] } },
        select: { id: true, invoiceNumber: true, currency: true, totalAmount: true, amountPaid: true, status: true, dueDate: true },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),
      prisma.clientMessage.count({
        where: { clientId, sentByClient: false, isRead: false },
      }),
    ]);

    res.json({ client, matters, pendingInvoices: invoices, unreadMessages });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load portal overview' });
  }
});

// GET /api/v1/portal/matters/:id/documents — Only CLIENT_VISIBLE docs
router.get('/matters/:id/documents', enforceClientScope, async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user?.tier !== 'CLIENT') { res.status(403).json({ error: 'Forbidden' }); return; }

    // Verify matter belongs to this client
    const matter = await prisma.matter.findUnique({ where: { id: req.params.id }, select: { clientId: true } });
    if (!matter || matter.clientId !== req.user.clientId) {
      res.status(403).json({ error: 'Access denied' }); return;
    }

    // CRITICAL: Only CLIENT_VISIBLE documents returned
    const docs = await prisma.document.findMany({
      where: { matterId: req.params.id, visibility: 'CLIENT_VISIBLE' },
      select: {
        id: true, title: true, fileName: true, fileSize: true,
        mimeType: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(docs);
  } catch {
    res.status(500).json({ error: 'Failed to load matter documents' });
  }
});

export default router;
