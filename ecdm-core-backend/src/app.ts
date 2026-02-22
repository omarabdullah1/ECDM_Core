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

const app: Application = express();

// ── Security ────────────────────────────────────────────────────────
app.use(helmet());
const allowedOrigins = [
    'https://ecdmfront-g54vn7na.b4a.run',
    'https://ecdmfront-x0httuwt.b4a.run',
    'http://localhost:3000',
];
app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error(`CORS blocked: ${origin}`));
            }
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        credentials: true,
    }),
);

// ── Rate limiting ───────────────────────────────────────────────────
app.use(
    rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100,
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

// ── Global error handler (must be last) ─────────────────────────────
app.use(errorHandler);

export default app;
