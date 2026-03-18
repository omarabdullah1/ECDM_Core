'use client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import api from '@/lib/axios';
import { FileText, Plus, Save, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { SalesOrder } from './columns';

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
}

interface PriceListEntry {
  id: string;
  label: string; // "{sparePartsId} - {itemName}"
  price: number;
  category: string;
}

interface AddQuotationDialogProps {
  order: SalesOrder;
  onClose: () => void;
  onSuccess: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Styling
// ─────────────────────────────────────────────────────────────────────────────

const iCls = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed';
const labelCls = 'text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-1.5 block';
const btnPrimary = 'px-5 py-2.5 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-xl hover:opacity-90 transition-all font-medium text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed';
const btnSecondary = 'px-5 py-2.5 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded-xl hover:opacity-80 transition-all font-medium text-sm flex items-center gap-2';
const btnDanger = 'p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all';

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function AddQuotationDialog({ order, onClose, onSuccess }: AddQuotationDialogProps) {
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

        const entries: PriceListEntry[] = raw.map((item) => ({
          id: item._id,
          label: `${item.sparePartsId || item._id.slice(-6)} — ${item.itemName}`,
          price: item.unitPrice || 0,
          category: item.category || 'Uncategorised',
        }));

        setPriceListEntries(entries);
      } catch (err) {
        console.error('❌ Failed to fetch price list:', err);
        toast.error('Failed to load price list');
      } finally {
        setLoadingPriceList(false);
      }
    };

    fetchPriceList();
  }, []);

  // ── Computed ──────────────────────────────────────────────────────────────

  const subTotal = items.reduce((sum, item) => sum + item.total, 0);
  const grandTotal = Math.max(0, subTotal - discount);

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

      // Auto-fill unit price when a price-list item is selected
      if (value && value !== '' && value !== '__custom__') {
        const match = priceListEntries.find((e) => e.label === value);
        if (match) {
          updated[index].unitPrice = match.price;
          updated[index].total = updated[index].quantity * match.price;
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
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto overflow-x-hidden p-6 outline-none">

        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between border-b border-[hsl(var(--border))] pb-4 mb-4 space-y-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[hsl(var(--primary))]/10 rounded-lg">
              <FileText className="w-5 h-5 text-[hsl(var(--primary))]" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-[hsl(var(--foreground))]">
                Create Quotation
              </DialogTitle>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {order.salesOrderId || `Order #${order._id.slice(-6).toUpperCase()}`}
                {' | '}
                {order.customer?.name || order.customerId?.name || 'Customer'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-[hsl(var(--accent))] rounded-lg transition-all"
            disabled={saving}
          >
            <X className="w-5 h-5" />
          </button>
        </DialogHeader>

        {/* Form */}
        <form onSubmit={handleSaveQuotation} className="flex flex-col gap-6">

          {/* Items Table */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className={labelCls}>Quotation Items</label>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1.5 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg hover:opacity-90 transition-all text-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>

            <div className="border border-[hsl(var(--border))] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[hsl(var(--muted))]/50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide w-12">#</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Description</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide w-24">Qty</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide w-32">Unit Price</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide w-32">Total</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(var(--border))]">
                    {items.map((item, index) => (
                      <tr key={index} className="hover:bg-[hsl(var(--muted))]/20 transition-colors">

                        <td className="px-3 py-3 text-sm text-[hsl(var(--muted-foreground))]">
                          {index + 1}
                        </td>

                        {/* Description (Price List Dropdown) */}
                        <td className="px-3 py-3">
                          <select
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-lg text-sm focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 bg-[hsl(var(--background))]"
                            required
                            disabled={loadingPriceList}
                          >
                            <option value="">
                              {loadingPriceList ? 'Loading price list...' : 'Select item from Price List'}
                            </option>

                            {/* Items grouped by category */}
                            {Object.entries(grouped).map(([cat, entries]) => (
                              <optgroup key={cat} label={`═══ ${cat} ═══`}>
                                {entries.map((e) => (
                                  <option key={e.id} value={e.label}>
                                    {e.label} — ${e.price.toFixed(2)}
                                  </option>
                                ))}
                              </optgroup>
                            ))}

                            {/* Custom entry fallback */}
                            <optgroup label="═══ Custom Entry ═══">
                              <option value="__custom__">➕ Enter Custom Item...</option>
                            </optgroup>
                          </select>

                          {/* Free-text for custom items */}
                          {item.description === '__custom__' && (
                            <input
                              type="text"
                              placeholder="Type custom item description"
                              onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                              className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-lg text-sm focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 mt-2"
                              autoFocus
                            />
                          )}
                        </td>

                        {/* Quantity */}
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            min="1"
                            step="1"
                            className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-lg text-sm focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20"
                            required
                          />
                        </td>

                        {/* Unit Price (auto-filled or editable) */}
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-lg text-sm focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20"
                            required
                          />
                        </td>

                        {/* Row total */}
                        <td className="px-3 py-3 text-right text-sm font-semibold text-[hsl(var(--foreground))]">
                          ${item.total.toFixed(2)}
                        </td>

                        {/* Remove */}
                        <td className="px-3 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className={btnDanger}
                            title="Remove item"
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

          {/* Notes + Totals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div>
              <label className={labelCls}>Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes or terms..."
                rows={5}
                className={iCls}
              />
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelCls}>Discount ($)</label>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className={iCls}
                />
              </div>

              <div className="bg-[hsl(var(--muted))]/30 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[hsl(var(--muted-foreground))]">Subtotal:</span>
                  <span className="font-semibold">${subTotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[hsl(var(--muted-foreground))]">Discount:</span>
                    <span className="font-semibold text-red-600">-${discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="pt-3 border-t border-[hsl(var(--border))]">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-bold">Grand Total:</span>
                    <span className="text-xl font-bold text-[hsl(var(--primary))]">${grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[hsl(var(--border))] mt-2">
          <button type="button" onClick={onClose} className={btnSecondary} disabled={saving}>
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button type="button" onClick={handleSaveQuotation} className={btnPrimary} disabled={saving}>
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Quotation'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
