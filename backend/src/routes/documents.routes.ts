import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma';
import { authenticate, requireStaffOrAdmin, enforceClientScope } from '../middleware/auth';
import { documentVisibilityGuard } from '../middleware/document-guard';
import { createAuditLog } from '../middleware/audit';

const router = Router();
router.use(authenticate);

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB || '50')) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.xlsx', '.xls', '.txt', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('File type not allowed'));
  },
});

// GET /api/v1/documents?matterId=...
// CLIENT TIER: only CLIENT_VISIBLE docs for their matters (enforced server-side)
router.get('/', enforceClientScope, async (req: Request, res: Response): Promise<void> => {
  try {
    const matterId = req.query.matterId as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      ...(matterId && { matterId }),
      // CRITICAL: client users only see CLIENT_VISIBLE documents
      ...(req.user?.tier === 'CLIENT' && {
        visibility: 'CLIENT_VISIBLE',
        matter: { clientId: req.user.clientId! },
      }),
    };

    const [docs, total] = await Promise.all([
      prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          uploadedBy: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.document.count({ where }),
    ]);

    res.json({ documents: docs, total, page, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// GET /api/v1/documents/:id — with visibility guard
router.get('/:id', enforceClientScope, documentVisibilityGuard, async (req: Request, res: Response): Promise<void> => {
  try {
    const doc = await prisma.document.findUnique({
      where: { id: req.params.id },
      include: {
        uploadedBy: { select: { firstName: true, lastName: true } },
        matter: { select: { id: true, title: true, referenceNumber: true } },
      },
    });
    if (!doc) { res.status(404).json({ error: 'Document not found' }); return; }

    await createAuditLog({
      userId: req.user!.userId, action: 'DOCUMENT_VIEWED', entityType: 'Document',
      entityId: doc.id, module: 'M04', ipAddress: req.ip,
    });

    res.json(doc);
  } catch {
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// GET /api/v1/documents/:id/download — Secure Authenticated File Stream (Download & Inline View)
router.get('/:id/download', enforceClientScope, documentVisibilityGuard, async (req: Request, res: Response): Promise<void> => {
  try {
    const doc = await prisma.document.findUnique({
      where: { id: req.params.id },
    });
    if (!doc) {
      res.status(404).json({ error: 'Document record not found' });
      return;
    }

    const resolvedPath = path.resolve(doc.filePath);
    const fallbackPath = path.resolve(UPLOAD_DIR, path.basename(doc.filePath));
    const targetPath = fs.existsSync(doc.filePath)
      ? doc.filePath
      : fs.existsSync(resolvedPath)
        ? resolvedPath
        : fs.existsSync(fallbackPath)
          ? fallbackPath
          : null;

    if (!targetPath) {
      res.status(404).json({ error: 'Document file not found on disk' });
      return;
    }

    try {
      await createAuditLog({
        userId: req.user!.userId, action: 'DOCUMENT_DOWNLOADED', entityType: 'Document',
        entityId: doc.id, module: 'M04', ipAddress: req.ip,
      });
    } catch {}

    // Support inline preview in browser tabs (for PDFs, images, text)
    if (req.query.inline === 'true' || req.query.view === '1') {
      res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.fileName || doc.title)}"`);
      fs.createReadStream(targetPath).pipe(res);
      return;
    }

    res.download(targetPath, doc.fileName || doc.title);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to stream document' });
  }
});

// POST /api/v1/documents — Upload with visibility flag
router.post('/', requireStaffOrAdmin, upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) { res.status(400).json({ error: 'File is required' }); return; }

    const visibility = req.body.visibility || 'INTERNAL';
    if (!['INTERNAL', 'CLIENT_VISIBLE'].includes(visibility)) {
      res.status(400).json({ error: 'Invalid visibility value' });
      return;
    }

    const staff = await prisma.staffProfile.findFirst({ where: { userId: req.user!.userId } });
    if (!staff) {
      res.status(400).json({ error: 'Only staff can upload documents' });
      return;
    }

    if (!req.body.matterId || req.body.matterId.trim() === '') {
      res.status(400).json({ error: 'A matter must be selected for this document. Please select a matter.' });
      return;
    }

    // Look up matter by ID, referenceNumber, or title
    let matter = await prisma.matter.findFirst({
      where: {
        OR: [
          { id: req.body.matterId },
          { referenceNumber: req.body.matterId },
          { title: { contains: req.body.matterId } },
        ],
      },
    });

    if (!matter) {
      res.status(400).json({ error: 'Selected matter not found. Please choose an existing matter from the list.' });
      return;
    }

    const doc = await prisma.document.create({
      data: {
        matterId: matter.id,
        title: req.body.title || req.body.name || req.file.originalname,
        fileName: req.file.originalname,
        description: req.body.description,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        visibility,
        tags: req.body.tags ? JSON.stringify(req.body.tags) : undefined,
        uploadedById: staff.id,
      },
    });

    await createAuditLog({
      userId: req.user!.userId, action: 'CREATE', entityType: 'Document',
      entityId: doc.id, module: 'M04',
      newValue: { title: doc.title, visibility: doc.visibility, matterId: doc.matterId },
      ipAddress: req.ip,
    });

    res.status(201).json(doc);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to upload document' });
  }
});

// PATCH /api/v1/documents/:id — Update visibility or metadata
router.patch('/:id', requireStaffOrAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const old = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!old) { res.status(404).json({ error: 'Document not found' }); return; }

    const updated = await prisma.document.update({
      where: { id: req.params.id },
      data: {
        title: req.body.title || req.body.name,
        description: req.body.description,
        visibility: req.body.visibility,
        tags: typeof req.body.tags === 'object' ? JSON.stringify(req.body.tags) : req.body.tags,
      },
    });

    await createAuditLog({
      userId: req.user!.userId, action: 'UPDATE', entityType: 'Document',
      entityId: updated.id, module: 'M04', oldValue: old, newValue: updated, ipAddress: req.ip,
    });

    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// DELETE /api/v1/documents/:id
router.delete('/:id', requireStaffOrAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) { res.status(404).json({ error: 'Document not found' }); return; }
    await prisma.document.delete({ where: { id: req.params.id } });
    if (fs.existsSync(doc.filePath)) fs.unlinkSync(doc.filePath);
    await createAuditLog({
      userId: req.user!.userId, action: 'DELETE', entityType: 'Document',
      entityId: req.params.id, module: 'M04', oldValue: { title: doc.title }, ipAddress: req.ip,
    });
    res.json({ message: 'Document deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;
