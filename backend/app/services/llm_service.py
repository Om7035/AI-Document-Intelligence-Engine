"""
LLM Service — Ollama integration.
- Lazy client instantiation
- Long timeouts (3 min) for low-RAM machines
- Automatic model fallback: tries configured model, then smaller alternatives
"""
import requests
from app.core.config import settings

# Ordered fallback list — smallest-first so it works even on low-RAM machines
MODEL_FALLBACK_ORDER = [
    settings.OLLAMA_MODEL,
    "llama3.2:1b",
    "phi3:latest",
    "llama3.1:latest",
]

# Deduplicate while preserving order
_seen: set = set()
_FALLBACK_MODELS: list = []
for _m in MODEL_FALLBACK_ORDER:
    if _m not in _seen:
        _seen.add(_m)
        _FALLBACK_MODELS.append(_m)


def _get_available_models() -> list[str]:
    """Return list of model names currently installed in Ollama."""
    try:
        r = requests.get(f"{settings.OLLAMA_HOST}/api/tags", timeout=5)
        if r.status_code == 200:
            return [m["name"] for m in r.json().get("models", [])]
    except Exception:
        pass
    return []


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
            import ollama  # lazy import
            # Use a long keep_alive so the model stays warm between requests
            self._client = ollama.Client(host=self.host)
        return self._client

    def _best_model(self) -> str:
        """Return the first model from the fallback list that is installed."""
        available = _get_available_models()
        if not available:
            return self.model  # let it fail with a meaningful error
        for m in _FALLBACK_MODELS:
            if any(a == m or a.startswith(m.split(":")[0]) for a in available):
                # Return exact match first, else first partial match
                for a in available:
                    if a == m or a == m + ":latest":
                        return a
                for a in available:
                    if a.startswith(m.split(":")[0]):
                        return a
        return available[0]  # last resort: whatever is installed

    def _generate(self, prompt: str, timeout: int = 180) -> str:
        """
        Call Ollama generate with the best available model.
        Raises on failure so callers can handle gracefully.
        """
        import ollama
        model = self._best_model() if not hasattr(self, '_resolved_model') else self._resolved_model
        # cache the resolved model for the session
        self._resolved_model = model
        print(f"  [LLM] Using model: {model}")

        resp = self.client.generate(
            model=model,
            prompt=prompt,
            options={"num_predict": 1024, "temperature": 0.3},
        )
        return resp["response"].strip()

    # ── Summary ───────────────────────────────────────────────────────────────

    def generate_summary(self, text: str) -> str:
        if not text.strip():
            return "No text available for summarisation."

        prompt = (
            "You are a professional document analyst. "
            "Write a clear, structured executive summary of the following document text. "
            "Use plain English. Focus on the main purpose, key findings, and conclusions. "
            "Keep it under 300 words.\n\n"
            f"DOCUMENT TEXT:\n{text[:8000]}\n\nSUMMARY:"
        )
        try:
            return self._generate(prompt)
        except Exception as e:
            err = str(e)
            print(f"[LLM] Summary error: {err}")
            if "memory" in err.lower():
                return "⚠️ Summary unavailable — not enough free RAM to run the LLM. Close other apps and use 'Re-process' to try again."
            return f"⚠️ Summary generation failed: {err}"

    # ── Mindmap ───────────────────────────────────────────────────────────────

    def generate_mindmap(self, text: str) -> str:
        if not text.strip():
            return "# Document\n- No content available"

        prompt = (
            "You are a professional knowledge architect. "
            "Create a sophisticated, multi-level hierarchical Markdown outline of the document text. "
            "Structure it like this:\n"
            "# Broad Document Title\n"
            "## 🎯 Core Concepts\n"
            "### Concept 1\n"
            "- Key detail\n"
            "### Concept 2\n"
            "- Key detail\n"
            "## 💡 Vital Insights\n"
            "### Insight 1\n"
            "- Supporting fact\n"
            "## 🛠️ Practical Applications/Actions\n"
            "- Step or action item\n\n"
            "Rules:\n"
            "- Use clean indentations.\n"
            "- Use relevant emojis for level 2 headings to aid visual scanning.\n"
            "- Keep points concise (max 10 words per leaf node).\n"
            "- Output ONLY valid Markdown.\n\n"
            f"DOCUMENT TEXT:\n{text[:6000]}\n\nMARKDOWN OUTLINE:"
        )
        try:
            content = self._generate(prompt)
            if not content.startswith("#"):
                content = "# Document Overview\n" + content
            return content
        except Exception as e:
            err = str(e)
            print(f"[LLM] Mindmap error: {err}")
            if "memory" in err.lower():
                return (
                    "# ⚠️ Generation Failed\n"
                    "## Reason\n"
                    "- Not enough free RAM to load the LLM model\n"
                    "## Fix\n"
                    "- Close other apps (browser tabs, IDE, etc.)\n"
                    "- Then click **Re-process** on this document\n"
                    f"## System Info\n"
                    f"- Required: ~1.5 GB free RAM\n"
                    f"- Model: {self.model}"
                )
            return f"# ⚠️ Generation Failed\n## Error\n- {err}\n## Fix\n- Ensure Ollama is running\n- Click Re-process"

    # ── Chat (streaming) ──────────────────────────────────────────────────────

    def chat(self, messages: list):
        """Generator that yields text tokens for streaming."""
        import ollama
        model = self._best_model()
        try:
            stream = self.client.chat(
                model=model,
                messages=messages,
                stream=True,
                options={"temperature": 0.7, "num_predict": 2048},
            )
            for chunk in stream:
                token = chunk.get("message", {}).get("content", "")
                if token:
                    yield token
        except Exception as e:
            err = str(e)
            if "memory" in err.lower():
                yield "\n\n⚠️ **Not enough RAM** to run the LLM. Please close other applications and try again."
            else:
                yield f"\n\n⚠️ LLM Error: {err}"


# Module-level singleton
_llm_service: LLMService | None = None


def get_llm_service() -> LLMService:
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service
