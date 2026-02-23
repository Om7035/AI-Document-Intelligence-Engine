import { useState, useRef } from 'react';
import { Upload, FileText, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui';
import { uploadDocument } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function DocumentUploader() {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const addDocument = useStore((state) => state.addDocument);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleUpload(files[0]);
        }
    };

    const handleUpload = async (file: File) => {
        if (file.type !== 'application/pdf') {
            alert('Only PDF files are supported');
            return;
        }

        setIsUploading(true);
        try {
            const doc = await uploadDocument(file);
            addDocument(doc);
        } catch (error) {
            console.error(error);
            alert('Upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto mb-8">
            <motion.div
                layout
                className={cn(
                    "relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 cursor-pointer overflow-hidden",
                    isDragging ? "border-blue-500 bg-blue-500/10" : "border-slate-700 hover:border-slate-500 hover:bg-slate-800/50",
                    "glass-panel"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".pdf"
                    onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                />

                <AnimatePresence mode="wait">
                    {isUploading ? (
                        <motion.div
                            key="uploading"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex flex-col items-center gap-4"
                        >
                            <div className="relative">
                                <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 rounded-full"></div>
                                <Loader2 className="w-12 h-12 text-blue-500 animate-spin relative z-10" />
                            </div>
                            <p className="text-lg font-medium text-blue-200">Processing Document...</p>
                            <p className="text-sm text-slate-400">Extracting text & generating embeddings</p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="idle"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex flex-col items-center gap-4"
                        >
                            <div className="p-4 bg-slate-800/50 rounded-full border border-slate-700 shadow-inner group-hover:scale-110 transition-transform duration-300">
                                <Upload className="w-8 h-8 text-slate-300 group-hover:text-blue-400 transition-colors" />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-white mb-2">Upload Research Paper</h3>
                                <p className="text-slate-400">Drag & drop your PDF here, or click to browse</p>
                            </div>
                            <div className="flex gap-2 text-xs text-slate-500 mt-2">
                                <span className="bg-slate-800/80 px-2 py-1 rounded border border-slate-700">PDF up to 50MB</span>
                                <span className="bg-slate-800/80 px-2 py-1 rounded border border-slate-700">Secure Local Processing</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
