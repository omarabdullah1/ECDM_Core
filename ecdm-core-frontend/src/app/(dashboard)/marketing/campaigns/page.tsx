'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import api from '@/lib/axios';
import { TrendingUp, Plus, X, Upload, RefreshCw, Sheet, Database, Save, Loader2, Check, AlertTriangle } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/layout/PageHeader';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Pagination } from '@/components/shared/Pagination';
import { getColumns, type Campaign } from './columns';
import toast from 'react-hot-toast';

const CAMPAIGN_STATUSES = ['Previous', 'Current', 'Future', ''];
const NEXT_STEPS = ['Analyse', 'Pause', 'Stop', 'Continue', ''];

const iCls = 'flex h-9 w-full rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-3 py-1 text-sm shadow-sm transition-all placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:border-[hsl(var(--primary))]/50 focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10';
const labelCls = 'text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-1.5 block';

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

export default function CampaignResultsPage() {
    const [rows, setRows] = useState<Campaign[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Campaign | null>(null);
    const [delId, setDelId] = useState<string | null>(null);
    const [isReadOnly, setIsReadOnly] = useState(true);

    const [fStatus, setFStatus] = useState('');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10; // Set limit per page

    // Google Sheets Sync Dialog state
    const [syncModal, setSyncModal] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [syncStep, setSyncStep] = useState<'config' | 'done'>('config');
    const [syncResult, setSyncResult] = useState<{ synced: number; created: number; updated: number; errors: string[] } | null>(null);
    const { register: regSync, handleSubmit: handleSync, formState: { errors: syncErrors }, reset: resetSync, setValue: setSyncValue, getValues: getSyncValues } = useForm<SheetSyncForm>();

    // Saved Connections state
    const [savedConnections, setSavedConnections] = useState<SavedConnection[]>([]);
    const [selectedConnectionId, setSelectedConnectionId] = useState<string>('new');
    const [saveNewConnection, setSaveNewConnection] = useState(false);
    const [newConnectionName, setNewConnectionName] = useState('');

    const filteredRows = useMemo(() => {
        return rows.filter(r => {
            if (fStatus && r.status !== fStatus) return false;
            return true;
        });
    }, [rows, fStatus]);

    // Reset to page 1 when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [fStatus]);

    // Calculate pagination for client-side filtering
    const totalPages = Math.ceil(filteredRows.length / rowsPerPage);
    const indexOfLastRow = currentPage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;
    const currentRows = filteredRows.slice(indexOfFirstRow, indexOfLastRow);

    // Form state
    const [formData, setFormData] = useState({
        campaignName: '',
        status: '',
        impressions: '0',
        conversions: '0',
        salesRevenue: '0',
        salesRevenuePercent: '0',
        region1: '',
        region2: '',
        region3: '',
        adSpend: '0',
        cpa: '0',
        roas: '0',
        nextSteps: '',
        notes: '',
    });
    const [file, setFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/marketing/campaigns');
            setRows(data.data.campaigns || []);
            setTotal(data.data.total || 0);
        } catch (err) {
            console.error('Failed to fetch campaigns:', err);
            toast.error('Failed to load campaigns');
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
        fetchSavedConnections();
    }, [fetchData]);

    const fetchSavedConnections = async () => {
        try {
            const { data } = await api.get('/marketing/saved-sheets');
            setSavedConnections(data.data || []);
        } catch (e) {
            console.error('Failed to load saved connections:', e);
        }
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

    const openAdd = () => {
        setFormData({
            campaignName: '',
            status: '',
            impressions: '0',
            conversions: '0',
            salesRevenue: '0',
            salesRevenuePercent: '0',
            region1: '',
            region2: '',
            region3: '',
            adSpend: '0',
            cpa: '0',
            roas: '0',
            nextSteps: '',
            notes: '',
        });
        setFile(null);
        setEditing(null);
        setIsReadOnly(false);
        setShowModal(true);
    };

    const openEdit = (campaign: Campaign, mode: 'preview' | 'edit' = 'preview') => {
        setEditing(campaign);
        setIsReadOnly(mode === 'preview');
        setFormData({
            campaignName: campaign.campaignName || '',
            status: campaign.status || '',
            impressions: String(campaign.impressions || 0),
            conversions: String(campaign.conversions || 0),
            salesRevenue: String(campaign.salesRevenue || 0),
            salesRevenuePercent: String(campaign.salesRevenuePercent || 0),
            region1: campaign.region1 || '',
            region2: campaign.region2 || '',
            region3: campaign.region3 || '',
            adSpend: String(campaign.adSpend || 0),
            cpa: String(campaign.cpa || 0),
            roas: String(campaign.roas || 0),
            nextSteps: campaign.nextSteps || '',
            notes: campaign.notes || '',
        });
        setFile(null);
        setEditing(campaign);
        setShowModal(true);
    };

    const handleDelete = async () => {
        if (!delId) return;
        try {
            await api.delete(`/marketing/campaigns/${delId}`);
            toast.success('Campaign deleted successfully!');
            fetchData();
        } catch (err) {
            console.error('Delete failed:', err);
            toast.error('Failed to delete campaign');
        }
        setDelId(null);
    };

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

    const onSyncSubmit = async (data: SheetSyncForm) => {
        setSyncing(true);
        try {
            // Optionally save the new connection
            if (selectedConnectionId === 'new' && saveNewConnection && newConnectionName) {
                await api.post('/marketing/saved-sheets', {
                    connectionName: newConnectionName,
                    spreadsheetId: data.spreadsheetId,
                    sheetRange: data.sheetRange,
                    serviceAccountJson: data.serviceAccountJson,
                });
                fetchSavedConnections();
            }

            const response = await api.post('/marketing/campaigns/sync', data);
            const result = response.data.data;
            
            setSyncResult(result);
            setSyncStep('done');
            fetchData(); // Refresh table
            
            toast.success(`Successfully synced ${result.synced} campaigns`);
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Sync failed');
        }
        setSyncing(false);
    };

    const openSyncModal = () => {
        resetSync();
        setSyncResult(null);
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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0] || null;
        setFile(selectedFile);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.campaignName.trim()) {
            toast.error('Campaign name is required');
            return;
        }

        setSaving(true);
        try {
            const submitData = new FormData();

            // Append all form fields
            Object.keys(formData).forEach(key => {
                const value = formData[key as keyof typeof formData];
                if (value !== undefined && value !== null && value !== '') {
                    submitData.append(key, value);
                }
            });

            // Append file if selected
            if (file) {
                submitData.append('file', file);
            }

            if (editing) {
                await api.put(`/marketing/campaigns/${editing._id}`, submitData);
                toast.success('Campaign updated successfully!');
            } else {
                await api.post('/marketing/campaigns', submitData);
                toast.success('Campaign created successfully!');
            }

            setShowModal(false);
            fetchData();
        } catch (err: any) {
            console.error('Submit error:', err);
            const message = err?.response?.data?.message || 'Operation failed';
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    const columns = getColumns({
        onEdit: (c: Campaign) => openEdit(c, 'edit'),
        onDelete: (id: string) => setDelId(id),
    });

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <PageHeader 
                title="Campaign Results"
                icon={TrendingUp}
                actions={
                    <>
                        <button
                            type="button"
                            onClick={openSyncModal}
                            className="flex items-center gap-2 rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-4 py-2 text-sm font-medium shadow-sm hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10 transition-all"
                        >
                            <Sheet className="h-4 w-4 text-green-600" />
                            Sync Sheet
                        </button>
                        <button
                            type="button"
                            onClick={openAdd}
                            className="flex items-center gap-2 rounded-md bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] shadow-sm hover:opacity-90 border-0 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10 transition-all"
                        >
                            <Plus className="h-4 w-4" />
                            Add Campaign
                        </button>
                    </>
                }
            />

            <div className="flex gap-3 flex-wrap items-center">
                <select value={fStatus} onChange={e => setFStatus(e.target.value)} className="h-9 rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-3 py-1 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:border-[hsl(var(--primary))]/50 focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10">
                    <option value="">All Statuses</option>
                    {CAMPAIGN_STATUSES.filter(s => s !== '').map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            {/* Data Table */}
            <div className="w-full">
                <DataTable
                    data={currentRows}
                    columns={columns}
                    loading={loading}
                    onRowClick={(c: Campaign) => openEdit(c, 'preview')}
                    emptyMessage="No campaign results found."
                    page={currentPage}
                    totalItems={filteredRows.length}
                    itemsPerPage={rowsPerPage}
                    onPageChange={setCurrentPage}
                    defaultVisibility={{
                        notes: false,
                    }}
                />
            </div>

            {/* Add/Edit Campaign Dialog */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Campaign' : 'Add Campaign'}</DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        <form id="campaign-form" onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className={labelCls}>Campaign Name *</label>
                                <input
                                    type="text"
                                    value={formData.campaignName}
                                    onChange={(e) => setFormData({ ...formData, campaignName: e.target.value })}
                                    className={iCls}
                                    placeholder="e.g., Google, Facebook, Instagram, LinkedIn"
                                    required
                                    disabled={isReadOnly}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className={iCls}
                                        disabled={isReadOnly}
                                    >
                                        {CAMPAIGN_STATUSES.map(status => (
                                            <option key={status} value={status}>{status || '(None)'}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className={labelCls}>Next Steps</label>
                                    <select
                                        value={formData.nextSteps}
                                        onChange={(e) => setFormData({ ...formData, nextSteps: e.target.value })}
                                        className={iCls}
                                        disabled={isReadOnly}
                                    >
                                        {NEXT_STEPS.map(step => (
                                            <option key={step} value={step}>{step || '(None)'}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className={labelCls}>Impressions</label>
                                    <input
                                        type="number"
                                        value={formData.impressions}
                                        onChange={(e) => setFormData({ ...formData, impressions: e.target.value })}
                                        className={iCls}
                                        min="0"
                                        disabled={isReadOnly}
                                    />
                                </div>

                                <div>
                                    <label className={labelCls}>Conversions</label>
                                    <input
                                        type="number"
                                        value={formData.conversions}
                                        onChange={(e) => setFormData({ ...formData, conversions: e.target.value })}
                                        className={iCls}
                                        min="0"
                                        disabled={isReadOnly}
                                    />
                                </div>

                                <div>
                                    <label className={labelCls}>Sales Revenue (EGP)</label>
                                    <input
                                        type="number"
                                        value={formData.salesRevenue}
                                        onChange={(e) => setFormData({ ...formData, salesRevenue: e.target.value })}
                                        className={iCls}
                                        min="0"
                                        step="0.01"
                                        disabled={isReadOnly}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className={labelCls}>Ad Spend (EGP)</label>
                                    <input
                                        type="number"
                                        value={formData.adSpend}
                                        onChange={(e) => setFormData({ ...formData, adSpend: e.target.value })}
                                        className={iCls}
                                        min="0"
                                        step="0.01"
                                        disabled={isReadOnly}
                                    />
                                </div>

                                <div>
                                    <label className={labelCls}>CPA (Cost Per Acquisition)</label>
                                    <input
                                        type="number"
                                        value={formData.cpa}
                                        onChange={(e) => setFormData({ ...formData, cpa: e.target.value })}
                                        className={iCls}
                                        min="0"
                                        step="0.01"
                                        disabled={isReadOnly}
                                    />
                                </div>

                                <div>
                                    <label className={labelCls}>ROAS (Return on Ad Spend)</label>
                                    <input
                                        type="number"
                                        value={formData.roas}
                                        onChange={(e) => setFormData({ ...formData, roas: e.target.value })}
                                        className={iCls}
                                        min="0"
                                        step="0.01"
                                        disabled={isReadOnly}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className={labelCls}>Region 1</label>
                                    <input
                                        type="text"
                                        value={formData.region1}
                                        onChange={(e) => setFormData({ ...formData, region1: e.target.value })}
                                        className={iCls}
                                        placeholder="Primary region"
                                        disabled={isReadOnly}
                                    />
                                </div>

                                <div>
                                    <label className={labelCls}>Region 2</label>
                                    <input
                                        type="text"
                                        value={formData.region2}
                                        onChange={(e) => setFormData({ ...formData, region2: e.target.value })}
                                        className={iCls}
                                        placeholder="Secondary region"
                                        disabled={isReadOnly}
                                    />
                                </div>

                                <div>
                                    <label className={labelCls}>Region 3</label>
                                    <input
                                        type="text"
                                        value={formData.region3}
                                        onChange={(e) => setFormData({ ...formData, region3: e.target.value })}
                                        className={iCls}
                                        placeholder="Tertiary region"
                                        disabled={isReadOnly}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={labelCls}>File Upload</label>
                                <div className="relative">
                                    <input
                                        type="file"
                                        onChange={handleFileChange}
                                        accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx"
                                        className="hidden"
                                        id="file-upload"
                                        disabled={isReadOnly}
                                    />
                                    <label
                                        htmlFor="file-upload"
                                        className={`flex items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 px-4 py-6 transition-colors ${isReadOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-[hsl(var(--muted))]/50'}`}
                                    >
                                        <Upload className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
                                        <span className="text-sm text-[hsl(var(--muted-foreground))]">
                                            {file ? file.name : (editing?.fileName || 'No file selected')}
                                        </span>
                                    </label>
                                </div>
                                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                                    Supported: Images (JPG, PNG, GIF, WebP), PDF, DOC, DOCX (Max 10MB)
                                </p>
                            </div>

                            <div>
                                <label className={labelCls}>Notes</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className={iCls}
                                    placeholder="Additional notes"
                                    rows={3}
                                    disabled={isReadOnly}
                                />
                            </div>
                        </form>
                    </DialogBody>
                    <DialogFooter>
                        <div className="flex gap-3 w-full">
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="flex-1 rounded-xl border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] py-3 text-sm font-semibold hover:bg-[hsl(var(--muted))]/50 transition-colors"
                                disabled={saving}
                            >
                                {isReadOnly ? 'Close' : 'Cancel'}
                            </button>
                            {isReadOnly ? (
                                <button
                                    type="button"
                                    key="btn-edit" onClick={(e) => { e.preventDefault(); setIsReadOnly(false); }}
                                    className="flex-1 rounded-xl bg-[hsl(var(--primary))] py-3 text-sm font-semibold text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                                >
                                    <Edit2 className="h-4 w-4" /> Edit Campaign
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    form="campaign-form"
                                    className="protect-mount flex-1 rounded-xl bg-[hsl(var(--primary))] py-3 text-sm font-semibold text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity disabled:opacity-50"
                                    disabled={saving}
                                >
                                    {saving ? 'Saving...' : editing ? 'Update Campaign' : 'Create Campaign'}
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
                                {syncStep === 'done' && 'Sync Complete'}
                            </DialogTitle>
                        </div>
                    </DialogHeader>

                    <DialogBody>
                        {/* Step 1: Configuration */}
                        {syncStep === 'config' && (
                            <form id="sync-form" onSubmit={handleSync(onSyncSubmit)} className="space-y-4">
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
                                                placeholder="e.g., Campaign Results!A:J"
                                                defaultValue="Campaign Results!A:J"
                                                className={iCls}
                                            />
                                            {syncErrors.sheetRange && <p className="text-sm text-destructive mt-1">{syncErrors.sheetRange.message}</p>}
                                            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Expected columns: Campaign, Status, Impressions, Conversions, Sales Revenue, Region 1, Region 2, Region 3, Next steps, Notes</p>
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
                                                    placeholder="e.g., Q1 Campaigns 2026"
                                                    className={iCls}
                                                    required={saveNewConnection}
                                                />
                                            </div>
                                        )}
                                    </>
                                )}
                            </form>
                        )}

                        {/* Step 2: Done */}
                        {syncStep === 'done' && syncResult && (
                            <div className="space-y-4 text-center">
                                <div className={`rounded-full mx-auto flex h-16 w-16 items-center justify-center ${syncResult.errors.length > 0 ? 'bg-amber-500/10' : 'bg-green-500/10'}`}>
                                    {syncResult.errors.length > 0 ? <AlertTriangle className="h-8 w-8 text-amber-600" /> : <Check className="h-8 w-8 text-green-600" />}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold">Sync Completed</h3>
                                    <div className="mt-4 grid grid-cols-3 gap-3">
                                        <div className="rounded-xl border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] p-3">
                                            <p className="text-xl font-bold text-green-600">{syncResult.created}</p>
                                            <p className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))]">Created</p>
                                        </div>
                                        <div className="rounded-xl border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] p-3">
                                            <p className="text-xl font-bold text-blue-600">{syncResult.updated}</p>
                                            <p className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))]">Updated</p>
                                        </div>
                                        <div className="rounded-xl border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] p-3">
                                            <p className="text-xl font-bold text-[hsl(var(--muted-foreground))]">{syncResult.synced}</p>
                                            <p className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))]">Total</p>
                                        </div>
                                    </div>
                                </div>

                                {syncResult.errors.length > 0 && (
                                    <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-left">
                                        <p className="text-sm font-medium text-red-600 mb-2">Errors ({syncResult.errors.length})</p>
                                        <div className="space-y-1 max-h-32 overflow-y-auto">
                                            {syncResult.errors.map((error, i) => (
                                                <p key={i} className="text-xs text-red-600">• {error}</p>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </DialogBody>
                    <DialogFooter>
                        <div className="flex gap-3 w-full">
                            {syncStep === 'config' && (
                                <>
                                    <button
                                        type="button"
                                        onClick={closeSyncModal}
                                        className="flex-1 rounded-xl border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] py-3 text-sm font-semibold hover:bg-[hsl(var(--muted))]/50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        form="sync-form"
                                        disabled={syncing}
                                        className="protect-mount flex-1 rounded-xl bg-green-600 py-3 text-sm font-semibold text-white disabled:opacity-60 hover:bg-green-700 transition-colors"
                                    >
                                        {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sheet className="h-4 w-4 mr-2" />}
                                        {syncing ? 'Syncing…' : 'Sync Sheet'}
                                    </button>
                                </>
                            )}
                            {syncStep === 'done' && (
                                <button
                                    type="button"
                                    onClick={closeSyncModal}
                                    className="w-full rounded-xl bg-[hsl(var(--primary))] py-3 text-sm font-semibold text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity"
                                >
                                    Done
                                </button>
                            )}
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!delId} onOpenChange={(open) => !open && setDelId(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Confirm Delete</DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        <p className="text-[hsl(var(--muted-foreground))]">
                            Are you sure you want to delete this campaign? This action cannot be undone.
                        </p>
                    </DialogBody>
                    <DialogFooter>
                        <div className="flex gap-3 w-full">
                            <button
                                onClick={() => setDelId(null)}
                                className="flex-1 rounded-xl border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] py-3 text-sm font-semibold hover:bg-[hsl(var(--muted))]/50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex-1 rounded-xl bg-red-500 py-3 text-sm font-semibold text-white hover:bg-red-600 transition-colors"
                            >
                                Delete Campaign
                            </button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

