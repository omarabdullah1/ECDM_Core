'use client';
import api from '@/lib/axios';
import { useAuthStore } from '@/features/auth/useAuth';
import toast from 'react-hot-toast';
import { CheckCircle2, XCircle, Printer } from 'lucide-react';
import { useState } from 'react';
import type { PurchaseOrder } from './columns';
import ApprovePurchaseOrderDialog from './ApprovePurchaseOrderDialog';

interface PurchaseOrderActionsProps {
    po: PurchaseOrder;
    onActionSuccess: () => void;
}

export default function PurchaseOrderActions({ po, onActionSuccess }: PurchaseOrderActionsProps) {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [showApproveModal, setShowApproveModal] = useState(false);

    if (!user) return null;

    const isAdmin = ['Admin', 'SuperAdmin'].includes(user.role);
    const isFinance = user.role === 'Finance';
    const isOpsOrEng = ['Operations', 'MaintenanceEngineer'].includes(user.role);

    const handlePrint = () => {
        // ... (existing handlePrint code remains unchanged) ...
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const hasFinancialAccess = ['Admin', 'SuperAdmin'].includes(user.role);

        const itemsHtml = po.items.map(item => `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.itemName || 'Item'}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
                ${hasFinancialAccess ? `
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.unitPrice.toFixed(2)}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${(item.quantity * item.unitPrice).toFixed(2)}</td>
                ` : ''}
            </tr>
        `).join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>PO ${po.poNumber}</title>
                    <style>
                        body { font-family: sans-serif; padding: 40px; color: #333; }
                        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #111; padding-bottom: 20px; margin-bottom: 30px; }
                        .info { margin-bottom: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th { background: #f9f9f9; text-align: left; padding: 8px; border-bottom: 2px solid #eee; font-size: 12px; text-transform: uppercase; }
                        .total { margin-top: 30px; text-align: right; font-size: 20px; font-weight: bold; }
                        .status { display: inline-block; padding: 4px 12px; border-radius: 99px; font-size: 12px; font-weight: bold; text-transform: uppercase; background: #eee; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div>
                            <h1 style="margin: 0; color: #000;">PURCHASE ORDER</h1>
                            <p style="color: #666; margin: 4px 0;"># ${po.poNumber}</p>
                        </div>
                        <div style="text-align: right;">
                            <h2 style="margin: 0;">ECDM Core</h2>
                            <p style="color: #666; margin: 4px 0;">Operations Department</p>
                        </div>
                    </div>
                    
                    <div class="info">
                        <div>
                            <p><strong>Supplier:</strong><br/>${hasFinancialAccess ? po.supplierName : 'Authorized Supplier'}</p>
                            <p><strong>Date:</strong><br/>${new Date(po.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div style="text-align: right;">
                            <p><strong>Status:</strong><br/><span class="status">${po.status}</span></p>
                            <p><strong>Issued By:</strong><br/>${po.createdBy.firstName} ${po.createdBy.lastName}</p>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Item Description</th>
                                <th style="text-align: center;">Qty</th>
                                ${hasFinancialAccess ? `
                                <th style="text-align: right;">Unit Price</th>
                                <th style="text-align: right;">Total</th>
                                ` : ''}
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>

                    ${hasFinancialAccess ? `
                    <div class="total">
                        <span style="font-size: 14px; color: #666; font-weight: normal; margin-right: 15px;">GRAND TOTAL:</span>
                        $${po.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    ` : ''}

                    <div style="margin-top: 100px; border-top: 1px solid #eee; padding-top: 20px; font-size: 10px; color: #aaa; text-align: center;">
                        This is a computer-generated document. Authorized approval signatures are logged in the system.
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    const handleAction = async (endpoint: string, actionName: string) => {
        setLoading(true);
        try {
            await api.patch(`/operations/purchase-orders/${po._id}/${endpoint}`);
            toast.success(`Purchase Order ${actionName} successfully!`);
            onActionSuccess();
        } catch (err: any) {
            toast.error(err.response?.data?.message || `Failed to ${actionName.toLowerCase()}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center gap-2 justify-end">
            {/* Print Action */}
            <button
                onClick={handlePrint}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                title="Print PDF"
            >
                <Printer className="w-4 h-4 text-gray-400" />
            </button>

            {/* Admin Approval Actions */}
            {po.status === 'PendingFinance' && isAdmin && (
                <>
                    <button
                        onClick={() => setShowApproveModal(true)}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-bold uppercase hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-sm"
                    >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve
                    </button>
                    <button
                        onClick={() => handleAction('reject', 'Rejected')}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-[10px] font-bold uppercase hover:bg-red-100 transition-all disabled:opacity-50 border border-red-200"
                    >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                    </button>
                </>
            )}

            {/* Operations Receipt Action */}
            {po.status === 'ApprovedFinance' && (isOpsOrEng || isAdmin) && (
                <button
                    onClick={() => handleAction('confirm-receipt', 'Received')}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[hsl(var(--primary))] text-white text-[10px] font-bold uppercase hover:opacity-90 transition-all disabled:opacity-50 shadow-sm"
                >
                    <PackageCircle className="w-3.5 h-3.5" />
                    Confirm Receipt (Stock In)
                </button>
            )}

            {/* Completed / Rejected state */}
            {(po.status === 'Received' || po.status === 'Rejected') && (
                <span className="text-[10px] uppercase font-bold text-gray-400 italic">
                    Action Completed
                </span>
            )}

            {showApproveModal && (
                <ApprovePurchaseOrderDialog 
                    po={po} 
                    onClose={() => setShowApproveModal(false)} 
                    onSuccess={onActionSuccess} 
                />
            )}
        </div>
    );
}

const PackageCircle = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L12 7" /><path d="M12 22L12 17" /><path d="M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0 -10 0" /><path d="M17 12L22 12" /><path d="M7 12L2 12" />
    </svg>
);

