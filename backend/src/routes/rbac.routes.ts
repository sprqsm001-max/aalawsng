import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireAdmin } from '../middleware/auth';
import { createAuditLog } from '../middleware/audit';

const router = Router();
router.use(authenticate, requireAdmin);

// GET /api/v1/rbac/permissions
router.get('/permissions', async (_req: Request, res: Response): Promise<void> => {
  try {
    const permissions = await prisma.rolePermission.findMany({ orderBy: [{ role: 'asc' }, { module: 'asc' }] });
    res.json(permissions);
  } catch {
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

// POST /api/v1/rbac/permissions — Set module permission for a role
router.post('/permissions', async (req: Request, res: Response): Promise<void> => {
  try {
    const { role, module, canRead, canWrite, canAdmin } = req.body;
    const perm = await prisma.rolePermission.upsert({
      where: { role_module: { role, module } },
      update: { canRead: canRead ?? false, canWrite: canWrite ?? false, canAdmin: canAdmin ?? false },
      create: { role, module, canRead: canRead ?? false, canWrite: canWrite ?? false, canAdmin: canAdmin ?? false },
    });
    await createAuditLog({
      userId: req.user!.userId, action: 'PERMISSION_CHANGE', entityType: 'RolePermission',
      entityId: perm.id, module: 'M20', newValue: perm, ipAddress: req.ip,
    });
    res.json(perm);
  } catch {
    res.status(500).json({ error: 'Failed to set permission' });
  }
});

// GET /api/v1/rbac/matrix — Full permission matrix
router.get('/matrix', async (_req: Request, res: Response): Promise<void> => {
  try {
    const permissions = await prisma.rolePermission.findMany();
    const modules = ['M01','M02','M03','M04','M05','M06','M07','M08','M09','M10','M11','M12','M13','M14','M15','M16','M17','M18','M19','M20'];
    const roles = ['ADMIN','ATTORNEY','PARALEGAL','BILLING_STAFF','ADMIN_STAFF','ASSOCIATE'];

    const matrix: Record<string, Record<string, any>> = {};
    for (const role of roles) {
      matrix[role] = {};
      for (const mod of modules) {
        const perm = permissions.find(p => p.role === role && p.module === mod);
        matrix[role][mod] = perm ? { read: perm.canRead, write: perm.canWrite, admin: perm.canAdmin } : { read: false, write: false, admin: false };
      }
    }
    res.json({ matrix, roles, modules });
  } catch {
    res.status(500).json({ error: 'Failed to generate matrix' });
  }
});

export default router;
