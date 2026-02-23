"use client"; // Next.js App Router needs this for hooks

import { useEffect, useState } from 'react';
import DocumentUploader from '@/components/DocumentUploader';
import ChatInterface from '@/components/ChatInterface';
import MindmapViewer from '@/components/MindmapViewer';
import Sidebar from '@/components/Sidebar';
import { useStore } from '@/store/useStore';
import { MessageSquare, Network, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Home() {
  const currentDocumentId = useStore((state) => state.currentDocumentId);
  const [activeTab, setActiveTab] = useState<'chat' | 'mindmap'>('chat');

  return (
    <main className="flex h-screen overflow-hidden bg-slate-950 text-slate-50">
      <Sidebar />

      <div className="flex-1 flex flex-col h-full relative">
        {/* Top Navbar */}
        <header className="h-16 border-b border-slate-800/50 bg-slate-900/30 backdrop-blur-sm flex items-center px-8 justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-light text-slate-200">
              {currentDocumentId ? 'Document Analysis' : 'Dashboard'}
            </h2>
          </div>

          {currentDocumentId && (
            <div className="flex bg-slate-800/50 p-1 rounded-lg border border-slate-700/50">
              <button
                onClick={() => setActiveTab('chat')}
                className={cn(
                  "px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all",
                  activeTab === 'chat' ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                )}
              >
                <MessageSquare size={16} />
                Chat
              </button>
              <button
                onClick={() => setActiveTab('mindmap')}
                className={cn(
                  "px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all",
                  activeTab === 'mindmap' ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                )}
              >
                <Network size={16} />
                Mindmap
              </button>
            </div>
          )}
        </header>

        {/* Main Content Area */}
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar relative">
          {/* Background Gradients */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
            <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px]"></div>
          </div>

          {!currentDocumentId ? (
            <div className="flex flex-col items-center justify-center h-full max-w-4xl mx-auto animate-in fade-in zoom-in duration-500">
              <div className="mb-12 text-center">
                <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-wb from-white via-slate-200 to-slate-500 mb-4 tracking-tight">
                  Unlock Knowledge from PDFs
                </h1>
                <p className="text-lg text-slate-400 max-w-xl mx-auto leading-relaxed">
                  Upload your research papers, contracts, or reports. Our AI generates mindmaps and lets you chat with your documents locally.
                </p>
              </div>
              <DocumentUploader />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-12 px-12">
                {[
                  { icon: FileText, title: "Smart Parsing", desc: "Extracts structure & entities accurately." },
                  { icon: Network, title: "Visual Maps", desc: "Auto-generates knowledge graphs." },
                  { icon: MessageSquare, title: "Context Chat", desc: "Ask questions with citations." }
                ].map((feature, i) => (
                  <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors backdrop-blur-sm">
                    <feature.icon className="w-8 h-8 text-blue-400 mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                    <p className="text-sm text-slate-400">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
              <div className="h-full animate-in slide-in-from-left duration-500">
                <ChatInterface />
              </div>
              <div className={cn(
                "h-full animate-in slide-in-from-right duration-500",
                activeTab === 'mindmap' ? "block" : "hidden lg:block" // On mobile, toggle. On large screens, maybe split view? 
                // Let's stick to tabs logic strictly for MVP on sidebar? 
                // Actually, for "Chat vs Mindmap" usually split view is best for productivity.
                // But let's respect the tab state for the second column or toggle main view.
                // Re-reading requirements: "Mindmap Viewer", "Chat Interface".
                // Let's make the Right Panel switchable or allow split.
                // For now, I'll make the Left Panel always Chat, Right Panel always Mindmap? 
                // Or just use the tab to switch the MAIN content view if one view is dominant.
                // The design above uses Grid 2 cols. 
                // Let's put Chat in Col 1, Mindmap in Col 2.
                // If tab is 'chat', scroll to chat? 
                // Let's just render both side-by-side on large screens,
                // and toggle on small screens.
              )}>
                {/* If both are visible on LG, the tab switcher is redundant on LG? 
                       Let's make it a single full-screen view mode controlled by tabs if the user wants focus.
                       Actually, splitting is better for "Chat with Document".
                       Let's keep Chat on Left, Vis on Right.
                   */}
                <MindmapViewer />
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
