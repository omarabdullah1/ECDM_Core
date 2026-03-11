'use client';
import { useState, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
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
    Minus,
    Plus
} from 'lucide-react';
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
    // Convert camelCase to Title Case with spaces
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
        // Handle nested objects (like populated references)
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

// Fields to exclude from the diff display
const EXCLUDED_FIELDS = [
    '_id',
    '__v',
    'createdAt',
    'updatedAt',
    'id',
    'customer', // populated field (use customerId instead)
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

    // Calculate the diff between original and proposed data
    const diff = useMemo<DiffItem[]>(() => {
        const allKeys = new Set([
            ...Object.keys(request.originalData),
            ...Object.keys(request.proposedData),
        ]);

        const items: DiffItem[] = [];

        allKeys.forEach((key) => {
            if (EXCLUDED_FIELDS.includes(key)) return;

            const originalValue = request.originalData[key];
            const proposedValue = request.proposedData[key];
            const hasChanged = !valuesAreEqual(originalValue, proposedValue);

            items.push({
                key,
                label: formatFieldLabel(key),
                originalValue,
                proposedValue,
                hasChanged,
            });
        });

        // Sort: changed items first, then alphabetically
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
            <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto overflow-x-hidden p-6 outline-none">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-[hsl(var(--primary))]" />
                        Review Modification Request
                    </DialogTitle>
                    <DialogDescription>
                        Compare the original and proposed changes below. You can approve or reject this request.
                    </DialogDescription>
                </DialogHeader>

                {/* Request Meta Info */}
                <div className="flex flex-wrap gap-4 p-4 bg-[hsl(var(--muted))]/50 rounded-xl text-sm">
                    <div className="flex items-center gap-2">
                        <span className="text-[hsl(var(--muted-foreground))]">Module:</span>
                        <span className="font-medium">{formatFieldLabel(request.moduleName)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                        <span className="text-[hsl(var(--muted-foreground))]">By:</span>
                        <span className="font-medium">
                            {request.requestedBy?.firstName} {request.requestedBy?.lastName}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                        <span className="text-[hsl(var(--muted-foreground))]">Date:</span>
                        <span className="font-medium">{formatDate(request.createdAt)}</span>
                    </div>
                </div>

                {/* Tab Buttons */}
                <div className="flex gap-2 border-b border-[hsl(var(--border))]">
                    <button
                        onClick={() => setActiveTab('changes')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'changes'
                                ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
                                : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                            }`}
                    >
                        Changes Only ({changedItems.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('full')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'full'
                                ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
                                : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                            }`}
                    >
                        All Fields ({diff.length})
                    </button>
                </div>

                {/* Diff Comparison */}
                <div className="max-h-[400px] overflow-y-auto space-y-2">
                    {displayItems.length === 0 ? (
                        <div className="flex items-center justify-center gap-2 py-8 text-[hsl(var(--muted-foreground))]">
                            <AlertTriangle className="h-5 w-5" />
                            <span>No changes detected</span>
                        </div>
                    ) : (
                        displayItems.map((item) => (
                            <div
                                key={item.key}
                                className={`p-3 rounded-lg border ${item.hasChanged
                                        ? 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/10'
                                        : 'border-[hsl(var(--border))] bg-[hsl(var(--card))]'
                                    }`}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    {item.hasChanged ? (
                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                                            <AlertTriangle className="h-3 w-3" />
                                            Changed
                                        </span>
                                    ) : null}
                                    <span className="text-sm font-semibold text-[hsl(var(--foreground))]">
                                        {item.label}
                                    </span>
                                </div>

                                <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
                                    {/* Original Value */}
                                    <div className={`p-2 rounded text-sm ${item.hasChanged
                                            ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                                            : 'bg-[hsl(var(--muted))]/50 text-[hsl(var(--foreground))]'
                                        }`}>
                                        <div className="flex items-center gap-1 text-xs font-medium mb-1">
                                            {item.hasChanged && <Minus className="h-3 w-3" />}
                                            Original
                                        </div>
                                        <div className="break-words whitespace-pre-wrap">
                                            {formatValue(item.originalValue)}
                                        </div>
                                    </div>

                                    {/* Arrow */}
                                    <ArrowRight className={`h-4 w-4 ${item.hasChanged
                                            ? 'text-amber-500'
                                            : 'text-[hsl(var(--muted-foreground))]'
                                        }`} />

                                    {/* Proposed Value */}
                                    <div className={`p-2 rounded text-sm ${item.hasChanged
                                            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                                            : 'bg-[hsl(var(--muted))]/50 text-[hsl(var(--foreground))]'
                                        }`}>
                                        <div className="flex items-center gap-1 text-xs font-medium mb-1">
                                            {item.hasChanged && <Plus className="h-3 w-3" />}
                                            Proposed
                                        </div>
                                        <div className="break-words whitespace-pre-wrap">
                                            {formatValue(item.proposedValue)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Review Notes */}
                <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                        Review Notes (optional)
                    </label>
                    <textarea
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        placeholder="Add any notes about your decision..."
                        rows={3}
                        className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all resize-none"
                    />
                </div>

                {/* Action Buttons */}
                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <button
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                        className="px-4 py-2 rounded-xl border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={() => handleSubmit('Rejected')}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                        <XCircle className="h-4 w-4" />
                        {isSubmitting ? 'Processing...' : 'Reject'}
                    </button>

                    <button
                        onClick={() => handleSubmit('Approved')}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                        <CheckCircle className="h-4 w-4" />
                        {isSubmitting ? 'Processing...' : 'Approve'}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
