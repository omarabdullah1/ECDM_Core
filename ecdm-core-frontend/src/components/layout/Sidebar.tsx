'use client';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/features/auth/useAuth';
import { useT } from '@/i18n/useT';
import { cn } from '@/lib/utils';
import {
    Activity,
    Archive,
    Banknote,
    BarChart3,
    Briefcase,
    Calendar,
    ChevronDown, ChevronLeft, ChevronRight,
    ClipboardCheck,
    ClipboardList,
    CreditCard,
    DollarSign,
    FileEdit,
    FileSpreadsheet,
    FileText,
    FolderKanban,
    Headphones,
    Kanban,
    LayoutDashboard,
    LogOut,
    Megaphone,
    MessageSquare,
    Package,
    Settings,
    ShoppingCart,
    Star,
    TrendingUp,
    TrendingUpDown,
    User,
    UserCheck,
    UserCog,
    Users,
    Wrench,
    Tags,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useState } from 'react';

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    LayoutDashboard, Users,
    Package, TrendingUp, ShoppingCart,
    Megaphone, Wrench, Star, Headphones, MessageSquare, ClipboardList, ClipboardCheck,
    CreditCard, Banknote,
    FileText, UserCog, FileEdit, Activity, Calendar, UserCheck, Archive,
    Kanban, FolderKanban, TrendingUpDown, Briefcase, DollarSign, Tags,
};

interface NavChild { labelKey: string; href: string; icon: string; }
interface NavItem { labelKey: string; href?: string; icon: string; children?: readonly NavChild[]; }

const NAV: NavItem[] = [
    { labelKey: 'dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
    {
        labelKey: 'marketing', icon: 'Megaphone', children: [
            { labelKey: 'marketingLeads', href: '/marketing/leads', icon: 'TrendingUp' },
            { labelKey: 'contentTracker', href: '/marketing/content', icon: 'FileText' },
            { labelKey: 'campaignResults', href: '/marketing/campaigns', icon: 'Activity' },
        ]
    },
    {
        labelKey: 'sales', icon: 'ShoppingCart', children: [
            { labelKey: 'salesLeads', href: '/sales/leads', icon: 'Users' },
            { labelKey: 'salesData', href: '/sales/data', icon: 'FileText' },
            { labelKey: 'salesOrders', href: '/sales/order', icon: 'ClipboardList' },
            { labelKey: 'myCustomers', href: '/sales/my-customers', icon: 'UserCheck' },
            { labelKey: 'nonPotential', href: '/sales/non-potential', icon: 'Archive' },
        ]
    },
    {
        labelKey: 'customer', icon: 'Headphones', children: [
            { labelKey: 'customersList', href: '/customer/list', icon: 'Users' },
            { labelKey: 'myCustomers', href: '/customer/my-customers', icon: 'UserCheck' },
            { labelKey: 'customerOrders', href: '/customer/orders', icon: 'Package' },
            { labelKey: 'customerFollowUp', href: '/customer/follow-up', icon: 'ClipboardList' },
            { labelKey: 'customerFeedback', href: '/customer/feedback', icon: 'MessageSquare' },
        ]
    },
    {
        labelKey: 'finance', icon: 'DollarSign', children: [
            { labelKey: 'invoices', href: '/finance/invoices', icon: 'FileText' },
            { labelKey: 'orderFinance', href: '/finance/order-finance', icon: 'DollarSign' },
            { labelKey: 'inventoryFinance', href: '/finance/inventory', icon: 'Package' },
            { labelKey: 'generalExpenses', href: '/finance/expenses', icon: 'CreditCard' },
            { labelKey: 'salaries', href: '/finance/salaries', icon: 'Banknote' },
        ]
    },
    {
        labelKey: 'operations', icon: 'Wrench', children: [
            { labelKey: 'workOrder', href: '/operations/work-order', icon: 'Wrench' },
            { labelKey: 'inventory', href: '/operations/inventory', icon: 'FileText' },
            { labelKey: 'purchaseOrder', href: '/operations/purchase-order', icon: 'ShoppingCart' },
            { labelKey: 'reportOperation', href: '/operations/report', icon: 'Star' },
        ]
    },
    { labelKey: 'priceList', href: '/price-list', icon: 'Tags' },
    {
        labelKey: 'hr', icon: 'UserCheck', children: [
            { labelKey: 'hrEmployees', href: '/hr/users', icon: 'Users' },
            { labelKey: 'hrAttendance', href: '/hr/attendance', icon: 'Calendar' },
        ]
    },

    {
        labelKey: 'administration', icon: 'UserCog', children: [
            { labelKey: 'userManagement', href: '/users', icon: 'Users' },
            { labelKey: 'modificationRequests', href: '/admin/requests', icon: 'FileEdit' },
            { labelKey: 'auditLogs', href: '/admin/audit-logs', icon: 'Activity' },
            { labelKey: 'netProfitReport', href: '/reports/net-profit', icon: 'DollarSign' },
        ]
    },
];

interface SidebarProps {
    isCollapsed: boolean;
    onToggle: () => void;
}

export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const t = useT();
    const nav = t.nav;
    const { user, logout } = useAuthStore();
    const [openGroups, setOpenGroups] = useState<string[]>(['marketing', 'sales', 'customer', 'finance', 'operations', 'hr', 'administration']);

    const label = (key: string) => (nav as Record<string, string>)[key] ?? key;

    const toggle = (key: string) =>
        setOpenGroups((prev) =>
            prev.includes(key) ? prev.filter((g) => g !== key) : [...prev, key],
        );

    // ── RBAC: Filter navigation based on user role ─────────────────
    const getFilteredNav = () => {
        const role = user?.role;
        const adminRoles = ['Admin', 'SuperAdmin', 'Manager'];

        // SuperAdmin has full access to everything
        if (role === 'SuperAdmin') {
            return NAV;
        }

        // Helper to get restricted customer nav
        const getRestrictedCustomerNav = (navItems: typeof NAV) => {
            if (role === 'Customer Service' || role === 'CustomerService') return navItems;
            return navItems.map(item => {
                if (item.labelKey === 'customer') {
                    return {
                        ...item,
                        children: item.children?.filter(child => {
                            // These roles specifically cannot see the customersList
                            const rolesDeniedList = ['Operations', 'Maintenance', 'MaintenanceEngineer', 'Technician'];
                            if (rolesDeniedList.includes(role || '') && child.labelKey === 'customersList') return false;
                            
                            // Other restricted roles only see the list
                            return child.labelKey === 'customersList';
                        })
                    };
                }
                return item;
            }).filter(item => item.labelKey !== 'customer' || (item.children && item.children.length > 0));
        };

        const restrictedRoles = [
            'Admin',
            'Manager',
            'Sales',
            'Marketing',
            'Customer Service',
            'CustomerService',
            'Operations',
            'HR',
            'Finance',
            'Maintenance',
            'MaintenanceEngineer',
            'Technician'
        ];

        if (restrictedRoles.includes(role || '')) {
            let allowedKeys: string[] = [];
            
            // Only admins and managers see the dashboard
            if (adminRoles.includes(role || '')) {
                allowedKeys.push('dashboard');
            }

            if (role === 'Admin') allowedKeys.push('marketing', 'sales', 'customer', 'finance', 'operations', 'hr', 'priceList');
            
            if (role === 'Sales') allowedKeys.push('sales', 'priceList');
            if (role === 'Marketing') allowedKeys.push('marketing');
            if (role === 'Operations') allowedKeys.push('operations');
            if (role === 'HR') allowedKeys.push('hr');
            if (role === 'Finance') allowedKeys.push('finance', 'operations', 'priceList');
            if (role === 'Maintenance' || role === 'MaintenanceEngineer') allowedKeys.push('operations');
            if (role === 'Customer Service' || role === 'CustomerService') allowedKeys.push('customer');
            if (role === 'Manager') {
                // Manager now gets restricted like the others for customer, but sees other sections
                return getRestrictedCustomerNav(NAV.filter(item => item.labelKey !== 'administration'));
            }

            // Marketing is restricted from customer, and now Sales too (they have "My Customers")
            // Marketing/Sales/Operations/Maintenance/Technician are restricted from customer list
            const noCustomerGroupRoles = ['Marketing', 'Sales', 'Operations', 'Maintenance', 'MaintenanceEngineer', 'Technician'];
            if (!allowedKeys.includes('customer') && !noCustomerGroupRoles.includes(role || '')) allowedKeys.push('customer');

            const filteredNavItems = NAV.filter(item => allowedKeys.includes(item.labelKey)).map(item => {
                if (item.labelKey === 'operations') {
                    const rolesToRestrict = ['Operations', 'Maintenance', 'MaintenanceEngineer', 'Technician'];
                    if (rolesToRestrict.includes(role || '')) {
                        return {
                            ...item,
                            children: item.children?.filter(child => 
                                child.labelKey !== 'purchaseOrder'
                            )
                        };
                    }
                }
                return item;
            });

            return getRestrictedCustomerNav(filteredNavItems);
        }

        if (role === 'R&D_Engineer' || role === 'R&D') {
            return NAV.filter(item => adminRoles.includes(role || '') && ['dashboard'].includes(item.labelKey));
        }

        return NAV.filter(item => adminRoles.includes(role || '') && item.labelKey === 'dashboard');
    };

    const filteredNav = getFilteredNav();

    const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`;
    const adminRoles = ['Admin', 'SuperAdmin', 'Manager'];
    const isAdmin = adminRoles.includes(user?.role || '');

    return (
        <aside className={cn(
            'fixed inset-inline-start-0 top-0 z-40 flex h-screen flex-col bg-[#111111] transition-all duration-300 ease-in-out border-r border-[#262626]',
            isCollapsed ? 'w-[var(--sidebar-collapsed-width)]' : 'w-[var(--sidebar-width)]'
        )}>
            <div className="flex h-[var(--header-height)] items-center border-b border-[#262626] px-3">
                {!isCollapsed && (
                    <div className="flex items-center gap-2.5 flex-1 min-w-0 ps-1">
                        <Image src="/logo.png" alt="ECDM" width={28} height={28} className="rounded-md shrink-0" />
                        <div className="min-w-0 text-white">
                            <h1 className="text-[13px] font-bold leading-tight tracking-wider">ECDM Core</h1>
                            <p className="text-[10px] text-[#8b919e] truncate uppercase tracking-widest">{nav.erpPlatform}</p>
                        </div>
                    </div>
                )}
                {isCollapsed && (
                    <div className="flex flex-1 justify-center">
                        <Image src="/logo.png" alt="ECDM" width={24} height={24} className="rounded-md" />
                    </div>
                )}
                <button
                    onClick={onToggle}
                    className="shrink-0 rounded-md p-1 text-[#8b919e] hover:bg-white/10 hover:text-white transition-colors"
                    title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-1">
                {filteredNav.map((item) => {
                    const Icon = iconMap[item.icon];

                    if (item.href) {
                        const isActive = pathname === item.href;
                        return (
                            <Link key={item.labelKey} href={item.href}
                                title={isCollapsed ? label(item.labelKey) : undefined}
                                className={cn(
                                    'group flex items-center rounded-xl py-2 text-[12px] font-semibold transition-all duration-200',
                                    isCollapsed ? 'justify-center px-0' : 'gap-3 px-3',
                                    isActive
                                        ? 'bg-white text-black shadow-md'
                                        : 'text-[#8b919e] hover:bg-white/10 hover:text-white',
                                )}>
                                {Icon && <Icon size={16} className={cn("shrink-0 transition-transform duration-200", !isActive && "group-hover:scale-110")} />}
                                {!isCollapsed && <span className="truncate">{label(item.labelKey)}</span>}
                            </Link>
                        );
                    }

                    const isOpen = openGroups.includes(item.labelKey);
                    const anyChildActive = item.children?.some(c => pathname.startsWith(c.href));

                    return (
                        <div key={item.labelKey}>
                            <button
                                onClick={() => !isCollapsed && toggle(item.labelKey)}
                                title={isCollapsed ? label(item.labelKey) : undefined}
                                className={cn(
                                    'group flex w-full items-center rounded-lg py-1.5 text-[13px] font-medium transition-all duration-200',
                                    isCollapsed ? 'justify-center px-0' : 'gap-2 px-2',
                                    anyChildActive
                                        ? 'text-white'
                                        : 'text-[#8b919e] hover:bg-white/10 hover:text-white'
                                )}>
                                {Icon && <Icon size={15} className={cn("shrink-0 transition-transform duration-200", !anyChildActive && "group-hover:scale-110")} />}
                                {!isCollapsed && (
                                    <>
                                        <span className="flex-1 text-start truncate">{label(item.labelKey)}</span>
                                        <ChevronDown size={12} className={cn('shrink-0 transition-transform', isOpen && 'rotate-180')} />
                                    </>
                                )}
                            </button>

                            {!isCollapsed && isOpen && item.children && (
                                <div className="ms-3 mt-1 space-y-0.5 border-s border-[#262626] ps-3">
                                    {item.children.map((child) => {
                                        const ChildIcon = iconMap[child.icon];
                                        const isActive = pathname === child.href;
                                        return (
                                            <Link key={child.href} href={child.href}
                                                className={cn(
                                                    'group flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] transition-all duration-200 hover:translate-x-1',
                                                    isActive
                                                        ? 'bg-white/10 text-white font-medium shadow-sm'
                                                        : 'text-[#8b919e] hover:text-white',
                                                )}>
                                                {ChildIcon && <ChildIcon size={13} className="shrink-0 transition-colors duration-200 group-hover:text-white" />}
                                                <span className="truncate">{label(child.labelKey)}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Collapsed: show children as icon-only links */}
                            {isCollapsed && item.children && (
                                <div className="mt-0.5 space-y-0.5">
                                    {item.children.map((child) => {
                                        const ChildIcon = iconMap[child.icon];
                                        const isActive = pathname === child.href;
                                        return (
                                            <Link key={child.href} href={child.href}
                                                title={label(child.labelKey)}
                                                className={cn(
                                                    'flex justify-center rounded-md py-1 text-[12px] transition-all',
                                                    isActive
                                                        ? 'bg-white/10 text-white'
                                                        : 'text-[#8b919e] hover:bg-white/10 hover:text-white',
                                                )}>
                                                {ChildIcon && <ChildIcon size={13} />}
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* EMPLOYEE REPORTS: Admin ONLY */}
                {isAdmin && (
                    <div className="mt-4 mb-2">
                        {!isCollapsed && (
                            <h3 className="text-[11px] font-semibold text-[#8b919e] uppercase tracking-wider mb-2 px-2">
                                Employee Reports
                            </h3>
                        )}
                        <div className="space-y-0.5">
                            <Link href="/reports/sales"
                                title={isCollapsed ? "Sales Report" : undefined}
                                className={cn(
                                    'flex items-center rounded-lg py-1.5 text-[13px] font-medium transition-all',
                                    isCollapsed ? 'justify-center px-0' : 'gap-2 px-2',
                                    pathname === '/reports/sales'
                                        ? 'bg-white/10 text-white'
                                        : 'text-[#8b919e] hover:bg-white/10 hover:text-white',
                                )}>
                                <FileSpreadsheet size={15} className="shrink-0" />
                                {!isCollapsed && <span className="truncate">Sales Report</span>}
                            </Link>
                            <Link href="/reports/marketing"
                                title={isCollapsed ? "Marketing Report" : undefined}
                                className={cn(
                                    'flex items-center rounded-lg py-1.5 text-[13px] font-medium transition-all',
                                    isCollapsed ? 'justify-center px-0' : 'gap-2 px-2',
                                    pathname === '/reports/marketing'
                                        ? 'bg-white/10 text-white'
                                        : 'text-[#8b919e] hover:bg-white/10 hover:text-white',
                                )}>
                                <BarChart3 size={15} className="shrink-0" />
                                {!isCollapsed && <span className="truncate">Marketing Report</span>}
                            </Link>
                            <Link href="/reports/operation-members"
                                title={isCollapsed ? "Operation Members" : undefined}
                                className={cn(
                                    'flex items-center rounded-lg py-1.5 text-[13px] font-medium transition-all',
                                    isCollapsed ? 'justify-center px-0' : 'gap-2 px-2',
                                    pathname === '/reports/operation-members'
                                        ? 'bg-white/10 text-white'
                                        : 'text-[#8b919e] hover:bg-white/10 hover:text-white',
                                )}>
                                <Users size={15} className="shrink-0" />
                                {!isCollapsed && <span className="truncate">Operation Members</span>}
                            </Link>
<Link href="/reports/employee-evaluation"
    title={isCollapsed ? "Employee Evaluation" : undefined}
    className={cn(
        'flex items-center rounded-lg py-1.5 text-[13px] font-medium transition-all',
        isCollapsed ? 'justify-center px-0' : 'gap-2 px-2',
        pathname === '/reports/employee-evaluation'
            ? 'bg-white/10 text-white'
            : 'text-[#8b919e] hover:bg-white/10 hover:text-white',
    )}>
    <ClipboardCheck size={15} className="shrink-0" />
    {!isCollapsed && <span className="truncate">Employee Evaluation</span>}
</Link>
<Link href="/reports/hr-efficiency"
    title={isCollapsed ? "HR Efficiency" : undefined}
    className={cn(
        'flex items-center rounded-lg py-1.5 text-[13px] font-medium transition-all',
        isCollapsed ? 'justify-center px-0' : 'gap-2 px-2',
        pathname === '/reports/hr-efficiency'
            ? 'bg-white/10 text-white'
            : 'text-[#8b919e] hover:bg-white/10 hover:text-white',
    )}>
    <BarChart3 size={15} className="shrink-0" />
    {!isCollapsed && <span className="truncate">HR Efficiency</span>}
</Link>
                        </div>
                    </div>
                )}
            </nav>

            {/* User Footer with Dropdown */}
            <div className="border-t border-[#262626] px-3 py-3">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className={cn(
                            'flex w-full items-center rounded-md p-2 text-left transition-all hover:bg-white/10',
                            isCollapsed ? 'justify-center' : 'gap-3'
                        )}>
                            {/* Avatar */}
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white text-xs font-bold text-black shadow-sm">
                                {initials}
                            </div>
                            {!isCollapsed && (
                                <div className="flex-1 min-w-0 text-white">
                                    <p className="text-[12px] font-medium leading-tight truncate">
                                        {user?.firstName} {user?.lastName}
                                    </p>
                                    <p className="text-[10px] text-[#8b919e] truncate capitalize">
                                        {user?.role}
                                    </p>
                                </div>
                            )}
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="end" className="w-52">
                        <div className="px-2 py-1.5 border-b border-[hsl(var(--border))] mb-1">
                            <p className="text-xs font-semibold truncate">{user?.firstName} {user?.lastName}</p>
                            <p className="text-[11px] text-[hsl(var(--muted-foreground))] truncate">{user?.email}</p>
                        </div>
                        <DropdownMenuItem onClick={() => router.push('/profile')} className="gap-2 text-xs cursor-pointer">
                            <User size={13} />
                            My Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push('/settings')} className="gap-2 text-xs cursor-pointer">
                            <Settings size={13} />
                            Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={logout}
                            className="gap-2 text-xs cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/10"
                        >
                            <LogOut size={13} />
                            Sign Out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </aside>
    );
}

