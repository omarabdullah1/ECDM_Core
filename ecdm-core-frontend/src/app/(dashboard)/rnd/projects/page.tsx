'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FolderKanban, Plus, Eye, Edit2, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { API_BASE_URL } from '@/lib/constants';

interface Project {
    _id: string;
    title: string;
    description: string;
    status: string;
    members: any[];
    createdAt: string;
}

// Mock data for demonstration
const mockProjects: Project[] = [];

const statusColors: Record<string, string> = {
    Planning: 'bg-gray-500',
    Active: 'bg-green-500',
    'On Hold': 'bg-yellow-500',
    Completed: 'bg-blue-500',
    Cancelled: 'bg-red-500',
};

export default function RndProjectsPage() {
    const router = useRouter();
    const [projects, setProjects] = useState<Project[]>(mockProjects);
    const [users, setUsers] = useState<any[]>([]);
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
                console.log('✅ Projects fetched:', response);
                // API returns { success, data: { data: [...], pagination }, message }
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
                console.log(`✅ Project ${isEditing ? 'updated' : 'created'}`);
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
        {
            key: 'actions',
            header: 'Actions',
      className: 'md:w-[1%] md:whitespace-nowrap',
            render: (row: Project) => (
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => window.location.href = `/rnd/projects/${row._id}`}
                        className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))] transition-colors"
                        title="View Project"
                    >
                        <Eye size={16} />
                    </button>
                    <button
                        onClick={() => handleEditProject(row)}
                        className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))] transition-colors"
                        title="Edit Project"
                    >
                        <Edit2 size={16} />
                    </button>
                    <button
                        onClick={() => handleDeleteProject(row._id)}
                        className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                        title="Delete Project"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in-slide stagger-1">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-blue-500">
                        <FolderKanban size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">R&D Projects</h1>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                            Manage research and development projects
                        </p>
                    </div>
                </div>
                <Dialog open={isOpen} onOpenChange={(open) => {
                    setIsOpen(open);
                    if (!open) {
                        setEditingProject(null);
                        setFormData({ title: '', description: '', status: 'Planning', members: [] });
                    }
                }}>
                    <DialogTrigger asChild>
                        <button className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity">
                            <Plus size={16} />
                            Add Project
                        </button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingProject ? 'Edit Project' : 'Create New R&D Project'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Project Title</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={handleInputChange('title')}
                                    className={iCls}
                                    placeholder="Enter project title"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={handleInputChange('description')}
                                    className={iCls}
                                    placeholder="Enter project description"
                                    rows={4}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5">
                                    Status
                                </label>
                                <select
                                    value={formData.status}
                                    onChange={handleInputChange('status')}
                                    className={iCls}
                                >
                                    <option value="Planning">Planning</option>
                                    <option value="Active">Active</option>
                                    <option value="On Hold">On Hold</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Cancelled">Cancelled</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Team Members</label>
                                <select
                                    multiple
                                    value={formData.members}
                                    onChange={(e) => {
                                        const selected = Array.from(e.target.selectedOptions, option => option.value);
                                        setFormData(prev => ({ ...prev, members: selected }));
                                    }}
                                    className={`${iCls} min-h-[100px]`}
                                >
                                    {users.map(user => (
                                        <option key={user._id} value={user._id}>
                                            {user.firstName} {user.lastName} ({user.email})
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Hold Ctrl/Cmd to select multiple members</p>
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-sm font-medium hover:bg-[hsl(var(--secondary))] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    {isLoading ? (editingProject ? 'Updating...' : 'Creating...') : (editingProject ? 'Update Project' : 'Create Project')}
                                </button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Projects Table */}
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                {projects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4">
                        <FolderKanban size={48} className="text-[hsl(var(--muted-foreground))] mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
                        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
                            Get started by creating your first R&D project
                        </p>
                        <button 
                            onClick={() => setIsOpen(true)}
                            className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
                        >
                            <Plus size={16} />
                            Add Project
                        </button>
                    </div>
                ) : (
                    <DataTable columns={columns} data={projects} />
                )}
            </div>
        </div>
    );
}
