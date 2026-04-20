'use client';
import { useState, useMemo } from 'react';
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
    CheckCircle,
    XCircle,
    ArrowRight,
    User,
    Calendar,
    FileText,
    AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ModificationRequest } from './page';

// ─────────────────────────────────────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────────────────────────────────────

interface ReviewRequestDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    request: ModificationRequest;
    onSubmit: (status: 'Approved' | 'Rejected', reviewNotes: string) => Promise<void>;
}

interface DiffItem {
    key: string;
    label: string;
    originalValue: unknown;
    proposedValue: unknown;
    hasChanged: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

const formatFieldLabel = (key: string): string => {
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .trim();
};

const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '—';
    if (value === '') return '(empty)';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (value instanceof Date) return new Date(value).toLocaleDateString();
    if (typeof value === 'object') {
        if ('name' in (value as Record<string, unknown>)) {
            return String((value as Record<string, unknown>).name);
        }
        if ('firstName' in (value as Record<string, unknown>)) {
            const obj = value as Record<string, unknown>;
            return `${obj.firstName} ${obj.lastName}`;
        }
        return JSON.stringify(value, null, 2);
    }
    return String(value);
};

const valuesAreEqual = (a: unknown, b: unknown): boolean => {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (typeof a === 'object' && a !== null && b !== null) {
        return JSON.stringify(a) === JSON.stringify(b);
    }
    return false;
};

const EXCLUDED_FIELDS = [
    '_id',
    '__v',
    'createdAt',
    'updatedAt',
    'id',
    'customer',
    'salesLead',
    'salesData',
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function ReviewRequestDialog({
    open,
    onOpenChange,
    request,
    onSubmit,
}: ReviewRequestDialogProps) {
    const [reviewNotes, setReviewNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'changes' | 'full'>('changes');

    const diff = useMemo<DiffItem[]>(() => {
        const allKeys = new Set([
            ...Object.keys(request.originalData || {}),
            ...Object.keys(request.proposedData || {}),
        ]);

        const items: DiffItem[] = [];

        allKeys.forEach((key) => {
            if (EXCLUDED_FIELDS.includes(key)) return;

            const originalValue = request.originalData?.[key];
            const proposedValue = request.proposedData?.[key];
            const hasChanged = !valuesAreEqual(originalValue, proposedValue);

            items.push({
                key,
                label: formatFieldLabel(key),
                originalValue,
                proposedValue,
                hasChanged,
            });
        });

        return items.sort((a, b) => {
            if (a.hasChanged && !b.hasChanged) return -1;
            if (!a.hasChanged && b.hasChanged) return 1;
            return a.label.localeCompare(b.label);
        });
    }, [request]);

    const changedItems = diff.filter((item) => item.hasChanged);
    const displayItems = activeTab === 'changes' ? changedItems : diff;

    const handleSubmit = async (status: 'Approved' | 'Rejected') => {
        setIsSubmitting(true);
        try {
            await onSubmit(status, reviewNotes);
        } finally {
            setIsSubmitting(false);
            setReviewNotes('');
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <DialogTitle>
                                {request.status === 'Pending' ? 'Review Modification' : 'Modification Details'}
                            </DialogTitle>
                            <DialogDescription>
                                Proposed changes for {formatFieldLabel(request.moduleName)}
                                {request.status !== 'Pending' && (
                                    <span className="ml-2 font-bold text-gray-500">• {request.status}</span>
                                )}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <DialogBody>
                    <div className="space-y-6">
                        {/* Request Meta Info */}
                        <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                            <div className="flex flex-wrap items-center gap-2">
                                <User className="h-3.5 w-3.5 text-gray-400" />
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Requested By:</span>
                                <span className="text-xs font-bold text-gray-700">{request.requestedBy?.firstName} {request.requestedBy?.lastName}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Submitted:</span>
                                <span className="text-xs font-bold text-gray-700">{formatDate(request.createdAt)}</span>
                            </div>
                            {request.reviewedBy && (
                                <div className="flex flex-wrap items-center gap-2 col-span-2 pt-2 border-t border-gray-200 mt-1">
                                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Reviewed By:</span>
                                    <span className="text-xs font-bold text-green-700">{request.reviewedBy.firstName} {request.reviewedBy.lastName}</span>
                                    <span className="text-[10px] text-gray-400 ml-auto">{formatDate(request.updatedAt)}</span>
                                </div>
                            )}
                        </div>

                        {/* Tab Buttons */}
                        <div className="flex p-1 bg-gray-100/50 rounded-xl border border-gray-100">
                            <button
                                onClick={() => setActiveTab('changes')}
                                className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'changes'
                                        ? 'bg-white text-primary shadow-sm'
                                        : 'text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                Changes ({changedItems.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('full')}
                                className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'full'
                                        ? 'bg-white text-primary shadow-sm'
                                        : 'text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                All Fields ({diff.length})
                            </button>
                        </div>

                        {/* Diff Comparison */}
                        <div className="space-y-3">
                            {displayItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-gray-300">
                                    <AlertTriangle className="h-8 w-8 mb-2 opacity-20" />
                                    <span className="text-xs font-bold uppercase tracking-widest">No changes detected</span>
                                </div>
                            ) : (
                                displayItems.map((item) => (
                                    <div
                                        key={item.key}
                                        className={`rounded-2xl border transition-all ${item.hasChanged
                                                ? 'border-amber-100 bg-amber-50/20'
                                                : 'border-gray-100 bg-white'
                                            }`}
                                    >
                                        <div className="px-4 py-2 border-b border-inherit flex items-center justify-between">
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none">
                                                {item.label}
                                            </span>
                                            {item.hasChanged && (
                                                <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest px-2 py-0.5 bg-amber-100 rounded-full">Modified</span>
                                            )}
                                        </div>

                                        <div className="p-3 grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                                            <div className="space-y-1">
                                                <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">Original</p>
                                                <p className={`text-xs font-medium break-words ${item.hasChanged ? 'text-red-500' : 'text-gray-600'}`}>
                                                    {formatValue(item.originalValue)}
                                                </p>
                                            </div>
                                            <ArrowRight className={`h-4 w-4 ${item.hasChanged ? 'text-amber-400' : 'text-gray-200'}`} />
                                            <div className="space-y-1 text-right">
                                                <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">Proposed</p>
                                                <p className={`text-xs font-black break-words ${item.hasChanged ? 'text-green-600' : 'text-gray-600'}`}>
                                                    {formatValue(item.proposedValue)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Review Notes */}
                        {(request.status === 'Pending' || request.reviewNotes) && (
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    {request.status === 'Pending' ? 'Decision Remarks' : 'Reviewer Notes'}
                                </label>
                                {request.status === 'Pending' ? (
                                    <textarea
                                        value={reviewNotes}
                                        onChange={(e) => setReviewNotes(e.target.value)}
                                        placeholder="State the reason for approval or rejection..."
                                        rows={3}
                                        className="w-full rounded-2xl border border-gray-100 bg-gray-50/50 px-4 py-3 text-sm placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium resize-none shadow-inner"
                                    />
                                ) : (
                                    <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100 italic text-sm text-gray-600">
                                        {request.reviewNotes || 'No notes provided.'}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </DialogBody>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        {request.status === 'Pending' ? 'Cancel' : 'Close'}
                    </Button>
                    {request.status === 'Pending' && (
                        <div className="flex gap-2 ml-auto">
                            <Button
                                variant="destructive"
                                onClick={() => handleSubmit('Rejected')}
                                disabled={isSubmitting}
                                className="bg-red-50 font-bold text-red-600 hover:bg-red-500 hover:text-white border-red-100"
                            >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                            </Button>
                            <Button
                                onClick={() => handleSubmit('Approved')}
                                disabled={isSubmitting}
                                className="bg-green-600 font-bold hover:bg-green-700 shadow-lg shadow-green-600/20"
                            >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                            </Button>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
