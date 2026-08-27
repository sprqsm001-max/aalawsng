import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireStaffOrAdmin } from '../middleware/auth';

const router = Router();
router.use(authenticate, requireStaffOrAdmin);

// GET /api/v1/staff-tasks — Per-staff task view with pagination
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const staffId = req.query.staffId as string || req.user!.staffId;
    const status = req.query.status as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      ...(staffId && { assigneeId: staffId }),
      ...(status && { status }),
    };

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where, skip, take: limit,
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
        include: {
          matter: { select: { referenceNumber: true, title: true, client: { select: { firstName: true, lastName: true } } } },
        },
      }),
      prisma.task.count({ where }),
    ]);
    res.json({ tasks, total, page, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch staff tasks' });
  }
});

export default router;
