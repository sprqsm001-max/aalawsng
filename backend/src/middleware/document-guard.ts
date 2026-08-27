import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

// CRITICAL: Document visibility guard
// Enforced at API layer — client portal users can NEVER retrieve internal documents
// regardless of URL guessing, document ID enumeration, or direct API calls
export const documentVisibilityGuard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (req.user?.tier !== 'CLIENT') {
    next();
    return;
  }

  const documentId = req.params.id || req.params.documentId;
  if (!documentId) {
    next();
    return;
  }

  try {
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        matter: { select: { clientId: true } },
      },
    });

    if (!doc) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    // Rule 1: Document must be CLIENT_VISIBLE
    if (doc.visibility !== 'CLIENT_VISIBLE') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Rule 2: Document must belong to THIS client's matter
    if (doc.matter.clientId !== req.user.clientId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    next();
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Matter scope guard for client tier
export const matterScopeGuard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (req.user?.tier !== 'CLIENT') {
    next();
    return;
  }

  const matterId = req.params.id || req.params.matterId;
  if (!matterId) {
    next();
    return;
  }

  try {
    const matter = await prisma.matter.findUnique({
      where: { id: matterId },
      select: { clientId: true },
    });

    if (!matter || matter.clientId !== req.user.clientId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    next();
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
};
