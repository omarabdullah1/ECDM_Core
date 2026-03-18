'use client';

import { Pagination } from '@/components/shared/Pagination';
import api from '@/lib/axios';
import { DollarSign, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface FinanceRow {
  _id: string;
  customerId: string;
  name: string;
  invoiceId: string;
  type: string;
  hashNumber: string;
  totalAmountInvoices: number;
  paymentMethod: string;
  spareParts: string;
  quantity: number;
  cost: number;
  extraExpenseType: string;
  extraExpenseAmount: number;
  salesPercentage: string;
  techniciansPercentage: string;
  engineerPercentage: string;
  paidAmount: number;
  netBalance: number;
  notes: string;
}

export default function OrderFinancePage() {
  const [financeData, setFinanceData] = useState<FinanceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
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

  useEffect(() => {
    async function fetchFinanceData() {
      setIsLoading(true);
      try {
        const ordersRes = await api.get('/customer/orders?limit=1000').catch(() => ({ data: [] }));
        const rawOrders = universalExtract(ordersRes.data || ordersRes);

        console.log('!!! RAW FINANCE ORDER DEBUG !!!', rawOrders[0]);

        // Map the data to match the finance sheet with NUCLEAR FAIL-SAFE
        const mappedData = rawOrders.map((order: any) => {
          // 1. Correctly extract the populated customer object
          const actualCustomerObj = order.customerId || order.customer || order.clientId || {};

          let extractedId = "-";
          let extractedName = "Unknown";

          // 2. Parse exactly based on the console log structure
          if (typeof actualCustomerObj === 'string') {
            extractedId = actualCustomerObj;
          } else if (typeof actualCustomerObj === 'object' && actualCustomerObj !== null) {
            // 1. Prioritize the short ID fields from the backend
            const shortId = actualCustomerObj.customerId || actualCustomerObj.customerCode || actualCustomerObj.code;

            if (shortId && String(shortId).toUpperCase().startsWith('CUS')) {
              extractedId = String(shortId);
            } else {
              // 2. Fallback: If no short ID is found, gracefully format the long Mongo ID
              const rawId = String(shortId || actualCustomerObj._id || actualCustomerObj.id || '-');
              // If it's a 24-char MongoDB ID, take the last 4 characters to mimic the CUS-XXXX format
              extractedId = rawId.length === 24 ? `CUS-${rawId.slice(-4).toUpperCase()}` : rawId;
            }

            extractedName = String(actualCustomerObj.name || actualCustomerObj.customerName || actualCustomerObj.firstName || 'Unknown');
          }

          // 3. Parse money (Note: Backend currently only sends 'cost' in this specific log, but we keep others safe)
          const safeString = (val: any) => val ? String(val) : "0";

          const totalAmount = parseMoney(safeString(order.totalAmount || order.grandTotal || order.price || 0));
          const paidAmount = parseMoney(safeString(order.paidAmount || order.deposit || 0));
          const cost = parseMoney(safeString(order.cost || 0));
          const extraExpenseAmount = parseMoney(safeString(order.extraExpenseAmount || 0));

          return {
            _id: String(order._id || Math.random()),
            customerId: extractedId,
            name: extractedName,
            invoiceId: String(order.invoiceId || order.invoiceNumber || '-'),
            type: String(order.type || order.typeOfOrder || 'Supply'),
            hashNumber: String(order.orderNumber || order.hash || order.serial || '-'),
            totalAmountInvoices: totalAmount,
            paymentMethod: String(order.paymentMethod || '-'),
            spareParts: String(order.spareParts || '-'),
            quantity: Number(order.quantity || 1),
            cost: cost,
            extraExpenseType: String(order.extraExpenseType || '-'),
            extraExpenseAmount: extraExpenseAmount,
            salesPercentage: String(order.salesPercentage || '0%'),
            techniciansPercentage: String(order.techniciansPercentage || '0%'),
            engineerPercentage: String(order.engineerPercentage || '0%'),
            paidAmount: paidAmount,
            netBalance: totalAmount - paidAmount,
            notes: String(order.notes || '')
          };
        });

        console.log("✅ MAPPED FINANCE DATA (Row 1):", mappedData[0]);

        setFinanceData(mappedData);
      } catch (error) {
        console.error('Failed to fetch order finance data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchFinanceData();
  }, []);

  // Calculate pagination
  const totalItems = financeData.length;
  const startIdx = (currentPage - 1) * rowsPerPage;
  const endIdx = startIdx + rowsPerPage;
  const currentData = financeData.slice(startIdx, endIdx);

  // Format money as EGP
  const formatEGP = (amount: number) => {
    return `EGP ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Color-code net balance
  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'text-red-600 dark:text-red-400 font-bold'; // Debt
    if (balance === 0) return 'text-emerald-600 dark:text-emerald-400 font-bold'; // Paid
    return 'text-slate-600 dark:text-slate-400'; // Overpaid
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-slate-50 dark:bg-slate-950 min-h-screen">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 rounded-lg">
          <DollarSign size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Order Finance
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Detailed financial tracking for customer orders
          </p>
        </div>
      </div>

      {/* Table with horizontal scroll */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-[1500px]">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
              <tr>
                <th className="px-4 py-4">Customer ID</th>
                <th className="px-4 py-4">Name</th>
                <th className="px-4 py-4">InvoiceID</th>
                <th className="px-4 py-4">Type</th>
                <th className="px-4 py-4">#</th>
                <th className="px-4 py-4">Total Amount Invoices</th>
                <th className="px-4 py-4">PaymentMethod</th>
                <th className="px-4 py-4">Spare Parts</th>
                <th className="px-4 py-4">Quantity</th>
                <th className="px-4 py-4">Cost</th>
                <th className="px-4 py-4">ExtraExpenseType</th>
                <th className="px-4 py-4"># ExtraExpenseAmount</th>
                <th className="px-4 py-4">% Sales Percentage</th>
                <th className="px-4 py-4">% Technicians Percentage</th>
                <th className="px-4 py-4">% Enginner Percentage</th>
                <th className="px-4 py-4"># PaidAmount</th>
                <th className="px-4 py-4">Net Balance</th>
                <th className="px-4 py-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {currentData.map((row) => (
                <tr
                  key={row._id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-4 py-4 font-mono text-slate-500 dark:text-slate-400 text-xs">
                    {row.customerId}
                  </td>
                  <td className="px-4 py-4 font-bold text-slate-900 dark:text-white">
                    {row.name}
                  </td>
                  <td className="px-4 py-4 font-mono text-slate-600 dark:text-slate-300 text-xs">
                    {row.invoiceId}
                  </td>
                  <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                    {row.type}
                  </td>
                  <td className="px-4 py-4 font-mono text-slate-500 dark:text-slate-400 text-xs">
                    {row.hashNumber}
                  </td>
                  <td className="px-4 py-4 font-bold text-blue-600 dark:text-blue-400">
                    {formatEGP(row.totalAmountInvoices)}
                  </td>
                  <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                    {row.paymentMethod}
                  </td>
                  <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                    {row.spareParts}
                  </td>
                  <td className="px-4 py-4 text-center text-slate-600 dark:text-slate-300">
                    {row.quantity}
                  </td>
                  <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                    {formatEGP(row.cost)}
                  </td>
                  <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                    {row.extraExpenseType}
                  </td>
                  <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                    {formatEGP(row.extraExpenseAmount)}
                  </td>
                  <td className="px-4 py-4 text-center text-slate-600 dark:text-slate-300">
                    {row.salesPercentage}
                  </td>
                  <td className="px-4 py-4 text-center text-slate-600 dark:text-slate-300">
                    {row.techniciansPercentage}
                  </td>
                  <td className="px-4 py-4 text-center text-slate-600 dark:text-slate-300">
                    {row.engineerPercentage}
                  </td>
                  <td className="px-4 py-4 font-bold text-emerald-600 dark:text-emerald-400">
                    {formatEGP(row.paidAmount)}
                  </td>
                  <td className={`px-4 py-4 ${getBalanceColor(row.netBalance)}`}>
                    {formatEGP(row.netBalance)}
                  </td>
                  <td className="px-4 py-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                    {row.notes || '-'}
                  </td>
                </tr>
              ))}
              {currentData.length === 0 && (
                <tr>
                  <td
                    colSpan={18}
                    className="px-6 py-8 text-center text-slate-500 dark:text-slate-400"
                  >
                    No order finance data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalItems > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={totalItems}
            itemsPerPage={rowsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </div>
  );
}
