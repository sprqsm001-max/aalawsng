import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, enforceClientScope } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/v1/client-messages — Separate channel from internal messages
router.get('/', enforceClientScope, async (req: Request, res: Response): Promise<void> => {
  try {
    const matterId = req.query.matterId as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      ...(matterId && { matterId }),
      // Client tier: only their own matter messages
      ...(req.user?.tier === 'CLIENT' && { clientId: req.user.clientId! }),
    };

    const [messages, total] = await Promise.all([
      prisma.clientMessage.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          staff: { select: { firstName: true, lastName: true, role: true } },
          matter: { select: { referenceNumber: true, title: true } },
        },
      }),
      prisma.clientMessage.count({ where }),
    ]);
    res.json({ messages, total, page, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch client messages' });
  }
});

// POST /api/v1/client-messages — Staff sends to client
router.post('/', enforceClientScope, async (req: Request, res: Response): Promise<void> => {
  try {
    const isClient = req.user?.tier === 'CLIENT';
    const staffId = isClient ? req.body.staffId : req.user!.staffId;
    const clientId = isClient ? req.user!.clientId! : req.body.clientId;

    // Validate: client can only message on their own matters
    if (isClient) {
      const matter = await prisma.matter.findUnique({ where: { id: req.body.matterId }, select: { clientId: true } });
      if (!matter || matter.clientId !== clientId) {
        res.status(403).json({ error: 'Access denied' }); return;
      }
    }

    const msg = await prisma.clientMessage.create({
      data: {
        matterId: req.body.matterId,
        staffId: staffId || undefined,
        clientId: clientId!,
        subject: req.body.subject,
        body: req.body.body,
        sentByClient: isClient,
      },
    });
    res.status(201).json(msg);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to send message' });
  }
});

// PATCH /api/v1/client-messages/:id/read
router.patch('/:id/read', enforceClientScope, async (req: Request, res: Response): Promise<void> => {
  try {
    const msg = await prisma.clientMessage.update({ where: { id: req.params.id }, data: { isRead: true, readAt: new Date() } });
    res.json(msg);
  } catch {
    res.status(500).json({ error: 'Failed to mark read' });
  }
});

export default router;
