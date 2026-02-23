'use client';

import { useEffect, useState } from 'react';
import { FileText, Plus, Clock, Trash2, CheckCircle, Loader2, XCircle, Brain } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { getDocuments, deleteDocument } from '@/lib/api';
import { cn } from '@/lib/utils';

const statusConfig = {
    completed: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Ready' },
    failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Failed' },
    pending: { icon: Loader2, color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'Pending', spin: true },
    extracting_text: { icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Extracting', spin: false },
    chunking: { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Chunking', spin: true },
    indexing: { icon: Loader2, color: 'text-indigo-400', bg: 'bg-indigo-500/10', label: 'Indexing', spin: true },
    generating_summary: { icon: Brain, color: 'text-purple-400', bg: 'bg-purple-500/10', label: 'AI Writing', spin: true },
} as const;

function StatusBadge({ status }: { status: string }) {
    const cfg = statusConfig[status as keyof typeof statusConfig] ?? statusConfig.pending;
    const Icon = cfg.icon;
    return (
        <span className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider', cfg.bg, cfg.color)}>
            <Icon size={9} className={'spin' in cfg && cfg.spin ? 'animate-spin' : ''} />
            {cfg.label}
        </span>
    );
}

interface SidebarProps {
    onNewDocument?: () => void;
}

export default function Sidebar({ onNewDocument }: SidebarProps) {
    const { documents, setDocuments, currentDocumentId, setCurrentDocumentId, removeDocument, addToast } = useStore();
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        const fetchDocs = async () => {
            try {
                const docs = await getDocuments();
                setDocuments(docs);
            } catch {
                // Silent fail - backend may not be up yet
            }
        };

        fetchDocs();
        const interval = setInterval(fetchDocs, 3000);
        return () => clearInterval(interval);
    }, [setDocuments]);

    const handleDelete = async (e: React.MouseEvent, docId: string) => {
        e.stopPropagation();
        if (!confirm('Delete this document? This cannot be undone.')) return;
        setDeletingId(docId);
        try {
            await deleteDocument(docId);
            removeDocument(docId);
            addToast('success', 'Document deleted.');
        } catch {
            addToast('error', 'Failed to delete document.');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="w-72 h-screen border-r border-slate-800 bg-slate-900/60 backdrop-blur-xl flex flex-col shrink-0">
            {/* Logo / Header */}
            <div className="p-5 border-b border-slate-800/80">
                <div className="flex items-center gap-2.5 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Brain className="text-white w-4 h-4" />
                    </div>
                    <div>
                        <h1 className="font-bold text-sm text-white leading-none">DocMatrix AI</h1>
                        <p className="text-[10px] text-slate-500 mt-0.5">Privacy-first · Local</p>
                    </div>
                </div>

                <button
                    onClick={onNewDocument}
                    className="w-full py-2 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20 text-sm font-medium group"
                >
                    <Plus size={15} className="group-hover:rotate-90 transition-transform duration-200" />
                    Upload Document
                </button>
            </div>

            {/* Document List */}
            <div className="flex-1 overflow-y-auto py-3 px-2.5 custom-scrollbar">
                <h3 className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    My Documents ({documents.length})
                </h3>

                {documents.length === 0 ? (
                    <div className="px-3 py-8 text-center border border-dashed border-slate-800 rounded-xl m-1">
                        <FileText className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                        <p className="text-xs text-slate-500">No documents yet.</p>
                        <p className="text-xs text-slate-600 mt-1">Upload your first PDF above.</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {documents.map((doc) => (
                            <button
                                key={doc.id}
                                onClick={() => setCurrentDocumentId(doc.id)}
                                className={cn(
                                    'w-full text-left px-3 py-3 rounded-xl transition-all group relative overflow-hidden',
                                    currentDocumentId === doc.id
                                        ? 'bg-blue-600/10 border border-blue-500/20 text-blue-100'
                                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
                                )}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-sm truncate leading-tight mb-1.5">
                                            {doc.filename}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                                <Clock size={9} />
                                                {new Date(doc.upload_date).toLocaleDateString()}
                                            </span>
                                            <StatusBadge status={doc.processing_status} />
                                        </div>
                                    </div>

                                    {/* Delete button - appears on hover */}
                                    <button
                                        onClick={(e) => handleDelete(e, doc.id)}
                                        disabled={deletingId === doc.id}
                                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all shrink-0 mt-0.5"
                                        title="Delete document"
                                    >
                                        {deletingId === doc.id
                                            ? <Loader2 size={13} className="animate-spin" />
                                            : <Trash2 size={13} />
                                        }
                                    </button>
                                </div>

                                {/* Active indicator shimmer */}
                                {currentDocumentId === doc.id && (
                                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500 rounded-r" />
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800/80">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    100% Local · Zero Cloud
                </div>
            </div>
        </div>
    );
}
