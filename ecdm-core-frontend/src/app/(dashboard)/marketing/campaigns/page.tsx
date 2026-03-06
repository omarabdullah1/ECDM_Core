'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { TrendingUp, Plus, X, Upload } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { getColumns, type Campaign } from './columns';
import toast from 'react-hot-toast';

const CAMPAIGN_STATUSES = ['Previous', 'Current', 'Future', ''];
const NEXT_STEPS = ['Analyse', 'Pause', 'Stop', 'Continue', ''];

const iCls = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all';
const labelCls = 'text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-1.5 block';

export default function CampaignResultsPage() {
    const [rows, setRows] = useState<Campaign[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Campaign | null>(null);
    const [delId, setDelId] = useState<string | null>(null);
    
    // Form state
    const [formData, setFormData] = useState({
        campaignName: '',
        status: '',
        impressions: '0',
        conversions: '0',
        salesRevenuePercent: '0',
        region1: '',
        region2: '',
        region3: '',
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
    }, [fetchData]);

    const openAdd = () => {
        setFormData({
            campaignName: '',
            status: '',
            impressions: '0',
            conversions: '0',
            salesRevenuePercent: '0',
            region1: '',
            region2: '',
            region3: '',
            nextSteps: '',
            notes: '',
        });
        setFile(null);
        setEditing(null);
        setShowModal(true);
    };

    const openEdit = (campaign: Campaign) => {
        setFormData({
            campaignName: campaign.campaignName || '',
            status: campaign.status || '',
            impressions: String(campaign.impressions || 0),
            conversions: String(campaign.conversions || 0),
            salesRevenuePercent: String(campaign.salesRevenuePercent || 0),
            region1: campaign.region1 || '',
            region2: campaign.region2 || '',
            region3: campaign.region3 || '',
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
        onEdit: openEdit,
        onDelete: (id: string) => setDelId(id),
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <TrendingUp className="h-7 w-7 text-[hsl(var(--primary))]" />
                    <h1 className="text-2xl font-bold">Campaign Results</h1>
                </div>
                <button
                    onClick={openAdd}
                    className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-sm font-semibold text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity"
                >
                    <Plus className="h-4 w-4" />
                    Add Campaign
                </button>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto rounded-xl border border-[hsl(var(--border))]">
                <DataTable
                    data={rows}
                    columns={columns}
                    loading={loading}
                    emptyMessage="No campaigns found."
                />
            </div>

            {/* Add/Edit Dialog */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="w-full max-w-2xl rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl my-8">
                        <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-6 py-4">
                            <h2 className="text-xl font-bold">{editing ? 'Edit Campaign' : 'Add Campaign'}</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-[hsl(var(--muted))] rounded-lg transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className={labelCls}>Campaign Name *</label>
                                <input
                                    type="text"
                                    value={formData.campaignName}
                                    onChange={(e) => setFormData({...formData, campaignName: e.target.value})}
                                    className={iCls}
                                    placeholder="e.g., Google, Facebook, Instagram, LinkedIn"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                                        className={iCls}
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
                                        onChange={(e) => setFormData({...formData, nextSteps: e.target.value})}
                                        className={iCls}
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
                                        onChange={(e) => setFormData({...formData, impressions: e.target.value})}
                                        className={iCls}
                                        min="0"
                                    />
                                </div>

                                <div>
                                    <label className={labelCls}>Conversions</label>
                                    <input
                                        type="number"
                                        value={formData.conversions}
                                        onChange={(e) => setFormData({...formData, conversions: e.target.value})}
                                        className={iCls}
                                        min="0"
                                    />
                                </div>

                                <div>
                                    <label className={labelCls}>% Sales Revenue</label>
                                    <input
                                        type="number"
                                        value={formData.salesRevenuePercent}
                                        onChange={(e) => setFormData({...formData, salesRevenuePercent: e.target.value})}
                                        className={iCls}
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className={labelCls}>Region 1</label>
                                    <input
                                        type="text"
                                        value={formData.region1}
                                        onChange={(e) => setFormData({...formData, region1: e.target.value})}
                                        className={iCls}
                                        placeholder="Primary region"
                                    />
                                </div>

                                <div>
                                    <label className={labelCls}>Region 2</label>
                                    <input
                                        type="text"
                                        value={formData.region2}
                                        onChange={(e) => setFormData({...formData, region2: e.target.value})}
                                        className={iCls}
                                        placeholder="Secondary region"
                                    />
                                </div>

                                <div>
                                    <label className={labelCls}>Region 3</label>
                                    <input
                                        type="text"
                                        value={formData.region3}
                                        onChange={(e) => setFormData({...formData, region3: e.target.value})}
                                        className={iCls}
                                        placeholder="Tertiary region"
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
                                    />
                                    <label
                                        htmlFor="file-upload"
                                        className="flex items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 px-4 py-6 cursor-pointer hover:bg-[hsl(var(--muted))]/50 transition-colors"
                                    >
                                        <Upload className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
                                        <span className="text-sm text-[hsl(var(--muted-foreground))]">
                                            {file ? file.name : 'Click to upload or drag & drop'}
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
                                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                    className={iCls}
                                    placeholder="Additional notes"
                                    rows={3}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-[hsl(var(--border))]">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 rounded-xl border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors"
                                    disabled={saving}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity disabled:opacity-50"
                                    disabled={saving}
                                >
                                    {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {delId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold">Confirm Delete</h3>
                            <button onClick={() => setDelId(null)} className="p-2 hover:bg-[hsl(var(--muted))] rounded-lg transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
                            Are you sure you want to delete this campaign? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDelId(null)}
                                className="px-4 py-2 rounded-xl border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
