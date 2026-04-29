'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@/lib/axios';
import { FileText, Plus, X, Upload, Edit2 } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/layout/PageHeader';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Pagination } from '@/components/shared/Pagination';
import { getColumns, type ContentTracker } from './columns';
import toast from 'react-hot-toast';

const CONTENT_TYPES = ['Email', 'Social media', 'TV', 'Blog post', 'All', ''];
const CONTENT_STATUSES = ['New', 'In progress', 'Under review', 'Published', 'Suspended', 'Paused', ''];

const iCls = 'flex h-9 w-full rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-3 py-1 text-sm shadow-sm transition-all placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:border-[hsl(var(--primary))]/50 focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10';
const labelCls = 'text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-1.5 block';

export default function ContentTrackerPage() {
    const [rows, setRows] = useState<ContentTracker[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<ContentTracker | null>(null);
    const [delId, setDelId] = useState<string | null>(null);
    const [isReadOnly, setIsReadOnly] = useState(true);

    const [fType, setFType] = useState('');
    const [fStatus, setFStatus] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const filteredRows = useMemo(() => {
        return rows.filter(r => {
            if (fType && r.type !== fType) return false;
            if (fStatus && r.status !== fStatus) return false;
            return true;
        });
    }, [rows, fType, fStatus]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [fType, fStatus]);

    // Paginate
    const paginatedRows = filteredRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Form state
    const [formData, setFormData] = useState({
        contentTitle: '',
        type: '',
        details: '',
        owner: '',
        status: 'New',
        postDate: '',
        notes: '',
    });
    const [file, setFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/marketing/content');
            setRows(data.data.contents || []);
            setTotal(data.data.total || 0);
        } catch (err) {
            console.error('Failed to fetch content trackers:', err);
            toast.error('Failed to load content trackers');
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Fetch users for owner dropdown
    useEffect(() => {
        if (showModal) {
            setLoadingUsers(true);
            api.get('/hr/users?limit=1000')
                .then(res => {
                    const userList = res.data?.data || [];
                    setUsers(Array.isArray(userList) ? userList : []);
                })
                .catch(err => {
                    console.error('Failed to fetch users:', err);
                    setUsers([]);
                })
                .finally(() => setLoadingUsers(false));
        }
    }, [showModal]);

    const openAdd = () => {
        setFormData({
            contentTitle: '',
            type: '',
            details: '',
            owner: '',
            status: 'New',
            postDate: '',
            notes: '',
        });
        setFile(null);
        setEditing(null);
        setIsReadOnly(false);
        setShowModal(true);
    };

    const openEdit = (content: ContentTracker, mode: 'preview' | 'edit' = 'preview') => {
        setEditing(content);
        setIsReadOnly(mode === 'preview');
        setFormData({
            contentTitle: content.contentTitle || '',
            type: content.type || '',
            details: content.details || '',
            owner: content.owner || '',
            status: content.status || 'New',
            postDate: content.postDate ? new Date(content.postDate).toISOString().split('T')[0] : '',
            notes: content.notes || '',
        });
        setFile(null);
        setEditing(content);
        setShowModal(true);
    };

    const handleDelete = async () => {
        if (!delId) return;
        try {
            await api.delete(`/marketing/content/${delId}`);
            toast.success('Content deleted successfully!');
            fetchData();
        } catch (err) {
            console.error('Delete failed:', err);
            toast.error('Failed to delete content');
        }
        setDelId(null);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0] || null;
        setFile(selectedFile);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.contentTitle.trim()) {
            toast.error('Content title is required');
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
                await api.put(`/marketing/content/${editing._id}`, submitData);
                toast.success('Content updated successfully!');
            } else {
                await api.post('/marketing/content', submitData);
                toast.success('Content created successfully!');
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
        onEdit: (c: ContentTracker) => openEdit(c, 'edit'),
        onDelete: (id: string) => setDelId(id),
    });

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <PageHeader 
                title="Content Tracker"
                icon={FileText}
                actions={
                    <button
                        onClick={openAdd}
                        className="flex items-center gap-2 rounded-md bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] shadow-sm hover:opacity-90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10 transition-all"
                    >
                        <Plus className="h-4 w-4" />
                        Add Content
                    </button>
                }
            />

            <div className="flex gap-3 flex-wrap items-center">
                <select value={fType} onChange={e => setFType(e.target.value)} className="h-9 rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-3 py-1 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:border-[hsl(var(--primary))]/50 focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10">
                    <option value="">All Types</option>
                    {CONTENT_TYPES.filter(t => t !== '' && t !== 'All').map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={fStatus} onChange={e => setFStatus(e.target.value)} className="h-9 rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-3 py-1 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:border-[hsl(var(--primary))]/50 focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10">
                    <option value="">All Statuses</option>
                    {CONTENT_STATUSES.filter(s => s !== '' && s !== 'All').map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            {/* Data Table */}
            <div className="w-full">
                <DataTable
                    data={filteredRows}
                    columns={columns}
                    loading={loading}
                    onRowClick={(c: ContentTracker) => openEdit(c, 'preview')}
                    emptyMessage="No content trackers found."
                    defaultVisibility={{
                        details: false,
                        notes: false,
                    }}
                />
            </div>

            {/* Add/Edit Content Dialog */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Content' : 'Add Content'}</DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        <form id="content-form" onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className={labelCls}>Content Title *</label>
                                <input
                                    type="text"
                                    value={formData.contentTitle}
                                    onChange={(e) => setFormData({ ...formData, contentTitle: e.target.value })}
                                    className={iCls}
                                    placeholder="Enter content title"
                                    required
                                    disabled={isReadOnly}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Type</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        className={iCls}
                                        disabled={isReadOnly}
                                    >
                                        {CONTENT_TYPES.map(type => (
                                            <option key={type} value={type}>{type || '(None)'}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className={labelCls}>Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className={iCls}
                                        disabled={isReadOnly}
                                    >
                                        {CONTENT_STATUSES.map(status => (
                                            <option key={status} value={status}>{status || '(None)'}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className={labelCls}>Details</label>
                                <textarea
                                    value={formData.details}
                                    onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                                    className={iCls}
                                    placeholder="Enter content details"
                                    rows={3}
                                    disabled={isReadOnly}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Owner</label>
                                    <select
                                        value={formData.owner}
                                        onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                                        className={iCls}
                                        disabled={loadingUsers || isReadOnly}
                                    >
                                        <option value="">{loadingUsers ? 'Loading users...' : 'Select owner...'}</option>
                                        {users.map(user => (
                                            <option key={user._id} value={user._id}>
                                                {user.firstName} {user.lastName} {user.role ? `(${user.role})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className={labelCls}>Post Date</label>
                                    <input
                                        type="date"
                                        value={formData.postDate}
                                        onChange={(e) => setFormData({ ...formData, postDate: e.target.value })}
                                        className={iCls}
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
                                    <Edit2 className="h-4 w-4" /> Edit Content
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    form="content-form"
                                    className="protect-mount flex-1 rounded-xl bg-[hsl(var(--primary))] py-3 text-sm font-semibold text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity disabled:opacity-50"
                                    disabled={saving}
                                >
                                    {saving ? 'Saving...' : editing ? 'Update Content' : 'Create Content'}
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
                            Are you sure you want to delete this content? This action cannot be undone.
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
                                Delete Content
                            </button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}


