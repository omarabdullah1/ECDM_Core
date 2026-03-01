'use client';
import { useState } from 'react';
import { X, Upload, AlertCircle, CheckCircle, FileSpreadsheet } from 'lucide-react';
import api from '@/lib/axios';

interface AnalyzedLead {
    rowIndex: number;
    data: {
        name: string;
        phone: string;
        address: string;
        region: string;
        date?: string;
        sector?: string;
        status?: string;
        typeOfOrder?: string;
        salesPlatform?: string;
        order?: string;
        notes?: string;
    };
    error?: string;
}

interface AnalysisResult {
    summary: {
        newLeads: number;
        skipped: number;
        errors: number;
    };
    newLeads: AnalyzedLead[];
    skipped: AnalyzedLead[];
    errors: AnalyzedLead[];
}

interface ImportDataDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

type DialogState = 'upload' | 'analyzing' | 'review' | 'committing' | 'success';

export default function ImportDataDialog({ isOpen, onClose, onSuccess }: ImportDataDialogProps) {
    const [state, setState] = useState<DialogState>('upload');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState('');
    const [commitResult, setCommitResult] = useState<{ created: number; errors: string[] } | null>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            const validTypes = [
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-excel',
                'text/csv',
            ];
            
            if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
                setError('Please select a valid Excel (.xlsx, .xls) or CSV file');
                return;
            }

            setSelectedFile(file);
            setError('');
        }
    };

    const handleAnalyze = async () => {
        if (!selectedFile) {
            setError('Please select a file first');
            return;
        }

        setState('analyzing');
        setError('');

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);

            const { data } = await api.post('/sales/data/import/analyze', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setAnalysisResult(data.data);
            setState('review');
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setError(error.response?.data?.message || 'Failed to analyze file');
            setState('upload');
        }
    };

    const handleCommit = async () => {
        if (!analysisResult) return;

        setState('committing');
        setError('');

        try {
            const { data } = await api.post('/sales/data/import/commit', {
                newLeads: analysisResult.newLeads,
            });

            setCommitResult(data.data);
            setState('success');
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setError(error.response?.data?.message || 'Failed to commit data');
            setState('review');
        }
    };

    const handleClose = () => {
        if (state === 'success') {
            onSuccess();
        }
        // Reset state
        setState('upload');
        setSelectedFile(null);
        setAnalysisResult(null);
        setError('');
        setCommitResult(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <FileSpreadsheet className="h-6 w-6 text-[hsl(var(--primary))]" />
                        <h2 className="text-lg font-bold">Import Sales Data from Excel</h2>
                    </div>
                    <button onClick={handleClose} className="hover:opacity-70">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Upload State */}
                {state === 'upload' && (
                    <div className="space-y-4">
                        <div className="border-2 border-dashed border-[hsl(var(--border))] rounded-xl p-8 text-center">
                            <Upload className="h-12 w-12 mx-auto mb-4 text-[hsl(var(--muted-foreground))]" />
                            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
                                Upload your Excel file (.xlsx, .xls) or CSV file
                            </p>
                            <input
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                onChange={handleFileSelect}
                                className="hidden"
                                id="file-upload"
                            />
                            <label
                                htmlFor="file-upload"
                                className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-sm font-semibold text-[hsl(var(--primary-foreground))] hover:opacity-90 cursor-pointer"
                            >
                                Select File
                            </label>
                            {selectedFile && (
                                <p className="mt-3 text-sm font-medium text-[hsl(var(--foreground))]">
                                    Selected: {selectedFile.name}
                                </p>
                            )}
                        </div>

                        <div className="bg-[hsl(var(--muted))]/30 rounded-xl p-4">
                            <h3 className="text-sm font-semibold mb-2">Required Fields:</h3>
                            <ul className="text-sm text-[hsl(var(--muted-foreground))] space-y-1">
                                <li>• <strong>Name</strong> (mandatory)</li>
                                <li>• <strong>Phone</strong> (mandatory)</li>
                                <li>• <strong>Address</strong> (mandatory)</li>
                                <li>• <strong>Region</strong> (mandatory)</li>
                                <li>• Date, Sector, Status, Type Of Order, Sales platform, Order, Notes (optional)</li>
                            </ul>
                        </div>

                        {error && (
                            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-3">
                                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={handleAnalyze}
                                disabled={!selectedFile}
                                className="flex-1 rounded-xl bg-[hsl(var(--primary))] py-2.5 text-sm font-semibold text-[hsl(var(--primary-foreground))] disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Analyze File
                            </button>
                            <button
                                onClick={handleClose}
                                className="flex-1 rounded-xl border border-[hsl(var(--border))] py-2.5 text-sm"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Analyzing State */}
                {state === 'analyzing' && (
                    <div className="py-12 text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[hsl(var(--primary))] border-r-transparent mb-4"></div>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">Analyzing file...</p>
                    </div>
                )}

                {/* Review State */}
                {state === 'review' && analysisResult && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-xl p-4">
                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                    {analysisResult.summary.newLeads}
                                </p>
                                <p className="text-xs text-green-700 dark:text-green-300">Valid / New</p>
                            </div>
                            <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-xl p-4">
                                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                                    {analysisResult.summary.skipped}
                                </p>
                                <p className="text-xs text-yellow-700 dark:text-yellow-300">Already Exists</p>
                            </div>
                            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-4">
                                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                                    {analysisResult.summary.errors}
                                </p>
                                <p className="text-xs text-red-700 dark:text-red-300">Errors</p>
                            </div>
                        </div>

                        {analysisResult.errors.length > 0 && (
                            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-4 max-h-48 overflow-y-auto">
                                <h3 className="text-sm font-semibold text-red-700 dark:text-red-300 mb-2">
                                    Errors (Missing Mandatory Fields):
                                </h3>
                                <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                                    {analysisResult.errors.slice(0, 10).map((err, idx) => (
                                        <li key={idx}>
                                            Row {err.rowIndex}: {err.error}
                                        </li>
                                    ))}
                                    {analysisResult.errors.length > 10 && (
                                        <li className="italic">... and {analysisResult.errors.length - 10} more</li>
                                    )}
                                </ul>
                            </div>
                        )}

                        {error && (
                            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-3">
                                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={handleCommit}
                                disabled={analysisResult.summary.newLeads === 0}
                                className="flex-1 rounded-xl bg-[hsl(var(--primary))] py-2.5 text-sm font-semibold text-[hsl(var(--primary-foreground))] disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Import {analysisResult.summary.newLeads} Valid Records
                            </button>
                            <button
                                onClick={handleClose}
                                className="flex-1 rounded-xl border border-[hsl(var(--border))] py-2.5 text-sm"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Committing State */}
                {state === 'committing' && (
                    <div className="py-12 text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[hsl(var(--primary))] border-r-transparent mb-4"></div>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">Importing data...</p>
                    </div>
                )}

                {/* Success State */}
                {state === 'success' && commitResult && (
                    <div className="space-y-4">
                        <div className="flex flex-col items-center py-8">
                            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                            <h3 className="text-xl font-bold mb-2">Import Successful!</h3>
                            <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                Successfully imported {commitResult.created} records
                            </p>
                        </div>

                        {commitResult.errors.length > 0 && (
                            <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-xl p-4">
                                <h3 className="text-sm font-semibold text-yellow-700 dark:text-yellow-300 mb-2">
                                    Some records failed:
                                </h3>
                                <ul className="text-sm text-yellow-600 dark:text-yellow-400 space-y-1">
                                    {commitResult.errors.slice(0, 5).map((err, idx) => (
                                        <li key={idx}>{err}</li>
                                    ))}
                                    {commitResult.errors.length > 5 && (
                                        <li className="italic">... and {commitResult.errors.length - 5} more</li>
                                    )}
                                </ul>
                            </div>
                        )}

                        <button
                            onClick={handleClose}
                            className="w-full rounded-xl bg-[hsl(var(--primary))] py-2.5 text-sm font-semibold text-[hsl(var(--primary-foreground))]"
                        >
                            Done
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
