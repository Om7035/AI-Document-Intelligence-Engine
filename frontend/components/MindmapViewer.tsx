'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Card } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { getDocumentMindmap, reprocessDocument } from '@/lib/api';
import { Download, RefreshCw, Maximize2, AlertTriangle, RotateCcw } from 'lucide-react';

/** Content that indicates the LLM failed during background processing */
function isBrokenContent(content: string): boolean {
    if (!content) return false;
    const lower = content.toLowerCase();
    return (
        lower.includes('generation failed') ||
        lower.includes('ensure ollama') ||
        lower.includes('not enough free ram') ||
        lower.includes('⚠️ generation failed')
    );
}

export default function MindmapViewer() {
    const svgRef = useRef<SVGSVGElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mmRef = useRef<any>(null);

    const { currentDocumentId, addToast } = useStore((s) => ({
        currentDocumentId: s.currentDocumentId,
        addToast: s.addToast,
    }));

    const [markdown, setMarkdown] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [failed, setFailed] = useState(false);        // LLM failed in background
    const [reprocessing, setReprocessing] = useState(false);

    // ─── Fetch mindmap ────────────────────────────────────────────────────────
    const fetchMindmap = useCallback(async (docId: string) => {
        setLoading(true);
        setError('');
        setFailed(false);
        try {
            const data = await getDocumentMindmap(docId);
            const content: string = data.content ?? '';
            if (isBrokenContent(content)) {
                setFailed(true);
                setMarkdown('');
            } else {
                setMarkdown(content);
            }
        } catch (e) {
            console.error(e);
            setError('Failed to load mindmap from backend.');
            setMarkdown('');
        } finally {
            setLoading(false);
        }
    }, []);

    // ─── Re-process document ──────────────────────────────────────────────────
    const handleReprocess = async () => {
        if (!currentDocumentId) return;
        setReprocessing(true);
        setFailed(false);
        setError('');
        try {
            await reprocessDocument(currentDocumentId);
            addToast('info', 'Re-processing started — this may take a few minutes.');
            // Poll until no longer pending
            const poll = setInterval(async () => {
                await fetchMindmap(currentDocumentId);
                // fetchMindmap sets failed/markdown — if markdown arrives, content will render
            }, 5000);
            // Stop polling after 3 minutes no matter what
            setTimeout(() => clearInterval(poll), 180_000);
        } catch (e) {
            console.error(e);
            addToast('error', 'Failed to trigger re-processing. Is the backend running?');
            setFailed(true);
        } finally {
            setReprocessing(false);
        }
    };

    // Fetch when document changes
    useEffect(() => {
        if (!currentDocumentId) return;
        setMarkdown('');
        mmRef.current = null;
        fetchMindmap(currentDocumentId);
    }, [currentDocumentId, fetchMindmap]);

    // Render mindmap when markdown arrives
    useEffect(() => {
        if (!markdown || !svgRef.current) return;

        let cancelled = false;

        const render = async () => {
            const { Transformer } = await import('markmap-lib');
            const { Markmap } = await import('markmap-view');
            if (cancelled || !svgRef.current) return;

            const transformer = new Transformer();
            const { root } = transformer.transform(markdown);

            if (mmRef.current) {
                mmRef.current.setData(root);
                mmRef.current.fit();
            } else {
                svgRef.current.innerHTML = '';
                mmRef.current = Markmap.create(svgRef.current, undefined, root);
            }
        };

        render().catch(console.error);
        return () => { cancelled = true; };
    }, [markdown]);

    const handleFit = () => mmRef.current?.fit();

    const handleExport = () => {
        if (!svgRef.current) return;
        const svgData = new XMLSerializer().serializeToString(svgRef.current);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mindmap.svg';
        a.click();
        URL.revokeObjectURL(url);
    };

    if (!currentDocumentId) return null;

    return (
        <Card className="h-full p-0 overflow-hidden relative flex flex-col group">
            {/* ── Toolbar ─────────────────────────────────────────────── */}
            <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
                <span className="bg-slate-900/85 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10 text-[10px] font-mono text-slate-400 pointer-events-none select-none">
                    {loading ? '⟳ LOADING…'
                        : reprocessing ? '⟳ RE-PROCESSING…'
                            : failed ? '✕ GENERATION FAILED'
                                : error ? '✕ ERROR'
                                    : 'MINDMAP VIEW'}
                </span>

                {!loading && !failed && !error && markdown && (
                    <div className="flex gap-1.5 pointer-events-auto">
                        <button
                            onClick={() => currentDocumentId && fetchMindmap(currentDocumentId)}
                            className="bg-slate-900/85 backdrop-blur-sm p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-slate-200 transition-colors"
                            title="Refresh"
                        >
                            <RefreshCw size={13} />
                        </button>
                        <button
                            onClick={handleFit}
                            className="bg-slate-900/85 backdrop-blur-sm p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-slate-200 transition-colors"
                            title="Fit to screen"
                        >
                            <Maximize2 size={13} />
                        </button>
                        <button
                            onClick={handleExport}
                            className="bg-slate-900/85 backdrop-blur-sm p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-slate-200 transition-colors"
                            title="Export SVG"
                        >
                            <Download size={13} />
                        </button>
                    </div>
                )}
            </div>

            {/* ── Loading ──────────────────────────────────────────────── */}
            {(loading || reprocessing) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950/80 z-20">
                    <div className="w-12 h-12 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
                    <p className="text-sm text-slate-400">
                        {reprocessing ? 'Re-processing with AI…' : 'Loading mindmap…'}
                    </p>
                    <p className="text-xs text-slate-600 max-w-xs text-center">
                        {reprocessing
                            ? 'This can take 1–3 minutes on low-RAM machines. The page will update automatically.'
                            : 'If generation is still running in the background, it will appear here shortly.'}
                    </p>
                </div>
            )}

            {/* ── Failed state (LLM ran out of RAM) ───────────────────── */}
            {failed && !loading && !reprocessing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-20 p-8">
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-amber-400" />
                    </div>
                    <div className="text-center max-w-sm">
                        <p className="text-sm font-semibold text-slate-200 mb-1">Mindmap Generation Failed</p>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            The AI model ran out of memory during background processing.
                            Close other apps to free RAM, then click{' '}
                            <strong className="text-slate-300">Re-process</strong> below.
                        </p>
                    </div>

                    {/* Steps */}
                    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 text-xs text-slate-400 space-y-1.5 w-full max-w-xs">
                        <p className="text-slate-300 font-semibold mb-2">To fix:</p>
                        <p>1. Close browser tabs, IDE windows, etc.</p>
                        <p>2. Free at least 1.5 GB of RAM</p>
                        <p>3. Click <strong className="text-white">Re-process Document</strong> below</p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleReprocess}
                            disabled={reprocessing}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                            <RotateCcw size={14} className={reprocessing ? 'animate-spin' : ''} />
                            Re-process Document
                        </button>
                        <button
                            onClick={() => currentDocumentId && fetchMindmap(currentDocumentId)}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg transition-colors font-medium"
                        >
                            <RefreshCw size={14} />
                            Check Again
                        </button>
                    </div>
                </div>
            )}

            {/* ── Network / fetch error ────────────────────────────────── */}
            {error && !loading && !failed && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-20">
                    <p className="text-sm text-red-400">{error}</p>
                    <button
                        onClick={() => currentDocumentId && fetchMindmap(currentDocumentId)}
                        className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-2"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* ── SVG canvas ───────────────────────────────────────────── */}
            <svg
                ref={svgRef}
                className="w-full h-full flex-1"
                style={{ background: 'transparent' }}
            />

            {/* ── Hint ─────────────────────────────────────────────────── */}
            <div className="absolute bottom-3 right-3 text-[10px] text-slate-600 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity select-none">
                Scroll to zoom · Drag to pan
            </div>
        </Card>
    );
}
