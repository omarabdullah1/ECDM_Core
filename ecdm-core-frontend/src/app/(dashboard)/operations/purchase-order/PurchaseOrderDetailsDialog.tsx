'use client';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/dialog';
import { ShoppingCart, Calendar, User, Tag, AlertCircle, Trash2, Plus, Search, MapPin, Printer } from 'lucide-react';
import { Input } from '@/components/ui/input';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import type { PurchaseOrder } from './columns';
import { useAuthStore } from '@/features/auth/useAuth';

interface PurchaseOrderDetailsDialogProps {
    po: PurchaseOrder;
    onClose: () => void;
    onSuccess: () => void;
}

interface InventoryOption {
    _id: string;
    itemName: string;
    unitPrice: number;
    availableQuantity: number;
    minStockLevel: number;
}

export default function PurchaseOrderDetailsDialog({ po, onClose, onSuccess }: PurchaseOrderDetailsDialogProps) {
    const { user } = useAuthStore();
    const [isEditing, setIsEditing] = useState(false);
    const [supplierName, setSupplierName] = useState(po.supplierName);
    const [selectedItems, setSelectedItems] = useState(po.items.map(item => ({
        ...item,
        inventoryId: typeof item.inventoryId === 'object' && item.inventoryId !== null ? (item.inventoryId as any)._id : item.inventoryId
    })));
    const [saving, setSaving] = useState(false);
    
    // For adding new items during edit
    const [Inventory, setInventory] = useState<InventoryOption[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingCatalog, setLoadingCatalog] = useState(false);

    const isAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin';
    const canEdit = isAdmin || (po.status === 'PendingFinance' && user?._id === po.createdBy._id);
    const hasFinancialAccess = isAdmin;

    useEffect(() => {
        if (isEditing) {
            fetchCatalog();
        }
    }, [isEditing]);

    const fetchCatalog = async () => {
        setLoadingCatalog(true);
        try {
            const { data } = await api.get('/operations/inventory?limit=100');
            setInventory(data.data.data || []);
        } catch (err) {
            toast.error('Failed to load item catalog');
        } finally {
            setLoadingCatalog(false);
        }
    };

    const addItem = (item: InventoryOption) => {
        if (selectedItems.find(si => si.inventoryId === item._id)) {
            return toast.error('Item already in list');
        }
        setSelectedItems([...selectedItems, {
            inventoryId: item._id,
            itemName: item.itemName,
            quantity: 1,
            unitPrice: item.unitPrice || 0,
            total: item.unitPrice || 0
        }]);
    };

    const updateItem = (id: string, field: 'quantity' | 'unitPrice', value: number) => {
        setSelectedItems(selectedItems.map(si => {
            if (si.inventoryId === id) {
                const updated = { ...si, [field]: value };
                updated.total = updated.quantity * updated.unitPrice;
                return updated;
            }
            return si;
        }));
    };

    const removeItem = (id: string) => {
        setSelectedItems(selectedItems.filter(si => si.inventoryId !== id));
    };

    const handleSave = async () => {
        if (hasFinancialAccess && !supplierName) return toast.error('Supplier name is required');
        if (selectedItems.length === 0) return toast.error('At least one item required');

        setSaving(true);
        try {
            await api.patch(`/operations/purchase-orders/${po._id}`, {
                supplierName,
                items: selectedItems
            });
            toast.success('Purchase Order updated successfully');
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to update PO');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this Purchase Order? This action cannot be undone.')) return;
        
        setSaving(true);
        try {
            await api.delete(`/operations/purchase-orders/${po._id}`);
            toast.success('Purchase Order deleted');
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to delete PO');
        } finally {
            setSaving(false);
        }
    };

    const totalAmount = selectedItems.reduce((acc, curr) => acc + curr.total, 0);

    const filteredCatalog = Inventory.filter(item => 
        item.itemName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
                <DialogHeader className="p-8 pb-0 flex-none relative overflow-hidden">
                    {/* Visual Decor */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[hsl(var(--primary))]/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
                    
                    <div className="flex justify-between items-start relative z-10">
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] shadow-sm">
                                    <ShoppingCart className="w-5 h-5" />
                                </div>
                                <div>
                                    <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                                        Purchase Order {po.poNumber} { !isEditing && <span className="text-amber-600 ml-1 text-sm font-bold tracking-normal italic">• Preview Mode</span> }
                                        <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-bold border ${
                                            po.status === 'PendingFinance' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                            po.status === 'ApprovedFinance' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                            po.status === 'Received' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                            'bg-red-50 text-red-600 border-red-200'
                                        }`}>
                                            {po.status}
                                        </span>
                                    </DialogTitle>
                                    <p className="text-xs font-medium text-gray-400 mt-1 uppercase tracking-widest flex items-center gap-2">
                                        <Calendar className="w-3.5 h-3.5" /> Issued on {new Date(po.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </DialogHeader>

                <DialogBody className="p-8 pt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left: Items list (Primary) */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 px-1">
                                    <Tag className="w-3.5 h-3.5" /> Order Items
                                </label>
                                
                                <div className="space-y-3">
                                    {selectedItems.map((item, idx) => (
                                        <div key={item.inventoryId ? `${item.inventoryId}-${idx}` : `item-${idx}`} className={`flex gap-4 items-end p-4 rounded-2xl border transition-all ${
                                            isEditing ? 'bg-white border-[hsl(var(--primary))]/20 shadow-sm' : 'bg-gray-50/50 border-gray-100'
                                        }`}>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-black uppercase text-gray-400 mb-2 truncate">{item.itemName}</p>
                                                <div className="flex gap-4">
                                                    <div className="space-y-1 w-24">
                                                        <label className="text-[9px] font-bold text-gray-400 uppercase">Qty</label>
                                                        {isEditing ? (
                                                            <Input 
                                                                type="number" min="1" 
                                                                value={item.quantity ?? ''} 
                                                                onChange={(e) => updateItem(item.inventoryId, 'quantity', Number(e.target.value))}
                                                                className="h-9 px-3 text-sm font-bold bg-white"
                                                            />
                                                        ) : (
                                                            <div className="h-9 flex items-center px-1 text-sm font-black">{item.quantity} units</div>
                                                        )}
                                                    </div>
                                                    {hasFinancialAccess && (
                                                        <>
                                                            <div className="space-y-1 flex-1">
                                                                <label className="text-[9px] font-bold text-gray-400 uppercase">Unit Price ($)</label>
                                                                {isEditing ? (
                                                                    <Input 
                                                                        type="number" step="0.01" 
                                                                        value={item.unitPrice ?? ''} 
                                                                        onChange={(e) => updateItem(item.inventoryId, 'unitPrice', Number(e.target.value))}
                                                                        className="h-9 px-3 text-sm font-bold bg-white"
                                                                    />
                                                                ) : (
                                                                    <div className="h-9 flex items-center px-1 text-sm font-black">${item.unitPrice?.toLocaleString()}</div>
                                                                )}
                                                            </div>
                                                            <div className="space-y-1 w-28 text-right pr-2">
                                                                <label className="text-[9px] font-bold text-gray-400 uppercase">Subtotal</label>
                                                                <div className="h-9 flex items-center justify-end text-sm font-black text-[hsl(var(--primary))]">
                                                                    ${(item.quantity * item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            {isEditing && (
                                                <button onClick={() => removeItem(item.inventoryId)} className="p-2.5 rounded-xl hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Catalog selection (Only when editing) */}
                            {isEditing && (
                                <div className="pt-6 border-t border-gray-100 flex flex-col min-h-[300px]">
                                    <div className="flex items-center justify-between mb-4">
                                        <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Add more items</label>
                                        <div className="relative w-48">
                                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                                            <input 
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                placeholder="Quick search catalog..." 
                                                className="w-full pl-8 pr-3 py-1.5 text-[10px] rounded-full border border-gray-100 focus:outline-none focus:border-emerald-500 transition-colors"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                                        {filteredCatalog.map(catalogItem => (
                                            <button 
                                                key={catalogItem._id}
                                                onClick={() => addItem(catalogItem)}
                                                className="p-3 text-left border border-gray-50 rounded-xl hover:border-emerald-200 hover:bg-emerald-50/30 transition-all flex justify-between items-center group"
                                            >
                                                <div className="min-w-0">
                                                    <p className="text-[11px] font-bold truncate pr-2" title={catalogItem.itemName}>{catalogItem.itemName}</p>
                                                    {hasFinancialAccess && <p className="text-[9px] text-gray-400 font-bold">${catalogItem.unitPrice}</p>}
                                                </div>
                                                <Plus className="w-3.5 h-3.5 text-gray-300 group-hover:text-emerald-500 group-hover:scale-125 transition-transform flex-shrink-0" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right: Meta details */}
                        <div className="space-y-6">
                            <div className="p-6 rounded-3xl bg-[hsl(var(--primary))]/5 border border-[hsl(var(--primary))]/10 space-y-5">
                                {hasFinancialAccess && (
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-[hsl(var(--primary))] uppercase tracking-widest flex items-center gap-2 px-1">
                                            <MapPin className="w-3.5 h-3.5" /> Supplier Information
                                        </label>
                                        {isEditing ? (
                                            <Input 
                                                value={supplierName}
                                                onChange={(e) => setSupplierName(e.target.value)}
                                                className="font-bold bg-white"
                                            />
                                        ) : (
                                            <div className="px-1 text-sm font-black">{po.supplierName || 'Not specified'}</div>
                                        )}
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-[hsl(var(--primary))] uppercase tracking-widest flex items-center gap-2 px-1">
                                        <User className="w-3.5 h-3.5" /> Created By
                                    </label>
                                    <div className="px-1 text-sm font-black capitalize">{po.createdBy.firstName} {po.createdBy.lastName}</div>
                                </div>

                                {hasFinancialAccess && (
                                    <div className="pt-4 border-t border-[hsl(var(--primary))]/10">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Grand Total</label>
                                        <div className="text-4xl font-black text-[hsl(var(--primary))] mt-2 tabular-nums">
                                            ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Status Timeline / History teaser */}
                            <div className="p-6 space-y-4">
                                <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Processing Log</h4>
                                <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-gray-100">
                                    <div className="flex gap-4 relative">
                                        <div className="w-4 h-4 rounded-full bg-emerald-500 border-4 border-white shadow-sm" />
                                        <div className="flex-1 -mt-0.5">
                                            <p className="text-[11px] font-black">Purchase Order Created</p>
                                            <p className="text-[9px] text-gray-400 font-bold">{new Date(po.createdAt).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    {po.financeApprovedAt && (
                                        <div className="flex gap-4 relative">
                                            <div className="w-4 h-4 rounded-full bg-blue-500 border-4 border-white shadow-sm" />
                                            <div className="flex-1 -mt-0.5">
                                                <p className="text-[11px] font-black">Finance Approved</p>
                                                <p className="text-[9px] text-gray-400 font-bold">{new Date(po.financeApprovedAt).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    )}
                                    {po.receivedAt && (
                                        <div className="flex gap-4 relative">
                                            <div className="w-4 h-4 rounded-full bg-purple-500 border-4 border-white shadow-sm" />
                                            <div className="flex-1 -mt-0.5">
                                                <p className="text-[11px] font-black">Stock Received</p>
                                                <p className="text-[9px] text-gray-400 font-bold">{new Date(po.receivedAt).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogBody>

                {/* Footer Actions */}
                <div className="p-8 border-t border-gray-100 bg-gray-50 flex items-center justify-between flex-none">
                    <div className="flex items-center gap-3">
                        {canEdit && !isEditing && (
                           <button 
                                onClick={handleDelete}
                                className="px-4 py-2 text-sm font-black text-red-500 hover:bg-red-50 rounded-xl transition-all"
                           >
                               Delete Order
                           </button>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                        {isEditing ? (
                            <>
                                <button 
                                    onClick={() => setIsEditing(false)}
                                    className="px-6 py-2.5 text-sm font-black text-gray-500 hover:bg-gray-100 rounded-xl transition-all"
                                >
                                    Discard Changes
                                </button>
                                <button 
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="px-8 py-2.5 bg-[hsl(var(--primary))] text-white rounded-xl text-sm font-black shadow-lg shadow-[hsl(var(--primary))]/20 hover:scale-[1.02] transition-all disabled:opacity-50"
                                >
                                    {saving ? 'Updating...' : 'Update Order'}
                                </button>
                            </>
                        ) : (
                            <>
                                <button 
                                    onClick={onClose}
                                    className="px-6 py-2.5 text-sm font-black text-gray-500 hover:bg-gray-100 rounded-xl transition-all"
                                >
                                    Close
                                </button>
                                {canEdit && (
                                    <button 
                                        onClick={() => setIsEditing(true)}
                                        className="px-10 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-black shadow-lg hover:bg-blue-700 hover:scale-[1.02] transition-all"
                                    >
                                        Edit Order
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

const X = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);


