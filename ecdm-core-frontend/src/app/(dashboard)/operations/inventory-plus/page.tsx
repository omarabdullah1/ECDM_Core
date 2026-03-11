'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@/lib/axios';
import { Package, Plus, Edit2, Trash2, X, Boxes, Tag, ArrowUpDown } from 'lucide-react';
import { Pagination } from '@/components/shared/Pagination';

type Tab = 'items' | 'products' | 'categories' | 'movements';

interface InventoryItem { _id: string; itemName: string; stockNumber: string; stockCount: number; status: string; price: number; category?: { name: string }; }
interface Product { _id: string; sku: string; name: string; currentStock: number; lowStockThreshold: number; unitPrice: number; category?: { name: string }; isActive: boolean; }
interface Category { _id: string; name: string; isActive: boolean; description?: string; }
interface StockMovement { _id: string; type: string; quantity: number; reason?: string; product?: { sku: string; name: string }; performedBy?: { firstName: string; lastName: string }; createdAt: string; }

const iCls = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all';

export default function InventoryPlusPage() {
  const [tab, setTab] = useState<Tab>('items');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [fItemStatus, setFItemStatus] = useState('');
  const [fMovementType, setFMovementType] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [delId, setDelId] = useState<string | null>(null);
  const lim = 10; const tp = Math.ceil(total / lim);

  const filteredItems = useMemo(() => {
    if (!fItemStatus) return items;
    return items.filter(r => r.status === fItemStatus);
  }, [items, fItemStatus]);

  const filteredProducts = useMemo(() => {
    if (!fItemStatus) return products;
    if (fItemStatus === 'In Stock') return products.filter(r => r.currentStock > r.lowStockThreshold);
    if (fItemStatus === 'Low Stock') return products.filter(r => r.currentStock <= r.lowStockThreshold && r.currentStock > 0);
    if (fItemStatus === 'Out of Stock') return products.filter(r => r.currentStock === 0);
    return products;
  }, [products, fItemStatus]);

  const filteredMovements = useMemo(() => {
    if (!fMovementType) return movements;
    return movements.filter(r => r.type === fMovementType);
  }, [movements, fMovementType]);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const p = { page, limit: lim };
      if (tab === 'items') { const { data } = await api.get('/operations/inventory-plus/items', { params: p }); setItems(data.data.data); setTotal(data.data.pagination.total); }
      else if (tab === 'products') { const { data } = await api.get('/operations/inventory-plus/products', { params: p }); setProducts(data.data.data); setTotal(data.data.pagination.total); }
      else if (tab === 'categories') { const { data } = await api.get('/operations/inventory-plus/categories', { params: p }); setCategories(data.data.data); setTotal(data.data.pagination.total); }
      else { const { data } = await api.get('/operations/inventory-plus/stock-movements', { params: p }); setMovements(data.data.data); setTotal(data.data.pagination.total); }
    } catch { }
    setLoading(false);
  }, [page, tab]);
  useEffect(() => { fetch_(); }, [fetch_]);

  const openC = () => { setForm({}); setError(''); setModal(true); };
  const save = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSaving(true); setError('');
    const pl: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(form)) {
      if (v !== '') pl[k] = ['stockCount', 'price', 'quantity', 'unitPrice', 'costPrice', 'currentStock', 'lowStockThreshold'].includes(k) ? Number(v) : v;
    }
    try {
      const base = '/operations/inventory-plus';
      if (tab === 'items') await api.post(`${base}/items`, pl);
      else if (tab === 'products') await api.post(`${base}/products`, pl);
      else if (tab === 'categories') await api.post(`${base}/categories`, pl);
      else await api.post(`${base}/stock-movements`, pl);
      setModal(false); fetch_();
    } catch (e: unknown) { setError((e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed'); }
    setSaving(false);
  };
  const del = async () => {
    if (!delId) return;
    const base = '/operations/inventory-plus';
    const path = tab === 'items' ? `${base}/items/${delId}` : tab === 'products' ? `${base}/products/${delId}` : `${base}/categories/${delId}`;
    try { await api.delete(path); fetch_(); } catch { } setDelId(null);
  };
  const u = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [f]: e.target.value }));

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'items', label: 'Spare Parts', icon: <Package className="h-4 w-4" /> },
    { key: 'products', label: 'Products', icon: <Boxes className="h-4 w-4" /> },
    { key: 'categories', label: 'Categories', icon: <Tag className="h-4 w-4" /> },
    { key: 'movements', label: 'Stock Movements', icon: <ArrowUpDown className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Package className="h-7 w-7 text-[hsl(var(--primary))]" /><h1 className="text-2xl font-bold">Inventory+</h1></div>
        {tab !== 'movements' && <button onClick={openC} className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-sm font-semibold text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity"><Plus className="h-4 w-4" />Add</button>}
        {tab === 'movements' && <button onClick={openC} className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-sm font-semibold text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity"><Plus className="h-4 w-4" />Log Movement</button>}
      </div>

      <div className="flex gap-2 border-b border-[hsl(var(--border))]">
        {TABS.map(tb => (
          <button key={tb.key} onClick={() => { setTab(tb.key); setPage(1); }} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === tb.key ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]' : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-foreground'}`}>
            {tb.icon}{tb.label}
          </button>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        {(tab === 'items') && (
          <select value={fItemStatus} onChange={e => { setFItemStatus(e.target.value); }} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm">
            <option value="">All Statuses</option>
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>
        )}
        {(tab === 'products') && (
          <select value={fItemStatus} onChange={e => { setFItemStatus(e.target.value); }} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm">
            <option value="">All Stock Levels</option>
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>
        )}
        {(tab === 'movements') && (
          <select value={fMovementType} onChange={e => { setFMovementType(e.target.value); }} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm">
            <option value="">All Movement Types</option>
            <option value="IN">IN</option>
            <option value="OUT">OUT</option>
            <option value="ADJUST">ADJUST</option>
          </select>
        )}
      </div>

      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
        {loading ? <div className="p-8 text-center text-[hsl(var(--muted-foreground))]">Loading…</div> : (
          <>
            {tab === 'items' && (
              <table className="w-full text-sm">
                <thead className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30"><tr>{['Item Name', 'Stock #', 'Count', 'Status', 'Price', 'Category', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>)}</tr></thead>
                <tbody>{filteredItems.map(r => <tr key={r._id} className="border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--muted))]/20"><td className="px-4 py-3 font-medium">{r.itemName}</td><td className="px-4 py-3">{r.stockNumber}</td><td className="px-4 py-3">{r.stockCount}</td><td className="px-4 py-3"><span className="rounded-full px-2 py-0.5 text-xs font-medium bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]">{r.status}</span></td><td className="px-4 py-3">EGP {r.price.toLocaleString()}</td><td className="px-4 py-3">{r.category?.name || '—'}</td><td className="px-4 py-3"><button onClick={() => setDelId(r._id)} className="p-1 hover:text-destructive"><Trash2 className="h-4 w-4" /></button></td></tr>)}{!filteredItems.length && <tr><td colSpan={7} className="px-4 py-8 text-center text-[hsl(var(--muted-foreground))]">No items found.</td></tr>}</tbody>
              </table>
            )}
            {tab === 'products' && (
              <table className="w-full text-sm">
                <thead className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30"><tr>{['SKU', 'Name', 'Stock', 'Low Thresh.', 'Price', 'Category', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>)}</tr></thead>
                <tbody>{filteredProducts.map(r => <tr key={r._id} className="border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--muted))]/20"><td className="px-4 py-3 font-medium">{r.sku}</td><td className="px-4 py-3">{r.name}</td><td className={`px-4 py-3 font-semibold ${r.currentStock <= r.lowStockThreshold ? 'text-red-500' : ''}`}>{r.currentStock}</td><td className="px-4 py-3">{r.lowStockThreshold}</td><td className="px-4 py-3">EGP {r.unitPrice.toLocaleString()}</td><td className="px-4 py-3">{r.category?.name || '—'}</td><td className="px-4 py-3"><button onClick={() => setDelId(r._id)} className="p-1 hover:text-destructive"><Trash2 className="h-4 w-4" /></button></td></tr>)}{!filteredProducts.length && <tr><td colSpan={7} className="px-4 py-8 text-center text-[hsl(var(--muted-foreground))]">No products found.</td></tr>}</tbody>
              </table>
            )}
            {tab === 'categories' && (
              <table className="w-full text-sm">
                <thead className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30"><tr>{['Name', 'Description', 'Active', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>)}</tr></thead>
                <tbody>{categories.map(r => <tr key={r._id} className="border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--muted))]/20"><td className="px-4 py-3 font-medium">{r.name}</td><td className="px-4 py-3">{r.description || '—'}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{r.isActive ? 'Active' : 'Inactive'}</span></td><td className="px-4 py-3"><button onClick={() => setDelId(r._id)} className="p-1 hover:text-destructive"><Trash2 className="h-4 w-4" /></button></td></tr>)}{!categories.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-[hsl(var(--muted-foreground))]">No categories found.</td></tr>}</tbody>
              </table>
            )}
            {tab === 'movements' && (
              <table className="w-full text-sm">
                <thead className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30"><tr>{['Product', 'Type', 'Qty', 'Reason', 'By', 'Date'].map(h => <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>)}</tr></thead>
                <tbody>{filteredMovements.map(r => <tr key={r._id} className="border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--muted))]/20"><td className="px-4 py-3 font-medium">{r.product?.name || '—'}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.type === 'IN' ? 'bg-green-100 text-green-700' : r.type === 'OUT' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{r.type}</span></td><td className="px-4 py-3">{r.quantity}</td><td className="px-4 py-3">{r.reason || '—'}</td><td className="px-4 py-3">{r.performedBy ? `${r.performedBy.firstName} ${r.performedBy.lastName}` : '—'}</td><td className="px-4 py-3">{new Date(r.createdAt).toLocaleDateString()}</td></tr>)}{!filteredMovements.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-[hsl(var(--muted-foreground))]">No movements found.</td></tr>}</tbody>
              </table>
            )}
          </>
        )}
      </div>

      {/* Pagination */}
      {!loading && total > 0 && (
        <Pagination
          currentPage={page}
          totalItems={total}
          itemsPerPage={lim}
          onPageChange={setPage}
        />
      )}



      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6"><h2 className="text-lg font-bold">Add {TABS.find(tb => tb.key === tab)?.label}</h2><button onClick={() => setModal(false)}><X className="h-5 w-5" /></button></div>
            <form onSubmit={save} className="space-y-4">
              {tab === 'items' && (<><input required placeholder="Item Name" value={form.itemName || ''} onChange={u('itemName')} className={iCls} /><input required placeholder="Stock Number" value={form.stockNumber || ''} onChange={u('stockNumber')} className={iCls} /><input required type="number" placeholder="Stock Count" value={form.stockCount || ''} onChange={u('stockCount')} className={iCls} /><input required type="number" placeholder="Price (EGP)" value={form.price || ''} onChange={u('price')} className={iCls} /><input placeholder="Category ID (optional)" value={form.category || ''} onChange={u('category')} className={iCls} /></>)}
              {tab === 'products' && (<><input required placeholder="SKU" value={form.sku || ''} onChange={u('sku')} className={iCls} /><input required placeholder="Product Name" value={form.name || ''} onChange={u('name')} className={iCls} /><input required type="number" placeholder="Unit Price (EGP)" value={form.unitPrice || ''} onChange={u('unitPrice')} className={iCls} /><input type="number" placeholder="Current Stock" value={form.currentStock || ''} onChange={u('currentStock')} className={iCls} /><input type="number" placeholder="Low Stock Threshold" value={form.lowStockThreshold || ''} onChange={u('lowStockThreshold')} className={iCls} /></>)}
              {tab === 'categories' && (<><input required placeholder="Category Name" value={form.name || ''} onChange={u('name')} className={iCls} /><input placeholder="Description" value={form.description || ''} onChange={u('description')} className={iCls} /></>)}
              {tab === 'movements' && (<><input required placeholder="Product ID" value={form.product || ''} onChange={u('product')} className={iCls} /><select required value={form.type || ''} onChange={u('type')} className={iCls}><option value="">Select Type</option><option value="IN">IN</option><option value="OUT">OUT</option><option value="ADJUST">ADJUST</option></select><input required type="number" placeholder="Quantity" value={form.quantity || ''} onChange={u('quantity')} className={iCls} /><input placeholder="Reason" value={form.reason || ''} onChange={u('reason')} className={iCls} /><input required placeholder="Performed By (User ID)" value={form.performedBy || ''} onChange={u('performedBy')} className={iCls} /></>)}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-3 pt-2"><button type="submit" disabled={saving} className="flex-1 rounded-xl bg-[hsl(var(--primary))] py-2.5 text-sm font-semibold text-[hsl(var(--primary-foreground))] disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button><button type="button" onClick={() => setModal(false)} className="flex-1 rounded-xl border border-[hsl(var(--border))] py-2.5 text-sm">Cancel</button></div>
            </form>
          </div>
        </div>
      )}

      {delId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl max-w-sm w-full">
            <p className="mb-4 font-semibold">Delete this item?</p>
            <div className="flex gap-3"><button onClick={del} className="flex-1 rounded-xl bg-destructive py-2 text-sm font-semibold text-white">Delete</button><button onClick={() => setDelId(null)} className="flex-1 rounded-xl border py-2 text-sm">Cancel</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
