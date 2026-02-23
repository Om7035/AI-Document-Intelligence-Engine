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

    const currentDocumentId = useStore((s) => s.currentDocumentId);
    const addToast = useStore((s) => s.addToast);

    const [markdown, setMarkdown] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [failed, setFailed] = useState(false);
    const [reprocessing, setReprocessing] = useState(false);

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
            setError('Failed to load mindmap.');
            setMarkdown('');
        } finally {
            setLoading(false);
        }
    }, []);

    const handleReprocess = async () => {
        if (!currentDocumentId) return;
        setReprocessing(true);
        try {
            await reprocessDocument(currentDocumentId);
            addToast('info', 'Re-processing started...');
            const poll = setInterval(async () => {
                const data = await getDocumentMindmap(currentDocumentId);
                if (data.content && !isBrokenContent(data.content)) {
                    setMarkdown(data.content);
                    setFailed(false);
                    clearInterval(poll);
                }
            }, 5000);
            setTimeout(() => clearInterval(poll), 120000);
        } catch (e) {
            console.error(e);
            addToast('error', 'Failed to trigger re-processing.');
        } finally {
            setReprocessing(false);
        }
    };

    useEffect(() => {
        if (!currentDocumentId) return;
        setMarkdown('');
        mmRef.current = null;
        fetchMindmap(currentDocumentId);
    }, [currentDocumentId, fetchMindmap]);

    useEffect(() => {
        if (!markdown || !svgRef.current) return;

        let cancelled = false;

        const render = async () => {
            const { Transformer } = await import('markmap-lib');
            const { Markmap, loadCSS, loadJS } = await import('markmap-view');
            if (cancelled || !svgRef.current) return;

            // Define custom styles to match the dark theme
            const customStyle = `
                .markmap-node { font-family: 'Inter', sans-serif; cursor: pointer; }
                .markmap-node-text { fill: #f1f5f9; font-size: 13px; font-weight: 500; }
                .markmap-link { stroke: #334155; stroke-width: 1.5; stroke-opacity: 0.6; }
                .markmap-node-circle { fill: #1e293b; stroke: #3b82f6; stroke-width: 1.5; }
                
                /* Level-specific colors */
                .markmap-node[data-depth="0"] .markmap-node-text { font-size: 18px; font-weight: 800; fill: #fff; }
                .markmap-node[data-depth="1"] .markmap-node-text { font-size: 15px; font-weight: 700; fill: #60a5fa; }
                .markmap-node[data-depth="2"] .markmap-node-text { fill: #94a3b8; }
                
                /* Depth colors for links */
                .markmap-link[data-depth="0"] { stroke: #3b82f6; stroke-width: 3; stroke-opacity: 0.8; }
                .markmap-link[data-depth="1"] { stroke: #6366f1; stroke-width: 2; }
            `;

            const transformer = new Transformer();
            const { root } = transformer.transform(markdown);

            if (mmRef.current) {
                mmRef.current.setData(root);
                mmRef.current.fit();
            } else {
                svgRef.current.innerHTML = '';
                // Create instance with custom options
                mmRef.current = Markmap.create(svgRef.current, {
                    autoFit: true,
                    duration: 500,
                    paddingX: 16,
                    spacingHorizontal: 100,
                    spacingVertical: 20,
                    color: (node) => {
                        const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
                        return colors[node.depth % colors.length];
                    },
                }, root);

                // Inject custom CSS
                const styleTag = document.createElement('style');
                styleTag.innerHTML = customStyle;
                svgRef.current.appendChild(styleTag);
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
        <Card className="h-full p-0 overflow-hidden relative flex flex-col group bg-slate-950/40 border-slate-800/50">
            {/* Toolbar */}
            <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5 shadow-2xl pointer-events-auto">
                    <div className={loading || reprocessing ? "w-2 h-2 rounded-full bg-blue-500 animate-pulse" : "w-2 h-2 rounded-full bg-emerald-500"} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
                        {loading ? 'Generating Analysis...' : failed ? 'Generation Failed' : 'Knowledge Map Visualizer'}
                    </span>
                </div>

                {!loading && !failed && !error && markdown && (
                    <div className="flex gap-2 pointer-events-auto">
                        <button
                            onClick={() => currentDocumentId && fetchMindmap(currentDocumentId)}
                            className="bg-slate-900/90 backdrop-blur-md p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-blue-500/50 transition-all shadow-xl"
                            title="Refresh"
                        >
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={handleFit}
                            className="bg-slate-900/90 backdrop-blur-md p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-blue-500/50 transition-all shadow-xl"
                            title="Center View"
                        >
                            <Maximize2 size={14} />
                        </button>
                        <button
                            onClick={handleExport}
                            className="bg-slate-900/90 backdrop-blur-md p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-blue-500/50 transition-all shadow-xl"
                            title="Export SVG"
                        >
                            <Download size={14} />
                        </button>
                    </div>
                )}
            </div>

            {/* Error / Failed View */}
            {failed && !loading && !reprocessing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-slate-950/90 z-20 p-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-2xl shadow-amber-500/5">
                        <AlertTriangle className="w-8 h-8 text-amber-500" />
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-lg font-bold text-white">Visualizer Failed</h4>
                        <p className="text-sm text-slate-400 max-w-sm">
                            The document is complex and generation timed out or ran out of RAM. Please try re-processing.
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={handleReprocess}
                            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-500/20"
                        >
                            <RotateCcw size={16} />
                            Re-process AI
                        </button>
                    </div>
                </div>
            )}

            {/* Canvas */}
            <div className="flex-1 w-full h-full relative overflow-hidden">
                {!loading && !failed && (
                    <svg
                        ref={svgRef}
                        className="w-full h-full"
                        style={{ background: 'transparent' }}
                    />
                )}

                {loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/40 backdrop-blur-[2px]">
                        <div className="relative w-20 h-20">
                            <div className="absolute inset-0 rounded-full border-4 border-blue-500/10" />
                            <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 animate-spin" />
                        </div>
                        <p className="text-sm font-bold text-slate-400 mt-6 tracking-widest animate-pulse uppercase">Mapping Intelligence...</p>
                    </div>
                )}
            </div>

            {/* Interaction Hint */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/5 text-[9px] uppercase tracking-tighter text-slate-500 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-500">
                Pinch to Zoom • Drag to Pan • Click Nodes to Expand
            </div>
        </Card>
    );
}
