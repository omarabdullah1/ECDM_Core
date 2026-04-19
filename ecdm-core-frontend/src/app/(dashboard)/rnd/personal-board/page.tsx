'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Kanban, Plus, Edit2, Trash2, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/features/auth/useAuth';
import { API_BASE_URL } from '@/lib/constants';

export default function PersonalBoardPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [tasks, setTasks] = useState<any[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [editingTask, setEditingTask] = useState<any>(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        status: 'To Do',
        assigneeId: '',
    });

    const fetchTasks = async () => {
        try {
            const token = localStorage.getItem('ecdm_token');
            const res = await fetch(`${API_BASE_URL}/rnd/tasks`, {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                },
            });
            if (res.ok) {
                const response = await res.json();
                console.log('✅ Tasks fetched:', response);
                // API returns { success, data: { data: [...], pagination }, message }
                const taskList = response.data?.data || [];
                // Filter only personal tasks
                setTasks(taskList.filter((task: any) => task.type === 'Personal'));
            }
        } catch (error) {
            console.error('Failed to fetch tasks', error);
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
                setAllUsers(response.data?.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch users', error);
        }
    };

    useEffect(() => {
        fetchTasks();
        fetchUsers();
    }, []);

    const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [field]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!user?._id) {
            console.error('❌ User not authenticated');
            alert('User not authenticated. Please log in again.');
            return;
        }

        setIsLoading(true);

        try {
            const token = localStorage.getItem('ecdm_token');
            const payload = {
                ...formData,
                type: 'Personal',
                assigneeId: formData.assigneeId || user._id,
            };

            const res = await fetch(`${API_BASE_URL}/rnd/tasks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : '',
                },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                const data = await res.json();
                console.log('✅ Task created:', data);
                setFormData({ title: '', description: '', status: 'To Do', assigneeId: '' });
                setIsOpen(false);
                fetchTasks();
                router.refresh();
            } else {
                const errorData = await res.json();
                console.error('❌ Failed to create task:', errorData);
                alert(`Failed to create task: ${errorData.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('❌ Network error:', error);
            alert('Network error. Please check your connection and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Drag and Drop Handlers
    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        e.dataTransfer.setData('taskId', taskId);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Necessary to allow dropping
    };

    const handleDrop = async (e: React.DragEvent, newStatus: string) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        if (!taskId) return;

        // Optimistic UI update
        setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t));

        // Backend sync
        try {
            const token = localStorage.getItem('ecdm_token');
            const res = await fetch(`${API_BASE_URL}/rnd/tasks/${taskId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : '',
                },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!res.ok) {
                console.error('Failed to update task status');
                fetchTasks(); // Revert on failure
            }
        } catch (error) {
            console.error('Drop sync failed', error);
            fetchTasks(); // Revert on failure
        }
    };

    // Delete Handler
    const handleDeleteTask = async (taskId: string) => {
        if (!confirm('Are you sure you want to delete this task?')) return;
        
        setTasks(prev => prev.filter(t => t._id !== taskId)); // Optimistic UI
        
        try {
            const token = localStorage.getItem('ecdm_token');
            await fetch(`${API_BASE_URL}/rnd/tasks/${taskId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                },
            });
        } catch (error) {
            console.error('Delete failed', error);
            fetchTasks(); // Revert on failure
        }
    };

    // Edit Handler
    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTask) return;

        setIsLoading(true);
        try {
            const token = localStorage.getItem('ecdm_token');
            const res = await fetch(`${API_BASE_URL}/rnd/tasks/${editingTask._id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : '',
                },
                body: JSON.stringify({
                    title: editingTask.title,
                    description: editingTask.description,
                    status: editingTask.status,
                    assigneeId: editingTask.assigneeId?._id || editingTask.assigneeId || '',
                }),
            });

            if (res.ok) {
                console.log('✅ Task updated');
                setEditingTask(null);
                fetchTasks();
            } else {
                alert('Failed to update task');
            }
        } catch (error) {
            console.error('Edit failed', error);
            alert('Failed to update task');
        } finally {
            setIsLoading(false);
        }
    };

    const iCls = 'flex h-9 w-full rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-3 py-1 text-sm shadow-sm transition-all placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:border-[hsl(var(--primary))]/50 focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10';
    
    // Filter tasks by status for Kanban columns
    const toDoTasks = tasks.filter(t => t.status === 'To Do');
    const inProgressTasks = tasks.filter(t => t.status === 'In Progress');
    const doneTasks = tasks.filter(t => t.status === 'Done');

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in-slide stagger-1">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-blue-500">
                        <Kanban size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">My Personal Kanban</h1>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                            Manage your personal R&D tasks
                        </p>
                    </div>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <button className="rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity">
                            + New Task
                        </button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Personal Task</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Task Title</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={handleInputChange('title')}
                                    className={iCls}
                                    placeholder="Enter task title"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={handleInputChange('description')}
                                    className={iCls}
                                    placeholder="Enter task description"
                                    rows={4}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Status</label>
                                <select
                                    value={formData.status}
                                    onChange={handleInputChange('status')}
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
                                    value={formData.assigneeId}
                                    onChange={handleInputChange('assigneeId')}
                                    className={iCls}
                                >
                                    <option value="">Unassigned</option>
                                    {allUsers.map(u => (
                                        <option key={u._id} value={u._id}>
                                            {u.firstName} {u.lastName} ({u.email})
                                        </option>
                                    ))}
                                </select>
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
                                    {isLoading ? 'Creating...' : 'Create Task'}
                                </button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Kanban Board */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* To Do Column */}
                <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
                    <div className="mb-4 flex justify-between items-center">
                        <h3 className="font-semibold text-sm">To Do</h3>
                        <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full">
                            {toDoTasks.length}
                        </span>
                    </div>
                    <div 
                        className="space-y-3 min-h-[300px]"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, 'To Do')}
                    >
                        {toDoTasks.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-[hsl(var(--border))] p-4 text-center text-sm text-[hsl(var(--muted-foreground))]">
                                No tasks yet
                            </div>
                        ) : (
                            toDoTasks.map(task => (
                                <Card 
                                    key={task._id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, task._id)}
                                    className="p-3 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-shadow group relative"
                                >
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-sm mb-1">{task.title}</h4>
                                            {task.description && (
                                                <p className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-2">
                                                    {task.description}
                                                </p>
                                            )}
                                            {task.assigneeId && (
                                                <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 dark:bg-blue-950 w-fit px-2 py-1 rounded-md">
                                                    <User className="w-3 h-3" />
                                                    {task.assigneeId.firstName} {task.assigneeId.lastName}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => setEditingTask(task)}
                                                className="text-gray-400 hover:text-blue-600 p-1"
                                                title="Edit task"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteTask(task._id)}
                                                className="text-gray-400 hover:text-red-600 p-1"
                                                title="Delete task"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                </div>

                {/* In Progress Column */}
                <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
                    <div className="mb-4 flex justify-between items-center">
                        <h3 className="font-semibold text-sm">In Progress</h3>
                        <span className="text-xs bg-blue-200 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-2 py-1 rounded-full">
                            {inProgressTasks.length}
                        </span>
                    </div>
                    <div 
                        className="space-y-3 min-h-[300px]"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, 'In Progress')}
                    >
                        {inProgressTasks.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-[hsl(var(--border))] p-4 text-center text-sm text-[hsl(var(--muted-foreground))]">
                                No tasks yet
                            </div>
                        ) : (
                            inProgressTasks.map(task => (
                                <Card 
                                    key={task._id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, task._id)}
                                    className="p-3 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-shadow group relative"
                                >
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-sm mb-1">{task.title}</h4>
                                            {task.description && (
                                                <p className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-2">
                                                    {task.description}
                                                </p>
                                            )}
                                            {task.assigneeId && (
                                                <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 dark:bg-blue-950 w-fit px-2 py-1 rounded-md">
                                                    <User className="w-3 h-3" />
                                                    {task.assigneeId.firstName} {task.assigneeId.lastName}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => setEditingTask(task)}
                                                className="text-gray-400 hover:text-blue-600 p-1"
                                                title="Edit task"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteTask(task._id)}
                                                className="text-gray-400 hover:text-red-600 p-1"
                                                title="Delete task"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                </div>

                {/* Done Column */}
                <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
                    <div className="mb-4 flex justify-between items-center">
                        <h3 className="font-semibold text-sm">Done</h3>
                        <span className="text-xs bg-green-200 dark:bg-green-900 text-green-600 dark:text-green-300 px-2 py-1 rounded-full">
                            {doneTasks.length}
                        </span>
                    </div>
                    <div 
                        className="space-y-3 min-h-[300px]"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, 'Done')}
                    >
                        {doneTasks.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-[hsl(var(--border))] p-4 text-center text-sm text-[hsl(var(--muted-foreground))]">
                                No tasks yet
                            </div>
                        ) : (
                            doneTasks.map(task => (
                                <Card 
                                    key={task._id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, task._id)}
                                    className="p-3 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-shadow group relative"
                                >
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-sm mb-1">{task.title}</h4>
                                            {task.description && (
                                                <p className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-2">
                                                    {task.description}
                                                </p>
                                            )}
                                            {task.assigneeId && (
                                                <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 dark:bg-blue-950 w-fit px-2 py-1 rounded-md">
                                                    <User className="w-3 h-3" />
                                                    {task.assigneeId.firstName} {task.assigneeId.lastName}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => setEditingTask(task)}
                                                className="text-gray-400 hover:text-blue-600 p-1"
                                                title="Edit task"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteTask(task._id)}
                                                className="text-gray-400 hover:text-red-600 p-1"
                                                title="Delete task"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                </div>
            </div>

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
                                    placeholder="Enter task title"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Description</label>
                                <textarea
                                    value={editingTask.description}
                                    onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                                    className={iCls}
                                    placeholder="Enter task description"
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
                            </div>                            <div>
                                <label className="block text-sm font-medium mb-2">Assign To</label>
                                <select
                                    value={editingTask.assigneeId?._id || editingTask.assigneeId || ''}
                                    onChange={(e) => setEditingTask({ ...editingTask, assigneeId: e.target.value })}
                                    className={iCls}
                                >
                                    <option value="">Unassigned</option>
                                    {allUsers.map(u => (
                                        <option key={u._id} value={u._id}>
                                            {u.firstName} {u.lastName} ({u.email})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button
                                    type="button"
                                    onClick={() => setEditingTask(null)}
                                    className="rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-sm font-medium hover:bg-[hsl(var(--secondary))] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    {isLoading ? 'Updating...' : 'Update Task'}
                                </button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
