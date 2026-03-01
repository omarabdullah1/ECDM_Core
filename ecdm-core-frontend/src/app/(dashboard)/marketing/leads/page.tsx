'use client';
import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import api from '@/lib/axios';
import { TrendingUp, Plus, Edit2, Trash2, X, ChevronLeft, ChevronRight, Sheet, Upload, Loader2, AlertTriangle, Check, RefreshCw, Save, Database } from 'lucide-react';

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

// Saved Sheet Connection
interface SavedConnection {
  _id: string;
  connectionName: string;
  spreadsheetId: string;
  sheetRange: string;
  lastUsedAt?: string;
}

// Types for 2-step sync process
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

const iCls = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all';
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
      setRows(data.data.data);
      setTotal(data.data.pagination.total);
    } catch { }
    setLoading(false);
  }, [page, fType, fSector]);
  
  useEffect(() => { fetch_(); }, [fetch_]);

  // Fetch saved sheet connections
  const fetchSavedConnections = useCallback(async () => {
    try {
      const { data } = await api.get('/marketing/saved-sheets');
      setSavedConnections(data.data);
    } catch { }
  }, []);

  useEffect(() => { fetchSavedConnections(); }, [fetchSavedConnections]);

  // Clear selection when rows change
  useEffect(() => { setSelectedRows(new Set()); }, [rows]);

  // Toggle row selection
  const toggleRowSelection = (id: string) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  // Toggle all rows selection
  const toggleAllSelection = () => {
    if (selectedRows.size === rows.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(rows.map(r => r._id)));
    }
  };

  // Bulk delete selected rows
  const handleBulkDelete = async () => {
    if (selectedRows.size === 0) return;
    setBulkDeleting(true);
    try {
      await api.post('/marketing/sync/bulk-delete', { ids: Array.from(selectedRows) });
      setSelectedRows(new Set());
      fetch_();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || 'Bulk delete failed');
    }
    setBulkDeleting(false);
    setShowBulkDeleteConfirm(false);
  };

  const openC = () => { setEditing(null); setForm(blank); setError(''); setModal(true); };
  const openE = (r: MarketingLead) => {
    setEditing(r);
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
    try { await api.delete(`/marketing/leads/${delId}`); fetch_(); } catch { }
    setDelId(null);
  };
  
  const u = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [f]: e.target.value }));

  // Handle JSON file upload
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

  // Handle saved connection selection
  const handleConnectionSelect = async (connectionId: string) => {
    setSelectedConnectionId(connectionId);
    if (connectionId === 'new') {
      resetSync();
      return;
    }
    // Fetch full connection data including serviceAccountJson
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

  // Step 1: Analyze sheet data
  const onSyncSubmit = async (data: SheetSyncForm) => {
    setSyncing(true);
    setAnalysis(null);
    try {
      // Optionally save the new connection
      if (selectedConnectionId === 'new' && saveNewConnection && newConnectionName) {
        await api.post('/marketing/saved-sheets', {
          connectionName: newConnectionName,
          spreadsheetId: data.spreadsheetId,
          sheetRange: data.sheetRange,
          serviceAccountJson: data.serviceAccountJson,
        });
        fetchSavedConnections(); // Refresh saved connections list
      }

      const response = await api.post('/marketing/sync/analyze', data);
      setAnalysis(response.data.data);
      // Initialize conflict resolutions to 'keep' by default
      const defaultResolutions: Record<number, 'update' | 'keep'> = {};
      response.data.data.conflicts.forEach((c: AnalyzedLead) => {
        defaultResolutions[c.rowIndex] = 'keep';
      });
      setConflictResolutions(defaultResolutions);
      setSyncStep('review');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || 'Analysis failed');
    }
    setSyncing(false);
  };

  // Step 2: Commit approved changes
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
      fetch_(); // Refresh the table
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || 'Commit failed');
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

  const closeSyncModal = () => {
    setSyncModal(false);
    setSyncStep('config');
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-7 w-7 text-[hsl(var(--primary))]" />
          <h1 className="text-2xl font-bold">Marketing Leads</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={openSyncModal} className="flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2 text-sm font-medium hover:bg-[hsl(var(--muted))] transition-colors">
            <Sheet className="h-4 w-4 text-green-600" />
            Sync Sheet
          </button>
          <button onClick={openC} className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-sm font-semibold text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" />Add
          </button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <select value={fType} onChange={e => { setFType(e.target.value); setPage(1); }} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm">
          <option value="">All Types</option>
          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={fSector} onChange={e => { setFSector(e.target.value); setPage(1); }} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm">
          <option value="">All Sectors</option>
          {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {selectedRows.size > 0 && (
          <button 
            onClick={() => setShowBulkDeleteConfirm(true)} 
            className="flex items-center gap-2 rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity ml-auto"
          >
            <Trash2 className="h-4 w-4" />
            Delete Selected ({selectedRows.size})
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
        {loading ? <div className="p-8 text-center text-[hsl(var(--muted-foreground))]">Loading…</div> : (
          <table className="w-full text-sm">
            <thead className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30">
              <tr>
                <th className="px-4 py-3 text-left w-10">
                  <input 
                    type="checkbox" 
                    checked={rows.length > 0 && selectedRows.size === rows.length}
                    onChange={toggleAllSelection}
                    className="h-4 w-4 rounded border-[hsl(var(--border))] cursor-pointer"
                  />
                </th>
                {['ID', 'Name', 'Phone', 'Type', 'Sector', 'Date', 'Notes', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r._id} className={`border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--muted))]/20 ${selectedRows.has(r._id) ? 'bg-[hsl(var(--primary))]/5' : ''}`}>
                  <td className="px-4 py-3">
                    <input 
                      type="checkbox" 
                      checked={selectedRows.has(r._id)}
                      onChange={() => toggleRowSelection(r._id)}
                      className="h-4 w-4 rounded border-[hsl(var(--border))] cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--primary))]">{r.customerId?.customerId || '—'}</td>
                  <td className="px-4 py-3 font-medium">{r.customerId?.name || '—'}</td>
                  <td className="px-4 py-3">{r.customerId?.phone || '—'}</td>
                  <td className="px-4 py-3"><span className="rounded-full px-2 py-0.5 text-xs font-medium bg-blue-500/10 text-blue-600">{r.customerId?.type || '—'}</span></td>
                  <td className="px-4 py-3"><span className="rounded-full px-2 py-0.5 text-xs font-medium bg-purple-500/10 text-purple-600">{r.customerId?.sector || '—'}</span></td>
                  <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{formatDate(r.date)}</td>
                  <td className="px-4 py-3 max-w-[200px] truncate text-[hsl(var(--muted-foreground))]" title={r.notes}>{r.notes || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openE(r)} className="p-1 hover:text-[hsl(var(--primary))]"><Edit2 className="h-4 w-4" /></button>
                      <button onClick={() => setDelId(r._id)} className="p-1 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={9} className="px-4 py-8 text-center text-[hsl(var(--muted-foreground))]">No leads found.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {tp > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg hover:bg-[hsl(var(--muted))] disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-sm">{page} / {tp}</span>
          <button onClick={() => setPage(p => Math.min(tp, p + 1))} disabled={page === tp} className="p-2 rounded-lg hover:bg-[hsl(var(--muted))] disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
        </div>
      )}

      {/* Add/Edit Lead Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">{editing ? 'Edit Lead' : 'Add Lead'}</h2>
              <button onClick={() => setModal(false)}><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={save} className="space-y-4">
              <input required placeholder="Name" value={form.name} onChange={u('name')} className={iCls} />
              <input required placeholder="Phone" value={form.phone} onChange={u('phone')} className={iCls} />
              <select required value={form.type} onChange={u('type')} className={iCls}>
                <option value="">Select Type</option>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={form.sector} onChange={u('sector')} className={iCls}>
                {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input type="date" placeholder="Date" value={form.date} onChange={u('date')} className={iCls} />
              <textarea placeholder="Notes" value={form.notes} onChange={u('notes')} rows={3} className={iCls} />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-[hsl(var(--primary))] py-2.5 text-sm font-semibold text-[hsl(var(--primary-foreground))] disabled:opacity-60">
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button type="button" onClick={() => setModal(false)} className="flex-1 rounded-xl border border-[hsl(var(--border))] py-2.5 text-sm">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Google Sheets Sync Modal - 2 Step Process */}
      {syncModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Sheet className="h-6 w-6 text-green-600" />
                <h2 className="text-lg font-bold">
                  {syncStep === 'config' && 'Connect Google Sheet'}
                  {syncStep === 'review' && 'Review Changes'}
                  {syncStep === 'done' && 'Sync Complete'}
                </h2>
              </div>
              <button onClick={closeSyncModal}><X className="h-5 w-5" /></button>
            </div>

            {/* Step 1: Configuration */}
            {syncStep === 'config' && (
              <form onSubmit={handleSync(onSyncSubmit)} className="space-y-4">
                {/* Saved Connections Dropdown */}
                <div>
                  <label className="block text-sm font-medium mb-1.5 flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Select Connection
                  </label>
                  <select
                    value={selectedConnectionId}
                    onChange={e => handleConnectionSelect(e.target.value)}
                    className={iCls}
                  >
                    <option value="new">+ Connect New Sheet</option>
                    {savedConnections.map(conn => (
                      <option key={conn._id} value={conn._id}>
                        {conn.connectionName} ({conn.sheetRange})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Show details if saved connection selected */}
                {selectedConnectionId !== 'new' && (
                  <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4">
                    <p className="text-sm text-green-600 font-medium flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      Connection loaded - Ready to sync
                    </p>
                  </div>
                )}

                {/* Show form fields only for new connections */}
                {selectedConnectionId === 'new' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Spreadsheet ID</label>
                      <input
                        {...regSync('spreadsheetId', { required: selectedConnectionId === 'new' ? 'Spreadsheet ID is required' : false })}
                        placeholder="e.g., 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                        className={iCls}
                      />
                      {syncErrors.spreadsheetId && <p className="text-sm text-destructive mt-1">{syncErrors.spreadsheetId.message}</p>}
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Found in the Google Sheet URL after /d/</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1.5">Sheet Name / Range</label>
                      <input
                        {...regSync('sheetRange', { required: selectedConnectionId === 'new' ? 'Sheet range is required' : false })}
                        placeholder="e.g., Sheet1!A:F or Leads!A1:F100"
                        className={iCls}
                      />
                      {syncErrors.sheetRange && <p className="text-sm text-destructive mt-1">{syncErrors.sheetRange.message}</p>}
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Expected columns: Name, Phone, Type, Sector, Address</p>
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
                      <textarea
                        {...regSync('serviceAccountJson', { required: selectedConnectionId === 'new' ? 'Service account JSON is required' : false })}
                        placeholder='Paste your service account JSON here or upload the file above...'
                        rows={6}
                        className={`${iCls} font-mono text-xs`}
                      />
                      {syncErrors.serviceAccountJson && <p className="text-sm text-destructive mt-1">{syncErrors.serviceAccountJson.message}</p>}
                    </div>

                    {/* Save connection option */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-[hsl(var(--muted))]/30 border border-[hsl(var(--border))]">
                      <input
                        type="checkbox"
                        id="saveConnection"
                        checked={saveNewConnection}
                        onChange={e => setSaveNewConnection(e.target.checked)}
                        className="h-4 w-4 rounded cursor-pointer"
                      />
                      <label htmlFor="saveConnection" className="text-sm cursor-pointer flex items-center gap-2">
                        <Save className="h-4 w-4" />
                        Save this connection for future use
                      </label>
                    </div>

                    {saveNewConnection && (
                      <div>
                        <label className="block text-sm font-medium mb-1.5">Connection Name</label>
                        <input
                          value={newConnectionName}
                          onChange={e => setNewConnectionName(e.target.value)}
                          placeholder="e.g., Facebook Campaign Q1"
                          className={iCls}
                          required={saveNewConnection}
                        />
                      </div>
                    )}
                  </>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={syncing} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60 hover:bg-green-700 transition-colors">
                    {syncing ? (
                      <><Loader2 className="h-4 w-4 animate-spin" />Analyzing…</>
                    ) : (
                      <><Sheet className="h-4 w-4" />Analyze Sheet</>
                    )}
                  </button>
                  <button type="button" onClick={closeSyncModal} className="flex-1 rounded-xl border border-[hsl(var(--border))] py-2.5 text-sm">Cancel</button>
                </div>
              </form>
            )}

            {/* Step 2: Review & Resolve Conflicts */}
            {syncStep === 'review' && analysis && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-green-500/10 p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{analysis.summary.new}</p>
                    <p className="text-xs text-green-600/80">New Leads</p>
                  </div>
                  <div className="rounded-xl bg-blue-500/10 p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{analysis.summary.exactMatch}</p>
                    <p className="text-xs text-blue-600/80">Already Synced</p>
                  </div>
                  <div className="rounded-xl bg-amber-500/10 p-4 text-center">
                    <p className="text-2xl font-bold text-amber-600">{analysis.summary.conflicts}</p>
                    <p className="text-xs text-amber-600/80">Conflicts</p>
                  </div>
                </div>

                {/* New Leads Preview */}
                {analysis.new.length > 0 && (
                  <div className="rounded-xl border border-green-500/20 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Plus className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-600">New Leads to Create ({analysis.new.length})</span>
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {analysis.new.map((lead, i) => (
                        <div key={i} className="text-sm flex gap-2 text-[hsl(var(--muted-foreground))]">
                          <span>{lead.sheetData.name}</span>
                          <span>•</span>
                          <span>{lead.sheetData.phone}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Conflicts - Need Resolution */}
                {analysis.conflicts.length > 0 && (
                  <div className="rounded-xl border border-amber-500/20 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span className="font-medium text-amber-600">Conflicts Requiring Resolution ({analysis.conflicts.length})</span>
                    </div>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {analysis.conflicts.map((conflict) => (
                        <div key={conflict.rowIndex} className="rounded-lg bg-[hsl(var(--muted))]/30 p-3 text-sm">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium">{conflict.existingData?.name} ({conflict.existingData?.customerId})</p>
                              <p className="text-xs text-[hsl(var(--muted-foreground))]">{conflict.existingData?.phone}</p>
                            </div>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => setConflictResolutions(prev => ({ ...prev, [conflict.rowIndex]: 'update' }))}
                                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                  conflictResolutions[conflict.rowIndex] === 'update'
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-[hsl(var(--muted))] hover:bg-amber-500/20'
                                }`}
                              >
                                <RefreshCw className="h-3 w-3 inline mr-1" />Update
                              </button>
                              <button
                                type="button"
                                onClick={() => setConflictResolutions(prev => ({ ...prev, [conflict.rowIndex]: 'keep' }))}
                                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                  conflictResolutions[conflict.rowIndex] === 'keep'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-[hsl(var(--muted))] hover:bg-blue-500/20'
                                }`}
                              >
                                <Check className="h-3 w-3 inline mr-1" />Keep
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-red-500/10 rounded p-2">
                              <p className="text-red-600 mb-1 font-medium">Current (System)</p>
                              <p>{conflict.existingData?.type} • {conflict.existingData?.sector}</p>
                              {conflict.existingData?.address && <p className="truncate">{conflict.existingData.address}</p>}
                            </div>
                            <div className="bg-green-500/10 rounded p-2">
                              <p className="text-green-600 mb-1 font-medium">New (Sheet)</p>
                              <p>{conflict.sheetData.type} • {conflict.sheetData.sector}</p>
                              {conflict.sheetData.address && <p className="truncate">{conflict.sheetData.address}</p>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCommit}
                    disabled={syncing}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60 hover:bg-green-700 transition-colors"
                  >
                    {syncing ? (
                      <><Loader2 className="h-4 w-4 animate-spin" />Committing…</>
                    ) : (
                      <><Check className="h-4 w-4" />Commit Changes</>
                    )}
                  </button>
                  <button type="button" onClick={() => setSyncStep('config')} className="rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-sm">Back</button>
                  <button type="button" onClick={closeSyncModal} className="rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-sm">Cancel</button>
                </div>
              </div>
            )}

            {/* Step 3: Done */}
            {syncStep === 'done' && commitResult && (
              <div className="space-y-4">
                <div className={`rounded-xl p-6 text-center ${commitResult.errors.length > 0 ? 'bg-amber-500/10' : 'bg-green-500/10'}`}>
                  <Check className={`h-12 w-12 mx-auto mb-3 ${commitResult.errors.length > 0 ? 'text-amber-600' : 'text-green-600'}`} />
                  <p className="text-lg font-bold mb-4">Sync Completed</p>
                  <div className="grid grid-cols-4 gap-3 max-w-md mx-auto">
                    <div>
                      <p className="text-2xl font-bold text-green-600">{commitResult.created}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">Created</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{commitResult.updated}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">Updated</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[hsl(var(--muted-foreground))]">{commitResult.skipped}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">Skipped</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-600">{commitResult.forwarded}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">Forwarded</p>
                    </div>
                  </div>
                </div>

                {commitResult.errors.length > 0 && (
                  <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4">
                    <p className="text-sm font-medium text-red-600 mb-2">Errors ({commitResult.errors.length})</p>
                    <ul className="text-xs text-red-600 space-y-1 max-h-24 overflow-y-auto">
                      {commitResult.errors.slice(0, 10).map((e, i) => <li key={i}>• {e}</li>)}
                      {commitResult.errors.length > 10 && <li>…and {commitResult.errors.length - 10} more</li>}
                    </ul>
                  </div>
                )}

                <div className="flex justify-center pt-2">
                  <button type="button" onClick={closeSyncModal} className="rounded-xl bg-[hsl(var(--primary))] px-8 py-2.5 text-sm font-semibold text-[hsl(var(--primary-foreground))]">Done</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {delId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl max-w-sm w-full">
            <p className="mb-4 font-semibold">Delete this lead?</p>
            <div className="flex gap-3">
              <button onClick={del} className="flex-1 rounded-xl bg-destructive py-2 text-sm font-semibold text-white">Delete</button>
              <button onClick={() => setDelId(null)} className="flex-1 rounded-xl border py-2 text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <p className="font-semibold">Delete {selectedRows.size} leads?</p>
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
              This action cannot be undone. All selected leads will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={handleBulkDelete} 
                disabled={bulkDeleting}
                className="flex-1 rounded-xl bg-destructive py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {bulkDeleting ? 'Deleting…' : 'Delete All'}
              </button>
              <button onClick={() => setShowBulkDeleteConfirm(false)} className="flex-1 rounded-xl border py-2 text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
