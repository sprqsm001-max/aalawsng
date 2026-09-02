import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireStaffOrAdmin } from '../middleware/auth';

const router = Router();
router.use(authenticate, requireStaffOrAdmin);

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const matterId = req.query.matterId as string;
    const staffId = req.query.staffId as string;
    const where: any = { ...(matterId && { matterId }), ...(staffId && { staffId }) };
    const expenses = await prisma.expense.findMany({
      where, orderBy: { expenseDate: 'desc' },
      include: { staff: { select: { firstName: true, lastName: true } }, matter: { select: { referenceNumber: true, title: true } } },
    });
    res.json(expenses);
  } catch { res.status(500).json({ error: 'Failed to fetch expenses' }); }
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    let staffId = req.user?.staffId || req.body.staffId;
    if (!staffId && req.user?.userId) {
      const staff = await prisma.staffProfile.findFirst({ where: { userId: req.user.userId } });
      staffId = staff?.id;
    }
    if (!staffId) {
      const firstStaff = await prisma.staffProfile.findFirst();
      staffId = firstStaff?.id;
    }
    if (!staffId) {
      res.status(400).json({ error: 'Staff profile required to record expense' });
      return;
    }

    const rawMatterId = (req.body.matterId || '').trim();
    let resolvedMatterId: string | null = null;
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

    const expense = await prisma.expense.create({
      data: {
        category: req.body.category || 'MISCELLANEOUS',
        description: req.body.description || 'Expense incurred',
        amount: parseFloat(req.body.amount) || 0,
        currency: req.body.currency || 'NGN',
        isBillable: req.body.isBillable ?? true,
        expenseDate: req.body.expenseDate ? new Date(req.body.expenseDate) : (req.body.incurredAt ? new Date(req.body.incurredAt) : new Date()),
        matterId: resolvedMatterId,
        staffId,
      },
    });
    res.status(201).json(expense);
  } catch (err: any) { res.status(500).json({ error: err.message || 'Failed to create expense' }); }
});

router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const updated = await prisma.expense.update({ where: { id: req.params.id }, data: req.body });
    res.json(updated);
  } catch { res.status(500).json({ error: 'Failed to update expense' }); }
});

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.expense.delete({ where: { id: req.params.id } });
    res.json({ message: 'Expense deleted' });
  } catch { res.status(500).json({ error: 'Failed to delete expense' }); }
});

export default router;
