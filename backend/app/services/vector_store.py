import numpy as np
import os
from app.core.config import settings

class VectorStore:
    def __init__(self):
        # Lazy initialization - model loaded on first use
        self._model = None
        self.dimension = 384
        
        if not os.path.exists(settings.FAISS_INDEX_PATH):
            os.makedirs(settings.FAISS_INDEX_PATH)
    
    @property
    def model(self):
        """Lazy load the model on first access"""
        if self._model is None:
            print("Loading Sentence Transformer model...")
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer('all-MiniLM-L6-v2')
            print("Model loaded successfully!")
        return self._model

    def create_index(self, texts: list[str], doc_id: str):
        import faiss  # Lazy import
        
        embeddings = self.model.encode(texts)
        index = faiss.IndexFlatL2(self.dimension)
        index.add(embeddings)
        
        # Save index
        index_path = os.path.join(settings.FAISS_INDEX_PATH, f"{doc_id}.index")
        faiss.write_index(index, index_path)
        
    def search(self, doc_id: str, query: str, k: int = 5):
        import faiss  # Lazy import
        
        index_path = os.path.join(settings.FAISS_INDEX_PATH, f"{doc_id}.index")
        if not os.path.exists(index_path):
            return [], []
            
        index = faiss.read_index(index_path)
        q_emb = self.model.encode([query])
        D, I = index.search(q_emb, k)
        return D[0], I[0] # Returns distances and indices
