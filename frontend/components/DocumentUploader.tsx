'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { uploadDocument } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export default function DocumentUploader() {
    const [isDragging, setIsDragging] = useState(false);
    const [uploadState, setUploadState] = useState<UploadState>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { addDocument, setCurrentDocumentId, addToast } = useStore();

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };
    const handleDragLeave = () => setIsDragging(false);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    };

    const processFile = async (file: File) => {
        if (!file.name.toLowerCase().endsWith('.pdf')) {
            setErrorMsg('Only PDF files are supported.');
            setUploadState('error');
            return;
        }
        if (file.size > 50 * 1024 * 1024) {
            setErrorMsg('File exceeds 50 MB limit.');
            setUploadState('error');
            return;
        }

        setUploadState('uploading');
        setErrorMsg('');

        // Pre-flight: verify backend is reachable
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
        try {
            const ping = await fetch(apiBase.replace('/api', '/health'), {
                signal: AbortSignal.timeout(3000),
            });
            if (!ping.ok) throw new Error('Backend unhealthy');
        } catch {
            setErrorMsg('Backend is offline. Run start_backend.bat, then wait for "Application startup complete."');
            setUploadState('error');
            addToast('error', 'Backend offline — start the backend server first.');
            return;
        }

        try {
            const doc = await uploadDocument(file);
            addDocument(doc);
            setCurrentDocumentId(doc.id);     // auto-navigate to new doc
            setUploadState('success');
            addToast('success', `"${file.name}" uploaded — AI processing started.`);
            // Reset after 2s so uploader is reusable
            setTimeout(() => setUploadState('idle'), 2500);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Upload failed.';
            setErrorMsg(msg.includes('Network') || msg.includes('ERR_CONNECTION_REFUSED')
                ? 'Backend is offline. Run start_backend.bat first.'
                : msg);
            setUploadState('error');
            addToast('error', 'Upload failed. Check the backend window for errors.');
        }
    };

    const stateContent = {
        idle: (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4">
                <div className="p-4 bg-slate-800/60 rounded-full border border-slate-700">
                    <Upload className="w-8 h-8 text-slate-300" />
                </div>
                <div className="text-center">
                    <h3 className="text-lg font-semibold text-white mb-1">Drop your PDF here</h3>
                    <p className="text-sm text-slate-400">or click to browse · up to 50 MB</p>
                </div>
                <div className="flex gap-2 flex-wrap justify-center">
                    {['PDF up to 50MB', 'Local Processing', 'No Cloud'].map((tag) => (
                        <span key={tag} className="text-xs bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700 text-slate-400">
                            {tag}
                        </span>
                    ))}
                </div>
            </motion.div>
        ),
        uploading: (
            <motion.div key="uploading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4">
                <div className="relative">
                    <div className="absolute inset-0 bg-blue-500/30 blur-2xl rounded-full" />
                    <Loader2 className="w-12 h-12 text-blue-400 animate-spin relative z-10" />
                </div>
                <p className="text-lg font-medium text-blue-200">Uploading PDF...</p>
                <p className="text-sm text-slate-400">Extracting text & starting AI processing</p>
            </motion.div>
        ),
        success: (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3">
                <CheckCircle className="w-12 h-12 text-emerald-400" />
                <p className="text-lg font-medium text-emerald-200">Upload Successful!</p>
                <p className="text-sm text-slate-400">AI is processing your document…</p>
            </motion.div>
        ),
        error: (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4">
                <AlertCircle className="w-10 h-10 text-red-400" />
                <p className="text-base font-medium text-red-300">{errorMsg || 'Upload failed'}</p>
                <button
                    onClick={() => setUploadState('idle')}
                    className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-2"
                >
                    Try again
                </button>
            </motion.div>
        ),
    };

    return (
        <div className="w-full max-w-xl mx-auto">
            <motion.div
                layout
                onClick={uploadState === 'idle' ? () => fileInputRef.current?.click() : undefined}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                    'relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 overflow-hidden',
                    uploadState === 'idle' && 'cursor-pointer',
                    isDragging ? 'border-blue-500 bg-blue-500/10 scale-[1.01]' : 'border-slate-700',
                    uploadState === 'uploading' && 'border-blue-500/50 bg-blue-500/5',
                    uploadState === 'success' && 'border-emerald-500/50 bg-emerald-500/5',
                    uploadState === 'error' && 'border-red-500/50 bg-red-500/5',
                    uploadState === 'idle' && !isDragging && 'hover:border-slate-500 hover:bg-slate-800/30',
                )}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".pdf"
                    onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
                />
                <AnimatePresence mode="wait">
                    {stateContent[uploadState]}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
