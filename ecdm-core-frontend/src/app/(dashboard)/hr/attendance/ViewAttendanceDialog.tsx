'use client';
import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogBody,
    DialogFooter
} from '@/components/ui/dialog';
import {
    Clock,
    User,
    Calendar,
    Briefcase,
    FileText,
    CheckCircle,
    TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/features/auth/useAuth';
import { Trash2 } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { AttendanceRecord } from './columns';

interface ViewAttendanceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    record: AttendanceRecord;
    onSuccess: () => void;
    initialEditMode?: boolean;
}

const inputClass = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all font-medium';

export default function ViewAttendanceDialog({
    open,
    onOpenChange,
    record,
    onSuccess,
    initialEditMode = false,
}: ViewAttendanceDialogProps) {
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'SuperAdmin' || user?.role === 'Admin';
    const [internalPreviewMode, setInternalPreviewMode] = useState(!initialEditMode);
    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState({
        checkIn: '',
        checkOut: '',
        status: '',
        notes: '',
    });

    useEffect(() => {
        if (open && record) {
            setForm({
                checkIn: record.checkIn || '',
                checkOut: record.checkOut || '',
                status: record.status || '',
                notes: record.notes || '',
            });
            setInternalPreviewMode(!initialEditMode);
        }
    }, [open, record, initialEditMode]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await api.put(`/hr/attendance/${record._id}`, form);
            toast.success('Attendance record updated');
            onSuccess();
            onOpenChange(false);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to update record');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        setIsSaving(true);
        try {
            await api.delete(`/hr/attendance/${record._id}`);
            toast.success('Attendance record deleted');
            onSuccess();
            onOpenChange(false);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to delete record');
        } finally {
            setIsSaving(false);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-GB', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <div className="flex items-center justify-between w-full pr-8">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Clock className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <DialogTitle>Attendance Details</DialogTitle>
                                <DialogDescription>
                                    {record.name} • {record.employeeId}
                                </DialogDescription>
                            </div>
                        </div>
                        <button
                            onClick={() => setInternalPreviewMode(!internalPreviewMode)}
                            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${internalPreviewMode
                                    ? 'bg-primary/10 text-primary hover:bg-primary/20'
                                    : 'bg-primary text-white hover:opacity-90'
                                }`}
                        >
                            {internalPreviewMode ? (
                                <>
                                    <TrendingUp className="h-3.5 w-3.5" />
                                    Edit
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    Finish
                                </>
                            )}
                        </button>
                    </div>
                </DialogHeader>

                <DialogBody>
                    <div className="space-y-6">
                        {/* Meta Info */}
                        <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Date:</span>
                                <span className="text-xs font-bold text-gray-700">{formatDate(record.date)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Briefcase className="h-3.5 w-3.5 text-gray-400" />
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Dept:</span>
                                <span className="text-xs font-bold text-gray-700">{record.department || 'N/A'}</span>
                            </div>
                        </div>

                        {/* Form Fields */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Check In</label>
                                <input
                                    type="time"
                                    value={form.checkIn}
                                    onChange={(e) => setForm(prev => ({ ...prev, checkIn: e.target.value }))}
                                    disabled={internalPreviewMode}
                                    className={`${inputClass} ${internalPreviewMode ? 'bg-transparent border-transparent px-1' : ''}`}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Check Out</label>
                                <input
                                    type="time"
                                    value={form.checkOut}
                                    onChange={(e) => setForm(prev => ({ ...prev, checkOut: e.target.value }))}
                                    disabled={internalPreviewMode}
                                    className={`${inputClass} ${internalPreviewMode ? 'bg-transparent border-transparent px-1' : ''}`}
                                />
                            </div>
                            <div className="col-span-2 space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Status</label>
                                <select
                                    value={form.status}
                                    onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
                                    disabled={internalPreviewMode}
                                    className={`${inputClass} ${internalPreviewMode ? 'bg-transparent border-transparent px-1 appearance-none pointer-events-none' : ''}`}
                                >
                                    <option value="">Select Status</option>
                                    <option value="Present">Present</option>
                                    <option value="Absent">Absent</option>
                                    <option value="Late">Late</option>
                                    <option value="Half-day">Half-day</option>
                                    <option value="Leave">Leave</option>
                                </select>
                            </div>
                            <div className="col-span-2 space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Notes</label>
                                <textarea
                                    value={form.notes}
                                    onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                                    disabled={internalPreviewMode}
                                    rows={3}
                                    placeholder="Add any internal remarks..."
                                    className={`${inputClass} ${internalPreviewMode ? 'bg-transparent border-transparent px-1 min-h-0 resize-none' : 'resize-none'}`}
                                />
                            </div>
                        </div>

                        {record.uploadedBy && (
                            <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
                                <span className="uppercase tracking-widest font-bold">Uploaded By:</span>
                                <span className="font-bold text-gray-500">{record.uploadedBy.firstName} {record.uploadedBy.lastName}</span>
                            </div>
                        )}
                    </div>
                </DialogBody>

                <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between w-full">
                    <div>
                        {internalPreviewMode && isAdmin && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2">
                                        <Trash2 className="h-4 w-4" />
                                        Delete
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete this attendance record
                                            for {record.name}.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction 
                                            onClick={handleDelete}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                         >
                                            Delete Permanently
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" onClick={() => onOpenChange(false)}>
                            {internalPreviewMode ? 'Close' : 'Cancel'}
                        </Button>
                        {!internalPreviewMode && (
                            <Button onClick={handleSave} disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

