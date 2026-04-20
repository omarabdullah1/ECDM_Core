'use client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import api from '@/lib/axios';
import { ShoppingCart, Plus, Trash2, AlertCircle, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PriceListOption {
    _id: string;
    itemName: string;
    availableQuantity: number;
    minStockLevel: number;
    unitPrice: number;
}

interface AddPurchaseOrderDialogProps {
    onClose: () => void;
    onSuccess: () => void;
}

export default function AddPurchaseOrderDialog({ onClose, onSuccess }: AddPurchaseOrderDialogProps) {
    const [priceList, setPriceList] = useState<PriceListOption[]>([]);
    const [supplierName, setSupplierName] = useState('');
    const [selectedItems, setSelectedItems] = useState<{ priceListId: string, itemName: string, quantity: number, unitPrice: number, total: number }[]>([]);
    const [saving, setSaving] = useState(false);
    const [loadingPriceList, setLoadingPriceList] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchPriceList = async () => {
            try {
                const { data } = await api.get('/operations/price-list?limit=1000');
                setPriceList(data.data.data || []);
            } catch (err) {
                toast.error('Failed to load price list');
            } finally {
                setLoadingPriceList(false);
            }
        };
        fetchPriceList();
    }, []);

    const lowStockItems = priceList.filter(item => (item.availableQuantity ?? 0) <= (item.minStockLevel ?? 5));
    const filteredPriceList = priceList.filter(item => 
        item.itemName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const addItem = (item: PriceListOption) => {
        if (selectedItems.find(si => si.priceListId === item._id)) {
            toast.error('Item already added');
            return;
        }
        setSelectedItems([...selectedItems, {
            priceListId: item._id,
            itemName: item.itemName,
            quantity: 1,
            unitPrice: item.unitPrice || 0,
            total: item.unitPrice || 0
        }]);
    };

    const removeItem = (id: string) => {
        setSelectedItems(selectedItems.filter(si => si.priceListId !== id));
    };

    const updateItem = (id: string, field: 'quantity' | 'unitPrice', value: number) => {
        setSelectedItems(selectedItems.map(si => {
            if (si.priceListId === id) {
                const updated = { ...si, [field]: value };
                updated.total = updated.quantity * updated.unitPrice;
                return updated;
            }
            return si;
        }));
    };

    const onSubmit = async () => {
        if (!supplierName) return toast.error('Supplier name is required');
        if (selectedItems.length === 0) return toast.error('Add at least one item');

        setSaving(true);
        try {
            await api.post('/operations/purchase-orders', {
                supplierName,
                items: selectedItems
            });
            toast.success('Purchase Order created successfully!');
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to create PO');
        } finally {
            setSaving(false);
        }
    };

    const totalAmount = selectedItems.reduce((acc, curr) => acc + curr.total, 0);

    return (
        <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[hsl(var(--primary))]/10 rounded-xl">
                            <ShoppingCart className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <DialogTitle>New Purchase Order</DialogTitle>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Inventory Replenishment Workflow</p>
                        </div>
                    </div>
                </DialogHeader>

                <DialogBody className="flex-1 overflow-y-auto min-h-0 py-4 grid grid-cols-1 md:grid-cols-5 gap-6">
                    {/* Left Side: Catalog Suggestions */}
                    <div className="md:col-span-2 space-y-4 border-r border-gray-100 pr-6 overflow-y-auto">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-amber-600 uppercase tracking-tighter flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Low Stock Suggestions
                            </label>
                            <div className="space-y-2">
                                {loadingPriceList ? (
                                    <p className="text-xs text-gray-400">Loading catalog...</p>
                                ) : lowStockItems.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic">No critically low items found.</p>
                                ) : (
                                    lowStockItems.map(item => (
                                        <button
                                            key={item._id}
                                            onClick={() => addItem(item)}
                                            className="w-full text-left p-3 rounded-xl border border-amber-100 bg-amber-50/30 hover:bg-amber-100 transition-all group"
                                        >
                                            <div className="flex justify-between items-start">
                                                <span className="text-sm font-bold block leading-tight">{item.itemName}</span>
                                                <Plus className="w-4 h-4 text-amber-500 group-hover:scale-125 transition-transform" />
                                            </div>
                                            <div className="flex justify-between mt-1 text-[10px] font-bold uppercase tracking-tight">
                                                <span className="text-red-500">Stock: {item.availableQuantity}</span>
                                                <span className="text-gray-400">Min: {item.minStockLevel}</span>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-gray-100">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Full Catalog</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input 
                                    className="pl-9 h-10 text-xs" 
                                    placeholder="Search catalog..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="max-h-[200px] overflow-y-auto space-y-1 pr-1">
                                {filteredPriceList.map(item => (
                                    <button
                                        key={item._id}
                                        onClick={() => addItem(item)}
                                        className="w-full text-left p-2 rounded-lg hover:bg-gray-50 flex items-center justify-between group border border-transparent hover:border-gray-100"
                                    >
                                        <span className="text-xs font-semibold">{item.itemName}</span>
                                        <Plus className="w-3.5 h-3.5 text-gray-300 group-hover:text-primary" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Side: PO Details */}
                    <div className="md:col-span-3 space-y-6 overflow-y-auto">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Supplier Name</label>
                            <Input 
                                value={supplierName}
                                onChange={(e) => setSupplierName(e.target.value)}
                                placeholder="e.g. Acme Industrial Supplies"
                                className="h-12 font-bold text-base"
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Selected Items</label>
                            {selectedItems.length === 0 ? (
                                <div className="border-2 border-dashed border-gray-100 rounded-2xl p-12 text-center">
                                    <ShoppingCart className="w-10 h-10 text-gray-100 mx-auto mb-2" />
                                    <p className="text-sm font-bold text-gray-300 italic">No items selected yet</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {selectedItems.map((item, idx) => (
                                        <div key={item.priceListId} className="flex gap-4 items-end bg-gray-50/50 p-4 rounded-2xl border border-gray-100 animate-in slide-in-from-right-2 fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-black uppercase text-gray-400 mb-2 truncate" title={item.itemName}>{item.itemName}</p>
                                                <div className="flex gap-4">
                                                    <div className="space-y-1 w-24">
                                                        <label className="text-[9px] font-bold text-gray-400 uppercase">Qty</label>
                                                        <Input 
                                                            type="number" 
                                                            min="1" 
                                                            value={item.quantity ?? ''} 
                                                            onChange={(e) => updateItem(item.priceListId, 'quantity', Number(e.target.value))}
                                                            className="h-9 px-3 text-sm font-bold"
                                                        />
                                                    </div>
                                                    <div className="space-y-1 flex-1">
                                                        <label className="text-[9px] font-bold text-gray-400 uppercase">Expected Unit Price ($)</label>
                                                        <Input 
                                                            type="number" 
                                                            step="0.01" 
                                                            value={item.unitPrice ?? ''} 
                                                            onChange={(e) => updateItem(item.priceListId, 'unitPrice', Number(e.target.value))}
                                                            className="h-9 px-3 text-sm font-bold"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => removeItem(item.priceListId)}
                                                className="p-2.5 rounded-xl hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors mb-0.5"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    
                                    <div className="flex justify-between items-center p-4 bg-[hsl(var(--primary))]/5 border border-[hsl(var(--primary))]/10 rounded-2xl">
                                        <span className="text-xs font-black uppercase text-primary">Estimated Grand Total</span>
                                        <span className="text-xl font-black text-primary">${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </DialogBody>

                <DialogFooter className="border-t border-gray-100 p-6 bg-gray-50/30">
                    <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button 
                        onClick={onSubmit} 
                        disabled={saving || selectedItems.length === 0}
                        className="h-12 px-8 font-black uppercase tracking-widest text-xs"
                    >
                        {saving ? 'Creating PO...' : 'Confirm & Send Request'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
