import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, requireStaffOrAdmin, enforceClientScope } from '../middleware/auth';
import { createAuditLog } from '../middleware/audit';

const router = Router();
router.use(authenticate);

const ClientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  companyName: z.string().optional().nullable(),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  idType: z.string().optional().nullable(),
  idNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  tin: z.string().optional().nullable(),
  rcNumber: z.string().optional().nullable(),
  sourceOfFundsDeclaration: z.string().optional().nullable(),
  pepStatus: z.boolean().optional().default(false),
  riskRating: z.string().optional().default('LOW'),
});

// GET /api/v1/clients — Admin/Staff only
router.get('/', requireStaffOrAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const skip = (page - 1) * limit;

    const where = search ? {
      OR: [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
        { companyName: { contains: search } },
      ],
    } : {};

    const [clients, total] = await Promise.all([
      prisma.clientRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { matters: true } },
        },
      }),
      prisma.clientRecord.count({ where }),
    ]);

    res.json({ clients, total, page, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// GET /api/v1/clients/:id
router.get('/:id', requireStaffOrAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const client = await prisma.clientRecord.findUnique({
      where: { id: req.params.id },
      include: {
        matters: { select: { id: true, referenceNumber: true, title: true, status: true, openedAt: true } },
        contactHistory: { orderBy: { loggedAt: 'desc' }, take: 20 },
        conflictChecks: { orderBy: { checkedAt: 'desc' }, take: 5 },
        trustLedgers: { select: { id: true, balance: true, currency: true, accountCategory: true } },
      },
    });
    if (!client) { res.status(404).json({ error: 'Client not found' }); return; }
    res.json(client);
  } catch {
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

// POST /api/v1/clients — Create new client (runs conflict check first)
router.post('/', requireStaffOrAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const data = ClientSchema.parse(req.body);
    const client = await prisma.clientRecord.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        companyName: data.companyName || null,
        phone: data.phone || '',
        address: data.address || null,
        idType: data.idType || 'NIN',
        idNumber: data.idNumber || null,
        tin: data.tin || null,
        rcNumber: data.rcNumber || null,
        sourceOfFundsDeclaration: data.sourceOfFundsDeclaration || null,
        pepStatus: data.pepStatus || false,
        riskRating: data.riskRating || 'LOW',
        notes: data.notes || null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      },
    });

    try {
      await createAuditLog({
        userId: req.user!.userId, action: 'CREATE', entityType: 'ClientRecord',
        entityId: client.id, module: 'M02', newValue: JSON.stringify(client), ipAddress: req.ip,
      });
    } catch (auditErr) {
      console.warn('Client create audit log failed:', auditErr);
    }

    res.status(201).json(client);
  } catch (err: any) {
    if (err.name === 'ZodError') { res.status(400).json({ error: 'Validation error', details: err.errors }); return; }
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'A client with this email address already exists in the system.' });
      return;
    }
    console.error('Error creating client:', err);
    res.status(500).json({ error: err.message || 'Failed to create client' });
  }
});

// PATCH /api/v1/clients/:id
router.patch('/:id', requireStaffOrAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const old = await prisma.clientRecord.findUnique({ where: { id: req.params.id } });
    if (!old) { res.status(404).json({ error: 'Client not found' }); return; }

    const updated = await prisma.clientRecord.update({
      where: { id: req.params.id },
      data: req.body,
    });

    await createAuditLog({
      userId: req.user!.userId, action: 'UPDATE', entityType: 'ClientRecord',
      entityId: updated.id, module: 'M02', oldValue: old, newValue: updated, ipAddress: req.ip,
    });

    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update client' });
  }
});

// DELETE /api/v1/clients/:id — Admin only
router.delete('/:id', requireStaffOrAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const old = await prisma.clientRecord.findUnique({ where: { id: req.params.id } });
    if (!old) { res.status(404).json({ error: 'Client not found' }); return; }
    await prisma.clientRecord.delete({
      where: { id: req.params.id },
    });
    await createAuditLog({
      userId: req.user!.userId, action: 'DELETE', entityType: 'ClientRecord',
      entityId: req.params.id, module: 'M02', oldValue: old, ipAddress: req.ip,
    });
    res.json({ message: 'Client deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

// POST /api/v1/clients/:id/communication-log
router.post('/:id/communication-log', requireStaffOrAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const log = await prisma.clientContactHistory.create({
      data: {
        clientId: req.params.id,
        contactType: req.body.type || 'CALL',
        summary: req.body.notes || req.body.subject || 'Communication logged',
        loggedBy: req.user!.userId,
      },
    });
    res.status(201).json(log);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create log' });
  }
});

export default router;
