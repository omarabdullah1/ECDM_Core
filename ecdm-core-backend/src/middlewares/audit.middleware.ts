import { Request, Response, NextFunction } from 'express';
import mongoose, { Types } from 'mongoose';
import AuditLog from '../features/shared/models/audit-log.model';
import { AuditAction } from '../features/shared/types/audit-log.types';
import { createUpdateDetails } from '../utils/auditLogger';

const AUDITED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

const getActionFromMethod = (method: string): AuditAction | null => {
    switch (method.toUpperCase()) {
        case 'POST': return AuditAction.CREATE;
        case 'PUT':
        case 'PATCH': return AuditAction.UPDATE;
        case 'DELETE': return AuditAction.DELETE;
        default: return null;
    }
};

/**
 * Maps URL segments to Internal Module Names used in logging
 */
const extractModuleName = (path: string): string => {
    const parts = path.split('/').filter(Boolean);
    if (parts[0] === 'api') parts.shift();
    if (parts.length === 0) return 'System';
    
    const moduleMap: Record<string, string> = {
        'auth': 'User',
        'auth-users': 'User',
        'shared-customers': 'Customer',
        'shared-employees': 'Employee',
        'marketing-leads': 'MarketingLead',
        'marketing-sync': 'MarketingSync',
        'marketing-saved-sheets': 'MarketingSheet',
        'marketing-content': 'ContentTracker',
        'marketing-campaigns': 'Campaign',
        'sales-leads': 'SalesLead',
        'sales-data': 'SalesData',
        'sales-orders': 'SalesOrder',
        'sales-follow-ups': 'SalesFollowUp',
        'sales-targets': 'SalesTarget',
        'customer-orders': 'CustomerOrder',
        'customer-follow-up': 'FollowUp',
        'customer-feedback': 'Feedback',
        'operations-work-orders': 'WorkOrder',
        'operations-inventory-plus': 'Inventory',
        'operations-inventory': 'Inventory',
        'operations-report': 'OperationReport',
        'operations-purchase-orders': 'PurchaseOrder',
        'hr-attendance': 'Attendance',
        'hr-users': 'Employee',
        'finance-inventory': 'InventoryFinance',
        'finance-expenses': 'Expense',
        'finance-salaries': 'Salary',
        'finance-invoices': 'FinanceInvoice',
        'admin-modification-requests': 'ModificationRequest',
        'admin-audit-logs': 'AuditLog',
        'erp-invoices': 'Invoice',
        'erp-tasks': 'Task',
    };

    const key2 = parts.slice(0, 2).join('-');
    if (moduleMap[key2]) return moduleMap[key2];
    
    const key1 = parts[0];
    if (moduleMap[key1]) return moduleMap[key1];

    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
};

/**
 * Extracts a human-readable identity string from a document based on its type
 */
const extractResourceIdentity = (doc: any, moduleName: string): string => {
    if (!doc) return '';

    try {
        switch (moduleName) {
            case 'SalesOrder':
                return `Order #${doc.salesOrderId || doc._id} ${doc.issueDescription ? `(${doc.issueDescription.substring(0, 20)}...)` : ''}`;
            case 'Customer':
                return `Customer: ${doc.name || doc.clientName || doc.contactName || doc._id}`;
            case 'User':
            case 'Employee':
                return `User: ${doc.firstName ? `${doc.firstName} ${doc.lastName || ''}` : doc.email || doc.username || doc.employeeId || doc._id}`;
            case 'WorkOrder':
                return `Work Order #${doc.workOrderId || doc._id}`;
            case 'PurchaseOrder':
                return `Purchase Order #${doc.purchaseOrderId || doc._id}`;
            case 'Invoice':
            case 'FinanceInvoice':
                return `Invoice #${doc.invoiceId || doc._id}`;
            case 'Campaign':
                return `Campaign: ${doc.name || doc.title || doc._id}`;
            case 'Task':
                return `Task: ${doc.title || doc.description || doc._id}`;
            case 'SalesLead':
            case 'MarketingLead':
                return `${moduleName}: ${doc.clientName || doc.name || doc.contactName || doc._id}`;
            default:
                return doc.name || doc.title || doc.label || doc.identifier || doc.orderId || doc.id || String(doc._id);
        }
    } catch (e) {
        return String(doc._id);
    }
};

/**
 * Global Audit Middleware
 * Intercepts mutations to provide high-fidelity logging with identity extraction and auto-diffing
 */
export const auditMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    // Only audit specific API methods
    const action = getActionFromMethod(req.method);
    const isAuditedPath = req.path.startsWith('/api') && !req.path.includes('/health') && !req.path.includes('/admin/audit-logs');

    if (!action || !isAuditedPath) {
        return next();
    }

    const startTime = Date.now();
    const moduleName = extractModuleName(req.path);
    
    // Robust Record ID Extraction: Look for anything that looks like a MongoDB ObjectId in the URL path segments
    const pathParts = req.path.split('/').filter(p => p && p !== 'api');
    let recordId = pathParts.find(p => Types.ObjectId.isValid(p));
    if (!recordId) recordId = req.params.id; // Fallback to params
    
    let oldDoc: any = null;
    let resourceIdentity = '';

    // Step 1: PRE-FETCH logic (for UPDATE and DELETE operations)
    if ((action === AuditAction.UPDATE || action === AuditAction.DELETE) && recordId && Types.ObjectId.isValid(recordId)) {
        try {
            const Model = mongoose.models[moduleName];
            if (Model) {
                oldDoc = await Model.findById(recordId).lean();
                if (oldDoc) {
                    resourceIdentity = extractResourceIdentity(oldDoc, moduleName);
                }
            }
        } catch (error) {
            console.error(`Audit Pre-fetch error [${moduleName}]:`, error);
        }
    }

    // Intercept res.send to log the action after it succeeds
    const originalSend = res.send;
    res.send = function (responseBody: any): Response {
        // Only log successful operations (2xx)
        if (res.statusCode >= 200 && res.statusCode < 300) {
            const user = (req as any).user;
            
            if (user) {
                // Determine target record ID for CREATE actions or fallbacks
                let targetId = recordId;
                let parsedBody = responseBody;
                try {
                  if (typeof responseBody === 'string') parsedBody = JSON.parse(responseBody);
                } catch (e) { /* skip */ }
                
                if (!targetId && parsedBody?.data?._id) targetId = parsedBody.data._id;
                else if (!targetId && parsedBody?._id) targetId = parsedBody._id;

                // Extraction for CREATE actions
                if (action === AuditAction.CREATE && !resourceIdentity) {
                    resourceIdentity = extractResourceIdentity(parsedBody?.data || parsedBody || req.body, moduleName);
                }

                // Prepare audit details
                const details: Record<string, any> = {
                    method: req.method,
                    path: req.path,
                    query: req.query,
                    duration: Date.now() - startTime,
                    body: req.body ? { ...req.body, password: undefined, token: undefined, secret: undefined } : undefined,
                };

                // AUTO-DIFFING for updates
                if (action === AuditAction.UPDATE && oldDoc && req.body) {
                    const diff = createUpdateDetails(oldDoc, req.body);
                    if (diff.changes && Object.keys(diff.changes).length > 0) {
                        details.changes = diff.changes;
                    }
                }
                
                // DATA PRESERVATION for deletions
                if (action === AuditAction.DELETE && oldDoc) {
                    details.deletedRecord = oldDoc;
                }

                // Clean up IP Address (::1 -> 127.0.0.1)
                let ipAddress = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || req.ip || '';
                if (ipAddress === '::1') ipAddress = '127.0.0.1';

                // Log the action asynchronously
                setImmediate(async () => {
                    try {
                        await AuditLog.create({
                            userId: new Types.ObjectId(user.userId),
                            action,
                            moduleName,
                            recordId: targetId && Types.ObjectId.isValid(targetId) ? new Types.ObjectId(targetId) : undefined,
                            resourceIdentity: resourceIdentity || undefined,
                            details,
                            ipAddress,
                        });
                    } catch (error) {
                        console.error('Audit middleware creation error:', error);
                    }
                });
            }
        }
        
        return originalSend.call(this, responseBody);
    };
    
    next();
};

export default auditMiddleware;

