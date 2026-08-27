import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireStaffOrAdmin } from '../middleware/auth';
import { createAuditLog } from '../middleware/audit';

const router = Router();
router.use(authenticate, requireStaffOrAdmin);

// GET /api/v1/time?matterId=...&staffId=...
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const matterId = req.query.matterId as string;
    const staffId = req.query.staffId as string;
    const isBilled = req.query.isBilled === 'true' ? true : req.query.isBilled === 'false' ? false : undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const where: any = {
      ...(matterId && { matterId }),
      ...(staffId && { staffId }),
      ...(isBilled !== undefined && { isBilled }),
    };

    const [entries, total] = await Promise.all([
      prisma.timeEntry.findMany({
        where, skip, take: limit,
        orderBy: { dateWorked: 'desc' },
        include: {
          staff: { select: { firstName: true, lastName: true, role: true } },
          matter: { select: { referenceNumber: true, title: true } },
        },
      }),
      prisma.timeEntry.count({ where }),
    ]);

    const totalHours = entries.reduce((sum, e) => sum + (e.hours || 0), 0);
    const totalBillableHours = entries
      .filter(e => e.isBillable)
      .reduce((sum, e) => sum + (e.hours || 0), 0);

    res.json({ entries, total, page, totalPages: Math.ceil(total / limit), totalHours, totalBillableHours });
  } catch {
    res.status(500).json({ error: 'Failed to fetch time entries' });
  }
});

// POST /api/v1/time — Log time entry
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const hours = parseFloat(req.body.hours) || 1.0;
    const hourlyRate = parseFloat(req.body.hourlyRate) || 50000.0;
    const totalAmount = hours * hourlyRate;

    const entry = await prisma.timeEntry.create({
      data: {
        matterId: req.body.matterId,
        staffId: req.user!.staffId || req.body.staffId,
        description: req.body.description || 'Legal services rendered',
        hours,
        hourlyRate,
        totalAmount,
        currency: req.body.currency || 'NGN',
        isBillable: req.body.isBillable ?? true,
        dateWorked: req.body.dateWorked ? new Date(req.body.dateWorked) : new Date(),
      },
    });
    res.status(201).json(entry);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create time entry' });
  }
});

// PATCH /api/v1/time/:id
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const entry = await prisma.timeEntry.findUnique({ where: { id: req.params.id } });
    if (!entry) { res.status(404).json({ error: 'Time entry not found' }); return; }
    if (entry.isBilled) { res.status(400).json({ error: 'Cannot edit a billed time entry' }); return; }
    const updated = await prisma.timeEntry.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update time entry' });
  }
});

// DELETE /api/v1/time/:id
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const entry = await prisma.timeEntry.findUnique({ where: { id: req.params.id } });
    if (!entry) { res.status(404).json({ error: 'Not found' }); return; }
    if (entry.isBilled) { res.status(400).json({ error: 'Cannot delete a billed time entry' }); return; }
    await prisma.timeEntry.delete({ where: { id: req.params.id } });
    res.json({ message: 'Time entry deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete time entry' });
  }
});

export default router;
