'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';
import {
    CheckSquare, Plus, Search, Edit2, Trash2, X, ChevronLeft, ChevronRight, Clock,
} from 'lucide-react';

interface Task {
    _id: string;
    title: string;
    description?: string;
    status: string;
    priority: string;
    dueDate?: string;
    assignedTo?: { firstName: string; lastName: string };
    relatedClient?: { companyName: string };
    createdBy?: { firstName: string; lastName: string };
    createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
    'To-do': 'bg-gray-500/15 text-gray-400',
    'In Progress': 'bg-amber-500/15 text-amber-400',
    'Done': 'bg-emerald-500/15 text-emerald-400',
};

const PRIORITY_COLORS: Record<string, string> = {
    Low: 'bg-blue-500/15 text-blue-400',
    Medium: 'bg-amber-500/15 text-amber-400',
    High: 'bg-orange-500/15 text-orange-400',
    Urgent: 'bg-red-500/15 text-red-400',
};

const inputCls = cn(
    'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm',
    'placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))]',
    'focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all'
);

export default function TasksPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [form, setForm] = useState({ title: '', description: '', status: 'To-do', priority: 'Medium', dueDate: '', assignedTo: '', relatedClient: '' });
    const [saving, setSaving] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [employees, setEmployees] = useState<{ _id: string; firstName: string; lastName: string }[]>([]);
    const [clients, setClients] = useState<{ _id: string; companyName: string }[]>([]);

    const limit = 10;
    const totalPages = Math.ceil(total / limit);

    const fetchTasks = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page, limit };
            if (search) params.search = search;
            if (filterStatus) params.status = filterStatus;
            const { data } = await api.get('/erp/tasks', { params });
            setTasks(data.data.data);
            setTotal(data.data.pagination.total);
        } catch { /* ignore */ }
        setLoading(false);
    }, [page, search, filterStatus]);

    useEffect(() => { fetchTasks(); }, [fetchTasks]);

    useEffect(() => {
        api.get('/erp/employees', { params: { limit: 100 } }).then(r => setEmployees(r.data.data.data)).catch(() => { });
        api.get('/crm/clients', { params: { limit: 100 } }).then(r => setClients(r.data.data.data)).catch(() => { });
    }, []);

    const openCreate = () => {
        setEditingTask(null);
        setForm({ title: '', description: '', status: 'To-do', priority: 'Medium', dueDate: '', assignedTo: '', relatedClient: '' });
        setShowModal(true);
    };

    const openEdit = (t: Task) => {
        setEditingTask(t);
        setForm({
            title: t.title,
            description: t.description || '',
            status: t.status,
            priority: t.priority,
            dueDate: t.dueDate ? t.dueDate.split('T')[0] : '',
            assignedTo: (t.assignedTo as unknown as { _id: string })?._id || '',
            relatedClient: (t.relatedClient as unknown as { _id: string })?._id || '',
        });
        setShowModal(true);
    };

    const [error, setError] = useState('');

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        // Strip empty strings
        const payload: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(form)) {
            if (val !== '') payload[key] = val;
        }
        try {
            if (editingTask) {
                await api.put(`/erp/tasks/${editingTask._id}`, payload);
            } else {
                await api.post('/erp/tasks', payload);
            }
            setShowModal(false);
            fetchTasks();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to save task';
            setError(msg);
        }
        setSaving(false);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/erp/tasks/${deleteId}`);
            fetchTasks();
        } catch { /* ignore */ }
        setDeleteId(null);
    };

    const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setForm((prev) => ({ ...prev, [field]: e.target.value }));

    const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        <CheckSquare size={24} className="text-emerald-400" /> Tasks
                    </h1>
                    <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Manage and track team tasks ({total} total)</p>
                </div>
                <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-all">
                    <Plus size={16} /> Add Task
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
                <div className="relative w-64">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                    <input type="text" placeholder="Search tasks..." value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className={cn(inputCls, 'pl-10')} />
                </div>
                <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                    className={cn(inputCls, 'w-44')}>
                    <option value="">All Statuses</option>
                    <option value="To-do">To-do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Done">Done</option>
                </select>
            </div>

            {/* Table */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[hsl(var(--border))] text-left text-[hsl(var(--muted-foreground))]">
                                <th className="px-4 py-3 font-medium">Title</th>
                                <th className="px-4 py-3 font-medium">Status</th>
                                <th className="px-4 py-3 font-medium">Priority</th>
                                <th className="px-4 py-3 font-medium">Due Date</th>
                                <th className="px-4 py-3 font-medium">Assigned To</th>
                                <th className="px-4 py-3 font-medium">Client</th>
                                <th className="px-4 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]">
                                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[hsl(var(--primary))]/30 border-t-[hsl(var(--primary))] mx-auto" />
                                </td></tr>
                            ) : tasks.length === 0 ? (
                                <tr><td colSpan={7} className="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]">
                                    No tasks found. Click &quot;Add Task&quot; to create one.
                                </td></tr>
                            ) : (
                                tasks.map((t) => (
                                    <tr key={t._id} className="border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--secondary))]/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <p className="font-medium">{t.title}</p>
                                            {t.description && <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 truncate max-w-[200px]">{t.description}</p>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={cn('inline-block rounded-full px-2.5 py-1 text-xs font-medium', STATUS_COLORS[t.status])}>
                                                {t.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={cn('inline-block rounded-full px-2.5 py-1 text-xs font-medium', PRIORITY_COLORS[t.priority])}>
                                                {t.priority}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">
                                            <span className="flex items-center gap-1.5"><Clock size={13} />{formatDate(t.dueDate)}</span>
                                        </td>
                                        <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">
                                            {t.assignedTo ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}` : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{t.relatedClient?.companyName || '—'}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => openEdit(t)} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-white transition-all">
                                                    <Edit2 size={15} />
                                                </button>
                                                <button onClick={() => setDeleteId(t._id)} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-red-500/10 hover:text-red-400 transition-all">
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
                            <h3 className="text-lg font-bold">{editingTask ? 'Edit Task' : 'New Task'}</h3>
                            <button onClick={() => setShowModal(false)} className="rounded-lg p-1 hover:bg-[hsl(var(--secondary))]"><X size={18} /></button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4">
                            {error && (
                                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                                    {error}
                                </div>
                            )}
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">Title *</label>
                                <input value={form.title} onChange={update('title')} required className={inputCls} placeholder="Design mockups" />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">Description</label>
                                <textarea value={form.description} onChange={update('description')} rows={3} className={cn(inputCls, 'resize-none')} placeholder="Task details..." />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">Status</label>
                                    <select value={form.status} onChange={update('status')} className={inputCls}>
                                        <option value="To-do">To-do</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Done">Done</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">Priority</label>
                                    <select value={form.priority} onChange={update('priority')} className={inputCls}>
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                        <option value="Urgent">Urgent</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">Due Date</label>
                                    <input type="date" value={form.dueDate} onChange={update('dueDate')} className={inputCls} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">Assigned To</label>
                                    <select value={form.assignedTo} onChange={update('assignedTo')} className={inputCls}>
                                        <option value="">— None —</option>
                                        {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">Related Client</label>
                                    <select value={form.relatedClient} onChange={update('relatedClient')} className={inputCls}>
                                        <option value="">— None —</option>
                                        {clients.map(c => <option key={c._id} value={c._id}>{c.companyName}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)}
                                    className="flex-1 rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-sm font-medium hover:bg-[hsl(var(--secondary))] transition-all">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving}
                                    className="flex-1 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                    {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : editingTask ? 'Update' : 'Create'}
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
                        <h3 className="text-lg font-bold text-center">Delete Task?</h3>
                        <p className="text-sm text-[hsl(var(--muted-foreground))] text-center mt-2">
                            This action cannot be undone. The task will be permanently removed.
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
