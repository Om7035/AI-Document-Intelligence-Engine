import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

export const uploadDocument = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/documents/upload/', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const getDocuments = async () => {
    const response = await api.get('/documents/');
    return response.data;
};

export const getDocument = async (id: string) => {
    const response = await api.get(`/documents/${id}/`);
    return response.data;
}

export const getDocumentMindmap = async (id: string) => {
    const response = await api.get(`/documents/${id}/mindmap/`);
    return response.data;
}

export const chatWithDocument = async (docId: string, message: string, history: any[]) => {
    // For streaming, we might need fetch instead of axios to handle the stream better
    // But axios also supports streams in node, in browser fetch is often easier for SSE
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/chat/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            document_id: docId,
            question: message,
            history: history
        })
    });
    return response;
};
