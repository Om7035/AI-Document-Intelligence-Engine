'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Card } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { getDocumentMindmap } from '@/lib/api';
import { Download, RefreshCw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

export default function MindmapViewer() {
    const svgRef = useRef<SVGSVGElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mmRef = useRef<any>(null);

    const currentDocumentId = useStore((s) => s.currentDocumentId);
    const [markdown, setMarkdown] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchMindmap = useCallback(async (docId: string) => {
        setLoading(true);
        setError('');
        try {
            const data = await getDocumentMindmap(docId);
            setMarkdown(data.content ?? '');
        } catch (e) {
            console.error(e);
            setError('Failed to load mindmap.');
            setMarkdown('');
        } finally {
            setLoading(false);
        }
    }, []);

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
            // Dynamic imports so they only run in the browser
            const { Transformer } = await import('markmap-lib');
            const { Markmap } = await import('markmap-view');
            if (cancelled || !svgRef.current) return;

            const transformer = new Transformer();
            const { root } = transformer.transform(markdown);

            if (mmRef.current) {
                mmRef.current.setData(root);
                mmRef.current.fit();
            } else {
                // Clear SVG before creating a fresh instance
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
            {/* Toolbar */}
            <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
                <span className="bg-slate-900/85 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10 text-[10px] font-mono text-slate-400 pointer-events-none select-none">
                    {loading ? '⟳ GENERATING...' : error ? '✕ ERROR' : 'MINDMAP VIEW'}
                </span>

                {!loading && !error && markdown && (
                    <div className="flex gap-1.5 pointer-events-auto">
                        <button
                            onClick={() => currentDocumentId && fetchMindmap(currentDocumentId)}
                            className="bg-slate-900/85 backdrop-blur-sm p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-slate-200 transition-colors"
                            title="Refresh mindmap"
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
                            title="Export as SVG"
                        >
                            <Download size={13} />
                        </button>
                    </div>
                )}
            </div>

            {/* Loading skeleton */}
            {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950/80 z-20">
                    <div className="w-12 h-12 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
                    <p className="text-sm text-slate-400">Generating mindmap with AI...</p>
                    <p className="text-xs text-slate-600">This may take a moment</p>
                </div>
            )}

            {/* Error state */}
            {error && !loading && (
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

            {/* SVG canvas */}
            <svg
                ref={svgRef}
                className="w-full h-full flex-1"
                style={{ background: 'transparent' }}
            />

            {/* Hint */}
            <div className="absolute bottom-3 right-3 text-[10px] text-slate-600 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity select-none">
                Scroll to zoom · Drag to pan
            </div>
        </Card>
    );
}
