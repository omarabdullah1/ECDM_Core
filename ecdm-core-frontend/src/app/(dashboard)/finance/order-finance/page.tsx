'use client';

import { PageHeader } from '@/components/layout/PageHeader';
import api from '@/lib/axios';
import { DollarSign, Loader2, Eye } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { createColumns, FinanceRow } from './columns';
import OrderFinanceDialog from './OrderFinanceDialog';

export default function OrderFinancePage() {
  const [financeData, setFinanceData] = useState<FinanceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<FinanceRow | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const rowsPerPage = 10;

  // Universal extractor for nested API responses
  const universalExtract = (rawData: any): any[] => {
    if (!rawData) return [];
    if (Array.isArray(rawData)) return rawData;
    if (rawData.data?.data && Array.isArray(rawData.data.data)) return rawData.data.data;
    if (rawData.data && Array.isArray(rawData.data)) return rawData.data;
    const potentialArray = Object.values(rawData).find(val => Array.isArray(val));
    return (potentialArray as any[]) || [];
  };

  // Money parser for string values with currency symbols
  const parseMoney = (val: any): number => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    const cleaned = String(val).replace(/[^0-9.-]+/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  const fetchFinanceData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Use standard pagination params
      const params = {
        page: currentPage,
        limit: rowsPerPage,
        // The backend might need limit=1000 if it doesn't support pagination here yet, 
        // but let's stick to standard behavior if possible.
        // Looking at the original code it used limit=1000.
      };
      
      const ordersRes = await api.get('customer/orders?limit=1000').catch(() => ({ data: [] }));
      const rawOrders = universalExtract(ordersRes.data || ordersRes);

      // Map the data to match the finance sheet with NUCLEAR FAIL-SAFE
      const mappedData = rawOrders.map((order: any) => {
        const actualCustomerObj = order.customerId || order.customer || order.clientId || {};

        let extractedId = "-";
        let extractedName = "Unknown";

        if (typeof actualCustomerObj === 'string') {
          extractedId = actualCustomerObj;
        } else if (typeof actualCustomerObj === 'object' && actualCustomerObj !== null) {
          const shortId = actualCustomerObj.customerId || actualCustomerObj.customerCode || actualCustomerObj.code;

          if (shortId && String(shortId).toUpperCase().startsWith('CUS')) {
            extractedId = String(shortId);
          } else {
            const rawId = String(shortId || actualCustomerObj._id || actualCustomerObj.id || '-');
            extractedId = rawId.length === 24 ? `CUS-${rawId.slice(-4).toUpperCase()}` : rawId;
          }

          extractedName = String(actualCustomerObj.name || actualCustomerObj.customerName || actualCustomerObj.firstName || 'Unknown');
        }

        const salesOrderObj = order.salesOrderId || {};
        const safeString = (val: any) => val ? String(val) : "0";
        
        // CALCULATE REAL QTY from quotation items
        const rawItems = salesOrderObj.quotation?.items || [];
        const totalQty = Array.isArray(rawItems) 
          ? rawItems.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0)
          : 0;

        // EXTRACT REAL TOTAL AMOUNT from quotation
        const totalAmount = parseMoney(salesOrderObj.quotation?.grandTotal || 0);
        
        // USE REAL DATABASE FIELDS for operational finance
        const paidAmount = Number(order.paidAmount || 0);
        const cost = Number(order.cost || 0);
        const extraExpenseAmount = Number(order.extraExpenseAmount || 0);

        return {
          _id: String(order._id),
          customerId: extractedId,
          name: extractedName,
          invoiceId: String(salesOrderObj.invoiceId || order.invoiceId || order.invoiceNumber || '-'),
          type: String(order.type || order.typeOfOrder || 'Supply'),
          hashNumber: String(salesOrderObj.salesOrderId || order.orderNumber || order.hash || '-'),
          totalAmountInvoices: totalAmount,
          paymentMethod: String(order.paymentMethod || '-'),
          spareParts: String(order.spareParts || '-'),
          quantity: totalQty || 1, // Fallback to 1 if no items
          cost: cost,
          extraExpenseType: String(order.extraExpenseType || '-'),
          extraExpenseAmount: extraExpenseAmount,
          salesPercentage: Number(order.salesPercentage || 0),
          techniciansPercentage: Number(order.technicianPercentage || 0),
          engineerPercentage: Number(order.engineerPercentage || 0),
          paidAmount: paidAmount,
          netBalance: totalAmount - paidAmount,
          notes: String(order.notes || ''),
          // Personnel refs
          salesPersonId: order.salesPersonId?._id || order.salesPersonId || null,
          salesPersonName: order.salesPersonId?.fullName || order.salesPersonId?.firstName
            ? `${order.salesPersonId.firstName || ''} ${order.salesPersonId.lastName || ''}`.trim()
            : undefined,
          technicianId: order.technicianId?._id || order.technicianId || null,
          technicianName: order.technicianId?.fullName || order.technicianId?.firstName
            ? `${order.technicianId.firstName || ''} ${order.technicianId.lastName || ''}`.trim()
            : undefined,
          engineerId: order.engineerId?._id || order.engineerId || null,
          engineerName: order.engineerId?.fullName || order.engineerName || undefined,
        };
      });

      setFinanceData(mappedData);
      setTotalItems(mappedData.length);
    } catch (error) {
      console.error('Failed to fetch order finance data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchFinanceData();
  }, [fetchFinanceData]);

  const handleViewOrder = (order: FinanceRow) => {
    setSelectedOrder(order);
    setIsDialogOpen(true);
  };

  const columns = createColumns({
    onView: handleViewOrder
  });

  // Default Column Visibility Logic: Essential columns only by default
  const DEFAULT_VISIBILITY = {
    invoiceId: false,
    type: false,
    hashNumber: false,
    paymentMethod: false,
    spareParts: false,
    quantity: false,
    cost: false,
    extraExpenseType: false,
    extraExpenseAmount: false,
    notes: false,
  };

  // Calculate local pagination since we fetch bulk data
  const startIdx = (currentPage - 1) * rowsPerPage;
  const currentData = financeData.slice(startIdx, startIdx + rowsPerPage);

  if (isLoading && financeData.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0 space-y-6 pb-4">
      <PageHeader 
        title="Order Finance"
        icon={DollarSign}
        description="Detailed financial tracking for customer orders"
      />

      {/* DataTable Integration */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <DataTable
          data={currentData}
          columns={columns}
          loading={isLoading}
          page={currentPage}
          totalPages={Math.ceil(totalItems / rowsPerPage)}
          totalItems={totalItems}
          itemsPerPage={rowsPerPage}
          onPageChange={setCurrentPage}
          onRowClick={handleViewOrder}
          defaultVisibility={DEFAULT_VISIBILITY}
          renderActions={(row) => (
            <button
              onClick={() => handleViewOrder(row)}
              className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
              title="View Details"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}
          emptyMessage="No order finance data available."
        />
      </div>

      {/* Interactive Detail Dialog */}
      {selectedOrder && (
        <OrderFinanceDialog
          isOpen={isDialogOpen}
          order={selectedOrder}
          onClose={() => setIsDialogOpen(false)}
          onSuccess={() => {
            fetchFinanceData();
            setIsDialogOpen(false);
          }}
        />
      )}
    </div>
  );
}
