import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, requireStaffOrAdmin, enforceClientScope } from '../middleware/auth';
import { createAuditLog } from '../middleware/audit';

const router = Router();
router.use(authenticate);

const EventSchema = z.object({
  matterId: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['COURT_DATE','STATUTE_DEADLINE','TASK_DUE','MEETING','FILING_DEADLINE','HEARING','DEPOSITION','OTHER']),
  eventDate: z.string(),
  endDate: z.string().optional(),
  isHardDeadline: z.boolean().optional(),
  reminderDays: z.array(z.number()).optional(),
  location: z.string().optional(),
  isAllDay: z.boolean().optional(),
});

// GET /api/v1/calendar — firm-wide or per-matter
router.get('/', enforceClientScope, async (req: Request, res: Response): Promise<void> => {
  try {
    const matterId = req.query.matterId as string;
    const from = req.query.from as string;
    const to = req.query.to as string;

    const where: any = {
      ...(matterId && { matterId }),
      ...(from && to && { eventDate: { gte: new Date(from), lte: new Date(to) } }),
      // Client tier scoping
      ...(req.user?.tier === 'CLIENT' && {
        matter: { clientId: req.user.clientId! },
      }),
    };

    const events = await prisma.calendarEvent.findMany({
      where,
      orderBy: { eventDate: 'asc' },
      include: {
        matter: { select: { id: true, referenceNumber: true, title: true } },
      },
    });
    res.json(events);
  } catch {
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

// GET /api/v1/calendar/upcoming-deadlines — hard deadlines only
router.get('/upcoming-deadlines', requireStaffOrAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const until = new Date();
    until.setDate(until.getDate() + days);

    const deadlines = await prisma.calendarEvent.findMany({
      where: {
        isHardDeadline: true,
        eventDate: { gte: new Date(), lte: until },
      },
      orderBy: { eventDate: 'asc' },
      include: {
        matter: { select: { id: true, referenceNumber: true, title: true, client: { select: { firstName: true, lastName: true } } } },
      },
    });
    res.json(deadlines);
  } catch {
    res.status(500).json({ error: 'Failed to fetch deadlines' });
  }
});

// POST /api/v1/calendar
router.post('/', requireStaffOrAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const data = EventSchema.parse(req.body);
    const staff = await prisma.staffProfile.findFirst({ where: { userId: req.user!.userId } });
    if (!staff) {
      res.status(400).json({ error: 'Staff profile required' });
      return;
    }

    const event = await prisma.calendarEvent.create({
      data: {
        ...data,
        eventDate: new Date(data.eventDate),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        organizerId: staff.id,
      },
    });
    await createAuditLog({
      userId: req.user!.userId, action: 'CREATE', entityType: 'CalendarEvent',
      entityId: event.id, module: 'M03', newValue: event, ipAddress: req.ip,
    });
    res.status(201).json(event);
  } catch (err: any) {
    if (err.name === 'ZodError') { res.status(400).json({ error: 'Validation error', details: err.errors }); return; }
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// PATCH /api/v1/calendar/:id
router.patch('/:id', requireStaffOrAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const old = await prisma.calendarEvent.findUnique({ where: { id: req.params.id } });
    if (!old) { res.status(404).json({ error: 'Event not found' }); return; }
    const updated = await prisma.calendarEvent.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        eventDate: req.body.eventDate ? new Date(req.body.eventDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      },
    });
    await createAuditLog({
      userId: req.user!.userId, action: 'UPDATE', entityType: 'CalendarEvent',
      entityId: updated.id, module: 'M03', oldValue: old, newValue: updated, ipAddress: req.ip,
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// DELETE /api/v1/calendar/:id
router.delete('/:id', requireStaffOrAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.calendarEvent.delete({ where: { id: req.params.id } });
    res.json({ message: 'Event deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

export default router;
