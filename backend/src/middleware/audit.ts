import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
export type AuditAction = string;

// Append-only audit log — never update or delete
export const createAuditLog = async (params: {
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  module: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        module: params.module,
        oldValue: params.oldValue ?? undefined,
        newValue: params.newValue ?? undefined,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  } catch (err) {
    // Log failures are critical — log to stderr but never crash the main flow
    console.error('[AUDIT_LOG_FAILURE]', err);
  }
};

// Middleware factory: auto-log any route action
export const auditMiddleware = (action: AuditAction, entityType: string, module: string) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (req.user) {
      await createAuditLog({
        userId: req.user.userId,
        action,
        entityType,
        entityId: req.params.id || 'unknown',
        module,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    }
    next();
  };
};
