"""
Vector store using FAISS + Sentence Transformers.
All heavy imports are lazy to prevent startup blocking.
Saves chunk-ID mapping alongside the FAISS index for reliable retrieval.
"""
import json
import os
from typing import List, Tuple
from app.core.config import settings


class VectorStore:
    def __init__(self):
        self._model = None
        self.dimension = 384
        os.makedirs(settings.FAISS_INDEX_PATH, exist_ok=True)

    @property
    def model(self):
        """Lazy-load SentenceTransformer on first use."""
        if self._model is None:
            print("⏳ Loading embedding model (all-MiniLM-L6-v2)...")
            from sentence_transformers import SentenceTransformer  # noqa: lazy
            self._model = SentenceTransformer("all-MiniLM-L6-v2")
            print("✓ Embedding model loaded.")
        return self._model

    def _index_path(self, doc_id: str) -> str:
        return os.path.join(settings.FAISS_INDEX_PATH, f"{doc_id}.index")

    def _map_path(self, doc_id: str) -> str:
        """JSON file mapping FAISS position → chunk_index."""
        return os.path.join(settings.FAISS_INDEX_PATH, f"{doc_id}.map.json")

    def create_index(self, texts: List[str], doc_id: str):
        """Embed texts and store FAISS index + position mapping."""
        import faiss  # lazy
        import numpy as np  # noqa

        if not texts:
            return

        embeddings = self.model.encode(texts, show_progress_bar=False)
        embeddings = embeddings.astype("float32")

        index = faiss.IndexFlatL2(self.dimension)
        index.add(embeddings)

        faiss.write_index(index, self._index_path(doc_id))

        # Save position → chunk_index mapping (here they're the same, but explicit)
        mapping = {str(pos): pos for pos in range(len(texts))}
        with open(self._map_path(doc_id), "w") as f:
            json.dump(mapping, f)

        print(f"✓ FAISS index saved for {doc_id} ({len(texts)} vectors)")

    def search(self, doc_id: str, query: str, k: int = 5) -> Tuple[List[float], List[int]]:
        """Search FAISS index, return (distances, chunk_indices)."""
        import faiss  # lazy

        index_path = self._index_path(doc_id)
        map_path = self._map_path(doc_id)

        if not os.path.exists(index_path):
            return [], []

        index = faiss.read_index(index_path)
        q_emb = self.model.encode([query], show_progress_bar=False).astype("float32")

        actual_k = min(k, index.ntotal)
        if actual_k == 0:
            return [], []

        distances, positions = index.search(q_emb, actual_k)

        # Load position→chunk_index mapping
        chunk_indices: List[int] = []
        if os.path.exists(map_path):
            with open(map_path) as f:
                mapping = json.load(f)
            for pos in positions[0]:
                if pos != -1:
                    chunk_indices.append(mapping.get(str(pos), int(pos)))
        else:
            chunk_indices = [int(p) for p in positions[0] if p != -1]

        return list(distances[0]), chunk_indices

    def delete_index(self, doc_id: str):
        """Remove FAISS index and mapping for a document."""
        for path in [self._index_path(doc_id), self._map_path(doc_id)]:
            if os.path.exists(path):
                os.remove(path)
                print(f"✓ Deleted {path}")
