'use client';

import { Eye } from 'lucide-react';

export interface FinanceRow {
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
  salesPercentage: number;
  techniciansPercentage: number;
  engineerPercentage: number;
  paidAmount: number;
  netBalance: number;
  notes: string;
  // Personnel refs
  salesPersonId?: string | null;
  salesPersonName?: string;
  technicianId?: string | null;
  technicianName?: string;
  engineerId?: string | null;
  engineerName?: string;
}

const formatEGP = (amount: number) => {
  return `EGP ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getBalanceColor = (balance: number) => {
  if (balance > 0) return 'text-red-600 dark:text-red-400 font-bold'; 
  if (balance === 0) return 'text-emerald-600 dark:text-emerald-400 font-bold'; 
  return 'text-slate-600 dark:text-slate-400';
};

interface ColumnConfig {
  onView: (row: FinanceRow) => void;
}

export const createColumns = (config: ColumnConfig) => [
  {
    key: 'customerId',
    header: 'Customer ID',
      className: 'md:w-[1%] md:whitespace-nowrap',
    render: (row: FinanceRow) => (
      <span className="font-mono text-slate-500 dark:text-slate-400 text-xs">
        {row.customerId}
      </span>
    )
  },
  {
    key: 'name',
    header: 'Name',
      className: 'md:w-auto md:max-w-[150px] md:truncate',
    render: (row: FinanceRow) => (
      <span className="font-bold text-slate-900 dark:text-white">
        {row.name}
      </span>
    )
  },
  {
    key: 'invoiceId',
    header: 'Invoice ID',
      className: 'md:w-[1%] md:whitespace-nowrap',
    render: (row: FinanceRow) => (
      <span className="font-mono text-slate-600 dark:text-slate-300 text-xs">
        {row.invoiceId}
      </span>
    )
  },
  {
    key: 'type',
    header: 'Type',
      className: 'md:w-[1%] md:whitespace-nowrap',
    render: (row: FinanceRow) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.type}
      </span>
    )
  },
  {
    key: 'hashNumber',
    header: '#',
      className: 'md:w-1/6 md:max-w-[120px] md:truncate',
    render: (row: FinanceRow) => (
      <span className="font-mono text-slate-500 dark:text-slate-400 text-xs">
        {row.hashNumber}
      </span>
    )
  },
  {
    key: 'totalAmountInvoices',
    header: 'Total Amount',
      className: 'md:w-[1%] md:whitespace-nowrap',
    render: (row: FinanceRow) => (
      <span className="font-bold text-blue-600 dark:text-blue-400">
        {formatEGP(row.totalAmountInvoices)}
      </span>
    )
  },
  {
      key: 'paymentMethod',
      header: 'Payment Method',
      className: 'md:w-1/6 md:max-w-[120px] md:truncate',
      render: (row: FinanceRow) => row.paymentMethod
  },
  {
      key: 'spareParts',
      header: 'Spare Parts',
      className: 'md:w-1/6 md:max-w-[120px] md:truncate',
      render: (row: FinanceRow) => row.spareParts
  },
  {
      key: 'quantity',
      header: 'Qty',
      className: 'md:w-1/6 md:max-w-[120px] md:truncate',
      render: (row: FinanceRow) => row.quantity
  },
  {
    key: 'cost',
    header: 'Cost',
      className: 'md:w-1/6 md:max-w-[120px] md:truncate',
    render: (row: FinanceRow) => formatEGP(row.cost)
  },
  {
    key: 'extraExpenseType',
    header: 'Extra Exp Type',
      className: 'md:w-[1%] md:whitespace-nowrap',
    render: (row: FinanceRow) => row.extraExpenseType
  },
  {
    key: 'extraExpenseAmount',
    header: 'Extra Exp Amount',
      className: 'md:w-[1%] md:whitespace-nowrap',
    render: (row: FinanceRow) => formatEGP(row.extraExpenseAmount)
  },
  {
    key: 'paidAmount',
    header: 'Paid Amount',
      className: 'md:w-[1%] md:whitespace-nowrap',
    render: (row: FinanceRow) => (
      <span className="font-bold text-emerald-600 dark:text-emerald-400">
        {formatEGP(row.paidAmount)}
      </span>
    )
  },
  {
    key: 'netBalance',
    header: 'Net Balance',
      className: 'md:w-1/6 md:max-w-[120px] md:truncate',
    render: (row: FinanceRow) => (
      <span className={getBalanceColor(row.netBalance)}>
        {formatEGP(row.netBalance)}
      </span>
    )
  },
  {
    key: 'notes',
    header: 'Notes',
      className: 'md:w-1/6 md:max-w-[120px] md:truncate',
    render: (row: FinanceRow) => (
      <div className="max-w-xs truncate text-slate-600 dark:text-slate-300" title={row.notes}>
        {row.notes || '-'}
      </div>
    )
  }
];

