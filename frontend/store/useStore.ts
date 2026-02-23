import { create } from 'zustand';

interface Document {
    id: string;
    filename: string;
    upload_date: string;
    processing_status: string;
    file_size: number;
}

interface AppState {
    documents: Document[];
    currentDocumentId: string | null;
    setDocuments: (docs: Document[]) => void;
    setCurrentDocumentId: (id: string | null) => void;
    addDocument: (doc: Document) => void;
}

export const useStore = create<AppState>((set) => ({
    documents: [],
    currentDocumentId: null,
    setDocuments: (docs) => set({ documents: docs }),
    setCurrentDocumentId: (id) => set({ currentDocumentId: id }),
    addDocument: (doc) => set((state) => ({ documents: [...state.documents, doc] })),
}));
