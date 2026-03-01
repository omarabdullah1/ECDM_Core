'use client';
import { useState, useEffect, useCallback } from 'react';
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
  const limit = 10;
  const totalPages = Math.ceil(total / limit);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {page, limit };
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

      {/* Data Table with Horizontal Scrolling */}
      <div className="overflow-x-auto w-full">
        <DataTable
          data={orders}
          columns={columns}
          loading={loading}
          emptyMessage="No customer orders found."
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          meta={{
            onEdit: handleEdit,
            onDelete: handleDelete,
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
