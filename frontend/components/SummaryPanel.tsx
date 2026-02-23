'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Copy, Check, BookOpen, Clock, FileText, Hash, RotateCcw, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { reprocessDocument } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

function isFailedSummary(text: string) {
    const lower = text.toLowerCase();
    return lower.includes('⚠️') || lower.includes('failed') || lower.includes('ensure ollama');
}

function estimateReadTime(text: string): string {
    const words = text.split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return `${minutes} min read`;
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SummaryPanel() {
    const { currentDocument, addToast } = useStore((s) => ({
        currentDocument: s.currentDocument,
        addToast: s.addToast,
    }));
    const [copied, setCopied] = useState(false);
    const [expanded, setExpanded] = useState(true);
    const [reprocessing, setReprocessing] = useState(false);

    const handleCopy = () => {
        if (currentDocument?.summary) {
            navigator.clipboard.writeText(currentDocument.summary);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleReprocess = async () => {
        if (!currentDocument) return;
        setReprocessing(true);
        try {
            await reprocessDocument(currentDocument.id);
            addToast('info', 'Re-processing started — check back in a minute.');
        } catch {
            addToast('error', 'Failed to start re-processing.');
        } finally {
            setReprocessing(false);
        }
    };

    if (!currentDocument) return null;

    const isProcessing = currentDocument.processing_status !== 'completed';
    const summary = currentDocument.summary;
    const summaryFailed = !!summary && isFailedSummary(summary);

    return (
        <div className="flex flex-col gap-4">
            {/* Document Info Card */}
            <Card className="p-5">
                <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                    <FileText size={14} className="text-blue-400" />
                    Document Info
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { label: 'Pages', value: currentDocument.page_count ?? '—', icon: Hash },
                        { label: 'Size', value: currentDocument.file_size ? formatBytes(currentDocument.file_size) : '—', icon: FileText },
                        { label: 'Status', value: currentDocument.processing_status, icon: Clock },
                        { label: 'Uploaded', value: new Date(currentDocument.upload_date).toLocaleDateString(), icon: Clock },
                    ].map(({ label, value, icon: Icon }) => (
                        <div key={label} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{label}</div>
                            <div className="text-sm font-medium text-slate-200 capitalize truncate">{String(value)}</div>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Summary Card */}
            <Card className="p-5 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                        <BookOpen size={14} className="text-purple-400" />
                        AI Summary
                    </h3>
                    <div className="flex items-center gap-2">
                        {summary && (
                            <>
                                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                    <Clock size={10} />
                                    {estimateReadTime(summary)}
                                </span>
                                <button
                                    onClick={handleCopy}
                                    className="p-1.5 rounded-md hover:bg-slate-700 transition-colors text-slate-400 hover:text-slate-200"
                                    title="Copy summary"
                                >
                                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => setExpanded((e) => !e)}
                            className="p-1.5 rounded-md hover:bg-slate-700 transition-colors text-slate-400"
                        >
                            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                    </div>
                </div>

                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            {isProcessing ? (
                                <div className="space-y-2">
                                    {[...Array(5)].map((_, i) => (
                                        <div
                                            key={i}
                                            className="h-3 bg-slate-700/60 rounded animate-pulse"
                                            style={{ width: `${70 + Math.random() * 30}%` }}
                                        />
                                    ))}
                                    <p className="text-xs text-slate-500 mt-3 text-center">
                                        Generating summary... ({currentDocument.processing_status})
                                    </p>
                                </div>
                            ) : summaryFailed ? (
                                <div className="flex flex-col items-center gap-3 py-4">
                                    <AlertTriangle className="w-8 h-8 text-amber-400" />
                                    <p className="text-xs text-slate-400 text-center leading-relaxed">
                                        Summary generation failed — likely out of RAM.<br />
                                        Close other apps, then re-process.
                                    </p>
                                    <button
                                        onClick={handleReprocess}
                                        disabled={reprocessing}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg transition-colors disabled:opacity-50 font-medium"
                                    >
                                        <RotateCcw size={12} className={reprocessing ? 'animate-spin' : ''} />
                                        Re-process Document
                                    </button>
                                </div>
                            ) : summary ? (
                                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                                    {summary}
                                </p>
                            ) : (
                                <p className="text-sm text-slate-500 italic">
                                    No summary available for this document.
                                </p>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>
        </div>
    );
}
