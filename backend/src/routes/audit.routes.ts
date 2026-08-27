import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();
router.use(authenticate, requireAdmin);

// GET /api/v1/audit — Audit log viewer (admin only, read-only)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;
    const entityType = req.query.entityType as string;
    const module = req.query.module as string;
    const userId = req.query.userId as string;
    const action = req.query.action as string;

    const where: any = {
      ...(entityType && { entityType }),
      ...(module && { module }),
      ...(userId && { userId }),
      ...(action && { action }),
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              email: true,
              tier: true,
              staffProfile: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);
    res.json({ logs, total, page, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// GET /api/v1/audit/trust — Trust-specific audit trail
router.get('/trust', async (_req: Request, res: Response): Promise<void> => {
  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        module: 'M08',
        action: { in: ['TRUST_DEPOSIT', 'TRUST_WITHDRAWAL', 'TRUST_TRANSFER', 'PAYMENT_RECEIVED'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        user: { select: { email: true, staffProfile: { select: { firstName: true, lastName: true } } } },
      },
    });
    res.json(logs);
  } catch {
    res.status(500).json({ error: 'Failed to fetch trust audit trail' });
  }
});

export default router;
