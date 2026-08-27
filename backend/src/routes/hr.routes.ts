import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireStaffOrAdmin } from '../middleware/auth';

const router = Router();
router.use(authenticate, requireStaffOrAdmin);

// ─── TIMESHEETS (Aggregated Time Entries) ───────────────────────

router.get('/timesheets', async (req: Request, res: Response): Promise<void> => {
  try {
    const staffId = req.query.staffId as string || req.user!.staffId;
    const from = req.query.from as string;
    const to = req.query.to as string;
    const entries = await prisma.timeEntry.findMany({
      where: {
        ...(staffId && { staffId }),
        ...(from && to && { dateWorked: { gte: new Date(from), lte: new Date(to) } }),
      },
      orderBy: { dateWorked: 'desc' },
      include: {
        staff: { select: { firstName: true, lastName: true } },
        matter: { select: { referenceNumber: true, title: true } },
      },
    });
    res.json(entries);
  } catch { res.status(500).json({ error: 'Failed to fetch timesheets' }); }
});

// ─── LEAVE REQUESTS ──────────────────────────────────────────────

router.get('/leave', async (req: Request, res: Response): Promise<void> => {
  try {
    const staffId = req.query.staffId as string || req.user!.staffId;
    const leaves = await prisma.leaveRequest.findMany({
      where: { ...(staffId && { staffId }) },
      orderBy: { createdAt: 'desc' },
      include: { staff: { select: { firstName: true, lastName: true } } },
    });
    res.json(leaves);
  } catch { res.status(500).json({ error: 'Failed to fetch leave requests' }); }
});

router.post('/leave', async (req: Request, res: Response): Promise<void> => {
  try {
    const start = new Date(req.body.startDate);
    const end = new Date(req.body.endDate);
    const daysCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const staffId = req.user!.staffId || req.body.staffId;

    const leave = await prisma.leaveRequest.create({
      data: {
        staffId,
        leaveType: req.body.leaveType || req.body.type || 'ANNUAL',
        startDate: start,
        endDate: end,
        daysCount,
        reason: req.body.reason,
      },
    });
    res.status(201).json(leave);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to submit leave request' });
  }
});

router.patch('/leave/:id/review', async (req: Request, res: Response): Promise<void> => {
  try {
    const leave = await prisma.leaveRequest.update({
      where: { id: req.params.id },
      data: {
        status: req.body.status,
        reviewedById: req.user!.staffId || undefined,
        reviewedAt: new Date(),
        rejectionReason: req.body.rejectionReason,
      },
    });
    res.json(leave);
  } catch { res.status(500).json({ error: 'Failed to review leave request' }); }
});

router.get('/leave-balance/:staffId', async (req: Request, res: Response): Promise<void> => {
  try {
    const staff = await prisma.staffProfile.findUnique({
      where: { id: req.params.staffId },
      include: { leaveRequests: { where: { status: 'APPROVED' } } },
    });
    if (!staff) { res.status(404).json({ error: 'Staff not found' }); return; }

    const usedDays = staff.leaveRequests.reduce((sum, l) => sum + l.daysCount, 0);
    const totalDays = staff.annualLeaveDays || 20;

    res.json({
      staffId: staff.id,
      annualLeaveDays: totalDays,
      usedDays,
      remainingDays: Math.max(0, totalDays - usedDays),
    });
  } catch { res.status(500).json({ error: 'Failed to fetch leave balance' }); }
});

export default router;
