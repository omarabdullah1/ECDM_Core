'use client';

import { Pagination } from '@/components/shared/Pagination';
import { useAuthStore } from '@/features/auth/useAuth';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { TableSkeleton } from '@/components/ui/skeleton';
import {
  Database,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  TrendingUp,
  UserPlus,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface InventoryFinanceRow {
  sparePartsId: string;
  itemName: string;
  price: string;
  typeOfOrder: string;
  stockNumber: string;
  status: string;
  purchaseOrders: string;
  startDate: string;
  suppliersId: string;
  address: string;
  phone: string;
  endDate: string;
  notes: string;
}

const universalExtract = (rawData: any): any[] => {
  if (!rawData) return [];
  if (Array.isArray(rawData)) return rawData;
  if (rawData.data && Array.isArray(rawData.data)) return rawData.data;
  if (rawData.data?.data && Array.isArray(rawData.data.data)) return rawData.data.data;
  const possibleArray = Object.values(rawData).find(val => Array.isArray(val));
  return (possibleArray as any[]) || [];
};

export default function InventoryFinancePage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [inventoryData, setInventoryData] = useState<InventoryFinanceRow[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [formData, setFormData] = useState<InventoryFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchInventoryData = async (isSync = false) => {
    if (isSync) {
      setSyncing(true);
    } else {
      setIsLoading(true);
    }
    setApiError(null);

    try {
      const [inventoryRes] = await Promise.all([
        api.get('/finance/inventory?limit=1000').catch(() => ({ data: [] }))
      ]);

      const rawInventory = universalExtract(inventoryRes.data || inventoryRes);

      const rows: InventoryFinanceRow[] = rawInventory.map((item: any) => ({
        sparePartsId: String(item.sparePartsId || '-'),
        itemName: String(item.itemName || 'Unknown'),
        price: String(item.price || '0'),
        typeOfOrder: String(item.typeOfOrder || 'Maintenance'),
        stockNumber: String(item.stockNumber || '0'),
        status: String(item.status || 'In stock'),
        purchaseOrders: 'File', // Represents the Document icon
        startDate: item.startDate ? new Date(item.startDate).toLocaleDateString() : 'dd/mm/yyyy',
        suppliersId: String(item.suppliersId || '-'),
        address: String(item.address || 'Place'),
        phone: String(item.phone || '-'),
        endDate: item.endDate ? new Date(item.endDate).toLocaleDateString() : 'dd/mm/yyyy',
        notes: String(item.notes || '-')
      }));

      setInventoryData(rows);
    } catch (error: any) {
      console.error('Failed to generate inventory finance report:', error);
      setApiError(error.message || 'Unknown fetching error');
    } finally {
      setIsLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    const role = user.role;
    if (role !== 'Admin' && role !== 'SuperAdmin') {
      router.push('/dashboard');
      return;
    }

    fetchInventoryData();
  }, [user, router]);

  const handleSync = () => {
    fetchInventoryData(true);
  };

  const filteredData = inventoryData.filter((row) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      row.sparePartsId.toLowerCase().includes(q) ||
      row.itemName.toLowerCase().includes(q) ||
      row.typeOfOrder.toLowerCase().includes(q) ||
      row.status.toLowerCase().includes(q) ||
      row.suppliersId.toLowerCase().includes(q) ||
      row.address.toLowerCase().includes(q) ||
      row.phone.toLowerCase().includes(q) ||
      row.notes.toLowerCase().includes(q)
    );
  });

  const indexOfLastRow = currentPage * itemsPerPage;
  const indexOfFirstRow = indexOfLastRow - itemsPerPage;
  const currentRows = filteredData.slice(indexOfFirstRow, indexOfLastRow);

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'in stock':
        return 'bg-green-100 text-green-800';
      case 'temporarily unavailable':
        return 'bg-yellow-100 text-yellow-800';
      case 'repurchase needed':
        return 'bg-pink-100 text-pink-800';
      case 'sold out':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await api.post('/finance/inventory', {
        sparePartsId: formData.sparePartsId,
        itemName: formData.itemName,
        price: formData.price,
        typeOfOrder: formData.typeOfOrder,
        stockNumber: formData.stockNumber,
        status: formData.status,
        purchaseOrdersUrl: formData.purchaseOrdersUrl,
        startDate: formData.startDate ? new Date(formData.startDate) : undefined,
        suppliersId: formData.suppliersId,
        address: formData.address,
        phone: formData.phone,
        endDate: formData.endDate ? new Date(formData.endDate) : undefined,
        notes: formData.notes
      });

      setFormData(initialFormData);
      setAddModalOpen(false);
      await fetchInventoryData(true); // Refresh data
    } catch (error: any) {
      console.error('Failed to add inventory record:', error);
      setSubmitError(error.message || 'Failed to add record');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="flex flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Inventory Finance</h1>
              <p className="text-sm text-muted-foreground">
                Tracking inventory financials and stock levels
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {syncing ? 'Syncing...' : 'Sync Report'}
            </button>
            <button
              onClick={() => setAddModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <UserPlus className="h-4 w-4" />
              Add Inventory Record
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search inventory..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-md border border-input bg-background pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <span className="text-sm text-muted-foreground">
            {filteredData.length} item(s) found
          </span>
        </div>

        {apiError && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <ShieldAlert className="h-4 w-4" />
            {apiError}
          </div>
        )}

        {isLoading ? (
          <TableSkeleton rows={10} columns={13} height="h-12" />
        ) : (
          <>
            <div className="overflow-x-auto min-w-[1500px] rounded-md border">
              <table className="w-full caption-bottom text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="border-b px-3 py-2 text-left font-medium">Spare Parts ID</th>
                    <th className="border-b px-3 py-2 text-left font-medium">Item name</th>
                    <th className="border-b px-3 py-2 text-left font-medium"># price</th>
                    <th className="border-b px-3 py-2 text-left font-medium">Type Of Order</th>
                    <th className="border-b px-3 py-2 text-left font-medium"># Stock Number</th>
                    <th className="border-b px-3 py-2 text-left font-medium">Status</th>
                    <th className="border-b px-3 py-2 text-left font-medium">Purchase Orders</th>
                    <th className="border-b px-3 py-2 text-left font-medium bg-red-600 text-white">Start Date</th>
                    <th className="border-b px-3 py-2 text-left font-medium bg-red-600 text-white"># Suppliers ID</th>
                    <th className="border-b px-3 py-2 text-left font-medium bg-red-600 text-white">Address</th>
                    <th className="border-b px-3 py-2 text-left font-medium bg-red-600 text-white">Phone</th>
                    <th className="border-b px-3 py-2 text-left font-medium bg-red-600 text-white">End Date</th>
                    <th className="border-b px-3 py-2 text-left font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRows.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="border-b px-3 py-8 text-center text-muted-foreground">
                        {searchTerm ? 'No items match your search' : 'No inventory finance data found'}
                      </td>
                    </tr>
                  ) : (
                    currentRows.map((row) => (
                      <tr key={row.sparePartsId} className="hover:bg-muted/50">
                        <td className="border-b px-3 py-2">{row.sparePartsId}</td>
                        <td className="border-b px-3 py-2 font-medium">{row.itemName}</td>
                        <td className="border-b px-3 py-2">{row.price}</td>
                        <td className="border-b px-3 py-2">{row.typeOfOrder}</td>
                        <td className="border-b px-3 py-2">{row.stockNumber}</td>
                        <td className="border-b px-3 py-2">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadgeClass(row.status)}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="border-b px-3 py-2 text-center">
                          <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                        </td>
                        <td className="border-b px-3 py-2 bg-red-600 text-white">{row.startDate}</td>
                        <td className="border-b px-3 py-2 bg-red-600 text-white">{row.suppliersId}</td>
                        <td className="border-b px-3 py-2 bg-red-600 text-white">{row.address}</td>
                        <td className="border-b px-3 py-2 bg-red-600 text-white">{row.phone}</td>
                        <td className="border-b px-3 py-2 bg-red-600 text-white">{row.endDate}</td>
                        <td className="border-b px-3 py-2 text-muted-foreground">{row.notes}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalItems={filteredData.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>

      {/* Add Inventory Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" aria-hidden={!addModalOpen ? 'true' : 'false'}>
        <div className="relative w-full max-w-md max-h-[90vh]">
          <div className="relative bg-card rounded-lg shadow">
            {/* Close Button */}
            <button
              onClick={() => setAddModalOpen(false)}
              className="absolute right-3 top-2.5 rounded-md p-1 text-muted-foreground/70 hover:text-muted-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="py-6 px-6">
              <h2 className="text-lg font-medium leading-none text-foreground">
                Add New Inventory Record
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Fill out the form below to add a new inventory item
              </p>

              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-muted-foreground">Spare Parts ID</label>
                    <input
                      type="text"
                      value={formData.sparePartsId}
                      onChange={(e) => setFormData({ ...formData, sparePartsId: e.target.value })}
                      className="w-full rounded-md border border-input bg-background pl-2 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-muted-foreground">Item Name</label>
                    <input
                      type="text"
                      value={formData.itemName}
                      onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                      className="w-full rounded-md border border-input bg-background pl-2 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-muted-foreground">Price</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-md border border-input bg-background pl-2 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-muted-foreground">Type of Order</label>
                    <input
                      type="text"
                      value={formData.typeOfOrder}
                      onChange={(e) => setFormData({ ...formData, typeOfOrder: e.target.value })}
                      className="w-full rounded-md border border-input bg-background pl-2 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-muted-foreground">Stock Number</label>
                    <input
                      type="number"
                      value={formData.stockNumber}
                      onChange={(e) => setFormData({ ...formData, stockNumber: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-md border border-input bg-background pl-2 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-muted-foreground">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full rounded-md border border-input bg-background pl-2 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                      required
                    >
                      <option value="In stock">In stock</option>
                      <option value="Temporarily unavailable">Temporarily unavailable</option>
                      <option value="Repurchase needed">Repurchase needed</option>
                      <option value="Sold out">Sold out</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-muted-foreground">Purchase Orders URL</label>
                    <input
                      type="text"
                      value={formData.purchaseOrdersUrl}
                      onChange={(e) => setFormData({ ...formData, purchaseOrdersUrl: e.target.value })}
                      className="w-full rounded-md border border-input bg-background pl-2 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-muted-foreground">Suppliers ID</label>
                    <input
                      type="text"
                      value={formData.suppliersId}
                      onChange={(e) => setFormData({ ...formData, suppliersId: e.target.value })}
                      className="w-full rounded-md border border-input bg-background pl-2 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-muted-foreground">Start Date</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full rounded-md border border-input bg-background pl-2 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-muted-foreground">End Date</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full rounded-md border border-input bg-background pl-2 pr-4 py-2 text-sm outline-none focus:ring-2 focus-ring-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full rounded-md border border-input bg-background pl-2 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-md border border-input bg-background pl-2 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full rounded-md border border-input bg-background pl-2 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                    rows={3}
                  />
                </div>

                <div className="flex items-center justify-end pt-4 space-x-3">
                  <button
                    type="button"
                    onClick={() => setAddModalOpen(false)}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="disabled:opacity-50 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        Add Record
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Form state
type InventoryFormData = {
  sparePartsId: string;
  itemName: string;
  price: number;
  typeOfOrder: string;
  stockNumber: number;
  status: string;
  purchaseOrdersUrl: string;
  startDate: string;
  suppliersId: string;
  address: string;
  phone: string;
  endDate: string;
  notes: string;
};

const initialFormData: InventoryFormData = {
  sparePartsId: '',
  itemName: '',
  price: 0,
  typeOfOrder: '',
  stockNumber: 0,
  status: 'In stock',
  purchaseOrdersUrl: '',
  startDate: '',
  suppliersId: '',
  address: '',
  phone: '',
  endDate: '',
  notes: ''
};