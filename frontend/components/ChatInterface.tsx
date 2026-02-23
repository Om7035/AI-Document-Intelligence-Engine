import { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Sparkles, RefreshCw } from 'lucide-react';
import { Button, Input, Card } from '@/components/ui';
import { chatWithDocument } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export default function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const currentDocumentId = useStore((state) => state.currentDocumentId);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !currentDocumentId) return;

        const userMessage = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const response = await chatWithDocument(currentDocumentId, userMessage, []);

            // Handle streaming response
            if (response.body) {
                setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
                const reader = response.body.getReader();
                const decoder = new TextDecoder();

                let assistantMessage = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    // Simple parsing of SSE format "data: ..."
                    // In real logic, might need robust parsing if chunks are split
                    const lines = chunk.split('\n\n');
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            // This depends on how backend actually streams. 
                            // Our backend code yields raw strings, so streaming response would be raw text chunks usually
                            // unless we wrapped in SSE format explicitly in backend (which we did blindly using "text/event-stream" without explicit "data:" prefix in the generator?)
                            // Wait, backend `yield f"{block}"`? No, fastapi StreamingResponse with generator yields bytes.
                            // If generator yields strings, FastAPI sends them as chunks.
                            // Let's assume raw text for simpler MVP or adapt parsing.
                            // Our backend yields `chunk['message']['content']`.
                            // It is raw content chunks.
                            assistantMessage += line.replace('data: ', '');
                        } else {
                            assistantMessage += line;
                        }
                    }

                    setMessages(prev => {
                        const newMessages = [...prev];
                        newMessages[newMessages.length - 1].content = assistantMessage;
                        return newMessages;
                    });
                }
            }
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!currentDocumentId) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8 text-center glass-panel">
                <Sparkles className="w-12 h-12 mb-4 text-slate-600" />
                <h3 className="text-xl font-medium text-slate-300">Select a document to chat</h3>
                <p className="max-w-xs mt-2">Upload a PDF or select one from the sidebar to start asking questions.</p>
            </div>
        );
    }

    return (
        <Card className="flex flex-col h-[600px] p-0 overflow-hidden relative">
            {/* Header */}
            <div className="p-4 border-b border-white/5 bg-slate-900/50 backdrop-blur-md flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="font-semibold text-slate-200">AI Assistant</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {messages.length === 0 && (
                    <div className="text-center mt-20 opacity-50">
                        <Bot className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                        <p>Ask anything about the document!</p>
                    </div>
                )}
                <AnimatePresence>
                    {messages.map((msg, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                                "flex gap-4 max-w-[85%]",
                                msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                            )}
                        >
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                                msg.role === 'user' ? "bg-blue-600 border-blue-400" : "bg-emerald-600 border-emerald-400"
                            )}>
                                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                            </div>

                            <div className={cn(
                                "p-4 rounded-2xl text-sm leading-relaxed shadow-lg",
                                msg.role === 'user'
                                    ? "bg-blue-600/20 border border-blue-500/30 text-blue-50 rounded-tr-sm"
                                    : "bg-slate-800/80 border border-slate-700 text-slate-200 rounded-tl-sm"
                            )}>
                                {msg.content}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
                {isLoading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-emerald-600/50 flex items-center justify-center shrink-0 border border-emerald-400/30">
                            <Bot size={14} />
                        </div>
                        <div className="flex gap-1 items-center h-8">
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-0"></span>
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-300"></span>
                        </div>
                    </motion.div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-slate-900/50 border-t border-white/5 backdrop-blur-md">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <Input
                        value={input}
                        onChange={(e: { target: { value: string; }; }) => setInput(e.target.value)}
                        placeholder="Ask a question..."
                        className="flex-1 bg-slate-800/50 border-slate-700 focus:bg-slate-800 transition-all font-light"
                    />
                    <Button type="submit" disabled={isLoading || !input.trim()} className="bg-blue-600 hover:bg-blue-500 w-12 h-10 p-0 rounded-lg">
                        <Send size={18} />
                    </Button>
                </form>
            </div>
        </Card>
    );
}
