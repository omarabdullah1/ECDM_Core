'use client';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogBody, 
  DialogFooter 
} from '@/components/ui/dialog';
import api from '@/lib/axios';
import { FileText, Plus, Save, Trash2, X, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { SalesOrder } from './columns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useAuthStore } from '@/features/auth/useAuth';

/**
 * Add Quotation Dialog - Dynamic Quotation Builder
 *
 * Item catalogue sourced exclusively from /operations/price-list.
 * Items are grouped by Price List category in the dropdown.
 *
 * Features:
 * 1. Add/Remove quotation items dynamically
 * 2. Auto-fill unit price on item selection
 * 3. Real-time total calculations
 * 4. Discount support
 * 5. Notes field
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface QuotationItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  priceListId?: string;
  dataSheetUrl?: string;
}

interface PriceListEntry {
  id: string;
  label: string; // "{sparePartsId} — {itemName}"
  price: number;
  category: string;
  dataSheetUrl?: string;
}

interface AddQuotationDialogProps {
  order: SalesOrder;
  onClose: () => void;
  onSuccess: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Styling
// ─────────────────────────────────────────────────────────────────────────────

const iCls = 'flex h-9 w-full rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-3 py-1 text-sm shadow-sm transition-all placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:border-[hsl(var(--primary))]/50 focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10';
const labelCls = 'text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-1.5 block';
const btnPrimary = 'px-5 py-2.5 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-xl hover:opacity-90 transition-all font-medium text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed';
const btnSecondary = 'px-5 py-2.5 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded-xl hover:opacity-80 transition-all font-medium text-sm flex items-center gap-2';
const btnDanger = 'p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all';

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function AddQuotationDialog({ order, onClose, onSuccess }: AddQuotationDialogProps) {
  const { user } = useAuthStore();
  const [items, setItems] = useState<QuotationItem[]>([
    { description: '', quantity: 1, unitPrice: 0, total: 0 }
  ]);
  const [discount, setDiscount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [priceListEntries, setPriceListEntries] = useState<PriceListEntry[]>([]);
  const [loadingPriceList, setLoadingPriceList] = useState<boolean>(false);

  // ── Fetch Price List ───────────────────────────────────────────────────────

  useEffect(() => {
    const fetchPriceList = async () => {
      setLoadingPriceList(true);
      try {
        const { data } = await api.get('/operations/price-list', { params: { limit: 1000 } });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw: any[] = data?.data?.data || data?.data || [];

        const entries: PriceListEntry[] = raw.map((item) => {
          const id = item?._id || '';
          const itemId = item?.sparePartsId || (typeof id === 'string' ? id.slice(-6) : 'ID');
          
          return {
            id: id,
            label: `${itemId} — ${item?.itemName || 'Unnamed Item'}`,
            price: Number(item?.unitPrice || 0),
            category: item?.category || 'Uncategorised',
            dataSheetUrl: item?.dataSheetUrl || '',
          };
        });

        setPriceListEntries(entries);
      } catch (err: any) {
        console.error('❌ Failed to fetch price list - Detailed Error:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
          config: {
            url: err.config?.url,
            method: err.config?.method,
            baseURL: err.config?.baseURL
          }
        });
        
        const errorMsg = err.response?.data?.message || err.message || 'Failed to load price list';
        toast.error(`Price List Error: ${errorMsg}`);
      } finally {
        setLoadingPriceList(false);
      }
    };

    fetchPriceList();
  }, []);

  // ── Computed ──────────────────────────────────────────────────────────────

  const subTotal = items.reduce((sum, item) => sum + item.total, 0);
  const grandTotal = Math.max(0, subTotal - discount);

  // Discount Limit Logic
  const maxDiscountPercentage = user?.maxDiscountPercentage || 0;
  const isAdmin = ['SuperAdmin', 'Manager', 'Admin'].includes(user?.role || '');
  const appliedDiscountPercentage = subTotal > 0 ? (discount / subTotal) * 100 : 0;
  const isDiscountExceeded = !isAdmin && appliedDiscountPercentage > maxDiscountPercentage;

  // Group price list by category for <optgroup> rendering
  const grouped = priceListEntries.reduce<Record<string, PriceListEntry[]>>((acc, entry) => {
    (acc[entry.category] ??= []).push(entry);
    return acc;
  }, {});

  // ── Item Management ───────────────────────────────────────────────────────

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) {
      toast.error('At least one item is required');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof QuotationItem, value: string | number) => {
    const updated = [...items];

    if (field === 'description') {
      updated[index].description = value as string;

      // Auto-fill unit price and datasheet when a price-list item is selected
      if (value && value !== '' && value !== '__custom__') {
        const match = priceListEntries.find((e) => e.label === value);
        if (match) {
          updated[index].unitPrice = match.price;
          updated[index].total = updated[index].quantity * match.price;
          updated[index].priceListId = match.id;
          updated[index].dataSheetUrl = match.dataSheetUrl;
        } else {
          // Reset if no match (custom entry)
          updated[index].priceListId = undefined;
          updated[index].dataSheetUrl = undefined;
        }
      }
    } else if (field === 'quantity' || field === 'unitPrice') {
      const num = typeof value === 'string' ? parseFloat(value) || 0 : value;
      updated[index][field] = num;
      updated[index].total = updated[index].quantity * updated[index].unitPrice;
    }

    setItems(updated);
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSaveQuotation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }
    if (items.some((i) => !i.description.trim() || i.description === '__custom__')) {
      toast.error('All items must have a description');
      return;
    }
    if (items.some((i) => i.quantity <= 0)) {
      toast.error('All items must have a quantity greater than 0');
      return;
    }
    if (items.some((i) => i.unitPrice < 0)) {
      toast.error('Unit prices cannot be negative');
      return;
    }

    setSaving(true);
    try {
      const calculatedSubTotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
      const payload = {
        quotation: {
          items: items.map((i) => ({
            description: i.description,
            quantity: Number(i.quantity),
            unitPrice: Number(i.unitPrice),
            total: Number(i.quantity) * Number(i.unitPrice),
            priceListId: i.priceListId,
            dataSheetUrl: i.dataSheetUrl,
          })),
          subTotal: calculatedSubTotal,
          discount: Number(discount || 0),
          grandTotal: calculatedSubTotal - Number(discount || 0),
          notes: notes || '',
          createdAt: new Date(),
        },
      };

      const response = await api.patch(`/sales/orders/${order._id}`, payload);
      if (response.status === 200 || response.status === 202 || response.status === 204) {
        toast.success('Quotation saved successfully');
        onClose();
        onSuccess();
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; error?: string } }; message?: string };
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        'Failed to save quotation. Please try again.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[hsl(var(--primary))]/10 rounded-lg">
                <FileText className="w-5 h-5 text-[hsl(var(--primary))]" />
              </div>
              <div>
                <DialogTitle>Create Quotation</DialogTitle>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] font-medium mt-0.5">
                  {order.salesOrderId || (typeof order._id === 'string' ? `Order #${order._id.slice(-6).toUpperCase()}` : 'New Order')} • {order.customer?.name || order.customerId?.name || 'Customer'}
                </p>
              </div>
            </div>
        </DialogHeader>

        <DialogBody>
          <form id="add-quotation-form" onSubmit={handleSaveQuotation} className="space-y-6">
            {/* Items Table Container */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className={labelCls}>Quotation Items</label>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAddItem}
                  className="h-8 gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Item
                </Button>
              </div>

              <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                <div className="w-full overflow-x-auto custom-table-scrollbar">
        <table className="w-full text-xs">
                    <thead className="bg-gray-50/80 border-b border-gray-100">
                      <tr>
                        <th className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-tighter w-10">#</th>
                        <th className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-tighter">Description</th>
                        <th className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-tighter w-16">Qty</th>
                        <th className="px-3 py-2.5 text-left font-bold text-gray-500 uppercase tracking-tighter w-24">Unit Price</th>
                        <th className="px-3 py-2.5 text-right font-bold text-gray-500 uppercase tracking-tighter w-24">Total</th>
                        <th className="px-3 py-2.5 text-center font-bold text-gray-500 uppercase tracking-tighter w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {items.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-3 py-2 text-gray-400">{index + 1}</td>
                          <td className="px-3 py-2">
                            <Select
                              value={item.description}
                              onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                              className="h-8 py-0"
                              disabled={loadingPriceList}
                            >
                              <option value="">{loadingPriceList ? 'Loading...' : 'Select item...'}</option>
                              {Object.entries(grouped).map(([cat, entries]) => (
                                <optgroup key={cat} label={cat}>
                                  {entries.map((e) => (
                                    <option key={e.id} value={e.label}>
                                      {e.label} — ${e.price.toFixed(2)}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </Select>
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                              min="1"
                              className="h-8 px-2 py-0 text-center"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                              min="0"
                              step="0.01"
                              className="h-8 px-2 py-0"
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-gray-900">
                            ${item.total.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="p-1 text-red-300 hover:text-red-500 transition-colors disabled:opacity-30"
                              disabled={items.length === 1}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Notes + Totals Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <div className="space-y-1.5">
                <label className={labelCls}>Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Terms or conditions..."
                  rows={4}
                  className="flex min-h-[80px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm transition-all focus-visible:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              {/* Totals Section */}
              <div className="space-y-3 pt-4 border-t border-gray-100 md:border-t-0 md:pt-0">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Subtotal:</span>
                  <span className="font-semibold">${subTotal.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Discount:</span>
                  <div className="flex items-center gap-2 w-32">
                    <span className="text-gray-400">$</span>
                    <Input 
                      type="number" 
                      value={discount} 
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      className="h-8 text-right font-medium"
                      min="0"
                    />
                  </div>
                </div>

                {isDiscountExceeded && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 border border-red-100 text-red-600 text-[10px] font-medium animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
                    <span>Discount exceeds your authorized limit of {maxDiscountPercentage}% ({appliedDiscountPercentage.toFixed(1)}% applied)</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center pt-3 border-t border-gray-100 mt-2">
                  <span className="text-base font-bold text-gray-900">Grand Total:</span>
                  <span className="text-xl font-bold text-[hsl(var(--primary))]">${grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </form>
        </DialogBody>

        <DialogFooter className="mt-2">
          <button type="button" onClick={onClose} className={btnSecondary} disabled={saving}>
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button type="button" onClick={handleSaveQuotation} className={btnPrimary} disabled={saving || isDiscountExceeded}>
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Quotation'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
