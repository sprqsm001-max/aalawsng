import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireAdmin, requireStaffOrAdmin } from '../middleware/auth';
import { createAuditLog } from '../middleware/audit';

const router = Router();
router.use(authenticate);

// GET /api/v1/staff
router.get('/', requireStaffOrAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const role = req.query.role as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      ...(role && { role }),
    };

    const [staff, total] = await Promise.all([
      prisma.staffProfile.findMany({
        where, skip, take: limit,
        orderBy: { lastName: 'asc' },
        include: {
          user: { select: { email: true, tier: true } },
          _count: { select: { assignedMatters: true, assignedTasks: true } },
        },
      }),
      prisma.staffProfile.count({ where }),
    ]);
    res.json({ staff, total, page, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

// GET /api/v1/staff/:id
router.get('/:id', requireStaffOrAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const staff = await prisma.staffProfile.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { email: true, tier: true } },
        assignedMatters: {
          include: { matter: { select: { referenceNumber: true, title: true, status: true } } },
        },
        leaveRequests: { orderBy: { createdAt: 'desc' }, take: 10 },
        _count: { select: { assignedTasks: true, timeEntries: true } },
      },
    });
    if (!staff) { res.status(404).json({ error: 'Staff not found' }); return; }
    res.json(staff);
  } catch {
    res.status(500).json({ error: 'Failed to fetch staff member' });
  }
});

// PATCH /api/v1/staff/:id — Update role/details (role changes propagate immediately via live DB check in auth)
router.patch('/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const old = await prisma.staffProfile.findUnique({ where: { id: req.params.id } });
    if (!old) { res.status(404).json({ error: 'Staff not found' }); return; }

    const updated = await prisma.staffProfile.update({
      where: { id: req.params.id },
      data: req.body,
    });

    if (old.role !== updated.role) {
      await createAuditLog({
        userId: req.user!.userId, action: 'ROLE_CHANGED', entityType: 'StaffProfile',
        entityId: updated.id, module: 'M11',
        oldValue: { role: old.role }, newValue: { role: updated.role }, ipAddress: req.ip,
      });
    }

    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update staff member' });
  }
});

// DELETE /api/v1/staff/:id — Soft deactivate
router.delete('/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.staffProfile.delete({ where: { id: req.params.id } });
    res.json({ message: 'Staff member removed' });
  } catch {
    res.status(500).json({ error: 'Failed to remove staff' });
  }
});

// GET /api/v1/staff/workload/summary — Per-staff task/matter load (M12)
router.get('/workload/summary', requireStaffOrAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const staff = await prisma.staffProfile.findMany({
      include: {
        _count: {
          select: {
            assignedMatters: true,
            assignedTasks: true,
            timeEntries: true,
          },
        },
      },
    });

    // Active task count per staff
    const workload = await Promise.all(staff.map(async (s) => {
      const activeTasks = await prisma.task.count({
        where: { assigneeId: s.id, status: { in: ['PENDING', 'IN_PROGRESS'] } },
      });
      const billableHoursThisMonth = await prisma.timeEntry.aggregate({
        where: {
          staffId: s.id,
          isBillable: true,
          dateWorked: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
        _sum: { hours: true },
      });
      return {
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
        role: s.role,
        activeMatters: s._count.assignedMatters,
        activeTasks,
        billableHoursThisMonth: Math.round((billableHoursThisMonth._sum.hours || 0) * 10) / 10,
      };
    }));

    res.json(workload);
  } catch {
    res.status(500).json({ error: 'Failed to fetch workload summary' });
  }
});

export default router;
