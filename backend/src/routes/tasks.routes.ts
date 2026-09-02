import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, requireStaffOrAdmin } from '../middleware/auth';
import { createAuditLog } from '../middleware/audit';

const router = Router();
router.use(authenticate, requireStaffOrAdmin);

const TaskSchema = z.object({
  matterId: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  assigneeId: z.string().uuid().optional(),
  priority: z.enum(['LOW','MEDIUM','HIGH','URGENT']).optional(),
  dueDate: z.string().optional(),
});

// GET /api/v1/tasks
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const matterId = req.query.matterId as string;
    const assigneeId = req.query.assigneeId as string;
    const status = req.query.status as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      ...(matterId && { matterId }),
      ...(assigneeId && { assigneeId }),
      ...(status && { status }),
    };

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where, skip, take: limit,
        orderBy: { dueDate: 'asc' },
        include: {
          assignee: { select: { firstName: true, lastName: true, role: true } },
          matter: { select: { referenceNumber: true, title: true } },
        },
      }),
      prisma.task.count({ where }),
    ]);
    res.json({ tasks, total, page, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// POST /api/v1/tasks
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const rawMatterId = (req.body.matterId || '').trim();
    const rawAssigneeId = (req.body.assigneeId || req.body.assignedToId || '').trim();
    let priority = (req.body.priority || 'MEDIUM').toUpperCase();
    if (priority === 'CRITICAL') priority = 'URGENT';
    if (!['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority)) priority = 'MEDIUM';

    if (!req.body.title || req.body.title.trim() === '') {
      res.status(400).json({ error: 'Task title is required' });
      return;
    }

    const staff = await prisma.staffProfile.findFirst({ where: { userId: req.user!.userId } });
    if (!staff) {
      res.status(400).json({ error: 'Only staff can create tasks' });
      return;
    }

    // Resolve matterId if provided
    let resolvedMatterId: string | undefined = undefined;
    if (rawMatterId) {
      const matter = await prisma.matter.findFirst({
        where: {
          OR: [
            { id: rawMatterId },
            { referenceNumber: rawMatterId },
            { title: { contains: rawMatterId } },
          ],
        },
      });
      if (matter) resolvedMatterId = matter.id;
    }

    // Resolve assigneeId if provided
    let resolvedAssigneeId: string | undefined = undefined;
    if (rawAssigneeId) {
      const assignee = await prisma.staffProfile.findFirst({
        where: {
          OR: [
            { id: rawAssigneeId },
            { firstName: { contains: rawAssigneeId } },
            { lastName: { contains: rawAssigneeId } },
          ],
        },
      });
      if (assignee) resolvedAssigneeId = assignee.id;
    }

    let dueDate: Date | undefined = undefined;
    if (req.body.dueDate && req.body.dueDate.trim() !== '') {
      const d = new Date(req.body.dueDate);
      if (!isNaN(d.getTime())) dueDate = d;
    }

    const task = await prisma.task.create({
      data: {
        title: req.body.title.trim(),
        description: req.body.description || undefined,
        matterId: resolvedMatterId,
        assigneeId: resolvedAssigneeId,
        priority,
        dueDate,
        createdById: staff.id,
      },
      include: {
        assignee: { select: { firstName: true, lastName: true, role: true } },
        matter: { select: { referenceNumber: true, title: true } },
      },
    });

    await createAuditLog({
      userId: req.user!.userId, action: 'CREATE', entityType: 'Task',
      entityId: task.id, module: 'M05', newValue: { title: task.title }, ipAddress: req.ip,
    });

    res.status(201).json(task);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create task' });
  }
});

// PATCH /api/v1/tasks/:id
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const old = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!old) { res.status(404).json({ error: 'Task not found' }); return; }
    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
        completedAt: req.body.status === 'COMPLETED' ? new Date() : undefined,
      },
    });
    await createAuditLog({
      userId: req.user!.userId, action: 'UPDATE', entityType: 'Task',
      entityId: updated.id, module: 'M05', oldValue: { status: old.status }, newValue: { status: updated.status }, ipAddress: req.ip,
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE /api/v1/tasks/:id
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ message: 'Task deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

export default router;
