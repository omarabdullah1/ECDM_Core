import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middlewares/errorHandler.middleware';

// ── Feature routes ──────────────────────────────────────────────────
import authRoutes from './features/auth/auth.routes';
import clientRoutes from './features/crm/client/client.routes';
import leadRoutes from './features/crm/lead/lead.routes';
import activityRoutes from './features/crm/activity/activity.routes';
import taskRoutes from './features/erp/task/task.routes';
import employeeRoutes from './features/erp/employee/employee.routes';
import invoiceRoutes from './features/erp/invoice/invoice.routes';
import categoryRoutes from './features/inventory/category/category.routes';
import productRoutes from './features/inventory/product/product.routes';
import stockMovementRoutes from './features/inventory/stock-movement/stock-movement.routes';
// ── New feature routes ───────────────────────────────────────────────
import customerRoutes from './features/crm/customer/customer.routes';
import salesLeadRoutes from './features/crm/sales-lead/sales-lead.routes';
import salesOrderRoutes from './features/crm/sales-order/sales-order.routes';
import workOrderRoutes from './features/erp/work-order/work-order.routes';
import campaignRoutes from './features/erp/campaign/campaign.routes';
import contentTrackerRoutes from './features/erp/content-tracker/content-tracker.routes';
import followUpRoutes from './features/erp/follow-up/follow-up.routes';
import feedbackRoutes from './features/erp/feedback/feedback.routes';
import employeeEvaluationRoutes from './features/erp/employee-evaluation/employee-evaluation.routes';
import inventoryItemRoutes from './features/inventory/inventory-item/inventory-item.routes';

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
app.use('/api/crm/clients', clientRoutes);
app.use('/api/crm/leads', leadRoutes);
app.use('/api/crm/activities', activityRoutes);
app.use('/api/erp/tasks', taskRoutes);
app.use('/api/erp/employees', employeeRoutes);
app.use('/api/erp/invoices', invoiceRoutes);
app.use('/api/inventory/categories', categoryRoutes);
app.use('/api/inventory/products', productRoutes);
app.use('/api/inventory/stock-movements', stockMovementRoutes);
// ── New feature routes ───────────────────────────────────────────────
app.use('/api/crm/customers', customerRoutes);
app.use('/api/crm/sales-leads', salesLeadRoutes);
app.use('/api/crm/sales-orders', salesOrderRoutes);
app.use('/api/erp/work-orders', workOrderRoutes);
app.use('/api/erp/campaigns', campaignRoutes);
app.use('/api/erp/content-tracker', contentTrackerRoutes);
app.use('/api/erp/follow-ups', followUpRoutes);
app.use('/api/erp/feedback', feedbackRoutes);
app.use('/api/erp/employee-evaluations', employeeEvaluationRoutes);
app.use('/api/inventory/inventory-items', inventoryItemRoutes);

// ── Global error handler (must be last) ─────────────────────────────
app.use(errorHandler);

export default app;
