import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

export interface AuthPayload {
  userId: string;
  tier: 'ADMIN' | 'STAFF' | 'CLIENT';
  role?: string;
  clientId?: string;
  staffId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET!;
    const payload = jwt.verify(token, secret) as AuthPayload;

    // Verify user is still active in DB (role changes propagate immediately)
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        staffProfile: { select: { id: true, role: true } },
        clientProfile: { select: { id: true } },
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Account is inactive or does not exist' });
      return;
    }

    req.user = {
      userId: user.id,
      tier: user.tier as AuthPayload['tier'],
      role: user.staffProfile?.role,
      staffId: user.staffProfile?.id,
      clientId: user.clientProfile?.id,
    };

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
    } else {
      res.status(401).json({ error: 'Invalid token' });
    }
  }
};

export const requireTier = (...tiers: AuthPayload['tier'][]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    if (!tiers.includes(req.user.tier)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
};

export const requireAdmin = requireTier('ADMIN');
export const requireStaffOrAdmin = requireTier('ADMIN', 'STAFF');
export const requireClientOrAbove = requireTier('ADMIN', 'STAFF', 'CLIENT');

// Client-tier: enforce server-side scoping — client can ONLY see their own data
export const enforceClientScope = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.tier === 'CLIENT') {
    if (!req.user.clientId) {
      res.status(403).json({ error: 'No client profile associated' });
      return;
    }
    // Inject clientId into query params so controllers can scope queries
    (req as any).scopedClientId = req.user.clientId;
  }
  next();
};
