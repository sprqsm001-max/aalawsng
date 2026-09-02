import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, requireStaffOrAdmin, enforceClientScope } from '../middleware/auth';
import { matterScopeGuard } from '../middleware/document-guard';
import { createAuditLog } from '../middleware/audit';

const router = Router();
router.use(authenticate);

const MatterSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  clientId: z.string().uuid(),
  matterTypeId: z.string().optional(),
  status: z.enum(['INTAKE', 'OPEN', 'IN_PROGRESS', 'PENDING', 'CLOSED', 'ARCHIVED']).optional(),
  courtJurisdiction: z.string().optional(),
  courtCaseNumber: z.string().optional(),
  opposingPartyName: z.string().optional(),
  opposingCounselName: z.string().optional(),
  budgetAmount: z.number().optional(),
  estimatedHours: z.number().optional(),
  leadAttorneyId: z.string().uuid().optional(),
});

function generateRefNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `AAL-${year}-${rand}`;
}

// GET /api/v1/matters/types and /types/all — MUST BE BEFORE /:id
router.get(['/types', '/types/all'], requireStaffOrAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const types = await prisma.matterType.findMany({ orderBy: { name: 'asc' } });
    res.json(types);
  } catch {
    res.status(500).json({ error: 'Failed to fetch matter types' });
  }
});

// POST /api/v1/matters/types
router.post('/types', requireStaffOrAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const type = await prisma.matterType.create({ data: req.body });
    res.status(201).json(type);
  } catch {
    res.status(500).json({ error: 'Failed to create matter type' });
  }
});

// GET /api/v1/matters — paginated
router.get('/', enforceClientScope, async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;
    const status = req.query.status as string;
    const search = req.query.search as string;

    // Client tier: scope to own matters only (enforced server-side)
    const clientScope = req.user?.tier === 'CLIENT'
      ? { clientId: req.user.clientId! }
      : {};

    const where: any = {
      ...clientScope,
      ...(status && { status }),
      ...(search && {
        OR: [
          { title: { contains: search } },
          { referenceNumber: { contains: search } },
        ],
      }),
    };

    const [matters, total] = await Promise.all([
      prisma.matter.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { firstName: true, lastName: true, companyName: true } },
          matterType: { select: { name: true } },
          assignedStaff: {
            include: { staff: { select: { firstName: true, lastName: true, role: true } } },
          },
          _count: { select: { documents: true, tasks: true, timeEntries: true } },
        },
      }),
      prisma.matter.count({ where }),
    ]);

    res.json({ matters, total, page, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch matters' });
  }
});

// GET /api/v1/matters/:id
router.get('/:id', enforceClientScope, matterScopeGuard, async (req: Request, res: Response): Promise<void> => {
  try {
    const matter = await prisma.matter.findUnique({
      where: { id: req.params.id },
      include: {
        client: true,
        matterType: true,
        assignedStaff: { include: { staff: true } },
        documents: {
          where: req.user?.tier === 'CLIENT' ? { visibility: 'CLIENT_VISIBLE' } : {},
          orderBy: { createdAt: 'desc' },
        },
        tasks: { orderBy: { dueDate: 'asc' } },
        timeEntries: req.user?.tier !== 'CLIENT' ? { orderBy: { dateWorked: 'desc' } } : false,
        invoices: { orderBy: { createdAt: 'desc' } },
        matterTrustLedger: true,
      },
    });
    if (!matter) { res.status(404).json({ error: 'Matter not found' }); return; }
    res.json(matter);
  } catch {
    res.status(500).json({ error: 'Failed to fetch matter' });
  }
});

// POST /api/v1/matters
router.post('/', requireStaffOrAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const data = MatterSchema.parse(req.body);

    // Validate client exists
    const client = await prisma.clientRecord.findUnique({ where: { id: data.clientId } });
    if (!client) {
      res.status(400).json({ error: 'Selected client does not exist' });
      return;
    }

    // Resolve matterTypeId (fallback to first available if not a valid UUID or not found)
    let matterTypeId = data.matterTypeId;
    const isUuid = matterTypeId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(matterTypeId);
    if (!isUuid) {
      const firstType = await prisma.matterType.findFirst();
      if (!firstType) {
        res.status(400).json({ error: 'No matter types available in database' });
        return;
      }
      matterTypeId = firstType.id;
    } else {
      const typeExists = await prisma.matterType.findUnique({ where: { id: matterTypeId } });
      if (!typeExists) {
        const firstType = await prisma.matterType.findFirst();
        matterTypeId = firstType?.id || matterTypeId;
      }
    }

    const refNumber = generateRefNumber();

    const matter = await prisma.matter.create({
      data: {
        ...data,
        matterTypeId: matterTypeId!,
        referenceNumber: refNumber,
        assignedStaff: req.body.staffIds ? {
          create: (req.body.staffIds as string[]).map((sid: string) => ({
            staffId: sid,
          })),
        } : undefined,
      },
      include: { client: true, matterType: true, assignedStaff: true },
    });

    await createAuditLog({
      userId: req.user!.userId, action: 'CREATE', entityType: 'Matter',
      entityId: matter.id, module: 'M01', newValue: { title: matter.title, ref: matter.referenceNumber }, ipAddress: req.ip,
    });

    res.status(201).json(matter);
  } catch (err: any) {
    if (err.name === 'ZodError') { res.status(400).json({ error: 'Validation error', details: err.errors }); return; }
    res.status(500).json({ error: err.message || 'Failed to create matter' });
  }
});

// PATCH /api/v1/matters/:id
router.patch('/:id', requireStaffOrAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const old = await prisma.matter.findUnique({ where: { id: req.params.id } });
    if (!old) { res.status(404).json({ error: 'Matter not found' }); return; }

    const updated = await prisma.matter.update({
      where: { id: req.params.id },
      data: req.body,
    });

    await createAuditLog({
      userId: req.user!.userId, action: 'UPDATE', entityType: 'Matter',
      entityId: updated.id, module: 'M01', oldValue: old, newValue: updated, ipAddress: req.ip,
    });

    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update matter' });
  }
});

export default router;
