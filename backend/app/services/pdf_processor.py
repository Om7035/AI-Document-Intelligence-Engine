"""
Enhanced PDF Processor
- Paragraph-aware chunking (not word-split)
- Page number tracking
- Heading extraction via font-size heuristic
"""

import re
import os
from typing import List


class PDFProcessor:

    def extract_text(self, file_path: str) -> str:
        """Extract full text from PDF using PyMuPDF (lazy import)."""
        import fitz  # type: ignore  # lazy to avoid startup block
        doc = fitz.open(file_path)
        pages_text = []
        for page in doc:
            pages_text.append(page.get_text())
        doc.close()
        return "\n".join(pages_text)

    def get_page_count(self, file_path: str) -> int:
        import fitz  # type: ignore
        doc = fitz.open(file_path)
        count = len(doc)
        doc.close()
        return count

    def extract_pages_with_metadata(self, file_path: str) -> List[dict]:
        """
        Extract text per page with basic heading detection.
        Returns list of {page: int, text: str, headings: List[str]}
        """
        import fitz  # type: ignore
        results = []
        doc = fitz.open(file_path)
        for page_num, page in enumerate(doc, start=1):
            blocks = page.get_text("dict")["blocks"]
            page_text = []
            headings = []
            for block in blocks:
                if block.get("type") != 0:
                    continue
                for line in block.get("lines", []):
                    line_text = " ".join(span["text"] for span in line.get("spans", []))
                    if not line_text.strip():
                        continue
                    # Detect heading: large font or bold in first span
                    for span in line.get("spans", []):
                        if span.get("size", 0) >= 14 or "bold" in span.get("font", "").lower():
                            if line_text.strip():
                                headings.append(line_text.strip())
                            break
                    page_text.append(line_text)
            results.append({
                "page": page_num,
                "text": "\n".join(page_text),
                "headings": headings,
            })
        doc.close()
        return results

    def chunk_text(self, text: str, max_words: int = 400, overlap_words: int = 60) -> List[str]:
        """
        Paragraph-aware chunking.
        Splits on double-newlines (paragraphs) first, then merges
        small paragraphs into chunks of ~max_words with overlap.
        """
        # Clean up text
        text = re.sub(r"\n{3,}", "\n\n", text)  # collapse excessive newlines
        text = re.sub(r"[ \t]+", " ", text)      # normalize spaces

        # Split into paragraphs
        paragraphs = [p.strip() for p in re.split(r"\n\n+", text) if p.strip()]

        if not paragraphs:
            return []

        chunks: List[str] = []
        current_words: List[str] = []

        for para in paragraphs:
            para_words = para.split()
            if not para_words:
                continue

            # If adding this paragraph would exceed max, flush first
            if len(current_words) + len(para_words) > max_words and current_words:
                chunks.append(" ".join(current_words))
                # keep overlap tail
                current_words = current_words[-overlap_words:]

            current_words.extend(para_words)

        # Flush remaining
        if current_words:
            chunks.append(" ".join(current_words))

        # Filter out very short chunks (< 20 words)
        chunks = [c for c in chunks if len(c.split()) >= 20]
        return chunks
