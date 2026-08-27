import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireStaffOrAdmin } from '../middleware/auth';
import { createAuditLog } from '../middleware/audit';

const router = Router();
router.use(authenticate, requireStaffOrAdmin);

// GET /api/v1/conflicts — Conflict check history
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.query.clientId as string;
    const checks = await prisma.conflictCheck.findMany({
      where: { ...(clientId && { clientId }) },
      orderBy: { checkedAt: 'desc' },
      include: {
        client: { select: { firstName: true, lastName: true } },
        matter: { select: { referenceNumber: true, title: true } },
      },
    });
    res.json(checks);
  } catch {
    res.status(500).json({ error: 'Failed to fetch conflict checks' });
  }
});

// POST /api/v1/conflicts/run — Run conflict check before onboarding
// Must run before client is formally onboarded — checks name, related parties, opposing counsel
router.post('/run', async (req: Request, res: Response): Promise<void> => {
  try {
    const { clientId, matterId, searchTerms } = req.body;
    if (!searchTerms || !searchTerms.length) {
      res.status(400).json({ error: 'searchTerms required (names, companies, related parties)' }); return;
    }

    const flaggedClients: string[] = [];
    const flaggedMatters: string[] = [];

    // Search across all client records for name matches
    for (const term of searchTerms) {
      const matchingClients = await prisma.clientRecord.findMany({
        where: {
          OR: [
            { firstName: { contains: term } },
            { lastName: { contains: term } },
            { companyName: { contains: term } },
          ],
          ...(clientId && { NOT: { id: clientId } }), // Exclude the checking client itself
        },
        select: { id: true },
      });
      flaggedClients.push(...matchingClients.map(c => c.id));

      // Search matter titles and descriptions
      const matchingMatters = await prisma.matter.findMany({
        where: {
          OR: [
            { title: { contains: term } },
            { description: { contains: term } },
          ],
        },
        select: { id: true },
      });
      flaggedMatters.push(...matchingMatters.map(m => m.id));
    }

    const uniqueClients = [...new Set(flaggedClients)];
    const uniqueMatters = [...new Set(flaggedMatters)];

    const result = uniqueClients.length > 0 || uniqueMatters.length > 0 ? 'FLAGGED' : 'CLEAR';

    const staff = await prisma.staffProfile.findFirst({ where: { userId: req.user!.userId } });
    if (!staff) {
      res.status(400).json({ error: 'Staff profile required' });
      return;
    }

    const check = await prisma.conflictCheck.create({
      data: {
        clientId: clientId || undefined,
        matterId: matterId || undefined,
        checkedById: staff.id,
        searchTerm: Array.isArray(searchTerms) ? searchTerms.join(', ') : String(searchTerms),
        status: result === 'FLAGGED' ? 'POTENTIAL_CONFLICT' : 'CLEARED',
        findings: `Found ${uniqueClients.length} matching clients and ${uniqueMatters.length} matching matters.`,
      },
    });

    await createAuditLog({
      userId: req.user!.userId, action: 'CONFLICT_CHECK_RUN', entityType: 'ConflictCheck',
      entityId: check.id, module: 'M18',
      newValue: { result, flaggedCount: uniqueClients.length + uniqueMatters.length },
      ipAddress: req.ip,
    });

    res.status(201).json({
      check,
      summary: {
        result,
        flaggedClients: uniqueClients,
        flaggedMatters: uniqueMatters,
        note: result === 'FLAGGED'
          ? 'Potential conflicts found — requires human review before proceeding'
          : 'No conflicts detected',
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Conflict check failed' });
  }
});

// PATCH /api/v1/conflicts/:id/resolve
router.patch('/:id/resolve', async (req: Request, res: Response): Promise<void> => {
  try {
    const check = await prisma.conflictCheck.update({
      where: { id: req.params.id },
      data: {
        clearedAt: new Date(),
        clearedById: req.user!.staffId || req.user!.userId,
        status: req.body.status || 'CLEARED',
      },
    });
    res.json(check);
  } catch {
    res.status(500).json({ error: 'Failed to resolve conflict check' });
  }
});

export default router;
