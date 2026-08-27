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
    const expense = await prisma.expense.create({
      data: { ...req.body, staffId: req.user!.staffId || req.body.staffId },
    });
    res.status(201).json(expense);
  } catch { res.status(500).json({ error: 'Failed to create expense' }); }
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
