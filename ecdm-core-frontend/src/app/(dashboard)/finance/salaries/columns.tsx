'use client';

import { Column } from '@/components/ui/DataTable';

export interface SalaryRow {
  _id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  basicSalary: string;
  allowances: string;
  overtime: string;
  bonuses: string;
  percentage: string;
  tax: string;
  insurance: string;
  absenceDeduction: string;
  otherDeductions: string;
  notes: string;
}

const getStatusBadgeClass = (status: string) => {
  switch (status.toLowerCase()) {
    case 'paid':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    default:
      return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400';
  }
};

export const columns: Column<SalaryRow>[] = [
  {
    key: 'employeeId',
    header: 'ID',
    className: 'md:w-[1%] md:whitespace-nowrap',
    render: (row: SalaryRow) => (
      <span className="font-mono text-slate-500 dark:text-slate-400 text-xs text-center block">
        {row.employeeId}
      </span>
    )
  },
  {
    key: 'employeeName',
    header: 'Name',
    className: 'md:w-auto md:max-w-[150px] md:truncate',
    render: (row: SalaryRow) => (
      <span className="font-bold text-slate-900 dark:text-white">
        {row.employeeName}
      </span>
    )
  },
  {
    key: 'department',
    header: 'Dept.',
    className: 'md:w-[1%] md:whitespace-nowrap',
  },
  {
    key: 'basicSalary',
    header: 'Basic Salary',
    className: 'md:w-[1%] md:whitespace-nowrap',
    render: (row: SalaryRow) => (
      <span className="font-bold text-blue-600 dark:text-blue-400">
        {row.basicSalary}
      </span>
    )
  },
  {
    key: 'allowances',
    header: 'Allowances',
    className: 'md:w-[1%] md:whitespace-nowrap',
  },
  {
    key: 'overtime',
    header: 'Overtime',
    className: 'md:w-[1%] md:whitespace-nowrap',
  },
  {
    key: 'bonuses',
    header: 'Bonuses',
    className: 'md:w-[1%] md:whitespace-nowrap',
  },
  {
    key: 'tax',
    header: 'Tax',
    className: 'md:w-[1%] md:whitespace-nowrap',
    render: (row: SalaryRow) => (
      <span className="text-red-600 dark:text-red-400 font-medium whitespace-nowrap">
        {row.tax}
      </span>
    )
  },
  {
    key: 'insurance',
    header: 'Insurance',
    className: 'md:w-[1%] md:whitespace-nowrap',
  },
  {
    key: 'absenceDeduction',
    header: 'Absence Ded.',
    className: 'md:w-[1%] md:whitespace-nowrap',
    render: (row: SalaryRow) => (
      <span className="text-red-600 dark:text-red-400 font-medium whitespace-nowrap">
        {row.absenceDeduction}
      </span>
    )
  },
  {
    key: 'otherDeductions',
    header: 'Other Ded.',
    className: 'md:w-[1%] md:whitespace-nowrap',
    render: (row: SalaryRow) => (
      <span className="text-red-600 dark:text-red-400 font-medium whitespace-nowrap">
        {row.otherDeductions}
      </span>
    )
  },
  {
    key: 'notes',
    header: 'Notes',
    className: 'md:max-w-[150px] md:truncate',
    render: (row: SalaryRow) => (
      <span className="text-slate-500 dark:text-slate-400 italic text-xs">
        {row.notes}
      </span>
    )
  }
];

