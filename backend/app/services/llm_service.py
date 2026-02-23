"""
LLM Service — Ollama integration.
All instantiation is lazy; client created on first use.
"""
import requests
from app.core.config import settings


def _ollama_available() -> bool:
    """Quick reachability check for Ollama."""
    try:
        r = requests.get(f"{settings.OLLAMA_HOST}/api/tags", timeout=3)
        return r.status_code == 200
    except Exception:
        return False


class LLMService:
    def __init__(self):
        self.host = settings.OLLAMA_HOST
        self.model = settings.OLLAMA_MODEL
        self._client = None

    @property
    def client(self):
        if self._client is None:
            import ollama  # lazy
            self._client = ollama.Client(host=self.host)
        return self._client

    # ── Summary ──────────────────────────────────────────────────────────────

    def generate_summary(self, text: str) -> str:
        if not text.strip():
            return "No text available for summarisation."

        prompt = (
            "You are a professional document analyst. "
            "Write a clear, structured executive summary of the following document text. "
            "Use plain English. Focus on the main purpose, key findings, and conclusions. "
            "Keep it under 300 words.\n\n"
            f"DOCUMENT TEXT:\n{text[:10000]}\n\nSUMMARY:"
        )
        try:
            resp = self.client.generate(model=self.model, prompt=prompt)
            return resp["response"].strip()
        except Exception as e:
            print(f"LLM summary error: {e}")
            return "Summary generation failed. Ensure Ollama is running with the correct model."

    # ── Mindmap ───────────────────────────────────────────────────────────────

    def generate_mindmap(self, text: str) -> str:
        if not text.strip():
            return "# Document\n- No content available"

        prompt = (
            "You are a knowledge-map expert. "
            "Create a hierarchical Markdown outline for the following document. "
            "Rules:\n"
            "- Use # for the document title\n"
            "- Use ## for main sections/topics\n"
            "- Use ### for sub-topics\n"
            "- Use - for key points\n"
            "- Output ONLY the Markdown, no preamble, no explanation.\n\n"
            f"DOCUMENT TEXT:\n{text[:8000]}\n\nMARKDOWN OUTLINE:"
        )
        try:
            resp = self.client.generate(model=self.model, prompt=prompt)
            content = resp["response"].strip()
            # Ensure it starts with a heading
            if not content.startswith("#"):
                content = "# Document Overview\n" + content
            return content
        except Exception as e:
            print(f"LLM mindmap error: {e}")
            return "# Document\n- Mindmap generation failed\n- Ensure Ollama is running"

    # ── Chat (streaming) ──────────────────────────────────────────────────────

    def chat(self, messages: list):
        """Generator that yields text tokens for streaming."""
        try:
            stream = self.client.chat(
                model=self.model,
                messages=messages,
                stream=True,
            )
            for chunk in stream:
                token = chunk.get("message", {}).get("content", "")
                if token:
                    yield token
        except Exception as e:
            yield f"\n\n⚠️ LLM Error: {str(e)}"
