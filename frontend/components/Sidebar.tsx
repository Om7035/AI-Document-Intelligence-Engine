import { useEffect } from 'react';
import { FileText, Plus, Clock, ChevronRight } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { getDocuments } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function Sidebar() {
    const { documents, setDocuments, currentDocumentId, setCurrentDocumentId } = useStore();

    useEffect(() => {
        // Poll for documents or initial fetch
        const fetchDocs = async () => {
            try {
                const docs = await getDocuments();
                setDocuments(docs);
            } catch (e) {
                console.error("Failed to fetch documents", e);
            }
        };

        fetchDocs();
        const interval = setInterval(fetchDocs, 5000); // Polling for processing status updates
        return () => clearInterval(interval);
    }, [setDocuments]);

    return (
        <div className="w-80 h-screen border-r border-slate-800 bg-slate-900/50 backdrop-blur-xl flex flex-col">
            <div className="p-6 border-b border-slate-800">
                <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <FileText className="text-white w-5 h-5" />
                    </div>
                    <h1 className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        DocMatrix
                    </h1>
                </div>

                <button className="w-full py-2 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20 text-sm font-medium group">
                    <Plus size={16} className="group-hover:rotate-90 transition-transform" />
                    New Project
                </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                <h3 className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">My Documents</h3>
                {documents.map((doc) => (
                    <button
                        key={doc.id}
                        onClick={() => setCurrentDocumentId(doc.id)}
                        className={cn(
                            "w-full text-left px-4 py-3 rounded-xl transition-all group relative overflow-hidden",
                            currentDocumentId === doc.id
                                ? "bg-blue-600/10 text-blue-100 border border-blue-500/20"
                                : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                        )}
                    >
                        <div className="flex justify-between items-start mb-1">
                            <span className="font-medium truncate pr-2">{doc.filename}</span>
                            {currentDocumentId === doc.id && (
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]"></span>
                            )}
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <Clock size={10} />
                            <span>{new Date(doc.upload_date).toLocaleDateString()}</span>
                            {doc.processing_status !== 'completed' && (
                                <span className={cn(
                                    "ml-auto px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider",
                                    doc.processing_status === 'failed' ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400 animate-pulse"
                                )}>
                                    {doc.processing_status}
                                </span>
                            )}
                        </div>

                        {/* Hover effect gradient */}
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    </button>
                ))}

                {documents.length === 0 && (
                    <div className="px-4 py-8 text-center border border-dashed border-slate-800 rounded-xl m-2">
                        <p className="text-sm text-slate-500">No documents yet.</p>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-black/20">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600"></div>
                    <div className="text-xs">
                        <div className="text-slate-300 font-medium">User Account</div>
                        <div className="text-slate-600">Pro Plan</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
