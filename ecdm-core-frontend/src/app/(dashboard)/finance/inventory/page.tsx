'use client';

import { useAuthStore } from '@/features/auth/useAuth';
import api from '@/lib/axios';
import {
  Database,
  ShieldAlert,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { columns, InventoryFinanceRow } from './columns';
import InventoryFinanceDialog from './InventoryFinanceDialog';

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

  // Dialog state
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Default Visibility for Inventory: Hide metadata by default
  const DEFAULT_VISIBILITY = {
    typeOfOrder: false,
    purchaseOrders: false,
    startDate: false,
    suppliersId: false,
    address: false,
    phone: false,
    endDate: false,
    notes: false,
  };

  const universalExtract = (rawData: any): any[] => {
    if (!rawData) return [];
    if (Array.isArray(rawData)) return rawData;
    if (rawData.data && Array.isArray(rawData.data)) return rawData.data;
    if (rawData.data?.data && Array.isArray(rawData.data.data)) return rawData.data.data;
    const possibleArray = Object.values(rawData).find(val => Array.isArray(val));
    return (possibleArray as any[]) || [];
  };

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
        ...item,
        _id: String(item._id || item.sparePartsId),
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

  const handleRowClick = (row: InventoryFinanceRow) => {
    setSelectedWorkOrder(row);
    setIsDialogOpen(true);
  };

  if (!user) return null;

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Inventory Finance"
        icon={Database}
        description="Tracking inventory financials and stock levels"
      />

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-6 pb-0 flex items-center gap-3">
           <input
              type="text"
              placeholder="Search inventory items..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="max-w-sm w-full h-9 rounded-full border border-slate-200 dark:border-slate-800 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <span className="text-sm text-slate-500">{filteredData.length} records</span>
        </div>

        {apiError && (
          <div className="m-6 flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <ShieldAlert className="h-4 w-4" />
            {apiError}
          </div>
        )}

        <div className="mt-4">
          <DataTable
            data={filteredData}
            columns={columns}
            loading={isLoading}
            page={currentPage}
            totalPages={Math.ceil(filteredData.length / itemsPerPage)}
            totalItems={filteredData.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onRowClick={handleRowClick}
            defaultVisibility={DEFAULT_VISIBILITY}
            emptyMessage={searchTerm ? 'No items match your search' : 'No inventory finance data found'}
          />
        </div>
      </div>

      {isDialogOpen && (
        <InventoryFinanceDialog
          workOrder={selectedWorkOrder}
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSuccess={() => fetchInventoryData()}
        />
      )}
    </div>
  );
}