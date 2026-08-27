import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireStaffOrAdmin } from '../middleware/auth';

const router = Router();
router.use(authenticate, requireStaffOrAdmin);

// GET /api/v1/fin-dashboard — Aggregated financial KPIs
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      totalRevenue, monthRevenue, yearRevenue,
      outstanding, overdueCount,
      openMatters, closedMatters,
      trustTotal, recentReconciliation,
    ] = await Promise.all([
      // Total revenue (all paid invoices)
      prisma.invoice.aggregate({ where: { status: 'PAID' }, _sum: { amountPaid: true } }),
      // This month revenue
      prisma.invoice.aggregate({ where: { status: 'PAID', paidAt: { gte: startOfMonth } }, _sum: { amountPaid: true } }),
      // This year revenue
      prisma.invoice.aggregate({ where: { status: 'PAID', paidAt: { gte: startOfYear } }, _sum: { amountPaid: true } }),
      // Outstanding AR
      prisma.invoice.aggregate({ where: { status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] } }, _sum: { totalAmount: true } }),
      // Overdue count
      prisma.invoice.count({ where: { status: 'OVERDUE' } }),
      // Open matters
      prisma.matter.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS', 'INTAKE', 'PENDING'] } } }),
      // Closed this month
      prisma.matter.count({ where: { status: 'CLOSED', closedAt: { gte: startOfMonth } } }),
      // Total trust funds held
      prisma.trustLedgerAccount.aggregate({ _sum: { balance: true } }),
      // Latest reconciliation
      prisma.trustReconciliation.findFirst({ orderBy: { reconciledAt: 'desc' } }),
    ]);

    // AR Aging buckets
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date(); sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const ninetyDaysAgo = new Date(); ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const [ar0to30, ar31to60, ar61to90, ar90plus] = await Promise.all([
      prisma.invoice.aggregate({ where: { status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] }, dueDate: { gte: thirtyDaysAgo } }, _sum: { totalAmount: true } }),
      prisma.invoice.aggregate({ where: { status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] }, dueDate: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } }, _sum: { totalAmount: true } }),
      prisma.invoice.aggregate({ where: { status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] }, dueDate: { gte: ninetyDaysAgo, lt: sixtyDaysAgo } }, _sum: { totalAmount: true } }),
      prisma.invoice.aggregate({ where: { status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] }, dueDate: { lt: ninetyDaysAgo } }, _sum: { totalAmount: true } }),
    ]);

    // Top matters by billable hours
    const topMatters = await prisma.timeEntry.groupBy({
      by: ['matterId'],
      where: { isBillable: true },
      _sum: { hours: true },
      orderBy: { _sum: { hours: 'desc' } },
      take: 5,
    });

    res.json({
      revenue: {
        total: Number(totalRevenue._sum.amountPaid || 0),
        thisMonth: Number(monthRevenue._sum.amountPaid || 0),
        thisYear: Number(yearRevenue._sum.amountPaid || 0),
      },
      accountsReceivable: {
        outstanding: Number(outstanding._sum.totalAmount || 0),
        overdueCount,
        aging: {
          '0-30': Number(ar0to30._sum.totalAmount || 0),
          '31-60': Number(ar31to60._sum.totalAmount || 0),
          '61-90': Number(ar61to90._sum.totalAmount || 0),
          '90+': Number(ar90plus._sum.totalAmount || 0),
        },
      },
      matters: { open: openMatters, closedThisMonth: closedMatters },
      trust: {
        totalHeld: Number(trustTotal._sum.balance || 0),
        lastReconciliation: recentReconciliation,
        isReconciled: recentReconciliation?.isMatched ?? null,
      },
      topMattersByHours: topMatters,
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch financial dashboard' });
  }
});

export default router;
