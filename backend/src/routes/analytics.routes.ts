import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireStaffOrAdmin } from '../middleware/auth';

const router = Router();
router.use(authenticate, requireStaffOrAdmin);

// GET /api/v1/analytics — Firm-wide KPI dashboard (M17)
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalClients, activeMatters, totalStaff,
      invoicesThisMonth, timeEntriesThisMonth,
      taskCompletion, upcomingDeadlines,
      conflictChecks,
    ] = await Promise.all([
      prisma.clientRecord.count(),
      prisma.matter.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      prisma.staffProfile.count(),
      prisma.invoice.aggregate({ where: { createdAt: { gte: startOfMonth } }, _sum: { totalAmount: true }, _count: true }),
      prisma.timeEntry.aggregate({ where: { dateWorked: { gte: startOfMonth }, isBillable: true }, _sum: { hours: true } }),
      prisma.task.groupBy({ by: ['status'], _count: true }),
      prisma.calendarEvent.count({
        where: {
          isHardDeadline: true,
          eventDate: { gte: now, lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.conflictCheck.count({ where: { status: 'PENDING_REVIEW' } }),
    ]);

    // Matter status breakdown
    const matterStatusBreakdown = await prisma.matter.groupBy({ by: ['status'], _count: true });

    // Top clients by matter count
    const topClients = await prisma.clientRecord.findMany({
      include: { _count: { select: { matters: true } } },
      orderBy: { matters: { _count: 'desc' } },
      take: 5,
    });

    // Staff utilization
    const staffUtilization = await prisma.staffProfile.findMany({
      include: {
        _count: { select: { assignedMatters: true } },
      },
    });

    res.json({
      overview: {
        totalClients,
        activeMatters,
        totalStaff,
        upcomingDeadlines,
        pendingConflicts: conflictChecks,
      },
      financial: {
        invoicesIssuedThisMonth: invoicesThisMonth._count,
        invoicedAmountThisMonth: Number(invoicesThisMonth._sum.totalAmount || 0),
        billableHoursThisMonth: Number(timeEntriesThisMonth._sum.hours || 0),
      },
      matters: {
        statusBreakdown: matterStatusBreakdown,
        topClients,
      },
      tasks: taskCompletion,
      staff: staffUtilization,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;
