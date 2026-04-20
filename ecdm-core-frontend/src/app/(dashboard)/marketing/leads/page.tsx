'use client';
import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { TrendingUp, Plus, Edit2, Trash2, X, Sheet, Upload, Loader2, AlertTriangle, Check, RefreshCw, Save, Database } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/layout/PageHeader';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';

interface Customer {
  _id: string;
  customerId: string;
  name: string;
  phone: string;
  type: string;
  sector: string;
  address?: string;
}

interface MarketingLead {
  _id: string;
  customerId: Customer;
  date: string;
  notes?: string;
}

interface SheetSyncForm {
  spreadsheetId: string;
  sheetRange: string;
  serviceAccountJson: string;
}

interface SavedConnection {
  _id: string;
  connectionName: string;
  spreadsheetId: string;
  sheetRange: string;
  lastUsedAt?: string;
}

interface AnalyzedLead {
  rowIndex: number;
  sheetData: { name: string; phone: string; type: string; sector: string; address?: string };
  existingData?: { _id: string; customerId: string; name: string; phone: string; type: string; sector: string; address?: string };
}

interface AnalysisResult {
  summary: { new: number; exactMatch: number; conflicts: number };
  new: AnalyzedLead[];
  exactMatch: AnalyzedLead[];
  conflicts: AnalyzedLead[];
}

const iCls = 'flex h-9 w-full rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-3 py-1 text-sm shadow-sm transition-all placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:border-[hsl(var(--primary))]/50 focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10';
const TYPES = ['Google', 'Facebook', 'Instagram', 'TikTok', 'Snapchat', 'WhatsApp', 'Website', 'Referral', 'Cold Call', 'Exhibition', 'Other'];
const SECTORS = ['B2B', 'B2C', 'B2G', 'Hybrid', 'Other'];
const blank = { name: '', phone: '', type: '', sector: 'B2C', date: '', notes: '' };

export default function MarketingLeadsPage() {
  const [rows, setRows] = useState<MarketingLead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [fType, setFType] = useState('');
  const [fSector, setFSector] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<MarketingLead | null>(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [delId, setDelId] = useState<string | null>(null);
  const [internalPreviewMode, setInternalPreviewMode] = useState(true);

  const effectivelyReadOnly = modal && editing && internalPreviewMode;
  const isAdding = modal && !editing;

  // Google Sheets Sync Dialog state
  const [syncModal, setSyncModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStep, setSyncStep] = useState<'config' | 'review' | 'done'>('config');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [conflictResolutions, setConflictResolutions] = useState<Record<number, 'update' | 'keep'>>({});
  const [commitResult, setCommitResult] = useState<{ created: number; updated: number; skipped: number; forwarded: number; errors: string[] } | null>(null);
  const { register: regSync, handleSubmit: handleSync, formState: { errors: syncErrors }, reset: resetSync, setValue: setSyncValue, getValues: getSyncValues } = useForm<SheetSyncForm>();

  // Saved Connections state
  const [savedConnections, setSavedConnections] = useState<SavedConnection[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('new');
  const [saveNewConnection, setSaveNewConnection] = useState(false);
  const [newConnectionName, setNewConnectionName] = useState('');

  // Multi-select & Bulk Delete state
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const lim = 10;
  const tp = Math.ceil(total / lim);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const p: Record<string, string | number> = { page, limit: lim };
      if (fType) p.type = fType;
      if (fSector) p.sector = fSector;
      const { data } = await api.get('/marketing/leads', { params: p });
      setRows(data.data.data || []);
      setTotal(data.data.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to fetch marketing leads:', err);
      toast.error('Failed to load marketing leads');
      setRows([]);
    }
    setLoading(false);
  }, [page, fType, fSector]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const fetchSavedConnections = useCallback(async () => {
    try {
      const { data } = await api.get('/marketing/saved-sheets');
      setSavedConnections(data.data || []);
    } catch (err) {
      console.error('Failed to fetch saved connections:', err);
      setSavedConnections([]);
    }
  }, []);

  useEffect(() => { fetchSavedConnections(); }, [fetchSavedConnections]);

  useEffect(() => { setSelectedRows(new Set()); }, [rows]);

  const toggleRowSelection = (id: string) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedRows.size === 0) return;
    setBulkDeleting(true);
    try {
      await api.post('/marketing/sync/bulk-delete', { ids: Array.from(selectedRows) });
      toast.success('Bulk delete successful');
      setSelectedRows(new Set());
      fetch_();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Bulk delete failed');
    }
    setBulkDeleting(false);
    setShowBulkDeleteConfirm(false);
  };

  const openC = () => { setEditing(null); setForm(blank); setError(''); setInternalPreviewMode(false); setModal(true); };
  const openE = (r: MarketingLead, mode: 'preview' | 'edit' = 'preview') => {
    setEditing(r);
    setInternalPreviewMode(mode === 'preview');
    setForm({
      name: r.customerId?.name || '',
      phone: r.customerId?.phone || '',
      type: r.customerId?.type || '',
      sector: r.customerId?.sector || 'B2C',
      date: r.date ? new Date(r.date).toISOString().split('T')[0] : '',
      notes: r.notes || ''
    });
    setError('');
    setModal(true);
  };

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true);
    setError('');
    const pl: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(form)) { if (v !== '') pl[k] = v; }
    try {
      if (editing) await api.put(`/marketing/leads/${editing._id}`, pl);
      else await api.post('/marketing/leads', pl);
      setModal(false);
      fetch_();
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed');
    }
    setSaving(false);
  };

  const del = async () => {
    if (!delId) return;
    try { 
      await api.delete(`/marketing/leads/${delId}`); 
      toast.success('Lead deleted successfully');
      fetch_(); 
    } catch (err) {
      console.error('Failed to delete lead:', err);
      toast.error('Failed to delete lead');
    }
    setDelId(null);
  };

  const u = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [f]: e.target.value }));

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setSyncValue('serviceAccountJson', content);
    };
    reader.readAsText(file);
  };

  const handleConnectionSelect = async (connectionId: string) => {
    setSelectedConnectionId(connectionId);
    if (connectionId === 'new') {
      resetSync();
      return;
    }
    try {
      const { data } = await api.get(`/marketing/saved-sheets/${connectionId}`);
      const conn = data.data;
      setSyncValue('spreadsheetId', conn.spreadsheetId);
      setSyncValue('sheetRange', conn.sheetRange);
      setSyncValue('serviceAccountJson', conn.serviceAccountJson);
    } catch (e) {
      console.error('Failed to load connection:', e);
    }
  };

  const onSyncSubmit = async (data: SheetSyncForm) => {
    setSyncing(true);
    setAnalysis(null);
    try {
      if (selectedConnectionId === 'new' && saveNewConnection && newConnectionName) {
        await api.post('/marketing/saved-sheets', {
          connectionName: newConnectionName,
          spreadsheetId: data.spreadsheetId,
          sheetRange: data.sheetRange,
          serviceAccountJson: data.serviceAccountJson,
        });
        fetchSavedConnections();
      }
      const response = await api.post('/marketing/sync/analyze', data);
      setAnalysis(response.data.data);
      const defaultResolutions: Record<number, 'update' | 'keep'> = {};
      response.data.data.conflicts.forEach((c: AnalyzedLead) => {
        defaultResolutions[c.rowIndex] = 'keep';
      });
      setConflictResolutions(defaultResolutions);
      setSyncStep('review');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Analysis failed');
    }
    setSyncing(false);
  };

  const handleCommit = async () => {
    if (!analysis) return;
    setSyncing(true);
    try {
      const conflictResolutionsList = analysis.conflicts.map(c => ({
        rowIndex: c.rowIndex,
        action: conflictResolutions[c.rowIndex] || 'keep',
        data: c,
      }));
      const response = await api.post('/marketing/sync/commit', {
        serviceAccountJson: getSyncValues('serviceAccountJson'),
        newLeads: analysis.new,
        conflictResolutions: conflictResolutionsList,
      });
      setCommitResult(response.data.data);
      setSyncStep('done');
      fetch_();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Commit failed');
    }
    setSyncing(false);
  };

  const openSyncModal = () => {
    resetSync();
    setAnalysis(null);
    setCommitResult(null);
    setConflictResolutions({});
    setSyncStep('config');
    setSelectedConnectionId('new');
    setSaveNewConnection(false);
    setNewConnectionName('');
    setSyncModal(true);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch { return '—'; }
  };

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Marketing Leads"
        icon={TrendingUp}
        actions={
          <>
            <button onClick={openSyncModal} className="flex items-center gap-2 rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-4 py-2 text-sm font-medium shadow-sm hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] transition-all">
              <Sheet className="h-4 w-4 text-green-600" />
              Sync Sheet
            </button>
            <button onClick={openC} className="flex items-center gap-2 rounded-md bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] shadow-sm hover:opacity-90 transition-all">
              <Plus className="h-4 w-4" />Add
            </button>
          </>
        }
      />

      <div className="flex gap-3 flex-wrap items-center">
        <select value={fType} onChange={e => { setFType(e.target.value); setPage(1); }} className="h-9 rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-3 py-1 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:border-[hsl(var(--primary))]/50 focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10">
          <option value="">All Types</option>
          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={fSector} onChange={e => { setFSector(e.target.value); setPage(1); }} className="h-9 rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-3 py-1 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:border-[hsl(var(--primary))]/50 focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10">
          <option value="">All Sectors</option>
          {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {selectedRows.size > 0 && (
          <button
            onClick={() => setShowBulkDeleteConfirm(true)}
            className="flex items-center gap-2 rounded-md bg-[hsl(var(--destructive))] px-4 py-2 text-sm font-medium text-[hsl(var(--destructive-foreground))] shadow-sm hover:opacity-90 ml-auto"
          >
            <Trash2 className="h-4 w-4" />
            Delete Selected ({selectedRows.size})
          </button>
        )}
      </div>

      <div className="w-full">
        <DataTable
          data={rows}
          columns={[
            {
              key: "select",
              header: "",
              render: (row: any) => (
                <input
                  type="checkbox"
                  checked={selectedRows.has(row._id)}
                  onChange={() => toggleRowSelection(row._id)}
                  className="h-4 w-4 rounded border-[hsl(var(--border))] cursor-pointer"
                />
              ),
              className: "w-10",
            },
            {
              key: "customerId.customerId",
              header: "ID",
              className: 'md:w-[1%] md:whitespace-nowrap',
              render: (row: any) => <span className="font-mono text-xs text-[hsl(var(--primary))]">{row.customerId?.customerId || '—'}</span>,
            },
            {
              key: "customerId.name",
              header: "Name",
              className: 'md:w-auto md:max-w-[150px] md:truncate',
              render: (row: any) => <span className="font-medium">{row.customerId?.name || '—'}</span>,
            },
            {
              key: "customerId.phone",
              header: "Phone",
              className: 'hidden xl:table-cell md:w-1/6 md:max-w-[120px] md:truncate',
              render: (row: any) => <span>{row.customerId?.phone || '—'}</span>,
            },
            {
              key: "customerId.type",
              header: "Type",
              className: 'md:w-[1%] md:whitespace-nowrap',
              render: (row: any) => <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-blue-500/10 text-blue-600">{row.customerId?.type || '—'}</span>,
            },
            {
              key: "customerId.sector",
              header: "Sector",
              className: 'hidden xl:table-cell md:w-1/6 md:max-w-[120px] md:truncate',
              render: (row: any) => <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-purple-500/10 text-purple-600">{row.customerId?.sector || '—'}</span>,
            },
            {
              key: "customerId.address",
              header: "Address",
              className: 'md:w-1/6 md:max-w-[120px] md:truncate',
              render: (row: any) => <span>{row.customerId?.address || '—'}</span>,
            },
            {
              key: "date",
              header: "Date",
              className: 'md:w-1/6 md:max-w-[120px] md:truncate',
              render: (row: any) => <span className="text-[hsl(var(--muted-foreground))]">{formatDate(row.date)}</span>,
            },
          ]}
          loading={loading}
          emptyMessage="No marketing leads found."
          page={page}
          totalPages={tp}
          onPageChange={setPage}
          onRowClick={(row: MarketingLead) => openE(row, 'preview')}
          renderActions={(row: MarketingLead) => (
            <div className="flex items-center gap-2">
              <button onClick={() => openE(row, 'edit')} className="p-2 hover:bg-[hsl(var(--accent))] rounded-lg transition-colors">
                <Edit2 className="h-4 w-4" />
              </button>
              <button onClick={() => setDelId(row._id)} className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        />
      </div>

      {/* Main Lead Dialog */}
      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {effectivelyReadOnly ? 'Lead Preview' : (isAdding ? 'Add Marketing Lead' : 'Edit Marketing Lead')}
            </DialogTitle>
            {effectivelyReadOnly && <p className="text-xs text-amber-600 font-semibold mt-1 italic">• Preview Mode</p>}
          </DialogHeader>
          <DialogBody>
            <form id="lead-form" onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-[hsl(var(--muted-foreground))]">Customer Name</label>
                  <input value={form.name} onChange={u('name')} className={iCls} disabled={effectivelyReadOnly} required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-[hsl(var(--muted-foreground))]">Phone</label>
                  <input value={form.phone} onChange={u('phone')} className={iCls} disabled={effectivelyReadOnly} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-[hsl(var(--muted-foreground))]">Type</label>
                  <select value={form.type} onChange={u('type')} className={iCls} disabled={effectivelyReadOnly} required>
                    <option value="">Select Type</option>
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-[hsl(var(--muted-foreground))]">Sector</label>
                  <select value={form.sector} onChange={u('sector')} className={iCls} disabled={effectivelyReadOnly} required>
                    {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-[hsl(var(--muted-foreground))]">Date</label>
                <input type="date" value={form.date} onChange={u('date')} className={iCls} disabled={effectivelyReadOnly} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-[hsl(var(--muted-foreground))]">Notes</label>
                <textarea value={form.notes} onChange={u('notes')} rows={3} className={`${iCls} h-auto`} disabled={effectivelyReadOnly} />
              </div>
              {error && <p className="text-xs text-destructive font-bold">{error}</p>}
            </form>
          </DialogBody>
          <DialogFooter>
            <div className="flex gap-3 w-full">
              <button 
                type="button" 
                onClick={() => setModal(false)} 
                className="flex-1 rounded-xl border border-[hsl(var(--border))] py-3 text-sm font-semibold hover:bg-[hsl(var(--muted))] transition-colors"
              >
                {effectivelyReadOnly ? 'Close' : 'Cancel'}
              </button>
              {effectivelyReadOnly ? (
                <button 
                  type="button" 
                  onClick={() => setInternalPreviewMode(false)} 
                  className="flex-1 rounded-xl bg-blue-600 text-white py-3 text-sm font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit Lead
                </button>
              ) : (
                <button 
                  type="submit" 
                  form="lead-form" 
                  disabled={saving} 
                  className="flex-1 rounded-xl bg-[hsl(var(--primary))] text-white py-3 text-sm font-semibold disabled:opacity-60 transition-all"
                >
                  {saving ? 'Saving...' : (isAdding ? 'Add Lead' : 'Save Changes')}
                </button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Google Sheets Sync Dialog */}
      <Dialog open={syncModal} onOpenChange={setSyncModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Sheet className="h-6 w-6 text-green-600" />
              <DialogTitle>
                {syncStep === 'config' && 'Connect Google Sheet'}
                {syncStep === 'review' && 'Review Changes'}
                {syncStep === 'done' && 'Sync Complete'}
              </DialogTitle>
            </div>
          </DialogHeader>
          <DialogBody>
            {syncStep === 'config' && (
              <form id="sync-config-form" onSubmit={handleSync(onSyncSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Select Connection
                  </label>
                  <select value={selectedConnectionId} onChange={e => handleConnectionSelect(e.target.value)} className={iCls}>
                    <option value="new">+ Connect New Sheet</option>
                    {savedConnections.map(conn => <option key={conn._id} value={conn._id}>{conn.connectionName} ({conn.sheetRange})</option>)}
                  </select>
                </div>
                {selectedConnectionId === 'new' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Spreadsheet ID</label>
                      <input {...regSync('spreadsheetId', { required: true })} placeholder="ID from URL" className={iCls} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Sheet Name / Range</label>
                      <input {...regSync('sheetRange', { required: true })} placeholder="Sheet1!A:F" className={iCls} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Service Account JSON Key</label>
                      <div className="flex gap-2 mb-2">
                        <label className="flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 px-4 py-2 text-sm cursor-pointer hover:bg-[hsl(var(--muted))] transition-colors">
                          <Upload className="h-4 w-4" />
                          Upload JSON
                          <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                        </label>
                      </div>
                      <textarea {...regSync('serviceAccountJson', { required: true })} placeholder='Paste JSON key' rows={5} className={`${iCls} h-auto font-mono text-xs`} />
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-[hsl(var(--muted))]/30 border border-[hsl(var(--border))]">
                      <input type="checkbox" id="saveConnection" checked={saveNewConnection} onChange={e => setSaveNewConnection(e.target.checked)} className="h-4 w-4 rounded" />
                      <label htmlFor="saveConnection" className="text-sm cursor-pointer flex items-center gap-2">Save connection</label>
                    </div>
                    {saveNewConnection && (
                      <div>
                        <label className="block text-sm font-medium mb-1.5">Connection Name</label>
                        <input value={newConnectionName} onChange={e => setNewConnectionName(e.target.value)} placeholder="e.g., Campaign X" className={iCls} required />
                      </div>
                    )}
                  </div>
                )}
              </form>
            )}
            {syncStep === 'review' && analysis && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-green-500/10 p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{analysis.summary.new}</p>
                    <p className="text-xs">New</p>
                  </div>
                  <div className="rounded-xl bg-blue-500/10 p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{analysis.summary.exactMatch}</p>
                    <p className="text-xs">Identical</p>
                  </div>
                  <div className="rounded-xl bg-amber-500/10 p-4 text-center">
                    <p className="text-2xl font-bold text-amber-600">{analysis.summary.conflicts}</p>
                    <p className="text-xs">Conflicts</p>
                  </div>
                </div>
                {analysis.conflicts.map(c => (
                  <div key={c.rowIndex} className="p-3 rounded-lg bg-muted/30 text-xs flex justify-between items-center">
                    <div>{c.sheetData.name} ({c.sheetData.phone})</div>
                    <div className="flex gap-2">
                       <button onClick={() => setConflictResolutions(p => ({...p, [c.rowIndex]: 'update'}))} className={`px-2 py-1 rounded ${conflictResolutions[c.rowIndex] === 'update' ? 'bg-amber-500 text-white' : 'bg-muted'}`}>Update</button>
                       <button onClick={() => setConflictResolutions(p => ({...p, [c.rowIndex]: 'keep'}))} className={`px-2 py-1 rounded ${conflictResolutions[c.rowIndex] === 'keep' ? 'bg-blue-500 text-white' : 'bg-muted'}`}>Keep</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {syncStep === 'done' && commitResult && (
              <div className="text-center py-6">
                <Check className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold">Sync Complete</h3>
                <p className="mt-2 text-sm">Created: {commitResult.created} | Updated: {commitResult.updated}</p>
              </div>
            )}
          </DialogBody>
          <DialogFooter>
             {syncStep === 'config' && (
               <button type="submit" form="sync-config-form" disabled={syncing} className="w-full rounded-xl bg-green-600 py-3 text-sm font-semibold text-white">
                 {syncing ? 'Analyzing...' : 'Analyze Sheet'}
               </button>
             )}
             {syncStep === 'review' && (
               <button onClick={handleCommit} disabled={syncing} className="w-full rounded-xl bg-green-600 py-3 text-sm font-semibold text-white">
                 {syncing ? 'Committing...' : 'Commit Changes'}
               </button>
             )}
             {syncStep === 'done' && (
               <button onClick={closeSyncModal} className="w-full rounded-xl bg-[hsl(var(--primary))] py-3 text-sm font-semibold text-white">Done</button>
             )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!delId} onOpenChange={o => !o && setDelId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Confirm Delete</DialogTitle></DialogHeader>
          <DialogBody><p>Are you sure you want to delete this lead?</p></DialogBody>
          <DialogFooter>
            <div className="flex gap-3 w-full">
              <button onClick={() => setDelId(null)} className="flex-1 rounded-xl border border-border py-3">Cancel</button>
              <button onClick={del} className="flex-1 rounded-xl bg-destructive text-white py-3">Delete</button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirm */}
      <Dialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Delete {selectedRows.size} leads?</DialogTitle></DialogHeader>
          <DialogFooter>
            <div className="flex gap-3 w-full">
              <button onClick={() => setShowBulkDeleteConfirm(false)} className="flex-1 rounded-xl border border-border py-3">Cancel</button>
              <button onClick={handleBulkDelete} className="flex-1 rounded-xl bg-destructive text-white py-3">Delete All</button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
