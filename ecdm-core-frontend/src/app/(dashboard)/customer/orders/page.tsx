'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@/lib/axios';
import { Package } from 'lucide-react';
import DataTable from '@/components/ui/DataTable';
import { columns, CustomerOrder } from './columns';
import EditCustomerOrderDialog from './EditCustomerOrderDialog';
import toast from 'react-hot-toast';

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [fDeal, setFDeal] = useState('');
  const [fTypeOfOrder, setFTypeOfOrder] = useState('');

  const DEAL_OPTIONS = ['Pending', 'Approved', 'Rejected', 'Done'];
  const TYPE_OPTIONS = ['Maintenance', 'General supplies', 'Supply and installation'];

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (fDeal && o.deal !== fDeal) return false;
      if (fTypeOfOrder && o.typeOfOrder !== fTypeOfOrder) return false;
      return true;
    });
  }, [orders, fDeal, fTypeOfOrder]);

  const limit = 10;
  const totalPages = Math.ceil(total / limit);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit };
      const { data } = await api.get('/customer/orders', { params });
      setOrders(data.data.data);
      setTotal(data.data.pagination.total);
    } catch (error) {
      console.error('Failed to fetch customer orders:', error);
      toast.error('Failed to load customer orders');
    }
    setLoading(false);
  }, [page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ─── Edit Handler ────────────────────────────────────────────────────────
  const handleEdit = (order: CustomerOrder) => {
    setSelectedOrder(order);
    setIsEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    fetchOrders();
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setSelectedOrder(null);
  };

  // ─── Delete Handler ──────────────────────────────────────────────────────
  const handleDelete = async (orderId: string) => {
    if (!confirm('Are you sure you want to delete this customer order?')) {
      return;
    }

    try {
      await api.delete(`/customer/orders/${orderId}`);
      toast.success('Customer order deleted successfully');
      fetchOrders();
    } catch (error) {
      console.error('Failed to delete customer order:', error);
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete order';
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="h-7 w-7 text-[hsl(var(--primary))]" />
          <h1 className="text-2xl font-bold">Customer Orders</h1>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <select value={fDeal} onChange={e => { setFDeal(e.target.value); setPage(1); }} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm">
          <option value="">All Deal Statuses</option>
          {DEAL_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={fTypeOfOrder} onChange={e => { setFTypeOfOrder(e.target.value); setPage(1); }} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm">
          <option value="">All Order Types</option>
          {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Data Table with Horizontal Scrolling */}
      <div className="overflow-x-auto w-full">
        <DataTable
          data={filteredOrders}
          columns={columns}
          loading={loading}
          emptyMessage="No customer orders found."
          page={page}
          totalPages={totalPages}
          totalItems={total}
          itemsPerPage={limit}
          onPageChange={setPage}
          meta={{
            onEdit: handleEdit,
            onDelete: handleDelete,
          }}
          defaultVisibility={{
            "customer.address": false,
            "customer.region": false,
            "customer.sector": false,
            scheduledVisitDate: false,
            engineerName: false,
            actualVisitDate: false,
            devicePickupType: false,
            startDate: false,
            endDate: false,
            deviceReturnedDate: false,
            updatedBy: false,
            notes: false,
          }}
        />
      </div>

      {/* Edit Dialog */}
      {isEditDialogOpen && selectedOrder && (
        <EditCustomerOrderDialog
          order={selectedOrder}
          onClose={handleCloseEditDialog}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}
