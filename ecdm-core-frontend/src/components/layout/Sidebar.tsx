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

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    LayoutDashboard, Users, UserCog, Briefcase,
    Package, FolderTree, ArrowUpDown, Layers,
    Megaphone, FileVideo, TrendingUp, ShoppingCart,
    Wrench, Star, Headphones, MessageSquare, ClipboardList,
    FileText, CheckSquare,
};

interface NavChild {
    label: string;
    href: string;
    icon: string;
}

interface NavItem {
    label: string;
    href?: string;
    icon: string;
    children?: readonly NavChild[];
}

const NAV: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },

    // ── Marketing ──────────────────────────────────────────────────────────────
    {
        label: 'Marketing', icon: 'Megaphone',
        children: [
            { label: 'Campaigns',       href: '/dashboard/marketing/campaigns',       icon: 'Megaphone' },
            { label: 'Content Tracker', href: '/dashboard/marketing/content-tracker', icon: 'FileVideo' },
        ],
    },

    // ── CRM & Sales ────────────────────────────────────────────────────────────
    {
        label: 'CRM & Sales', icon: 'Users',
        children: [
            { label: 'Customers',    href: '/dashboard/crm/customers',    icon: 'Users' },
            { label: 'Sales Leads',  href: '/dashboard/crm/sales-leads',  icon: 'TrendingUp' },
            { label: 'Sales Orders', href: '/dashboard/crm/sales-orders', icon: 'ShoppingCart' },
        ],
    },

    // ── Operations (Work Orders) ───────────────────────────────────────────────
    {
        label: 'Operations', icon: 'Wrench',
        children: [
            { label: 'Work Orders',          href: '/dashboard/erp/work-orders',          icon: 'Wrench' },
            { label: 'Employee Evaluations', href: '/dashboard/erp/employee-evaluations', icon: 'Star' },
            { label: 'Employees',            href: '/dashboard/erp/employees',            icon: 'UserCog' },
        ],
    },

    // ── Customer Service ───────────────────────────────────────────────────────
    {
        label: 'Customer Service', icon: 'Headphones',
        children: [
            { label: 'Follow-Ups', href: '/dashboard/customer-service/follow-ups', icon: 'ClipboardList' },
            { label: 'Feedback',   href: '/dashboard/customer-service/feedback',   icon: 'MessageSquare' },
        ],
    },

    // ── Inventory ──────────────────────────────────────────────────────────────
    {
        label: 'Inventory', icon: 'Package',
        children: [
            { label: 'Spare Parts', href: '/dashboard/inventory/inventory-items', icon: 'Layers' },
            { label: 'Products',    href: '/dashboard/inventory/products',        icon: 'Package' },
            { label: 'Categories',  href: '/dashboard/inventory/categories',      icon: 'FolderTree' },
            { label: 'Stock',       href: '/dashboard/inventory/stock',           icon: 'ArrowUpDown' },
        ],
    },

    // ── ERP / Finance ──────────────────────────────────────────────────────────
    {
        label: 'Finance', icon: 'Briefcase',
        children: [
            { label: 'Invoices', href: '/dashboard/erp/invoices', icon: 'FileText' },
            { label: 'Tasks',    href: '/dashboard/erp/tasks',    icon: 'CheckSquare' },
        ],
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [openGroups, setOpenGroups] = useState<string[]>(['CRM & Sales', 'Operations']);

    const toggle = (label: string) =>
        setOpenGroups((prev) =>
            prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label],
        );

    return (
        <aside className="fixed left-0 top-0 z-40 flex h-screen w-[var(--sidebar-width)] flex-col border-r border-[hsl(var(--border))] bg-[hsl(var(--card))]">
            {/* Logo */}
            <div className="flex h-[var(--header-height)] items-center gap-3 px-5 border-b border-[hsl(var(--border))]">
                <Image src="/logo.png" alt="ECDM" width={36} height={36} className="rounded-lg" />
                <div>
                    <h1 className="text-sm font-bold">ECDM Core</h1>
                    <p className="text-[10px] text-[hsl(var(--muted-foreground))]">ERP &amp; CRM Platform</p>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                {NAV.map((item) => {
                    const Icon = iconMap[item.icon];

                    if (item.href) {
                        const isActive = pathname === item.href;
                        return (
                            <Link key={item.label} href={item.href}
                                className={cn(
                                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                                    isActive
                                        ? 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]'
                                        : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-white',
                                )}>
                                {Icon && <Icon size={18} />}
                                {item.label}
                            </Link>
                        );
                    }

                    const isOpen = openGroups.includes(item.label);
                    return (
                        <div key={item.label}>
                            <button onClick={() => toggle(item.label)}
                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-white transition-all">
                                {Icon && <Icon size={18} />}
                                <span className="flex-1 text-left">{item.label}</span>
                                <ChevronDown size={14} className={cn('transition-transform', isOpen && 'rotate-180')} />
                            </button>

                            {isOpen && item.children && (
                                <div className="ml-4 mt-1 space-y-1 border-l border-[hsl(var(--border))] pl-3">
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
                                                {child.label}
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
