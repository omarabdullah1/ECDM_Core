'use client';
import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { SalesOrder } from './columns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/**
 * Add Quotation Dialog - Dynamic Quotation Builder
 * 
 * Features:
 * 1. Add/Remove quotation items dynamically
 * 2. Real-time total calculations
 * 3. Discount support
 * 4. Notes field
 * 5. Generate PDF preview after saving
 */

// ─────────────────────────────────────────────────────────────────────────────
// Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

interface QuotationItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InventoryItem {
  id: string;
  name: string;
  price: number;
  type: 'Product' | 'Spare Part';
}

interface AddQuotationDialogProps {
  order: SalesOrder;
  onClose: () => void;
  onSuccess: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Styling Classes
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
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  const [items, setItems] = useState<QuotationItem[]>([
    { description: '', quantity: 1, unitPrice: 0, total: 0 }
  ]);
  const [discount, setDiscount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loadingInventory, setLoadingInventory] = useState<boolean>(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // FETCH INVENTORY (Products & Spare Parts)
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const fetchInventory = async () => {
      setLoadingInventory(true);
      try {
        const [sparePartsRes, productsRes] = await Promise.all([
          api.get('/operations/spare-parts?limit=1000'),
          api.get('/operations/inventory-plus/products?limit=1000')
        ]);

        const spareParts = sparePartsRes.data?.data?.data || sparePartsRes.data?.data || [];
        const products = productsRes.data?.data?.data || productsRes.data?.data || [];

        const formattedItems: InventoryItem[] = [
          ...spareParts.map((sp: any) => ({
            id: sp._id,
            name: `${sp.sparePartsId || sp._id.slice(-6)} - ${sp.itemName}`,
            price: sp.unitPrice || 0,
            type: 'Spare Part' as const
          })),
          ...products.map((pr: any) => ({
            id: pr._id,
            name: `${pr.sku || pr._id.slice(-6)} - ${pr.name}`,
            price: pr.unitPrice || 0,
            type: 'Product' as const
          }))
        ];

        setInventoryItems(formattedItems);
        console.log('✅ Loaded inventory:', formattedItems.length, 'items');
      } catch (error) {
        console.error('❌ Failed to fetch inventory:', error);
        toast.error('Failed to load inventory items');
      } finally {
        setLoadingInventory(false);
      }
    };

    fetchInventory();
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED VALUES
  // ═══════════════════════════════════════════════════════════════════════════

  const subTotal = items.reduce((sum, item) => sum + item.total, 0);
  const grandTotal = Math.max(0, subTotal - discount);

  // ═══════════════════════════════════════════════════════════════════════════
  // ITEM MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

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
    const updatedItems = [...items];

    if (field === 'description') {
      updatedItems[index].description = value as string;

      // Auto-fill unitPrice when an inventory item is selected
      if (value && value !== '' && value !== '__custom__') {
        const selectedInvItem = inventoryItems.find(inv => inv.name === value);
        if (selectedInvItem) {
          updatedItems[index].unitPrice = selectedInvItem.price;
          // Recalculate total
          updatedItems[index].total = updatedItems[index].quantity * selectedInvItem.price;
          console.log('✅ Auto-filled price:', selectedInvItem.price, 'for', selectedInvItem.name);
        }
      }
    } else if (field === 'quantity' || field === 'unitPrice') {
      const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
      updatedItems[index][field] = numValue;

      // Recalculate total for this item
      updatedItems[index].total = updatedItems[index].quantity * updatedItems[index].unitPrice;
    }

    setItems(updatedItems);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FORM SUBMISSION
  // ═══════════════════════════════════════════════════════════════════════════

  const handleSaveQuotation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Validation
    if (items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    const hasEmptyDescription = items.some(item => !item.description.trim() || item.description === '__custom__');
    if (hasEmptyDescription) {
      toast.error('All items must have a description');
      return;
    }

    const hasInvalidQuantity = items.some(item => item.quantity <= 0);
    if (hasInvalidQuantity) {
      toast.error('All items must have a quantity greater than 0');
      return;
    }

    const hasInvalidPrice = items.some(item => item.unitPrice < 0);
    if (hasInvalidPrice) {
      toast.error('Unit prices cannot be negative');
      return;
    }

    setSaving(true);

    try {
      // 1. Calculate final totals (ensure your state variables match these names)
      const calculatedSubTotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      const calculatedGrandTotal = calculatedSubTotal - (discount || 0);

      // 2. Construct the exact payload matching the Mongoose schema
      const payload = {
        quotation: {
          items: items.map(item => ({
            description: item.description,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            total: Number(item.quantity) * Number(item.unitPrice)
          })),
          subTotal: calculatedSubTotal,
          discount: Number(discount || 0),
          grandTotal: calculatedGrandTotal,
          notes: notes || '',
          createdAt: new Date()
        }
      };

      console.log("🚀 Sending Payload to Backend:", payload);

      // 3. Send the PATCH request to the backend
      const response = await api.patch(`/sales/orders/${order._id}`, payload);

      console.log("✅ Backend Response:", response.data);

      if (response.status === 200 || response.status === 202 || response.status === 204) {
        toast.success('Quotation saved successfully');
        onClose();
        onSuccess();
      }
    } catch (error: any) {
      // Comprehensive error logging
      console.error("❌ Failed to save quotation - Full Error:", error);
      console.error("❌ Error Response:", error?.response);
      console.error("❌ Error Data:", error?.response?.data);
      console.error("❌ Error Message:", error?.message);
      
      // Extract error message with fallbacks
      let errorMessage = 'Failed to save quotation. Please try again.';
      
      if (error?.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.toString && error.toString() !== '[object Object]') {
        errorMessage = error.toString();
      }
      
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

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

        {/* Form Content */}
        <form onSubmit={handleSaveQuotation} className="flex flex-col gap-6">

          {/* Items Table */}
          <div className="mb-6">
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
                        <td className="px-3 py-3">
                          {/* Inventory Selection Dropdown */}
                          <select
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-lg text-sm focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 bg-[hsl(var(--background))]"
                            required
                            disabled={loadingInventory}
                          >
                            <option value="">
                              {loadingInventory ? 'Loading inventory...' : 'Select Product / Spare Part'}
                            </option>

                            {/* Products Group */}
                            {inventoryItems.filter(i => i.type === 'Product').length > 0 && (
                              <optgroup label="═══ Products ═══">
                                {inventoryItems
                                  .filter(i => i.type === 'Product')
                                  .map(i => (
                                    <option key={i.id} value={i.name}>
                                      {i.name} - ${i.price.toFixed(2)}
                                    </option>
                                  ))}
                              </optgroup>
                            )}

                            {/* Spare Parts Group */}
                            {inventoryItems.filter(i => i.type === 'Spare Part').length > 0 && (
                              <optgroup label="═══ Spare Parts ═══">
                                {inventoryItems
                                  .filter(i => i.type === 'Spare Part')
                                  .map(i => (
                                    <option key={i.id} value={i.name}>
                                      {i.name} - ${i.price.toFixed(2)}
                                    </option>
                                  ))}
                              </optgroup>
                            )}

                            {/* Manual Entry Option */}
                            <optgroup label="═══ Custom Entry ═══">
                              <option value="__custom__">➕ Enter Custom Item...</option>
                            </optgroup>
                          </select>

                          {/* Show text input for custom items */}
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
                        <td className="px-3 py-3 text-right text-sm font-semibold text-[hsl(var(--foreground))]">
                          ${item.total.toFixed(2)}
                        </td>
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

          {/* Totals & Discount */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

            {/* Notes */}
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

            {/* Totals Summary */}
            <div className="space-y-4">
              {/* Discount */}
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

              {/* Totals Display */}
              <div className="bg-[hsl(var(--muted))]/30 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[hsl(var(--muted-foreground))]">Subtotal:</span>
                  <span className="font-semibold text-[hsl(var(--foreground))]">${subTotal.toFixed(2)}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[hsl(var(--muted-foreground))]">Discount:</span>
                    <span className="font-semibold text-red-600">-${discount.toFixed(2)}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-[hsl(var(--border))]">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-bold text-[hsl(var(--foreground))]">Grand Total:</span>
                    <span className="text-xl font-bold text-[hsl(var(--primary))]">${grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[hsl(var(--border))] mt-2">
          <button
            type="button"
            onClick={onClose}
            className={btnSecondary}
            disabled={saving}
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSaveQuotation}
            className={btnPrimary}
            disabled={saving}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Quotation'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
