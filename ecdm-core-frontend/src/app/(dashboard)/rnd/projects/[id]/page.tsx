'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { FolderKanban, FileText, Kanban, Upload, Users, Calendar, Plus, Edit2, Trash2, Eye, File, User } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/features/auth/useAuth';
import { API_BASE_URL } from '@/lib/constants';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function ProjectDetailPage({ params }: PageProps) {
    const router = useRouter();
    const { user } = useAuthStore();
    const resolvedParams = use(params);
    const projectId = resolvedParams.id;
    const [activeTab, setActiveTab] = useState('board');
    const [tasks, setTasks] = useState<any[]>([]);
    const [documents, setDocuments] = useState<any[]>([]);
    const [project, setProject] = useState<any>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [editingTask, setEditingTask] = useState<any>(null);
    const [editingDocument, setEditingDocument] = useState<any>(null);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        status: 'To Do',
        assigneeId: '',
    });
    const [docFormData, setDocFormData] = useState({
        fileName: '',
    });

    const fetchProject = async () => {
        try {
            const token = localStorage.getItem('ecdm_token');
            const res = await fetch(`${API_BASE_URL}/rnd/projects/${projectId}`, {
                headers: { 'Authorization': token ? `Bearer ${token}` : '' },
            });
            if (res.ok) {
                const response = await res.json();
                setProject(response.data?.project || response.data || null);
            }
        } catch (error) {
            console.error('Failed to fetch project', error);
        }
    };

    const fetchTasks = async () => {
        try {
            const token = localStorage.getItem('ecdm_token');
            const res = await fetch(`${API_BASE_URL}/rnd/tasks?projectId=${projectId}`, {
                headers: { 'Authorization': token ? `Bearer ${token}` : '' },
            });
            if (res.ok) {
                const response = await res.json();
                const taskList = response.data?.data || [];
                setTasks(taskList.filter((task: any) => task.type === 'Project'));
            }
        } catch (error) {
            console.error('Failed to fetch tasks', error);
        }
    };

    useEffect(() => {
        fetchProject();
        fetchTasks();
        fetchDocuments();
    }, [projectId]);

    const fetchDocuments = async () => {
        try {
            const token = localStorage.getItem('ecdm_token');
            const res = await fetch(`${API_BASE_URL}/rnd/documents?projectId=${projectId}`, {
                headers: { 'Authorization': token ? `Bearer ${token}` : '' },
            });
            if (res.ok) {
                const response = await res.json();
                setDocuments(response.data?.documents || response.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch documents', error);
        }
    };

    const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [field]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?._id) return;
        setIsLoading(true);
        try {
            const token = localStorage.getItem('ecdm_token');
            const payload = { ...formData, type: 'Project', projectId, assigneeId: formData.assigneeId || user._id };
            const res = await fetch(`${API_BASE_URL}/rnd/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                setFormData({ title: '', description: '', status: 'To Do', assigneeId: '' });
                setIsOpen(false);
                fetchTasks();
            }
        } catch (error) {
            console.error('Failed to create task', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        e.dataTransfer.setData('taskId', taskId);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = async (e: React.DragEvent, newStatus: string) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        if (!taskId) return;
        setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t));
        try {
            const token = localStorage.getItem('ecdm_token');
            await fetch(`${API_BASE_URL}/rnd/tasks/${taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' },
                body: JSON.stringify({ status: newStatus }),
            });
        } catch (error) {
            fetchTasks();
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!confirm('Delete this task?')) return;
        setTasks(prev => prev.filter(t => t._id !== taskId));
        try {
            const token = localStorage.getItem('ecdm_token');
            await fetch(`${API_BASE_URL}/rnd/tasks/${taskId}`, {
                method: 'DELETE',
                headers: { 'Authorization': token ? `Bearer ${token}` : '' },
            });
        } catch (error) {
            fetchTasks();
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTask) return;
        setIsLoading(true);
        try {
            const token = localStorage.getItem('ecdm_token');
            await fetch(`${API_BASE_URL}/rnd/tasks/${editingTask._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' },
                body: JSON.stringify({ 
                    title: editingTask.title, 
                    description: editingTask.description, 
                    status: editingTask.status,
                    assigneeId: editingTask.assigneeId?._id || editingTask.assigneeId || '',
                }),
            });
            setEditingTask(null);
            fetchTasks();
        } catch (error) {
            console.error('Edit failed', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Document Handlers
    const handleFileUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploadFile || !user?._id) return;
        setIsLoading(true);
        try {
            const token = localStorage.getItem('ecdm_token');
            // Convert file to base64
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = reader.result as string;
                const payload = {
                    fileName: uploadFile.name,
                    fileUrl: base64, // In production, upload to cloud storage and use actual URL
                    fileType: uploadFile.type,
                    projectId,
                    uploadedBy: user._id,
                };
                const res = await fetch(`${API_BASE_URL}/rnd/documents`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' },
                    body: JSON.stringify(payload),
                });
                if (res.ok) {
                    setUploadFile(null);
                    setIsUploadOpen(false);
                    fetchDocuments();
                } else {
                    alert('Failed to upload document');
                }
                setIsLoading(false);
            };
            reader.readAsDataURL(uploadFile);
        } catch (error) {
            console.error('Upload failed', error);
            setIsLoading(false);
        }
    };

    const handleEditDocument = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingDocument) return;
        setIsLoading(true);
        try {
            const token = localStorage.getItem('ecdm_token');
            await fetch(`${API_BASE_URL}/rnd/documents/${editingDocument._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' },
                body: JSON.stringify({ fileName: docFormData.fileName }),
            });
            setEditingDocument(null);
            setDocFormData({ fileName: '' });
            fetchDocuments();
        } catch (error) {
            console.error('Edit failed', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteDocument = async (docId: string) => {
        if (!confirm('Delete this document?')) return;
        try {
            const token = localStorage.getItem('ecdm_token');
            const res = await fetch(`${API_BASE_URL}/rnd/documents/${docId}`, {
                method: 'DELETE',
                headers: { 'Authorization': token ? `Bearer ${token}` : '' },
            });
            if (res.ok) {
                fetchDocuments();
            } else {
                const error = await res.json();
                alert(error.message || 'Failed to delete document');
            }
        } catch (error) {
            console.error('Delete failed', error);
        }
    };

    const handlePreview = (dataUri: string) => {
        try {
            // 1. Extract the Base64 data and the MIME type from the Data URI
            const arr = dataUri.split(',');
            const mimeMatch = arr[0].match(/:(.*?);/);
            if (!mimeMatch) {
                console.error("Invalid data URI format");
                alert("Could not preview this document. Invalid format.");
                return;
            }
            const mimeType = mimeMatch[1];
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            
            // 2. Create a Blob from the Uint8Array
            const blob = new Blob([u8arr], { type: mimeType });
            
            // 3. Create an Object URL
            const blobUrl = URL.createObjectURL(blob);
            
            // 4. Open the Blob URL in a new tab
            window.open(blobUrl, '_blank');
            
            // Optional: Revoke the object URL after a delay to free up memory
            setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        } catch (error) {
            console.error("Failed to preview document:", error);
            alert("Could not preview this document. It might be corrupted.");
        }
    };

    const getFileIcon = (fileType: string) => {
        if (fileType.includes('pdf')) return <FileText className="w-8 h-8 text-red-500" />;
        if (fileType.includes('image')) return <File className="w-8 h-8 text-blue-500" />;
        if (fileType.includes('excel') || fileType.includes('spreadsheet')) return <File className="w-8 h-8 text-green-500" />;
        return <File className="w-8 h-8 text-gray-500" />;
    };

    const toDoTasks = tasks.filter(t => t.status === 'To Do');
    const inProgressTasks = tasks.filter(t => t.status === 'In Progress');
    const doneTasks = tasks.filter(t => t.status === 'Done');

    const iCls = 'flex h-9 w-full rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-3 py-1 text-sm shadow-sm transition-all placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:border-[hsl(var(--primary))]/50 focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10';

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-blue-500">
                        <FolderKanban size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">{project?.title || 'Loading...'}</h1>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                            {project?.description || ''}
                        </p>
                        {project && (
                            <div className="flex items-center gap-4 mt-2">
                                <span className="inline-flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                                    <Users size={14} />
                                    {project.members?.length || 0} members
                                </span>
                                <span className="inline-flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                                    <Calendar size={14} />
                                    Created {new Date(project.createdAt).toLocaleDateString()}
                                </span>
                                <span className="inline-flex items-center rounded-full bg-green-500 px-2 py-1 text-xs font-medium text-white">
                                    {project.status}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="board" className="flex flex-wrap items-center gap-2">
                        <Kanban size={16} />
                        Project Board
                    </TabsTrigger>
                    <TabsTrigger value="docs" className="flex flex-wrap items-center gap-2">
                        <FileText size={16} />
                        Documents
                    </TabsTrigger>
                </TabsList>

                {/* Board Tab */}
                <TabsContent value="board" className="space-y-4">
                    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">Project Kanban Board</h2>
                            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                                <DialogTrigger asChild>
                                    <button className="rounded-lg bg-[hsl(var(--primary))] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity">
                                        <Plus size={14} className="inline mr-1" />
                                        Add Task
                                    </button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Create New Project Task</DialogTitle>
                                    </DialogHeader>
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Task Title</label>
                                            <input type="text" value={formData.title} onChange={handleInputChange('title')} className={iCls} required />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Description</label>
                                            <textarea value={formData.description} onChange={handleInputChange('description')} className={iCls} rows={4} required />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Status</label>
                                            <select value={formData.status} onChange={handleInputChange('status')} className={iCls}>
                                                <option value="To Do">To Do</option>
                                                <option value="In Progress">In Progress</option>
                                                <option value="Done">Done</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Assign To</label>
                                            <select value={formData.assigneeId} onChange={handleInputChange('assigneeId')} className={iCls}>
                                                <option value="">Unassigned</option>
                                                {project?.members?.map((member: any) => {
                                                    const memberId = typeof member === 'object' ? member._id : member;
                                                    const memberName = typeof member === 'object' && member.firstName && member.lastName 
                                                        ? `${member.firstName} ${member.lastName}` 
                                                        : typeof member === 'object' && member.name 
                                                        ? member.name 
                                                        : 'Unknown User';
                                                    return (
                                                        <option key={memberId} value={memberId}>
                                                            {memberName}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </div>
                                        <div className="flex gap-2 justify-end">
                                            <button type="button" onClick={() => setIsOpen(false)} className="rounded-xl border px-4 py-2 text-sm font-medium">Cancel</button>
                                            <button type="submit" disabled={isLoading} className="rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                                                {isLoading ? 'Creating...' : 'Create Task'}
                                            </button>
                                        </div>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* To Do Column */}
                            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3">
                                <div className="mb-3 flex justify-between items-center">
                                    <h3 className="font-semibold text-sm">To Do</h3>
                                    <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">{toDoTasks.length}</span>
                                </div>
                                <div className="space-y-2 min-h-[300px]" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'To Do')}>
                                    {toDoTasks.length === 0 ? (
                                        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-[hsl(var(--muted-foreground))]">No tasks</div>
                                    ) : (
                                        toDoTasks.map(task => (
                                            <Card key={task._id} draggable onDragStart={(e) => handleDragStart(e, task._id)} className="p-3 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing group">
                                                <div className="flex justify-between items-start gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-medium text-sm mb-1">{task.title}</h4>
                                                        {task.description && <p className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-2">{task.description}</p>}
                                                        {task.assigneeId && (
                                                            <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 dark:bg-blue-950 w-fit px-2 py-1 rounded-md">
                                                                <User className="w-3 h-3" />
                                                                {task.assigneeId.firstName} {task.assigneeId.lastName}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => setEditingTask(task)} className="text-gray-400 hover:text-blue-600 p-1"><Edit2 className="w-3.5 h-3.5" /></button>
                                                        <button onClick={() => handleDeleteTask(task._id)} className="text-gray-400 hover:text-red-600 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* In Progress Column */}
                            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3">
                                <div className="mb-3 flex justify-between items-center">
                                    <h3 className="font-semibold text-sm">In Progress</h3>
                                    <span className="text-xs bg-blue-200 dark:bg-blue-900 px-2 py-1 rounded-full">{inProgressTasks.length}</span>
                                </div>
                                <div className="space-y-2 min-h-[300px]" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'In Progress')}>
                                    {inProgressTasks.length === 0 ? (
                                        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-[hsl(var(--muted-foreground))]">No tasks</div>
                                    ) : (
                                        inProgressTasks.map(task => (
                                            <Card key={task._id} draggable onDragStart={(e) => handleDragStart(e, task._id)} className="p-3 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing group">
                                                <div className="flex justify-between items-start gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-medium text-sm mb-1">{task.title}</h4>
                                                        {task.description && <p className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-2">{task.description}</p>}
                                                        {task.assigneeId && (
                                                            <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 dark:bg-blue-950 w-fit px-2 py-1 rounded-md">
                                                                <User className="w-3 h-3" />
                                                                {task.assigneeId.firstName} {task.assigneeId.lastName}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => setEditingTask(task)} className="text-gray-400 hover:text-blue-600 p-1"><Edit2 className="w-3.5 h-3.5" /></button>
                                                        <button onClick={() => handleDeleteTask(task._id)} className="text-gray-400 hover:text-red-600 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Done Column */}
                            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3">
                                <div className="mb-3 flex justify-between items-center">
                                    <h3 className="font-semibold text-sm">Done</h3>
                                    <span className="text-xs bg-green-200 dark:bg-green-900 px-2 py-1 rounded-full">{doneTasks.length}</span>
                                </div>
                                <div className="space-y-2 min-h-[300px]" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'Done')}>
                                    {doneTasks.length === 0 ? (
                                        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-[hsl(var(--muted-foreground))]">No tasks</div>
                                    ) : (
                                        doneTasks.map(task => (
                                            <Card key={task._id} draggable onDragStart={(e) => handleDragStart(e, task._id)} className="p-3 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing group">
                                                <div className="flex justify-between items-start gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-medium text-sm mb-1">{task.title}</h4>
                                                        {task.description && <p className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-2">{task.description}</p>}
                                                        {task.assigneeId && (
                                                            <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 dark:bg-blue-950 w-fit px-2 py-1 rounded-md">
                                                                <User className="w-3 h-3" />
                                                                {task.assigneeId.firstName} {task.assigneeId.lastName}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => setEditingTask(task)} className="text-gray-400 hover:text-blue-600 p-1"><Edit2 className="w-3.5 h-3.5" /></button>
                                                        <button onClick={() => handleDeleteTask(task._id)} className="text-gray-400 hover:text-red-600 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* Documents Tab */}
                <TabsContent value="docs" className="space-y-4">
                    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">Project Documents</h2>
                            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                                <DialogTrigger asChild>
                                    <button className="flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity">
                                        <Upload size={14} />
                                        Upload File
                                    </button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Upload Document</DialogTitle>
                                    </DialogHeader>
                                    <form onSubmit={handleFileUpload} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Select File</label>
                                            <input
                                                type="file"
                                                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                                className={iCls}
                                                required
                                            />
                                            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Supports PDF, Images, Excel files</p>
                                        </div>
                                        <div className="flex gap-2 justify-end">
                                            <button type="button" onClick={() => setIsUploadOpen(false)} className="rounded-xl border px-4 py-2 text-sm">Cancel</button>
                                            <button type="submit" disabled={isLoading || !uploadFile} className="rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                                                {isLoading ? 'Uploading...' : 'Upload'}
                                            </button>
                                        </div>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>

                        {documents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <FileText size={48} className="text-[hsl(var(--muted-foreground))] mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
                                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4 text-center max-w-md">
                                    Upload project documentation, specifications, reports, and other files here
                                </p>
                                <button 
                                    onClick={() => setIsUploadOpen(true)}
                                    className="flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
                                >
                                    <Upload size={16} />
                                    Upload First Document
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {documents.map(doc => (
                                    <Card key={doc._id} className="p-4 hover:shadow-md transition-shadow">
                                        <div className="flex items-start gap-3">
                                            <div className="flex-shrink-0">
                                                {getFileIcon(doc.fileType)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-medium text-sm truncate">{doc.fileName}</h4>
                                                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                                                    Uploaded by {doc.uploadedBy?.firstName} {doc.uploadedBy?.lastName}
                                                </p>
                                                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                                                    {new Date(doc.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 mt-3 pt-3 border-t border-[hsl(var(--border))]">
                                            <button
                                                onClick={() => handlePreview(doc.fileUrl)}
                                                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                                                title="Preview"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                Preview
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingDocument(doc);
                                                    setDocFormData({ fileName: doc.fileName });
                                                }}
                                                className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-700"
                                                title="Edit name"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                                Rename
                                            </button>
                                            {(user?._id === doc.uploadedBy?._id || user?._id === doc.uploadedBy) && (
                                                <button
                                                    onClick={() => handleDeleteDocument(doc._id)}
                                                    className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Edit Task Dialog */}
            <Dialog open={editingTask !== null} onOpenChange={(open) => !open && setEditingTask(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Task</DialogTitle>
                    </DialogHeader>
                    {editingTask && (
                        <form onSubmit={handleEditSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Task Title</label>
                                <input
                                    type="text"
                                    value={editingTask.title}
                                    onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                                    className={iCls}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Description</label>
                                <textarea
                                    value={editingTask.description}
                                    onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                                    className={iCls}
                                    rows={4}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Status</label>
                                <select
                                    value={editingTask.status}
                                    onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value })}
                                    className={iCls}
                                >
                                    <option value="To Do">To Do</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Done">Done</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Assign To</label>
                                <select
                                    value={editingTask.assigneeId?._id || editingTask.assigneeId || ''}
                                    onChange={(e) => setEditingTask({ ...editingTask, assigneeId: e.target.value })}
                                    className={iCls}
                                >
                                    <option value="">Unassigned</option>
                                    {project?.members?.map((member: any) => {
                                        const memberId = typeof member === 'object' ? member._id : member;
                                        const memberName = typeof member === 'object' && member.firstName && member.lastName 
                                            ? `${member.firstName} ${member.lastName}` 
                                            : typeof member === 'object' && member.name 
                                            ? member.name 
                                            : 'Unknown User';
                                        return (
                                            <option key={memberId} value={memberId}>
                                                {memberName}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button
                                    type="button"
                                    onClick={() => setEditingTask(null)}
                                    className="rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-sm font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                                >
                                    {isLoading ? 'Updating...' : 'Update Task'}
                                </button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Edit Document Dialog */}
            <Dialog open={editingDocument !== null} onOpenChange={(open) => !open && setEditingDocument(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename Document</DialogTitle>
                    </DialogHeader>
                    {editingDocument && (
                        <form onSubmit={handleEditDocument} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">File Name</label>
                                <input
                                    type="text"
                                    value={docFormData.fileName}
                                    onChange={(e) => setDocFormData({ fileName: e.target.value })}
                                    className={iCls}
                                    required
                                />
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button
                                    type="button"
                                    onClick={() => setEditingDocument(null)}
                                    className="rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-sm font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                                >
                                    {isLoading ? 'Updating...' : 'Update'}
                                </button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
