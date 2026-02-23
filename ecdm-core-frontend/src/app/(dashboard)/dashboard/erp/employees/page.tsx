'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';
import { Users, Plus, Search, Edit2, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useT } from '@/i18n/useT';

interface Employee { _id: string; firstName: string; lastName: string; email: string; phone?: string; department: string; position: string; status: string; hireDate?: string; }
const STATUS_C: Record<string, string> = { Active: 'bg-emerald-500/15 text-emerald-400', 'On Leave': 'bg-amber-500/15 text-amber-400', Terminated: 'bg-red-500/15 text-red-400' };
const DEPT_C: Record<string, string> = { Engineering: 'bg-blue-500/15 text-blue-400', Sales: 'bg-purple-500/15 text-purple-400', Marketing: 'bg-pink-500/15 text-pink-400', HR: 'bg-amber-500/15 text-amber-400', Finance: 'bg-emerald-500/15 text-emerald-400', Operations: 'bg-indigo-500/15 text-indigo-400', Other: 'bg-gray-500/15 text-gray-400' };
const iCls = cn('w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all');
const DEPTS = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations', 'Other'];

export default function EmployeesPage() {
    const t = useT();
    const [rows, setRows] = useState<Employee[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [fDept, setFDept] = useState('');
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    const [editing, setEditing] = useState<Employee | null>(null);
    const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', department: 'Engineering', position: '', status: 'Active', hireDate: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [delId, setDelId] = useState<string | null>(null);
    const lim = 10; const tp = Math.ceil(total / lim);

    const fetch_ = useCallback(async () => {
        setLoading(true);
        try {
            const p: Record<string, string | number> = { page, limit: lim };
            if (search) p.search = search; if (fDept) p.department = fDept;
            const { data } = await api.get('/erp/employees', { params: p });
            setRows(data.data.data); setTotal(data.data.pagination.total);
        } catch { /* */ }
        setLoading(false);
    }, [page, search, fDept]);
    useEffect(() => { fetch_(); }, [fetch_]);

    const openC = () => { setEditing(null); setForm({ firstName: '', lastName: '', email: '', phone: '', department: 'Engineering', position: '', status: 'Active', hireDate: '' }); setModal(true); };
    const openE = (e: Employee) => { setEditing(e); setForm({ firstName: e.firstName, lastName: e.lastName, email: e.email, phone: e.phone || '', department: e.department, position: e.position, status: e.status, hireDate: e.hireDate ? e.hireDate.split('T')[0] : '' }); setModal(true); };
    const save = async (ev: React.FormEvent) => {
        ev.preventDefault(); setSaving(true); setError('');
        const pl: Record<string, unknown> = {}; for (const [k, v] of Object.entries(form)) { if (v !== '') pl[k] = v; }
        try { if (editing) await api.put(`/erp/employees/${editing._id}`, pl); else await api.post('/erp/employees', pl); setModal(false); fetch_(); }
        catch (e: unknown) { setError((e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed'); }
        setSaving(false);
    };
    const del = async () => { if (!delId) return; try { await api.delete(`/erp/employees/${delId}`); fetch_(); } catch { } setDelId(null); };
    const u = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(p => ({ ...p, [f]: e.target.value }));

    return (<div className="space-y-6">
        <div className="flex items-center justify-between">
            <div><h1 className="text-2xl font-bold flex items-center gap-3"><Users size={24} className="text-amber-400" /> {t.pages.employees.title}</h1><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{t.pages.employees.subtitle} ({total} {t.common.total})</p></div>
            <button onClick={openC} className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-all"><Plus size={16} /> {t.pages.employees.addBtn}</button>
        </div>
        <div className="flex gap-3 flex-wrap">
            <div className="relative w-64"><Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" /><input placeholder={t.pages.employees.searchPlaceholder} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className={cn(iCls, 'ps-10')} /></div>
            <select value={fDept} onChange={e => { setFDept(e.target.value); setPage(1); }} className={cn(iCls, 'w-44')}><option value="">{t.pages.employees.allDepartments}</option>{DEPTS.map(d => <option key={d} value={d}>{d}</option>)}</select>
        </div>
        <div className="glass-card overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-[hsl(var(--border))] text-start text-[hsl(var(--muted-foreground))]"><th className="px-4 py-3 font-medium">{t.common.name}</th><th className="px-4 py-3 font-medium">{t.common.email}</th><th className="px-4 py-3 font-medium">{t.pages.employees.department}</th><th className="px-4 py-3 font-medium">{t.pages.employees.position}</th><th className="px-4 py-3 font-medium">{t.common.status}</th><th className="px-4 py-3 font-medium text-end">{t.common.actions}</th></tr></thead>
            <tbody>{loading ? <tr><td colSpan={6} className="px-4 py-12 text-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[hsl(var(--primary))]/30 border-t-[hsl(var(--primary))] mx-auto" /></td></tr>
                : rows.length === 0 ? <tr><td colSpan={6} className="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]">{t.pages.employees.emptyState}</td></tr>
                    : rows.map(emp => <tr key={emp._id} className="border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--secondary))]/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{emp.firstName} {emp.lastName}</td>
                        <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{emp.email}</td>
                        <td className="px-4 py-3"><span className={cn('inline-block rounded-full px-2.5 py-1 text-xs font-medium', DEPT_C[emp.department] || DEPT_C.Other)}>{emp.department}</span></td>
                        <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{emp.position}</td>
                        <td className="px-4 py-3"><span className={cn('inline-block rounded-full px-2.5 py-1 text-xs font-medium', STATUS_C[emp.status])}>{emp.status}</span></td>
                        <td className="px-4 py-3 text-end"><div className="flex items-center justify-end gap-1"><button onClick={() => openE(emp)} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-white transition-all"><Edit2 size={15} /></button><button onClick={() => setDelId(emp._id)} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-red-500/10 hover:text-red-400 transition-all"><Trash2 size={15} /></button></div></td>
                    </tr>)}</tbody></table></div>
            {tp > 1 && <div className="flex items-center justify-between border-t border-[hsl(var(--border))] px-4 py-3"><p className="text-xs text-[hsl(var(--muted-foreground))]">{t.common.page} {page} {t.common.of} {tp}</p><div className="flex gap-1"><button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] disabled:opacity-30"><ChevronLeft size={16} /></button><button onClick={() => setPage(Math.min(tp, page + 1))} disabled={page >= tp} className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] disabled:opacity-30"><ChevronRight size={16} /></button></div></div>}</div>

        {modal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setModal(false)}><div className="glass-card w-full max-w-lg p-6 animate-fade-in bg-[hsl(var(--card))]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6"><h3 className="text-lg font-bold">{editing ? t.common.edit : t.common.create}</h3><button onClick={() => setModal(false)} className="rounded-lg p-1 hover:bg-[hsl(var(--secondary))]"><X size={18} /></button></div>
            <form onSubmit={save} className="space-y-4">
                {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}
                <div className="grid grid-cols-2 gap-4"><div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">{t.pages.employees.firstName} *</label><input value={form.firstName} onChange={u('firstName')} required className={iCls} /></div><div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">{t.pages.employees.lastName} *</label><input value={form.lastName} onChange={u('lastName')} required className={iCls} /></div></div>
                <div className="grid grid-cols-2 gap-4"><div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">{t.common.email} *</label><input type="email" value={form.email} onChange={u('email')} required className={iCls} /></div><div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">{t.common.phone}</label><input value={form.phone} onChange={u('phone')} className={iCls} /></div></div>
                <div className="grid grid-cols-2 gap-4"><div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">{t.pages.employees.department} *</label><select value={form.department} onChange={u('department')} className={iCls}>{DEPTS.map(d => <option key={d} value={d}>{d}</option>)}</select></div><div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">{t.pages.employees.position} *</label><input value={form.position} onChange={u('position')} required className={iCls} /></div></div>
                <div className="grid grid-cols-2 gap-4"><div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">{t.common.status}</label><select value={form.status} onChange={u('status')} className={iCls}><option value="Active">Active</option><option value="On Leave">On Leave</option><option value="Terminated">Terminated</option></select></div><div><label className="mb-1.5 block text-sm font-medium text-[hsl(var(--muted-foreground))]">{t.pages.employees.hireDate}</label><input type="date" value={form.hireDate} onChange={u('hireDate')} className={iCls} /></div></div>
                <div className="flex gap-3 pt-2"><button type="button" onClick={() => setModal(false)} className="flex-1 rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-sm font-medium hover:bg-[hsl(var(--secondary))] transition-all">{t.common.cancel}</button><button type="submit" disabled={saving} className="flex-1 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">{saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : editing ? t.common.update : t.common.create}</button></div>
            </form></div></div>}

        {delId && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDelId(null)}><div className="glass-card w-full max-w-sm p-6 animate-fade-in bg-[hsl(var(--card))]" onClick={e => e.stopPropagation()}>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 mx-auto mb-4"><Trash2 size={22} className="text-red-400" /></div>
            <h3 className="text-lg font-bold text-center">{t.pages.employees.deleteTitle}</h3><p className="text-sm text-[hsl(var(--muted-foreground))] text-center mt-2">{t.pages.employees.deleteMsg}</p>
            <div className="flex gap-3 mt-6"><button onClick={() => setDelId(null)} className="flex-1 rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-sm font-medium hover:bg-[hsl(var(--secondary))] transition-all">{t.common.cancel}</button><button onClick={del} className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition-all">{t.common.delete}</button></div>
        </div></div>}
    </div>);
}
