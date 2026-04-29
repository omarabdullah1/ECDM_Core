'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FolderKanban, Plus, Eye, Edit2, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { API_BASE_URL } from '@/lib/constants';
import { useAuthStore } from '@/features/auth/useAuth';

interface Project {
    _id: string;
    title: string;
    description: string;
    status: string;
    members: any[];
    createdAt: string;
}

const statusColors: Record<string, string> = {
    Planning: 'bg-gray-500',
    Active: 'bg-green-500',
    'On Hold': 'bg-yellow-500',
    Completed: 'bg-blue-500',
    Cancelled: 'bg-red-500',
};

export default function RndProjectsPage() {
    const router = useRouter();
    const [projects, setProjects] = useState<Project[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'SuperAdmin' || user?.role === 'Admin';
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        status: 'Planning',
        members: [] as string[],
    });

    const fetchProjects = async () => {
        try {
            const token = localStorage.getItem('ecdm_token');
            const res = await fetch(`${API_BASE_URL}/rnd/projects`, {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                },
            });
            if (res.ok) {
                const response = await res.json();
                const projectsList = response.data?.data || [];
                setProjects(projectsList);
            }
        } catch (error) {
            console.error('Failed to fetch projects', error);
        }
    };

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('ecdm_token');
            const res = await fetch(`${API_BASE_URL}/auth/users`, {
                headers: { 'Authorization': token ? `Bearer ${token}` : '' },
            });
            if (res.ok) {
                const response = await res.json();
                setUsers(response.data?.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch users', error);
        }
    };

    useEffect(() => {
        fetchProjects();
        fetchUsers();
    }, []);

    const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [field]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const token = localStorage.getItem('ecdm_token');
            const isEditing = !!editingProject;
            const url = isEditing ? `${API_BASE_URL}/rnd/projects/${editingProject._id}` : `${API_BASE_URL}/rnd/projects`;
            const method = isEditing ? 'PATCH' : 'POST';
            
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : '',
                },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                setFormData({ title: '', description: '', status: 'Planning', members: [] });
                setEditingProject(null);
                setIsOpen(false);
                fetchProjects();
                router.refresh();
            } else {
                const errorData = await res.json();
                alert(`Failed: ${errorData.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('❌ Network error:', error);
            alert('Network error.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteProject = async (projectId: string) => {
        if (!confirm('Are you sure you want to delete this project?')) return;
        try {
            const token = localStorage.getItem('ecdm_token');
            await fetch(`${API_BASE_URL}/rnd/projects/${projectId}`, {
                method: 'DELETE',
                headers: { 'Authorization': token ? `Bearer ${token}` : '' },
            });
            fetchProjects();
        } catch (error) {
            console.error('Delete failed', error);
        }
    };

    const handleEditProject = (project: Project) => {
        setEditingProject(project);
        setFormData({
            title: project.title,
            description: project.description,
            status: project.status,
            members: project.members?.map((m: any) => m._id || m) || [],
        });
        setIsOpen(true);
    };

    const iCls = 'flex h-9 w-full rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-3 py-1 text-sm shadow-sm transition-all placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:border-[hsl(var(--primary))]/50 focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10';

    const columns = [
        {
            key: 'title',
            header: 'Project Title',
            className: 'md:w-1/6 md:max-w-[120px] md:truncate',
            render: (row: Project) => (
                <div>
                    <div className="font-medium">{row.title}</div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">
                        {row.description.substring(0, 60)}...
                    </div>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            className: 'md:w-1/6 md:max-w-[120px] md:truncate',
            render: (row: Project) => (
                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium text-white ${statusColors[row.status] || 'bg-gray-500'}`}>
                    {row.status}
                </span>
            ),
        },
        {
            key: 'members',
            header: 'Members',
            className: 'md:w-1/6 md:max-w-[120px] md:truncate',
            render: (row: Project) => <span className="text-sm">{row.members?.length || 0} members</span>,
        },
        {
            key: 'createdAt',
            header: 'Created',
            className: 'md:w-1/6 md:max-w-[120px] md:truncate',
            render: (row: Project) => (
                <span className="text-sm text-[hsl(var(--muted-foreground))]">
                    {new Date(row.createdAt).toLocaleDateString()}
                </span>
            ),
        },
    ];

    return (
        <div className="space-y-6 pb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500">
                        <FolderKanban size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">R&D Projects</h1>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">Manage and track R&D projects</p>
                    </div>
                </div>
                <button 
                    onClick={() => {
                        setEditingProject(null);
                        setFormData({ title: '', description: '', status: 'Planning', members: [] });
                        setIsOpen(true);
                    }}
                    className="rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
                >
                    + New Project
                </button>
            </div>

            <div className="w-full">
                <DataTable 
                    columns={columns} 
                    data={projects} 
                    renderActions={(row: Project) => (
                        <div className="flex items-center gap-2">
                            <button onClick={() => handleEditProject(row)} className="p-2 hover:bg-[hsl(var(--accent))] rounded-lg transition-colors">
                                <Edit2 size={16} />
                            </button>
                            {isAdmin && (
                                <button onClick={() => handleDeleteProject(row._id)} className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    )}
                />
            </div>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingProject ? 'Edit Project' : 'Create New Project'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Project Title</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={handleInputChange('title')}
                                className={iCls}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={handleInputChange('description')}
                                className={iCls}
                                rows={4}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Status</label>
                            <select value={formData.status} onChange={handleInputChange('status')} className={iCls}>
                                {Object.keys(statusColors).map(status => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button type="button" onClick={() => setIsOpen(false)} className="rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-sm font-medium hover:bg-[hsl(var(--secondary))] transition-colors">Cancel</button>
                            <button type="submit" disabled={isLoading} className="rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50">
                                {isLoading ? 'Saving...' : 'Save Project'}
                            </button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

