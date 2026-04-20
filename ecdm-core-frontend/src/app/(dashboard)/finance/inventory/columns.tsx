'use client';

import { FileSpreadsheet } from 'lucide-react';
import { Column } from '@/components/ui/DataTable';

export interface InventoryFinanceRow {
  _id: string;
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

const getStatusBadgeClass = (status: string) => {
  switch (status.toLowerCase()) {
    case 'in stock':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'temporarily unavailable':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'repurchase needed':
      return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400';
    case 'sold out':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400';
  }
};

export const columns: Column<InventoryFinanceRow>[] = [
  {
    key: 'sparePartsId',
    header: 'Spare Parts ID',
    className: 'md:w-[1%] md:whitespace-nowrap',
    render: (row: InventoryFinanceRow) => (
      <span className="font-mono text-slate-500 dark:text-slate-400 text-xs">
        {row.sparePartsId}
      </span>
    )
  },
  {
    key: 'itemName',
    header: 'Item Name',
    className: 'md:w-auto md:max-w-[200px] md:truncate',
    render: (row: InventoryFinanceRow) => (
      <span className="font-bold text-slate-900 dark:text-white">
        {row.itemName}
      </span>
    )
  },
  {
    key: 'price',
    header: 'Price',
    className: 'md:w-[1%] md:whitespace-nowrap',
    render: (row: InventoryFinanceRow) => (
      <span className="font-bold text-blue-600 dark:text-blue-400">
        EGP {Number(row.price).toLocaleString()}
      </span>
    )
  },
  {
    key: 'status',
    header: 'Status',
    className: 'md:w-[1%] md:whitespace-nowrap',
    render: (row: InventoryFinanceRow) => (
      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeClass(row.status)}`}>
        {row.status}
      </span>
    )
  },
  {
    key: 'stockNumber',
    header: 'Stock Number',
    className: 'md:w-[1%] md:whitespace-nowrap',
    render: (row: InventoryFinanceRow) => (
      <span className="font-mono font-medium">#{row.stockNumber}</span>
    )
  },
  {
    key: 'typeOfOrder',
    header: 'Type Of Order',
    className: 'md:w-[1%] md:whitespace-nowrap',
  },
  {
    key: 'purchaseOrders',
    header: 'Purchase Orders',
    className: 'md:w-[1%] md:whitespace-nowrap',
    render: () => (
      <FileSpreadsheet className="h-4 w-4 text-slate-400" />
    )
  },
  {
    key: 'startDate',
    header: 'Start Date',
    className: 'md:w-[1%] md:whitespace-nowrap',
    render: (row: InventoryFinanceRow) => (
      <span className="text-red-600 dark:text-red-400 font-medium">{row.startDate}</span>
    )
  },
  {
    key: 'suppliersId',
    header: 'Suppliers ID',
    className: 'md:w-[1%] md:whitespace-nowrap',
    render: (row: InventoryFinanceRow) => (
      <span className="text-red-600 dark:text-red-400 font-medium">{row.suppliersId}</span>
    )
  },
  {
    key: 'address',
    header: 'Address',
    className: 'md:max-w-[150px] md:truncate',
    render: (row: InventoryFinanceRow) => (
      <span className="text-red-600 dark:text-red-400 font-medium" title={row.address}>{row.address}</span>
    )
  },
  {
    key: 'phone',
    header: 'Phone',
    className: 'md:w-[1%] md:whitespace-nowrap',
    render: (row: InventoryFinanceRow) => (
      <span className="text-red-600 dark:text-red-400 font-medium">{row.phone}</span>
    )
  },
  {
    key: 'endDate',
    header: 'End Date',
    className: 'md:w-[1%] md:whitespace-nowrap',
    render: (row: InventoryFinanceRow) => (
      <span className="text-red-600 dark:text-red-400 font-medium">{row.endDate}</span>
    )
  },
  {
    key: 'notes',
    header: 'Notes',
    className: 'md:max-w-[200px] md:truncate',
    render: (row: InventoryFinanceRow) => (
      <span className="text-slate-500 dark:text-slate-400 italic text-xs">{row.notes}</span>
    )
  }
];
