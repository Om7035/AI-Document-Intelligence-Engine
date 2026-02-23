import { create } from 'zustand';

export interface Document {
    id: string;
    filename: string;
    upload_date: string;
    processing_status: string;
    file_size: number;
    page_count?: number;
    summary?: string | null;
    meta_data?: Record<string, unknown>;
}

export interface Toast {
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
}

interface AppState {
    documents: Document[];
    currentDocumentId: string | null;
    currentDocument: Document | null;
    toasts: Toast[];
    // Actions
    setDocuments: (docs: Document[]) => void;
    setCurrentDocumentId: (id: string | null) => void;
    addDocument: (doc: Document) => void;
    updateDocument: (id: string, updates: Partial<Document>) => void;
    removeDocument: (id: string) => void;
    addToast: (type: Toast['type'], message: string) => void;
    removeToast: (id: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
    documents: [],
    currentDocumentId: null,
    currentDocument: null,
    toasts: [],

    setDocuments: (docs) => {
        const { currentDocumentId } = get();
        const currentDoc = currentDocumentId
            ? docs.find((d) => d.id === currentDocumentId) ?? null
            : null;
        set({ documents: docs, currentDocument: currentDoc });
    },

    setCurrentDocumentId: (id) => {
        const doc = id ? get().documents.find((d) => d.id === id) ?? null : null;
        set({ currentDocumentId: id, currentDocument: doc });
    },

    addDocument: (doc) =>
        set((state) => ({ documents: [doc, ...state.documents] })),

    updateDocument: (id, updates) =>
        set((state) => {
            const documents = state.documents.map((d) =>
                d.id === id ? { ...d, ...updates } : d
            );
            const currentDocument =
                state.currentDocumentId === id
                    ? { ...state.currentDocument!, ...updates }
                    : state.currentDocument;
            return { documents, currentDocument };
        }),

    removeDocument: (id) =>
        set((state) => ({
            documents: state.documents.filter((d) => d.id !== id),
            currentDocumentId: state.currentDocumentId === id ? null : state.currentDocumentId,
            currentDocument: state.currentDocumentId === id ? null : state.currentDocument,
        })),

    addToast: (type, message) => {
        const id = Math.random().toString(36).slice(2);
        set((state) => ({ toasts: [...state.toasts, { id, type, message }] }));
        // Auto-remove after 4s
        setTimeout(() => get().removeToast(id), 4000);
    },

    removeToast: (id) =>
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
