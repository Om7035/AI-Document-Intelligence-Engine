import ollama
from app.core.config import settings

class LLMService:
    def __init__(self):
        self.host = settings.OLLAMA_HOST
        self.model = settings.OLLAMA_MODEL
        self._client = None
    
    @property
    def client(self):
        """Lazy load the Ollama client"""
        if self._client is None:
            self._client = ollama.Client(host=self.host)
        return self._client

    def generate_summary(self, text: str) -> str:
        # Simple prompt for summary
        # Warning: Context window limits. We might need map-reduce for large docs.
        # For MVP, we truncate or assume sections.
        prompt = f"Summarize the following text in a concise executive summary:\n\n{text[:8000]}" 
        try:
            response = self.client.generate(model=self.model, prompt=prompt)
            return response['response']
        except Exception as e:
            print(f"LLM Error: {e}")
            return "Summary generation failed."

    def generate_mindmap(self, text: str) -> str:
        prompt = f"Create a hierarchical markdown outline (mindmap) for the following text. Use # for main topics, ## for subtopics, and - for details. Do not write any intro or outro, just the markdown:\n\n{text[:6000]}"
        try:
            response = self.client.generate(model=self.model, prompt=prompt)
            # Clean response to ensure only markdown
            content = response['response']
            return content
        except Exception as e:
            print(f"LLM Error (Mindmap): {e}")
            return "# Error\n- Could not generate mindmap"

    def chat(self, messages: list):
        # Generator for streaming
        try:
            stream = self.client.chat(model=self.model, messages=messages, stream=True)
            for chunk in stream:
                if 'message' in chunk and 'content' in chunk['message']:
                     yield chunk['message']['content']
        except Exception as e:
            yield f"Error: {str(e)}"
