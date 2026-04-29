'use client';

import { useState, useEffect, useCallback } from 'react';
import { Activity, Search, Filter, PlusCircle, Edit, Trash2, LogIn, Copy, Clock, Globe, User as UserIcon, Shield, Box, ChevronRight, HardDrive, ArrowRight, CornerDownRight, Hash } from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { DataTable } from '@/components/ui/DataTable';
import { useAuthStore } from '@/features/auth/useAuth';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/dialog';

// ─────────────────────────────────────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────────────────────────────────────

interface User {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
}

interface AuditLog {
    _id: string;
    userId: User;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'OTHER';
    moduleName: string;
    recordId?: string;
    resourceIdentity?: string;
    details: Record<string, any>;
    ipAddress: string;
    createdAt: string;
    updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility Components
// ─────────────────────────────────────────────────────────────────────────────

const ActionBadge = ({ action }: { action: string }) => {
    const config: Record<string, { bg: string; icon: typeof PlusCircle }> = {
        CREATE: {
            bg: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800',
            icon: PlusCircle
        },
        UPDATE: {
            bg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
            icon: Edit
        },
        DELETE: {
            bg: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800',
            icon: Trash2
        },
        LOGIN: {
            bg: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 border border-gray-200 dark:border-gray-800',
            icon: LogIn
        },
        OTHER: {
            bg: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800',
            icon: Activity
        },
    };

    const { bg, icon: Icon } = config[action] || config.OTHER;

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold ${bg}`}>
            <Icon className="h-3 w-3" />
            {action}
        </span>
    );
};

const StatCard = ({
    label,
    value,
    icon: Icon,
    color
}: {
    label: string;
    value: number;
    icon: typeof Activity;
    color: string;
}) => (
    <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex justify-between items-start gap-4">
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--muted-foreground))]">{label}</p>
                <p className="mt-1 text-2xl font-black text-[hsl(var(--foreground))] tracking-tighter">{value.toLocaleString()}</p>
            </div>
            <div className={`rounded-xl p-2.5 ${color} shadow-sm`}>
                <Icon className="h-4 w-4" />
            </div>
        </div>
    </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Log Details Dialog
// ─────────────────────────────────────────────────────────────────────────────

const DetailsDialog = ({ open, onOpenChange, log }: { open: boolean; onOpenChange: (open: boolean) => void; log: AuditLog | null }) => {
    const [showPayload, setShowPayload] = useState(false);

    useEffect(() => {
        if (open) setShowPayload(false);
    }, [open, log?._id]);

    if (!log) return null;

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('en-US', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    };

    /**
     * Converts dot-notation keys to Human-Centric UI Breadcrumbs
     * e.g., "quotation.items[0].description" -> ["Quotation", "Items", "Item #1", "Description"]
     */
    const getPathTokens = (key: string) => {
        return key
            .split('.')
            .map(part => {
                // Check if part contains an array index like items[0]
                const arrayMatch = part.match(/(.*)\[(\d+)\]/);
                if (arrayMatch) {
                    const fieldName = arrayMatch[1]
                        .replace(/([A-Z])/g, ' $1')
                        .replace(/^./, str => str.toUpperCase())
                        .trim();
                    const index = parseInt(arrayMatch[2]) + 1;
                    return [fieldName, `Item #${index}`];
                }
                return part
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/^./, str => str.toUpperCase())
                    .trim();
            })
            .flat();
    };

    /**
     * Intelligently renders values with a focus on non-technical clarity
     */
    const renderValue = (val: any) => {
        if (val === null || val === undefined || val === '') {
            return <span className="text-gray-300 dark:text-gray-600 font-medium italic">Empty</span>;
        }
        
        if (typeof val === 'boolean') {
            return val ? 
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 text-[10px] font-black border border-blue-100 tracking-wider uppercase">True</span> : 
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-400 text-[10px] font-black border border-gray-100 tracking-wider uppercase">False</span>;
        }
        
        if (typeof val === 'object') {
            if (Array.isArray(val)) {
                if (val.length === 0) return <span className="text-gray-300 italic">Empty List</span>;
                return (
                    <div className="flex flex-wrap gap-1 mt-1">
                        {val.slice(0, 3).map((v, i) => (
                            <span key={i} className="px-2 py-1 bg-white dark:bg-gray-800 rounded-lg text-[10px] font-bold border border-gray-100 dark:border-gray-700 shadow-sm">
                                {typeof v === 'object' ? '...' : String(v)}
                            </span>
                        ))}
                        {val.length > 3 && <span className="text-[9px] text-gray-400 font-bold">+{val.length - 3} more items</span>}
                    </div>
                );
            }
            // For remaining objects, show a simplified key-value list instead of JSON
            return (
                <div className="grid grid-cols-1 gap-1 mt-1">
                    {Object.entries(val).slice(0, 5).map(([k, v]) => (
                        <div key={k} className="flex items-center gap-2 text-[10px]">
                            <span className="font-bold text-gray-400">{k}:</span>
                            <span className="truncate">{typeof v === 'object' ? '...' : String(v)}</span>
                        </div>
                    ))}
                </div>
            );
        }
        
        // Handle path strings (uploads)
        if (typeof val === 'string' && val.startsWith('/uploads')) {
            return (
                <div className="flex items-center gap-2 text-blue-500 font-bold underline decoration-blue-200">
                    <HardDrive className="h-3 w-3" /> External Attachment
                </div>
            );
        }

        return <span className="break-all">{String(val)}</span>;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl overflow-hidden border-none p-0 bg-white dark:bg-gray-950">
                <DialogHeader className="bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-md px-8 py-6 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-between w-full pr-8">
                      <div className="flex items-center gap-4">
                          <div className="p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
                            <Activity className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <DialogTitle className="text-xl font-black tracking-tight">Operation Insight</DialogTitle>
                            <p className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase font-bold tracking-[0.1em] mt-0.5">VAULT REF: {log._id}</p>
                          </div>
                      </div>
                    </div>
                </DialogHeader>
                <DialogBody className="space-y-8 p-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
                    {/* Primary Identifier */}
                    <div className={`p-8 rounded-[2.5rem] relative overflow-hidden group shadow-xl ${log.resourceIdentity ? 'bg-blue-600 text-white shadow-blue-200/50' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 shadow-none'}`}>
                        {log.resourceIdentity && <Box className="absolute right-[-20px] top-[-20px] h-40 w-40 opacity-10 rotate-12 group-hover:rotate-45 transition-transform duration-700" />}
                        <div className="relative z-10">
                            <p className={`text-[10px] items-center gap-2 uppercase font-black tracking-[0.3em] mb-3 flex ${log.resourceIdentity ? 'opacity-80' : 'opacity-40'}`}>
                              <Box className="h-4 w-4" /> Affected Resource
                            </p>
                            <h3 className="text-3xl font-black leading-tight tracking-tight">
                                {log.resourceIdentity || (
                                    <span className="opacity-40 italic">Resource identity unmapped</span>
                                )}
                            </h3>
                            <div className="mt-4 flex items-center gap-3">
                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${log.resourceIdentity ? 'bg-white/20' : 'bg-gray-200/50 dark:bg-gray-700/50'}`}>
                                    {log.moduleName}
                                </span>
                                <span className={`text-[10px] font-mono opacity-50`}>
                                    ID: {log.recordId || 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="p-5 rounded-3xl bg-gray-50/50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 shadow-sm">
                            <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1 flex items-center gap-1.5">
                                <Clock className="h-3 w-3" /> Timestamp
                            </div>
                            <div className="text-xs font-bold text-gray-900 dark:text-gray-100">{formatDate(log.createdAt)}</div>
                        </div>
                        <div className="p-5 rounded-3xl bg-gray-50/50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 shadow-sm">
                            <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1 flex items-center gap-1.5">
                                <UserIcon className="h-3 w-3" /> Initiator
                            </div>
                            <div className="text-xs font-black truncate">{log.userId?.firstName} {log.userId?.lastName}</div>
                            <div className="text-[9px] opacity-50 truncate">{log.userId?.email}</div>
                        </div>
                        <div className="p-5 rounded-3xl bg-gray-50/50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 shadow-sm">
                            <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1 flex items-center gap-1.5">
                                <Globe className="h-3 w-3" /> Source IP
                            </div>
                            <div className="text-xs font-bold font-mono tracking-tighter">{log.ipAddress || 'Internal'}</div>
                        </div>
                        <div className="p-5 rounded-3xl bg-gray-50/50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 shadow-sm">
                            <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Status</div>
                            <ActionBadge action={log.action} />
                        </div>
                    </div>

                    {/* Evolutionary Delta Cards (True Key-Value Visualization) */}
                    {log.details?.changes && Object.keys(log.details.changes).length > 0 && (
                        <div className="space-y-6 pt-2">
                            <div className="flex items-center justify-between">
                              <h4 className="text-[12px] font-black text-[hsl(var(--foreground))] uppercase tracking-[0.4em] flex items-center gap-3">
                                  <div className="h-8 w-1 bg-blue-500 rounded-full"></div>
                                  System State Mutation Log
                              </h4>
                              <div className="text-[10px] font-black bg-blue-50 dark:bg-blue-900/20 text-blue-600 px-4 py-2 rounded-[1rem] border border-blue-100 dark:border-blue-800 shadow-sm">
                                {Object.keys(log.details.changes).length} Data Properties Updated
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-4">
                                {Object.entries(log.details.changes).map(([key, delta]: [string, any]) => {
                                    const tokens = getPathTokens(key);
                                    return (
                                        <div key={key} className="group relative bg-white dark:bg-gray-900/40 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-8 hover:shadow-2xl hover:shadow-blue-500/5 hover:border-blue-500/40 transition-all duration-500 animate-in-slide">
                                            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8">
                                                
                                                {/* Property Breadcrumb Navigation */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2 mb-4">
                                                        {tokens.map((token, idx) => (
                                                            <div key={idx} className="flex items-center gap-2">
                                                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border transition-all ${
                                                                    idx === tokens.length - 1 ? 
                                                                    'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20' : 
                                                                    'bg-gray-50 dark:bg-gray-800 text-gray-400 border-gray-100 dark:border-gray-700'
                                                                }`}>
                                                                    {token}
                                                                </span>
                                                                {idx < tokens.length - 1 && <ChevronRight className="h-3 w-3 text-gray-300" />}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    
                                                    {/* Description for non-technical */}
                                                    <div className="flex items-center gap-3 text-xs text-gray-400 font-bold group-hover:text-blue-500 transition-colors">
                                                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-full">
                                                            <CornerDownRight className="h-4 w-4" />
                                                        </div>
                                                        Value transition across system registry
                                                    </div>
                                                </div>

                                                {/* Visual Comparison Interface */}
                                                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-6 lg:w-3/5">
                                                    {/* PRIOR STATE */}
                                                    <div className="flex-1 relative group/val">
                                                        <div className="absolute -top-3 left-6 px-3 py-0.5 rounded-full bg-red-100 dark:bg-red-900 text-red-600 text-[8px] font-black uppercase tracking-widest z-10 border border-red-200">
                                                            Was
                                                        </div>
                                                        <div className="h-full p-6 rounded-[2rem] bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 group-hover:bg-red-50/30 transition-colors overflow-hidden">
                                                            <div className="text-xs font-medium text-gray-400 dark:text-gray-500 line-through decoration-red-300/40 italic">
                                                                {renderValue(delta.from)}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="hidden md:flex items-center justify-center p-3 bg-white dark:bg-gray-800 rounded-full shadow-md border border-gray-100">
                                                        <ArrowRight className="h-4 w-4 text-blue-500" />
                                                    </div>

                                                    {/* TARGET STATE */}
                                                    <div className="flex-1 relative group/val">
                                                        <div className="absolute -top-3 left-6 px-3 py-0.5 rounded-full bg-green-100 dark:bg-green-900 text-green-600 text-[8px] font-black uppercase tracking-widest z-10 border border-green-200">
                                                            Became
                                                        </div>
                                                        <div className="h-full p-6 rounded-[2rem] bg-blue-50/30 dark:bg-blue-900/10 border border-blue-100/20 dark:border-blue-800/40 group-hover:bg-green-50/20 transition-colors">
                                                            <div className="text-xs font-black text-gray-900 dark:text-gray-100">
                                                                {renderValue(delta.to)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Technical Specs Toggle */}
                    <div className="space-y-4 pt-10 border-t border-gray-100 dark:border-gray-800">
                        <button 
                            onClick={() => setShowPayload(!showPayload)}
                            className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.4em] text-gray-300 hover:text-blue-500 transition-all group w-full"
                        >
                            <ChevronRight className={`h-4 w-4 transition-transform duration-500 ${showPayload ? 'rotate-90' : ''}`} />
                            System Protocol Audit Details
                            <div className="h-px bg-gray-100 dark:bg-gray-800 flex-1"></div>
                        </button>
                        
                        {showPayload && (
                            <div className="space-y-6 animate-in-slide">
                                {/* Raw Payload Card */}
                                {log.details?.body && (
                                    <div className="relative group rounded-[2.5rem] overflow-hidden border border-gray-100 dark:border-gray-800 shadow-2xl">
                                        <div className="bg-gray-950 px-8 py-4 flex justify-between items-center border-b border-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-white/5 rounded-xl border border-white/10">
                                                    <HardDrive className="h-4 w-4 text-emerald-400" />
                                                </div>
                                                <span className="text-[10px] font-black uppercase text-white/40 tracking-widest leading-none">Inbound Traffic / Raw Handshake</span>
                                            </div>
                                            <button
                                                onClick={() => copyToClipboard(JSON.stringify(log.details.body, null, 2))}
                                                className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-white/40 transition-all border border-white/5 shadow-inner"
                                            >
                                                <Copy className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <pre className="max-h-[400px] overflow-auto p-10 bg-gray-950 text-emerald-400 text-[11px] font-mono leading-relaxed custom-scrollbar selection:bg-emerald-500/20">
                                            {JSON.stringify(log.details.body, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </DialogBody>
            </DialogContent>
        </Dialog>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────────────────────

export default function AuditLogsPage() {
    const router = useRouter();
    const { user: currentUser } = useAuthStore();

    // State management
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState<string>('All');
    const [moduleFilter, setModuleFilter] = useState<string>('All');

    // Details Dialog State
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    // Check admin access
    const isAdmin = currentUser?.role === 'SuperAdmin' || currentUser?.role === 'Manager';

    useEffect(() => {
        if (!isAdmin) {
            router.replace('/dashboard');
        }
    }, [isAdmin, router]);

    // State
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const limit = 10;
    const totalPages = Math.ceil(total / limit);

    // Fetch audit logs
    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page, limit };
            if (actionFilter && actionFilter !== 'All') params.action = actionFilter;
            if (moduleFilter && moduleFilter !== 'All') params.moduleName = moduleFilter;

            const { data } = await api.get('/admin/audit-logs', { params });
            setLogs(data.data.data || []);
            setTotal(data.data.pagination?.total || 0);
            setFilteredLogs(data.data.data || []);
        } catch {
            toast.error('Failed to load audit logs');
        }
        setLoading(false);
    }, [page, actionFilter, moduleFilter]);

    useEffect(() => {
        if (isAdmin) {
            fetchLogs();
        }
    }, [fetchLogs, isAdmin]);

    // Apply filters and search
    useEffect(() => {
        let result = [...logs];

        // Search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(
                (log) =>
                    log.moduleName.toLowerCase().includes(term) ||
                    log.action.toLowerCase().includes(term) ||
                    log.resourceIdentity?.toLowerCase().includes(term) ||
                    `${log.userId?.firstName} ${log.userId?.lastName}`.toLowerCase().includes(term) ||
                    log.userId?.email.toLowerCase().includes(term) ||
                    log.ipAddress?.toLowerCase().includes(term),
            );
        }

        // Action filter
        if (actionFilter !== 'All') {
            result = result.filter((log) => log.action === actionFilter);
        }

        // Module filter
        if (moduleFilter !== 'All') {
            result = result.filter((log) => log.moduleName === moduleFilter);
        }

        setFilteredLogs(result);
    }, [searchTerm, actionFilter, moduleFilter, logs]);

    // Format date (12-hour AM/PM)
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('en-US', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    // Table columns
    const tableColumns = [
        {
            key: 'createdAt',
            header: 'Time',
            className: 'w-[140px]',
            render: (row: AuditLog) => {
                const fullStr = formatDate(row.createdAt);
                const match = fullStr.match(/(.*),\s(.*)/);
                const date = match ? match[1] : fullStr;
                const time = match ? match[2] : '';
                
                return (
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{date}</span>
                      <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tight">
                          {time}
                      </span>
                    </div>
                );
            },
        },
        {
            key: 'resourceIdentity',
            header: 'Target Record',
            className: 'min-w-[220px]',
            render: (row: AuditLog) => (
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-black tracking-tight leading-none ${row.resourceIdentity ? 'text-blue-600 dark:text-blue-400' : 'text-gray-300 italic'}`}>
                        {row.resourceIdentity || 'Unmapped Identifier'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 opacity-40">
                    <span className="text-[8px] uppercase font-black tracking-[0.2em]">{row.moduleName}</span>
                    <ChevronRight className="h-2 w-2" />
                    <span className="text-[8px] font-mono font-bold">{(row.recordId || '').substring(0, 8)}...</span>
                  </div>
                </div>
            ),
        },
        {
            key: 'userId',
            header: 'Initiator',
            className: 'w-[180px]',
            render: (row: AuditLog) => (
                <div className="flex flex-col">
                    <span className="font-bold text-xs text-gray-800 dark:text-gray-100">
                        {row.userId?.firstName} {row.userId?.lastName}
                    </span>
                    <span className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] opacity-60">
                        {row.userId?.email}
                    </span>
                </div>
            ),
        },
        {
            key: 'action',
            header: 'Operation',
            className: 'w-[110px]',
            render: (row: AuditLog) => <ActionBadge action={row.action} />,
        },
        {
            key: 'ipAddress',
            header: 'Host IP',
            className: 'w-[110px]',
            render: (row: AuditLog) => (
                <span className="text-[10px] font-mono font-bold text-gray-400 tracking-tighter">
                    {row.ipAddress || '--'}
                </span>
            ),
        },
    ];

    if (!isAdmin) return null;

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <PageHeader
                title="System Audit Vault"
                icon={Activity}
                description="High-fidelity activity tracking with deep field-level introspection. Every change is preserved."
            />

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard label="Total Events" value={total} icon={Activity} color="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" />
                <StatCard label="Creation" value={logs.filter((l) => l.action === 'CREATE').length} icon={PlusCircle} color="bg-green-100 text-green-700 dark:bg-green-900/40" />
                <StatCard label="Mutation" value={logs.filter((l) => l.action === 'UPDATE').length} icon={Edit} color="bg-blue-100 text-blue-700 dark:bg-blue-900/40" />
                <StatCard label="Deletion" value={logs.filter((l) => l.action === 'DELETE').length} icon={Trash2} color="bg-red-100 text-red-700 dark:bg-red-900/40" />
                <StatCard label="Sessions" value={logs.filter((l) => l.action === 'LOGIN').length} icon={LogIn} color="bg-orange-100 text-orange-700 dark:bg-orange-900/40" />
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative group flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search system logs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-6 py-3.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[1.25rem] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-medium text-xs shadow-sm shadow-gray-100 dark:shadow-none"
                    />
                </div>
                <div className="flex gap-3">
                    <select
                        value={actionFilter}
                        onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                        className="pl-4 pr-10 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest outline-none appearance-none cursor-pointer focus:border-blue-500 shadow-sm shadow-gray-100 dark:shadow-none"
                    >
                        <option value="All">All Operations</option>
                        <option value="CREATE">CREATE</option>
                        <option value="UPDATE">UPDATE</option>
                        <option value="DELETE">DELETE</option>
                        <option value="LOGIN">LOGIN</option>
                    </select>
                    <select
                        value={moduleFilter}
                        onChange={(e) => { setModuleFilter(e.target.value); setPage(1); }}
                        className="pl-4 pr-10 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest outline-none appearance-none cursor-pointer focus:border-blue-500 shadow-sm shadow-gray-100 dark:shadow-none"
                    >
                        <option value="All">All Modules</option>
                        {Array.from(new Set(logs.map(l => l.moduleName))).sort().map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Data Table */}
            <div className="w-full bg-white dark:bg-gray-900 rounded-[2rem] p-2 border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/40 dark:shadow-none animate-in-slide delay-200">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 space-y-4">
                        <div className="h-10 w-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Harvesting Audit Data</p>
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="p-6 rounded-3xl bg-gray-50 dark:bg-gray-800 mb-6 group">
                          <Activity className="h-12 w-12 text-gray-300 group-hover:text-blue-500 transition-colors duration-500" />
                        </div>
                        <h3 className="text-lg font-black text-gray-900 dark:text-gray-100">No logs found</h3>
                        <p className="text-[11px] text-gray-400 font-bold max-w-xs uppercase tracking-widest">Adjust your filters to see more activity</p>
                    </div>
                ) : (
                    <DataTable
                        columns={tableColumns}
                        data={filteredLogs}
                        page={page}
                        totalPages={totalPages}
                        totalItems={total}
                        itemsPerPage={limit}
                        onPageChange={setPage}
                        onRowClick={(row) => {
                            setSelectedLog(row);
                            setIsDetailsOpen(true);
                        }}
                        selectionDisabled={true}
                    />
                )}
            </div>

            <DetailsDialog 
                open={isDetailsOpen}
                onOpenChange={setIsDetailsOpen}
                log={selectedLog}
            />
        </div>
    );
}

