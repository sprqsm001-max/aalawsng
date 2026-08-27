import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { createAuditLog } from '../middleware/audit';

const router = Router();

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  tier: z.enum(['ADMIN', 'STAFF', 'CLIENT']),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['ATTORNEY', 'PARALEGAL', 'BILLING_STAFF', 'ADMIN_STAFF', 'ASSOCIATE']).optional(),
  phone: z.string().optional(),
});

function generateTokens(userId: string, tier: string, role?: string) {
  const payload = { userId, tier, role };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any,
  });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'fallback_refresh', {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any,
  });
  return { accessToken, refreshToken };
}

// POST /api/v1/auth/register — Public client onboarding or Admin staff creation
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = RegisterSchema.parse(req.body);

    // SECURITY CHECK: Disallow unauthenticated creation of ADMIN or STAFF accounts
    if (data.tier === 'ADMIN' || data.tier === 'STAFF') {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(403).json({ error: 'Administrative privileges required to provision Staff or Admin accounts' });
        return;
      }
      try {
        const token = authHeader.substring(7);
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;
        if (payload.tier !== 'ADMIN') {
          res.status(403).json({ error: 'Only Principal Partners (Admin) can create staff accounts' });
          return;
        }
      } catch {
        res.status(401).json({ error: 'Invalid admin authorization token' });
        return;
      }
    }

    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        tier: data.tier,
        ...(data.tier === 'STAFF' && data.role && {
          staffProfile: {
            create: {
              firstName: data.firstName,
              lastName: data.lastName,
              role: data.role,
              phone: data.phone,
            },
          },
        }),
        ...(data.tier === 'CLIENT' && {
          clientProfile: {
            create: {
              firstName: data.firstName,
              lastName: data.lastName,
              email: data.email,
              phone: data.phone,
            },
          },
        }),
        ...(data.tier === 'ADMIN' && {
          staffProfile: {
            create: {
              firstName: data.firstName,
              lastName: data.lastName,
              role: 'ADMIN_STAFF',
              phone: data.phone,
            },
          },
        }),
      },
      include: { staffProfile: true, clientProfile: true },
    });

    const { accessToken, refreshToken } = generateTokens(user.id, user.tier, data.role);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({
      data: { userId: user.id, token: refreshToken, expiresAt },
    });

    res.status(201).json({
      user: { id: user.id, email: user.email, tier: user.tier },
      accessToken,
      refreshToken,
    });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/v1/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = LoginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email },
      include: { staffProfile: true, clientProfile: true },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const { accessToken, refreshToken } = generateTokens(
      user.id, user.tier, user.staffProfile?.role
    );
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({
      data: { userId: user.id, token: refreshToken, expiresAt },
    });

    await createAuditLog({
      userId: user.id, action: 'LOGIN', entityType: 'User',
      entityId: user.id, module: 'M20', ipAddress: req.ip, userAgent: req.headers['user-agent'] as string,
    });

    res.json({
      user: {
        id: user.id, email: user.email, tier: user.tier,
        role: user.staffProfile?.role,
        staffId: user.staffProfile?.id,
        clientId: user.clientProfile?.id,
        name: user.staffProfile
          ? `${user.staffProfile.firstName} ${user.staffProfile.lastName}`
          : user.clientProfile
          ? `${user.clientProfile.firstName} ${user.clientProfile.lastName}`
          : user.email,
      },
      accessToken, refreshToken,
    });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/v1/auth/refresh
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) { res.status(400).json({ error: 'Refresh token required' }); return; }

    const session = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!session || (session.expiresAt && session.expiresAt < new Date()) || session.revokedAt) {
      res.status(401).json({ error: 'Invalid or expired refresh token' });
      return;
    }

    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'fallback_refresh') as any;
    const { accessToken, refreshToken: newRefresh } = generateTokens(payload.userId, payload.tier, payload.role);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.update({
      where: { id: session.id },
      data: { token: newRefresh, expiresAt },
    });

    res.json({ accessToken, refreshToken: newRefresh });
  } catch {
    res.status(401).json({ error: 'Token refresh failed' });
  }
});

// POST /api/v1/auth/logout
router.post('/logout', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }
    await createAuditLog({
      userId: req.user!.userId, action: 'LOGOUT', entityType: 'User',
      entityId: req.user!.userId, module: 'M20', ipAddress: req.ip,
    });
    res.json({ message: 'Logged out successfully' });
  } catch {
    res.status(500).json({ error: 'Logout failed' });
  }
});

// GET /api/v1/auth/me
router.get('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: {
        staffProfile: true,
        clientProfile: true,
      },
    });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json({ user: { id: user.id, email: user.email, tier: user.tier, staffProfile: user.staffProfile, clientProfile: user.clientProfile } });
  } catch {
    res.status(500).json({ error: 'Failed to get user' });
  }
});

export default router;
