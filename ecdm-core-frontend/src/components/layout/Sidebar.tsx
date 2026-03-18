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
    BarChart3,
    Briefcase,
    Calendar,
    ChevronDown, ChevronLeft, ChevronRight,
    ClipboardList,
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
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useState } from 'react';

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    LayoutDashboard, Users,
    Package, TrendingUp, ShoppingCart,
    Megaphone, Wrench, Star, Headphones, MessageSquare, ClipboardList,
    FileText, UserCog, FileEdit, Activity, Calendar, UserCheck, Archive,
    Kanban, FolderKanban, TrendingUpDown, Briefcase, DollarSign,
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
            { labelKey: 'marketingInsights', href: '/marketing/insights', icon: 'TrendingUp' },
        ]
    },
    {
        labelKey: 'sales', icon: 'ShoppingCart', children: [
            { labelKey: 'salesLeads', href: '/sales/leads', icon: 'Users' },
            { labelKey: 'salesData', href: '/sales/data', icon: 'FileText' },
            { labelKey: 'salesOrders', href: '/sales/order', icon: 'ClipboardList' },
            { labelKey: 'nonPotential', href: '/sales/non-potential', icon: 'Archive' },
            { labelKey: 'salesInsights', href: '/sales/insights', icon: 'Briefcase' },
        ]
    },
    {
        labelKey: 'customer', icon: 'Headphones', children: [
            { labelKey: 'customersList', href: '/customer/list', icon: 'Users' },
            { labelKey: 'customerOrders', href: '/customer/orders', icon: 'Package' },
            { labelKey: 'customerFollowUp', href: '/customer/follow-up', icon: 'ClipboardList' },
            { labelKey: 'customerFeedback', href: '/customer/feedback', icon: 'MessageSquare' },
        ]
    },
    {
        labelKey: 'finance', icon: 'DollarSign', children: [
            { labelKey: 'orderFinance', href: '/finance/orders', icon: 'DollarSign' },
        ]
    },
    {
        labelKey: 'operations', icon: 'Wrench', children: [
            { labelKey: 'workOrder', href: '/operations/work-order', icon: 'Wrench' },
            { labelKey: 'priceList', href: '/operations/price-list', icon: 'FileText' },
            { labelKey: 'reportOperation', href: '/operations/report', icon: 'Star' },
        ]
    },
    {
        labelKey: 'hr', icon: 'UserCheck', children: [
            { labelKey: 'hrEmployees', href: '/hr/employees', icon: 'Users' },
            { labelKey: 'hrAttendance', href: '/hr/attendance', icon: 'Calendar' },
        ]
    },
    {
        labelKey: 'rnd', icon: 'FolderKanban', children: [
            { labelKey: 'personalBoard', href: '/rnd/personal-board', icon: 'Kanban' },
            { labelKey: 'rndProjects', href: '/rnd/projects', icon: 'FolderKanban' },
            { labelKey: 'myPerformance', href: '/rnd/performance', icon: 'TrendingUpDown' },
        ]
    },
    {
        labelKey: 'administration', icon: 'UserCog', children: [
            { labelKey: 'userManagement', href: '/users', icon: 'Users' },
            { labelKey: 'modificationRequests', href: '/admin/requests', icon: 'FileEdit' },
            { labelKey: 'auditLogs', href: '/admin/audit-logs', icon: 'Activity' },
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
    const [openGroups, setOpenGroups] = useState<string[]>(['marketing', 'sales', 'customer', 'finance', 'operations', 'hr', 'administration', 'rnd']);

    const label = (key: string) => (nav as Record<string, string>)[key] ?? key;

    const toggle = (key: string) =>
        setOpenGroups((prev) =>
            prev.includes(key) ? prev.filter((g) => g !== key) : [...prev, key],
        );

    // ── RBAC: Filter navigation based on user role ─────────────────
    const getFilteredNav = () => {
        const role = user?.role;

        // Admin and SuperAdmin: see everything
        if (role === 'Admin' || role === 'SuperAdmin') {
            return NAV;
        }

        // R&D Engineer: ONLY Dashboard + R&D Workspace
        if (role === 'R&D_Engineer' || role === 'R&D') {
            return NAV.filter(item => ['dashboard', 'rnd'].includes(item.labelKey));
        }

        // Sales: ONLY Dashboard + Sales
        if (role === 'Sales') {
            return NAV.filter(item => ['dashboard', 'sales'].includes(item.labelKey));
        }

        // Marketing: ONLY Dashboard + Marketing
        if (role === 'Marketing') {
            return NAV.filter(item => ['dashboard', 'marketing'].includes(item.labelKey));
        }

        // Customer Service: ONLY Dashboard + Customer
        // NOTE: backend enum is 'CustomerService' (no space) — match both variants for resilience
        if (role === 'CustomerService' || role === 'Customer Service') {
            return NAV.filter(item => ['dashboard', 'customer'].includes(item.labelKey));
        }

        // Operations: ONLY Dashboard + Operations
        if (role === 'Operations') {
            return NAV.filter(item => ['dashboard', 'operations'].includes(item.labelKey));
        }

        // HR: ONLY Dashboard + HR
        if (role === 'HR') {
            return NAV.filter(item => ['dashboard', 'hr'].includes(item.labelKey));
        }

        // Default (unknown/unhandled role): Dashboard only — fail closed, never leak sections
        return NAV.filter(item => item.labelKey === 'dashboard');
    };

    const filteredNav = getFilteredNav();

    const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`;
    const isAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin';

    return (
        <aside className={cn(
            'fixed inset-inline-start-0 top-0 z-40 flex h-screen flex-col border-e border-[hsl(var(--border))] bg-[hsl(var(--card))] transition-all duration-300 ease-in-out',
            isCollapsed ? 'w-[var(--sidebar-collapsed-width)]' : 'w-[var(--sidebar-width)]'
        )}>
            {/* Logo + Toggle */}
            <div className="flex h-[var(--header-height)] items-center border-b border-[hsl(var(--border))] px-2">
                {!isCollapsed && (
                    <div className="flex items-center gap-2.5 flex-1 min-w-0 ps-1">
                        <Image src="/logo.png" alt="ECDM" width={28} height={28} className="rounded-md shrink-0" />
                        <div className="min-w-0">
                            <h1 className="text-[13px] font-bold leading-tight">ECDM Core</h1>
                            <p className="text-[10px] text-[hsl(var(--muted-foreground))] truncate">{nav.erpPlatform}</p>
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
                    className="shrink-0 rounded-md p-1 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))] transition-colors"
                    title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto overflow-x-hidden px-1.5 py-2 space-y-0.5">
                {filteredNav.map((item) => {
                    const Icon = iconMap[item.icon];

                    if (item.href) {
                        const isActive = pathname === item.href;
                        return (
                            <Link key={item.labelKey} href={item.href}
                                title={isCollapsed ? label(item.labelKey) : undefined}
                                className={cn(
                                    'flex items-center rounded-lg py-1.5 text-[13px] font-medium transition-all',
                                    isCollapsed ? 'justify-center px-0' : 'gap-2 px-2',
                                    isActive
                                        ? 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]'
                                        : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]',
                                )}>
                                {Icon && <Icon size={15} className="shrink-0" />}
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
                                    'flex w-full items-center rounded-lg py-1.5 text-[13px] font-medium transition-all',
                                    isCollapsed ? 'justify-center px-0' : 'gap-2 px-2',
                                    anyChildActive
                                        ? 'text-[hsl(var(--primary))]'
                                        : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]'
                                )}>
                                {Icon && <Icon size={15} className="shrink-0" />}
                                {!isCollapsed && (
                                    <>
                                        <span className="flex-1 text-start truncate">{label(item.labelKey)}</span>
                                        <ChevronDown size={12} className={cn('shrink-0 transition-transform', isOpen && 'rotate-180')} />
                                    </>
                                )}
                            </button>

                            {!isCollapsed && isOpen && item.children && (
                                <div className="ms-3 mt-0.5 space-y-0.5 border-s border-[hsl(var(--border))] ps-2">
                                    {item.children.map((child) => {
                                        const ChildIcon = iconMap[child.icon];
                                        const isActive = pathname === child.href;
                                        return (
                                            <Link key={child.href} href={child.href}
                                                className={cn(
                                                    'flex items-center gap-2 rounded-md px-2 py-1 text-[12px] transition-all',
                                                    isActive
                                                        ? 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] font-medium'
                                                        : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]',
                                                )}>
                                                {ChildIcon && <ChildIcon size={13} className="shrink-0" />}
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
                                                        ? 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]'
                                                        : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]',
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
                            <h3 className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2 px-2">
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
                                        ? 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]'
                                        : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]',
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
                                        ? 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]'
                                        : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]',
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
                                        ? 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]'
                                        : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]',
                                )}>
                                <Users size={15} className="shrink-0" />
                                {!isCollapsed && <span className="truncate">Operation Members</span>}
                            </Link>
                        </div>
                    </div>
                )}
            </nav>

            {/* User Footer with Dropdown */}
            <div className="border-t border-[hsl(var(--border))] px-1.5 py-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className={cn(
                            'flex w-full items-center rounded-lg p-1.5 text-left transition-all hover:bg-[hsl(var(--secondary))]',
                            isCollapsed ? 'justify-center' : 'gap-2'
                        )}>
                            {/* Avatar */}
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-xs font-bold text-white">
                                {initials}
                            </div>
                            {!isCollapsed && (
                                <div className="flex-1 min-w-0">
                                    <p className="text-[12px] font-medium leading-tight truncate">
                                        {user?.firstName} {user?.lastName}
                                    </p>
                                    <p className="text-[10px] text-[hsl(var(--muted-foreground))] truncate capitalize">
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
