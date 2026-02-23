'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Sparkles, Trash2, Copy, Check } from 'lucide-react';
import { Button, Input, Card } from '@/components/ui';
import { chatWithDocument } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

function MessageBubble({ msg, index }: { msg: Message; index: number }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(msg.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.02 }}
            className={cn(
                'flex gap-3 max-w-[88%] group',
                msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
            )}
        >
            {/* Avatar */}
            <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center shrink-0 border mt-1',
                msg.role === 'user'
                    ? 'bg-blue-600/80 border-blue-400/30'
                    : 'bg-emerald-700/80 border-emerald-400/30'
            )}>
                {msg.role === 'user' ? <User size={13} /> : <Bot size={13} />}
            </div>

            {/* Bubble */}
            <div className="relative">
                <div className={cn(
                    'px-4 py-3 rounded-2xl text-sm leading-relaxed',
                    msg.role === 'user'
                        ? 'bg-blue-600/20 border border-blue-500/30 text-blue-50 rounded-tr-sm'
                        : 'bg-slate-800/80 border border-slate-700/60 text-slate-200 rounded-tl-sm'
                )}>
                    {msg.content || <span className="italic text-slate-500">Thinking...</span>}
                </div>
                {/* Copy button */}
                {msg.content && (
                    <button
                        onClick={handleCopy}
                        className="absolute -bottom-5 right-0 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-slate-300 flex items-center gap-1 text-[10px]"
                    >
                        {copied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                        {copied ? 'Copied' : 'Copy'}
                    </button>
                )}
            </div>
        </motion.div>
    );
}

export default function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const currentDocumentId = useStore((state) => state.currentDocumentId);
    const addToast = useStore((state) => state.addToast);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    // Reset messages when document changes
    useEffect(() => {
        setMessages([]);
    }, [currentDocumentId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !currentDocumentId || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        // Add empty assistant message that we'll fill in
        setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

        try {
            const response = await chatWithDocument(currentDocumentId, userMessage, messages);

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            if (!response.body) {
                throw new Error('No response body');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulated = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                // Backend yields raw text chunks (not SSE `data:` format)
                const chunk = decoder.decode(value, { stream: true });
                accumulated += chunk;

                setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                        role: 'assistant',
                        content: accumulated,
                    };
                    return updated;
                });
            }
        } catch (error) {
            console.error('Chat error:', error);
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                    role: 'assistant',
                    content: `⚠️ Error: ${errorMsg}. Is the backend running?`,
                };
                return updated;
            });
            addToast('error', 'Chat failed. Check if the backend is running.');
        } finally {
            setIsLoading(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    const clearChat = () => {
        setMessages([]);
    };

    if (!currentDocumentId) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center mb-5">
                    <Sparkles className="w-8 h-8 text-slate-600" />
                </div>
                <h3 className="text-lg font-medium text-slate-300 mb-2">Select a document to begin</h3>
                <p className="text-sm max-w-xs text-slate-500">
                    Upload a PDF or pick one from the sidebar, then ask any question about it.
                </p>
            </div>
        );
    }

    return (
        <Card className="flex flex-col h-full p-0 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-3 border-b border-white/5 bg-slate-900/60 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px] shadow-emerald-500 animate-pulse" />
                    <span className="font-semibold text-slate-200 text-sm">AI Assistant</span>
                    {messages.length > 0 && (
                        <span className="text-xs text-slate-500">
                            {Math.floor(messages.length / 2)} exchange{messages.length > 2 ? 's' : ''}
                        </span>
                    )}
                </div>
                {messages.length > 0 && (
                    <button
                        onClick={clearChat}
                        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition-colors px-2 py-1 rounded-md hover:bg-red-500/10"
                    >
                        <Trash2 size={12} />
                        Clear
                    </button>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center opacity-50 gap-3">
                        <Bot className="w-12 h-12 text-slate-600" />
                        <p className="text-sm text-slate-400">Ask anything about the document</p>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {['Summarize this document', 'What are the main findings?', 'List key conclusions'].map((q) => (
                                <button
                                    key={q}
                                    onClick={() => {
                                        setInput(q);
                                        inputRef.current?.focus();
                                    }}
                                    className="text-xs px-3 py-1.5 rounded-full bg-slate-800/70 border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-all"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <AnimatePresence>
                    {messages.map((msg, i) => (
                        <MessageBubble key={i} msg={msg} index={i} />
                    ))}
                </AnimatePresence>

                {/* Typing indicator */}
                {isLoading && messages[messages.length - 1]?.content === '' && (
                    <div className="flex gap-3">
                        <div className="w-7 h-7 rounded-full bg-emerald-700/60 flex items-center justify-center border border-emerald-400/20">
                            <Bot size={13} />
                        </div>
                        <div className="flex gap-1 items-center px-4 py-3 bg-slate-800/80 rounded-2xl rounded-tl-sm border border-slate-700/60">
                            {[0, 150, 300].map((delay) => (
                                <span
                                    key={delay}
                                    className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                                    style={{ animationDelay: `${delay}ms` }}
                                />
                            ))}
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-slate-900/60 border-t border-white/5 shrink-0">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={isLoading ? 'Waiting for response...' : 'Ask a question...'}
                        disabled={isLoading}
                        className="flex-1 bg-slate-800/50 border border-slate-700 focus:border-blue-500/50 focus:bg-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 outline-none transition-all disabled:opacity-50"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit(e as unknown as React.FormEvent);
                            }
                        }}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="w-10 h-10 flex items-center justify-center bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-all shrink-0"
                    >
                        <Send size={16} />
                    </button>
                </form>
            </div>
        </Card>
    );
}
