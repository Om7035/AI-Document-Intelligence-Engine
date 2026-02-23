import { useEffect, useRef, useState } from 'react';
import { Transformer } from 'markmap-lib';
import { Markmap } from 'markmap-view';
import * as d3 from 'd3';
import { Card } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { getDocumentMindmap } from '@/lib/api';

interface MindmapViewerProps {
    // content?: string; // Markdown content for the mindmap - REMOVED
}

export default function MindmapViewer(/* { content = MOCK_MARKDOWN }: MindmapViewerProps */) { // content prop removed
    const svgRef = useRef<SVGSVGElement>(null);
    const refMm = useRef<Markmap>();
    const currentDocumentId = useStore((state) => state.currentDocumentId);
    const [markdown, setMarkdown] = useState<string>('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!currentDocumentId) return;

        const fetchMindmap = async () => {
            setLoading(true);
            try {
                const data = await getDocumentMindmap(currentDocumentId);
                setMarkdown(data.content);
            } catch (e) {
                console.error(e);
                setMarkdown("# Error\nFailed to load map");
            } finally {
                setLoading(false);
            }
        };

        fetchMindmap();
    }, [currentDocumentId]);

    useEffect(() => {
        if (svgRef.current && markdown) { // Check for markdown content
            // Basic Init
            const transformer = new Transformer();
            const { root } = transformer.transform(markdown); // Use markdown state

            if (refMm.current) {
                refMm.current.setData(root);
                refMm.current.fit();
            } else {
                refMm.current = Markmap.create(svgRef.current, undefined, root);
            }
        }
    }, [markdown]); // Dependency changed to markdown

    if (!currentDocumentId) return null;

    return (
        <Card className="h-[600px] p-0 overflow-hidden relative group">
            <div className="absolute top-4 left-4 z-10 bg-slate-900/80 px-3 py-1 rounded-full border border-white/10 text-xs font-mono text-slate-400 pointer-events-none">
                {loading ? 'GENERATING MAP...' : 'MINDMAP VIEW'}
            </div>
            <svg ref={svgRef} className="w-full h-full bg-slate-900/30" />
            <div className="absolute bottom-4 right-4 text-[10px] text-slate-600 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                Scroll to Zoom • Drag to Pan
            </div>
        </Card>
    );
}
