export const APP_NAME = 'ECDM Core';

const PRODUCTION_API_URL = 'https://ecdmback-1r2qkw1m.b4a.run/api';
const DEVELOPMENT_API_URL = 'http://localhost:5001/api';

export const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL ||
    (process.env.NODE_ENV === 'production' ? PRODUCTION_API_URL : DEVELOPMENT_API_URL);

export const USER_ROLES = {
    SuperAdmin: 'SuperAdmin',
    Manager: 'Manager',
    Sales: 'Sales',
    HR: 'HR',
} as const;

export const CLIENT_STATUS = {
    Active: 'Active',
    Inactive: 'Inactive',
    Prospect: 'Prospect',
    Churned: 'Churned',
} as const;

export const TASK_STATUS = {
    Todo: 'To-do',
    InProgress: 'In Progress',
    Done: 'Done',
} as const;

export const TASK_PRIORITY = {
    Low: 'Low',
    Medium: 'Medium',
    High: 'High',
    Urgent: 'Urgent',
} as const;

export const NAV_ITEMS = [
    { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
    {
        label: 'CRM',
        icon: 'Users',
        children: [
            { label: 'Clients', href: '/dashboard/crm/clients', icon: 'Building2' },
            { label: 'Leads', href: '/dashboard/crm/leads', icon: 'Target' },
            { label: 'Activities', href: '/dashboard/crm/activities', icon: 'Activity' },
        ],
    },
    {
        label: 'ERP',
        icon: 'Briefcase',
        children: [
            { label: 'Employees', href: '/dashboard/erp/employees', icon: 'UserCog' },
            { label: 'Tasks', href: '/dashboard/erp/tasks', icon: 'CheckSquare' },
            { label: 'Invoices', href: '/dashboard/erp/invoices', icon: 'FileText' },
        ],
    },
] as const;
