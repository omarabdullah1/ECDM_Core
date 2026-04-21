'use client';
import { useState } from 'react';
import { X, Upload, AlertCircle, CheckCircle, FileSpreadsheet } from 'lucide-react';
import api from '@/lib/axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <FileSpreadsheet className="h-5 w-5 text-[hsl(var(--primary))]" />
                        <DialogTitle>Import Sales Data</DialogTitle>
                    </div>
                </DialogHeader>

                <DialogBody>
                    <div className="space-y-6">
                        {/* Upload State */}
                        {state === 'upload' && (
                            <div className="space-y-6">
                                <div className="border-2 border-dashed border-gray-100 rounded-2xl p-10 text-center bg-gray-50/30 hover:bg-gray-50/50 transition-colors">
                                    <Upload className="h-10 w-10 mx-auto mb-4 text-gray-300" />
                                    <p className="text-sm font-medium text-gray-500 mb-6">
                                        Drop your Excel file (.xlsx) or CSV here
                                    </p>
                                    <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} className="hidden" id="file-upload" />
                                    <label
                                        htmlFor="file-upload"
                                        className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-2.5 text-sm font-bold text-[hsl(var(--primary-foreground))] hover:opacity-90 cursor-pointer shadow-lg shadow-[hsl(var(--primary))]/20 transition-all font-inter"
                                    >
                                        Select File
                                    </label>
                                    {selectedFile && (
                                        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-100 rounded-lg shadow-sm animate-in fade-in zoom-in-95">
                                            <FileSpreadsheet className="h-4 w-4 text-primary" />
                                            <span className="text-xs font-bold text-gray-700">{selectedFile.name}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-primary/5 rounded-2xl p-5 border border-primary/10">
                                    <h3 className="text-[10px] font-bold text-primary uppercase tracking-[0.1em] mb-3">Required Schema:</h3>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] font-medium text-gray-600">
                                        <div className="flex items-center gap-2"><div className="h-1 w-1 rounded-full bg-primary" /> Name (mandatory)</div>
                                        <div className="flex items-center gap-2"><div className="h-1 w-1 rounded-full bg-primary" /> Phone (mandatory)</div>
                                        <div className="flex items-center gap-2"><div className="h-1 w-1 rounded-full bg-primary" /> Address (mandatory)</div>
                                        <div className="flex items-center gap-2"><div className="h-1 w-1 rounded-full bg-primary" /> Region (mandatory)</div>
                                    </div>
                                    <p className="mt-4 text-[10px] text-primary/60 italic font-medium">Optional: Sector, Status, Order, Notes, Sales platform</p>
                                </div>

                                {error && (
                                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-[11px] font-bold">
                                        <AlertCircle className="h-4 w-4" />
                                        {error}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Analyzing/Committing States */}
                        {(state === 'analyzing' || state === 'committing') && (
                            <div className="py-16 text-center">
                                <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-6"></div>
                                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">{state === 'analyzing' ? 'Analyzing Dataset...' : 'Importing Records...'}</p>
                            </div>
                        )}

                        {/* Review State */}
                        {state === 'review' && analysisResult && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-green-50 border border-green-100 rounded-2xl p-4 text-center">
                                        <p className="text-2xl font-black text-green-600 leading-none">{analysisResult.summary.newLeads}</p>
                                        <p className="text-[10px] font-bold text-green-600/70 uppercase tracking-tighter mt-1">Ready to Import</p>
                                    </div>
                                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
                                        <p className="text-2xl font-black text-amber-600 leading-none">{analysisResult.summary.skipped}</p>
                                        <p className="text-[10px] font-bold text-amber-600/70 uppercase tracking-tighter mt-1">Duplicates</p>
                                    </div>
                                    <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
                                        <p className="text-2xl font-black text-red-600 leading-none">{analysisResult.summary.errors}</p>
                                        <p className="text-[10px] font-bold text-red-600/70 uppercase tracking-tighter mt-1">Invalid Rows</p>
                                    </div>
                                </div>

                                {analysisResult.errors.length > 0 && (
                                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Validation Errors:</h3>
                                        <div className="max-h-40 overflow-y-auto space-y-1 pr-2 custom-scrollbar border-t border-gray-100 pt-3">
                                            {analysisResult.errors.map((err, idx) => (
                                                <div key={idx} className="text-[11px] font-medium text-red-500 flex items-center gap-2">
                                                    <span className="opacity-50 font-mono">Row {err.rowIndex}:</span>
                                                    {err.error}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Success State */}
                        {state === 'success' && commitResult && (
                            <div className="py-10 text-center space-y-6">
                                <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-green-50 animate-in zoom-in-95 duration-500">
                                    <CheckCircle className="h-10 w-10 text-green-500" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 leading-tight">Import Complete</h3>
                                    <p className="text-sm font-medium text-gray-500 mt-1">Successfully added {commitResult.created} new records to the system.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogBody>

                <DialogFooter>
                    {state === 'upload' && (
                        <>
                            <Button variant="ghost" onClick={handleClose}>Cancel</Button>
                            <Button onClick={handleAnalyze} disabled={!selectedFile}>Analyze File</Button>
                        </>
                    )}
                    {state === 'review' && analysisResult && (
                        <>
                            <Button variant="ghost" onClick={() => setState('upload')}>Back</Button>
                            <Button onClick={handleCommit} disabled={analysisResult.summary.newLeads === 0}>
                                Import {analysisResult.summary.newLeads} Valid Leads
                            </Button>
                        </>
                    )}
                    {state === 'success' && (
                        <Button onClick={handleClose} className="w-full">Done</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
