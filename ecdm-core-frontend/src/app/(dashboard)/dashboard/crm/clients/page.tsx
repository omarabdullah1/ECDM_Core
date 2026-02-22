'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';
import {
    Building2, Plus, Search, Edit2, Trash2, X, ChevronLeft, ChevronRight,
} from 'lucide-react';

interface Client {
    _id: string;
    companyName: string;
    industry?: string;
    email?: string;
    phone?: string;
    status: string;
    assignedTo?: { firstName: string; lastName: string };
    createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
    Active: 'bg-emerald-500/15 text-emerald-400',
    Inactive: 'bg-gray-500/15 text-gray-400',
    Prospect: 'bg-blue-500/15 text-blue-400',
    Churned: 'bg-red-500/15 text-red-400',
};

const inputCls = cn(
    'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm',
    'placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))]',
    'focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all'
);

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [form, setForm] = useState({ companyName: '', industry: '', email: '', phone: '', status: 'Prospect', assignedTo: '' });
    const [saving, setSaving] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [employees, setEmployees] = useState<{ _id: string; firstName: string; lastName: string }[]>([]);

    const limit = 10;
    const totalPages = Math.ceil(total / limit);

    const fetchClients = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/crm/clients', { params: { page, limit, search: search || undefined } });
            setClients(data.data.data);
            setTotal(data.data.pagination.total);
        } catch { /* ignore */ }
        setLoading(false);
    }, [page, search]);

    useEffect(() => { fetchClients(); }, [fetchClients]);

    useEffect(() => {
        api.get('/erp/employees', { params: { limit: 100 } }).then(r => setEmployees(r.data.data.data)).catch(() => { });
    }, []);

    const openCreate = () => {
        setEditingClient(null);
        setForm({ companyName: '', industry: '', email: '', phone: '', status: 'Prospect', assignedTo: '' });
        setShowModal(true);
    };

    const openEdit = (c: Client) => {
        setEditingClient(c);
        setForm({ companyName: c.companyName, industry: c.industry || '', email: c.email || '', phone: c.phone || '', status: c.status, assignedTo: (c as unknown as { assignedTo?: { _id: string } }).assignedTo?._id || '' });
        setShowModal(true);
    };

    const [error, setError] = useState('');

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        // Strip empty strings so backend doesn't receive invalid values
        const payload: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(form)) {
            if (val !== '') payload[key] = val;
        }
        try {
            if (editingClient) {
                await api.put(`/crm/clients/${editingClient._id}`, payload);
            } else {
                await api.post('/crm/clients', payload);
            }
            setShowModal(false);
            fetchClients();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to save client';
            setError(msg);
        }
        setSaving(false);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/crm/clients/${deleteId}`);
            fetchClients();
        } catch { /* ignore */ }
        setDeleteId(null);
    };

    const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm((prev) => ({ ...prev, [field]: e.target.value }));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        <Building2 size={24} className="text-[hsl(var(--primary))]" /> Clients
                    </h1>
                    <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Manage your client portfolio ({total} total)</p>
                </div>
                <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-all">
                    <Plus size={16} /> Add Client
                </button>
            </div>

            {/* Search */}
            <div className="relative w-full max-w-sm">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                <input type="text" placeholder="Search clients..." value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className={cn(inputCls, 'pl-10')} />
            </div>

            {/* Table */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[hsl(var(--border))] text-left text-[hsl(var(--muted-foreground))]">
                                <th className="px-4 py-3 font-medium">Company</th>
                                <th className="px-4 py-3 font-medium">Industry</th>
                                <th className="px-4 py-3 font-medium">Email</th>
                                <th className="px-4 py-3 font-medium">Phone</th>
                                <th className="px-4 py-3 font-medium">Status</th>
                                <th className="px-4 py-3 font-medium">Assigned To</th>
                                <th className="px-4 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]">
                                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[hsl(var(--primary))]/30 border-t-[hsl(var(--primary))] mx-auto" />
                                </td></tr>
                            ) : clients.length === 0 ? (
                                <tr><td colSpan={7} className="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]">
                                    No clients found. Click &quot;Add Client&quot; to create one.
                                </td></tr>
                            ) : (
                                clients.map((c) => (
                                    <tr key={c._id} className="border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--secondary))]/30 transition-colors">
                                        <td className="px-4 py-3 font-medium">{c.companyName}</td>
                                        <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{c.industry || '—'}</td>
                                        <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{c.email || '—'}</td>
                                        <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{c.phone || '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className={cn('inline-block rounded-full px-2.5 py-1 text-xs font-medium', STATUS_COLORS[c.status] || 'bg-gray-500/15 text-gray-400')}>
                                                {c.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">
                                            {c.assignedTo ? `${c.assignedTo.firstName} ${c.assignedTo.lastName}` : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => openEdit(c)} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-white transition-all">
                                                    <Edit2 size={15} />
                                                </button>
                                                <button onClick={() => setDeleteId(c._id)} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-red-500/10 hover:text-red-400 transition-all">
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-[hsl(var(--border))] px-4 py-3">
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">Page {page} of {totalPages}</p>
                        <div className="flex gap-1">
                            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
                                className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] disabled:opacity-30">
                                <ChevronLeft size={16} />
                            </button>
                            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
                                className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] disabled:opacity-30">
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)}>
                    <div className="glass-card w-full max-w-lg p-6 animate-fade-in bg-[hsl(var(--card))]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold">{editingClient ? 'Edit Client' : 'New Client'}</h3>
                            <button onClick={() => setShowModal(false)} className="rounded-lg p-1 hover:bg-[hsl(var(--secondary))]">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4">
                            {error && (
                                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                                    {error}
                                </div>
                            )}
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">Company Name *</label>
                                <input value={form.companyName} onChange={update('companyName')} required className={inputCls} placeholder="Acme Corp" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">Industry</label>
                                    <input value={form.industry} onChange={update('industry')} className={inputCls} placeholder="Technology" />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">Status</label>
                                    <select value={form.status} onChange={update('status')} className={inputCls}>
                                        <option value="Prospect">Prospect</option>
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                        <option value="Churned">Churned</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">Email</label>
                                    <input type="email" value={form.email} onChange={update('email')} className={inputCls} placeholder="info@acme.com" />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">Phone</label>
                                    <input value={form.phone} onChange={update('phone')} className={inputCls} placeholder="+20 xxx xxx xxxx" />
                                </div>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">Assigned To</label>
                                <select value={form.assignedTo} onChange={update('assignedTo')} className={inputCls}>
                                    <option value="">— None —</option>
                                    {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</option>)}
                                </select>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)}
                                    className="flex-1 rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-sm font-medium hover:bg-[hsl(var(--secondary))] transition-all">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving}
                                    className="flex-1 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                    {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : editingClient ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDeleteId(null)}>
                    <div className="glass-card w-full max-w-sm p-6 animate-fade-in bg-[hsl(var(--card))]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 mx-auto mb-4">
                            <Trash2 size={22} className="text-red-400" />
                        </div>
                        <h3 className="text-lg font-bold text-center">Delete Client?</h3>
                        <p className="text-sm text-[hsl(var(--muted-foreground))] text-center mt-2">
                            This action cannot be undone. The client and all related data will be permanently removed.
                        </p>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setDeleteId(null)}
                                className="flex-1 rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-sm font-medium hover:bg-[hsl(var(--secondary))] transition-all">
                                Cancel
                            </button>
                            <button onClick={confirmDelete}
                                className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition-all">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
