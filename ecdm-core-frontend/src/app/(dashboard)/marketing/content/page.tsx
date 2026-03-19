'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@/lib/axios';
import { FileText, Plus, X, Upload } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { Pagination } from '@/components/shared/Pagination';
import { getColumns, type ContentTracker } from './columns';
import toast from 'react-hot-toast';

const CONTENT_TYPES = ['Email', 'Social media', 'TV', 'Blog post', 'All', ''];
const CONTENT_STATUSES = ['New', 'In progress', 'Under review', 'Published', 'Suspended', 'Paused', ''];

const iCls = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all';
const labelCls = 'text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-1.5 block';

export default function ContentTrackerPage() {
    const [rows, setRows] = useState<ContentTracker[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<ContentTracker | null>(null);
    const [delId, setDelId] = useState<string | null>(null);

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
        setShowModal(true);
    };

    const openEdit = (content: ContentTracker) => {
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
        onEdit: openEdit,
        onDelete: (id: string) => setDelId(id),
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <FileText className="h-7 w-7 text-[hsl(var(--primary))]" />
                    <h1 className="text-2xl font-bold">Content Tracker</h1>
                </div>
                <button
                    onClick={openAdd}
                    className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-sm font-semibold text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity"
                >
                    <Plus className="h-4 w-4" />
                    Add Content
                </button>
            </div>

            <div className="flex gap-3 flex-wrap items-center">
                <select value={fType} onChange={e => setFType(e.target.value)} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm">
                    <option value="">All Types</option>
                    {CONTENT_TYPES.filter(t => t !== '' && t !== 'All').map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={fStatus} onChange={e => setFStatus(e.target.value)} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm">
                    <option value="">All Statuses</option>
                    {CONTENT_STATUSES.filter(s => s !== '' && s !== 'All').map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto">
                <DataTable
                    data={paginatedRows}
                    columns={columns}
                    loading={loading}
                    emptyMessage="No content trackers found."
                    defaultVisibility={{
                        details: false,
                        notes: false,
                    }}
                />
                {!loading && filteredRows.length > 0 && (
                    <Pagination
                        currentPage={currentPage}
                        totalItems={filteredRows.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                    />
                )}
            </div>

            {/* Add/Edit Dialog */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="w-full max-w-2xl rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl my-8">
                        <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-6 py-4">
                            <h2 className="text-xl font-bold">{editing ? 'Edit Content' : 'Add Content'}</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-[hsl(var(--muted))] rounded-lg transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className={labelCls}>Content Title *</label>
                                <input
                                    type="text"
                                    value={formData.contentTitle}
                                    onChange={(e) => setFormData({ ...formData, contentTitle: e.target.value })}
                                    className={iCls}
                                    placeholder="Enter content title"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Type</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        className={iCls}
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
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Owner</label>
                                    <select
                                        value={formData.owner}
                                        onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                                        className={iCls}
                                        disabled={loadingUsers}
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
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                            Are you sure you want to delete this content? This action cannot be undone.
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
