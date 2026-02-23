'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard, Users, UserCog, Briefcase, ChevronDown,
    Package, FolderTree, ArrowUpDown, Layers,
    Megaphone, FileVideo, TrendingUp, ShoppingCart,
    Wrench, Star, Headphones, MessageSquare, ClipboardList,
    FileText, CheckSquare,
} from 'lucide-react';
import { useState } from 'react';
import { useT } from '@/i18n/useT';

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    LayoutDashboard, Users, UserCog, Briefcase,
    Package, FolderTree, ArrowUpDown, Layers,
    Megaphone, FileVideo, TrendingUp, ShoppingCart,
    Wrench, Star, Headphones, MessageSquare, ClipboardList,
    FileText, CheckSquare,
};

interface NavChild { labelKey: string; href: string; icon: string; }
interface NavItem  { labelKey: string; href?: string; icon: string; children?: readonly NavChild[]; }

const NAV: NavItem[] = [
    { labelKey: 'dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
    { labelKey: 'marketing', icon: 'Megaphone', children: [
        { labelKey: 'campaigns',       href: '/dashboard/marketing/campaigns',       icon: 'Megaphone' },
        { labelKey: 'contentTracker',  href: '/dashboard/marketing/content-tracker', icon: 'FileVideo' },
    ]},
    { labelKey: 'crmSales', icon: 'Users', children: [
        { labelKey: 'customers',    href: '/dashboard/crm/customers',    icon: 'Users' },
        { labelKey: 'salesLeads',   href: '/dashboard/crm/sales-leads',  icon: 'TrendingUp' },
        { labelKey: 'salesOrders',  href: '/dashboard/crm/sales-orders', icon: 'ShoppingCart' },
    ]},
    { labelKey: 'operations', icon: 'Wrench', children: [
        { labelKey: 'workOrders',           href: '/dashboard/erp/work-orders',          icon: 'Wrench' },
        { labelKey: 'employeeEvaluations',  href: '/dashboard/erp/employee-evaluations', icon: 'Star' },
        { labelKey: 'employees',            href: '/dashboard/erp/employees',            icon: 'UserCog' },
    ]},
    { labelKey: 'customerService', icon: 'Headphones', children: [
        { labelKey: 'followUps', href: '/dashboard/customer-service/follow-ups', icon: 'ClipboardList' },
        { labelKey: 'feedback',  href: '/dashboard/customer-service/feedback',   icon: 'MessageSquare' },
    ]},
    { labelKey: 'inventory', icon: 'Package', children: [
        { labelKey: 'spareParts', href: '/dashboard/inventory/inventory-items', icon: 'Layers' },
        { labelKey: 'products',   href: '/dashboard/inventory/products',        icon: 'Package' },
        { labelKey: 'categories', href: '/dashboard/inventory/categories',      icon: 'FolderTree' },
        { labelKey: 'stock',      href: '/dashboard/inventory/stock',           icon: 'ArrowUpDown' },
    ]},
    { labelKey: 'finance', icon: 'Briefcase', children: [
        { labelKey: 'invoices', href: '/dashboard/erp/invoices', icon: 'FileText' },
        { labelKey: 'tasks',    href: '/dashboard/erp/tasks',    icon: 'CheckSquare' },
    ]},
];

export default function Sidebar() {
    const pathname = usePathname();
    const t = useT();
    const nav = t.nav;
    const [openGroups, setOpenGroups] = useState<string[]>(['crmSales', 'operations']);

    const label = (key: string) => (nav as Record<string, string>)[key] ?? key;

    const toggle = (key: string) =>
        setOpenGroups((prev) =>
            prev.includes(key) ? prev.filter((g) => g !== key) : [...prev, key],
        );

    return (
        <aside className="fixed left-0 top-0 z-40 flex h-screen w-[var(--sidebar-width)] flex-col border-r border-[hsl(var(--border))] bg-[hsl(var(--card))]">
            {/* Logo */}
            <div className="flex h-[var(--header-height)] items-center gap-3 px-5 border-b border-[hsl(var(--border))]">
                <Image src="/logo.png" alt="ECDM" width={36} height={36} className="rounded-lg" />
                <div>
                    <h1 className="text-sm font-bold">ECDM Core</h1>
                    <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{nav.erpPlatform}</p>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                {NAV.map((item) => {
                    const Icon = iconMap[item.icon];

                    if (item.href) {
                        const isActive = pathname === item.href;
                        return (
                            <Link key={item.labelKey} href={item.href}
                                className={cn(
                                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                                    isActive
                                        ? 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]'
                                        : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-white',
                                )}>
                                {Icon && <Icon size={18} />}
                                {label(item.labelKey)}
                            </Link>
                        );
                    }

                    const isOpen = openGroups.includes(item.labelKey);
                    return (
                        <div key={item.labelKey}>
                            <button onClick={() => toggle(item.labelKey)}
                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-white transition-all">
                                {Icon && <Icon size={18} />}
                                <span className="flex-1 text-start">{label(item.labelKey)}</span>
                                <ChevronDown size={14} className={cn('transition-transform', isOpen && 'rotate-180')} />
                            </button>

                            {isOpen && item.children && (
                                <div className="ms-4 mt-1 space-y-1 border-s border-[hsl(var(--border))] ps-3">
                                    {item.children.map((child) => {
                                        const ChildIcon = iconMap[child.icon];
                                        const isActive = pathname === child.href;
                                        return (
                                            <Link key={child.href} href={child.href}
                                                className={cn(
                                                    'flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-all',
                                                    isActive
                                                        ? 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] font-medium'
                                                        : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-white',
                                                )}>
                                                {ChildIcon && <ChildIcon size={15} />}
                                                {label(child.labelKey)}
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-[hsl(var(--border))]">
                <p className="text-[10px] text-[hsl(var(--muted-foreground))] text-center">
                    © 2026 ECDM Solutions
                </p>
            </div>
        </aside>
    );
}
