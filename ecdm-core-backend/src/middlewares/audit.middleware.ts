import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import AuditLog from '../features/shared/models/audit-log.model';
import { AuditAction } from '../features/shared/types/audit-log.types';

const SENSITIVE_ROUTES = [
    '/auth/users',
    '/shared/customers',
    '/finance',
    '/operations/inventory-plus',
    '/erp/invoices',
];

const SENSITIVE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

const isSensitiveMethod = (method: string): boolean => {
    return SENSITIVE_METHODS.includes(method.toUpperCase());
};

const getActionFromMethod = (method: string): AuditAction | null => {
    switch (method.toUpperCase()) {
        case 'POST': return AuditAction.CREATE;
        case 'PUT':
        case 'PATCH': return AuditAction.UPDATE;
        case 'DELETE': return AuditAction.DELETE;
        default: return null;
    }
};

const extractModuleName = (path: string): string | null => {
    const parts = path.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    
    const moduleMap: Record<string, string> = {
        'auth': 'User',
        'shared-customers': 'Customer',
        'finance-inventory': 'InventoryFinance',
        'finance-expenses': 'Expense',
        'finance-salaries': 'Salary',
        'operations-work-orders': 'WorkOrder',
        'operations-inventory-plus': 'Inventory',
        'operations-price-list': 'PriceList',
        'erp-invoices': 'Invoice',
        'erp-tasks': 'Task',
        'marketing-leads': 'MarketingLead',
        'marketing-campaigns': 'Campaign',
        'sales-leads': 'SalesLead',
        'sales-orders': 'SalesOrder',
        'customer-orders': 'CustomerOrder',
        'customer-follow-up': 'FollowUp',
        'customer-feedback': 'Feedback',
        'hr-attendance': 'Attendance',
        'hr-users': 'Employee',
    };

    const key = parts.slice(0, 2).join('-');
    return moduleMap[key] || null;
};

export const auditMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    const startTime = Date.now();
    const originalSend = res.send;

    res.send = function (body: any): Response {
        const action = getActionFromMethod(req.method);
        const isSensitiveRoute = SENSITIVE_ROUTES.some(route => req.path.startsWith(route));
        const isSensitiveMethodFlag = isSensitiveMethod(req.method);
        
        if (action && isSensitiveRoute && isSensitiveMethodFlag && req.user) {
            const moduleName = extractModuleName(req.path);
            
            if (moduleName && (res.statusCode >= 200 && res.statusCode < 300)) {
                const recordId = req.params.id || body?.data?._id;
                
                setImmediate(async () => {
                    try {
                        await AuditLog.create({
                            userId: new Types.ObjectId(req.user!.userId),
                            action,
                            moduleName,
                            recordId: recordId ? new Types.ObjectId(recordId) : undefined,
                            details: {
                                method: req.method,
                                path: req.path,
                                query: req.query,
                                duration: Date.now() - startTime,
                            },
                            ipAddress: req.headers['x-forwarded-for'] as string || 
                                       req.socket.remoteAddress || 
                                       req.ip || '',
                        });
                    } catch (error) {
                        console.error('Audit middleware error:', error);
                    }
                });
            }
        }
        
        return originalSend.call(this, body);
    };
    
    next();
};

export default auditMiddleware;
