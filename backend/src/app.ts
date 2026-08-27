import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Route imports
import authRoutes from './routes/auth.routes';
import clientRoutes from './routes/clients.routes';
import matterRoutes from './routes/matters.routes';
import documentRoutes from './routes/documents.routes';
import calendarRoutes from './routes/calendar.routes';
import taskRoutes from './routes/tasks.routes';
import timeRoutes from './routes/time.routes';
import invoiceRoutes from './routes/invoices.routes';
import trustRoutes from './routes/trust.routes';
import expenseRoutes from './routes/expenses.routes';
import finDashboardRoutes from './routes/fin-dashboard.routes';
import staffRoutes from './routes/staff.routes';
import staffTaskRoutes from './routes/staff-tasks.routes';
import hrRoutes from './routes/hr.routes';
import portalRoutes from './routes/portal.routes';
import internalMsgRoutes from './routes/internal-messaging.routes';
import clientMsgRoutes from './routes/client-messaging.routes';
import analyticsRoutes from './routes/analytics.routes';
import conflictRoutes from './routes/conflicts.routes';
import auditRoutes from './routes/audit.routes';
import rbacRoutes from './routes/rbac.routes';
import notificationRoutes from './routes/notifications.routes';

const app = express();
app.set('trust proxy', 1);

// ─── Security Middleware ───────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // CSP handled by Nginx in production
  frameguard: { action: 'deny' },
  noSniff: true,
  hsts: { maxAge: 31536000, includeSubDomains: true },
}));

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'https://portal.aalawsng.com',
  'http://portal.aalawsng.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://145.239.78.148',
  'https://145.239.78.148',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Guarded by Bearer API authentication
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-paystack-signature'],
}));

// ─── Rate Limiting ─────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 login attempts per 15 minutes per IP
  message: { error: 'Too many authentication attempts. Please wait 15 minutes.' },
});

app.use('/api', generalLimiter);
app.use('/api/v1/auth', authLimiter);

// ─── Body Parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Logging ───────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// ─── Health Check ──────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'AALAWSNG API', timestamp: new Date().toISOString() });
});

// ─── API Routes ────────────────────────────────────────────────
const API = '/api/v1';

app.use(`${API}/auth`, authRoutes);
app.use(`${API}/clients`, clientRoutes);
app.use(`${API}/matters`, matterRoutes);
app.use(`${API}/documents`, documentRoutes);
app.use(`${API}/calendar`, calendarRoutes);
app.use(`${API}/tasks`, taskRoutes);
app.use(`${API}/time`, timeRoutes);
app.use(`${API}/invoices`, invoiceRoutes);
app.use(`${API}/trust`, trustRoutes);
app.use(`${API}/expenses`, expenseRoutes);
app.use(`${API}/fin-dashboard`, finDashboardRoutes);
app.use(`${API}/staff`, staffRoutes);
app.use(`${API}/staff-tasks`, staffTaskRoutes);
app.use(`${API}/hr`, hrRoutes);
app.use(`${API}/portal`, portalRoutes);
app.use(`${API}/internal-messages`, internalMsgRoutes);
app.use(`${API}/client-messages`, clientMsgRoutes);
app.use(`${API}/analytics`, analyticsRoutes);
app.use(`${API}/conflicts`, conflictRoutes);
app.use(`${API}/audit`, auditRoutes);
app.use(`${API}/rbac`, rbacRoutes);
app.use(`${API}/notifications`, notificationRoutes);

// ─── 404 Handler ───────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Global Error Handler ──────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ERROR]', err.stack);
  res.status(500).json({
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { detail: err.message }),
  });
});

export default app;
