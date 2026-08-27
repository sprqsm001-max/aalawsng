import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireTier } from '../middleware/auth';
import { createAuditLog } from '../middleware/audit';

const router = Router();
// Internal messaging: STAFF and ADMIN only — CLIENT users have ZERO access
router.use(authenticate, requireTier('ADMIN', 'STAFF'));

// GET /api/v1/internal-messages — Inbox for current staff user
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const staff = await prisma.staffProfile.findFirst({ where: { userId: req.user!.userId } });
    if (!staff) {
      res.status(400).json({ error: 'Staff profile required' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      prisma.internalMessage.findMany({
        where: {
          OR: [{ senderId: staff.id }, { recipientId: staff.id }],
        },
        skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, role: true } },
          recipient: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
      }),
      prisma.internalMessage.count({
        where: { OR: [{ senderId: staff.id }, { recipientId: staff.id }] },
      }),
    ]);
    res.json({ messages, total, page, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/v1/internal-messages — Send internal message
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { recipientId, subject, body } = req.body;
    const staff = await prisma.staffProfile.findFirst({ where: { userId: req.user!.userId } });
    if (!staff) {
      res.status(400).json({ error: 'Staff profile required' });
      return;
    }

    // Safety: verify recipient is a valid StaffProfile
    const recipient = await prisma.staffProfile.findUnique({ where: { id: recipientId } });
    if (!recipient) {
      res.status(400).json({ error: 'Recipient staff not found' }); return;
    }

    const msg = await prisma.internalMessage.create({
      data: { senderId: staff.id, recipientId, subject, body },
      include: {
        sender: { select: { firstName: true, lastName: true } },
        recipient: { select: { firstName: true, lastName: true } },
      },
    });
    res.status(201).json(msg);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to send message' });
  }
});

// PATCH /api/v1/internal-messages/:id/read — Mark as read
router.patch('/:id/read', async (req: Request, res: Response): Promise<void> => {
  try {
    const msg = await prisma.internalMessage.update({
      where: { id: req.params.id },
      data: { isRead: true, readAt: new Date() },
    });
    res.json(msg);
  } catch {
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// GET /api/v1/internal-messages/unread-count
router.get('/unread-count', async (req: Request, res: Response): Promise<void> => {
  try {
    const staff = await prisma.staffProfile.findFirst({ where: { userId: req.user!.userId } });
    if (!staff) {
      res.json({ unreadCount: 0 });
      return;
    }

    const count = await prisma.internalMessage.count({
      where: { recipientId: staff.id, isRead: false },
    });
    res.json({ unreadCount: count });
  } catch {
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

export default router;
