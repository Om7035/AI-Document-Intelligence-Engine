import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const api = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
});

export const uploadDocument = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/documents/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
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
};

export const getDocumentMindmap = async (id: string) => {
    const response = await api.get(`/documents/${id}/mindmap/`);
    return response.data;
};

export const getDocumentSummary = async (id: string) => {
    const response = await api.get(`/documents/${id}/summary/`);
    return response.data;
};

export const deleteDocument = async (id: string) => {
    const response = await api.delete(`/documents/${id}/`);
    return response.data;
};

export const chatWithDocument = async (
    docId: string,
    message: string,
    history: { role: string; content: string }[]
): Promise<Response> => {
    return fetch(`${BASE_URL}/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            document_id: docId,
            question: message,
            history,
        }),
    });
};
