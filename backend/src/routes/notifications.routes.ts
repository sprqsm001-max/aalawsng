import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.userId, isRead: false },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(notifications);
  } catch { res.status(500).json({ error: 'Failed' }); }
});

router.patch('/:id/read', async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.notification.update({ where: { id: req.params.id }, data: { isRead: true } });
    res.json({ message: 'Marked as read' });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

router.patch('/read-all', async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user!.userId }, data: { isRead: true } });
    res.json({ message: 'All marked as read' });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

export default router;
