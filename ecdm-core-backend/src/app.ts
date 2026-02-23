import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middlewares/errorHandler.middleware';

// ── Auth ────────────────────────────────────────────────────────────
import authRoutes from './features/auth/auth.routes';

// ── Shared domain ───────────────────────────────────────────────────
import sharedCustomerRoutes  from './features/shared/routes/customer.routes';
import sharedEmployeeRoutes  from './features/shared/routes/employee.routes';

// ── Marketing domain ────────────────────────────────────────────────
import marketingLeadsRoutes  from './features/marketing/routes/marketing-leads.routes';
import marketingDataRoutes   from './features/marketing/routes/marketing-data.routes';

// ── Sales domain ────────────────────────────────────────────────────
import salesLeadsRoutes      from './features/sales/routes/sales-leads.routes';
import salesDataRoutes       from './features/sales/routes/sales-data.routes';
import salesOrderRoutes      from './features/sales/routes/sales-order.routes';

// ── Customer domain ─────────────────────────────────────────────────
import customerOrderRoutes   from './features/customer/routes/customer-order.routes';
import followUpRoutes        from './features/customer/routes/follow-up.routes';
import feedbackRoutes        from './features/customer/routes/feedback.routes';

// ── Operations domain ───────────────────────────────────────────────
import workOrderRoutes       from './features/operations/routes/work-order.routes';
import inventoryPlusRoutes   from './features/operations/routes/inventory-plus.routes';
import reportRoutes          from './features/operations/routes/report.routes';

// ── Dashboard ───────────────────────────────────────────────────────
import dashboardRoutes       from './features/dashboard/dashboard.routes';

const app: Application = express();

// ── Trust proxy (required for rate limiting behind reverse proxy) ────
app.set('trust proxy', 1);

// ── Security ────────────────────────────────────────────────────────
app.use(helmet());
const allowedOrigins = [
    'https://ecdmfront-g54vn7na.b4a.run',
    'https://ecdmfront-x0httuwt.b4a.run',
    'http://localhost:3000',
    // add any other known frontend hosts here
];

app.use(
    cors({
        origin: (origin, callback) => {
            // allow server-to-server or tools without origin
            if (!origin) return callback(null, true);

            // allow exact matches
            if (allowedOrigins.includes(origin)) return callback(null, true);

            // allow any back4app frontend subdomain (quick, safe for this deployment)
            try {
                const url = new URL(origin);
                if (url.hostname.endsWith('.b4a.run')) return callback(null, true);
            } catch (e) {
                // fallthrough to block
            }

            callback(new Error(`CORS blocked: ${origin}`));
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        credentials: true,
    }),
);

// ── Rate limiting ───────────────────────────────────────────────────
app.use(
    rateLimit({
        windowMs: 15 * 60 * 1000,          // 15-minute window
        max: 1000,                          // production: 1 000 req / window / IP
        skip: () => process.env.NODE_ENV === 'development', // no limit in dev
        standardHeaders: true,
        legacyHeaders: false,
        message: { success: false, data: null, message: 'Too many requests, please try again later.' },
    }),
);

// ── Body parsing ────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health check ────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok' }, message: 'ECDM Core is running 🚀' });
});

// ── API routes ──────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// Shared
app.use('/api/shared/customers',  sharedCustomerRoutes);
app.use('/api/shared/employees',  sharedEmployeeRoutes);

// Marketing
app.use('/api/marketing/leads',   marketingLeadsRoutes);
app.use('/api/marketing/data',    marketingDataRoutes);

// Sales
app.use('/api/sales/leads',       salesLeadsRoutes);
app.use('/api/sales/data',        salesDataRoutes);
app.use('/api/sales/orders',      salesOrderRoutes);

// Customer
app.use('/api/customer/orders',     customerOrderRoutes);
app.use('/api/customer/follow-up',  followUpRoutes);
app.use('/api/customer/feedback',   feedbackRoutes);

// Operations
app.use('/api/operations/work-order',      workOrderRoutes);
app.use('/api/operations/inventory-plus',  inventoryPlusRoutes);
app.use('/api/operations/report',          reportRoutes);

// Dashboard
app.use('/api/dashboard', dashboardRoutes);

// ── Global error handler (must be last) ─────────────────────────────
app.use(errorHandler);

export default app;
