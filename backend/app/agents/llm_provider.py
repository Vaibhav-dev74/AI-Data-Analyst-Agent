import json
import logging
import re
from typing import Any, Dict, List, Optional
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class LLMProvider:
    """
    Unified LLM provider abstraction for Gemini API, OpenAI-compatible APIs,
    and a deterministic offline analysis engine.
    """

    @classmethod
    def generate_completion(
        cls,
        prompt: str,
        system_instruction: Optional[str] = None,
        json_output: bool = False,
        temperature: float = 0.1
    ) -> str:
        """Dispatches prompt to configured provider if API key exists, else triggers heuristic fallback."""
        provider = settings.AI_PROVIDER.lower()

        # 1. Gemini API
        if provider == "gemini" and settings.GEMINI_API_KEY:
            try:
                from google import genai
                from google.genai import types

                client = genai.Client(api_key=settings.GEMINI_API_KEY)
                config_params = {
                    "temperature": temperature,
                }
                if system_instruction:
                    config_params["system_instruction"] = system_instruction
                if json_output:
                    config_params["response_mime_type"] = "application/json"

                config = types.GenerateContentConfig(**config_params)
                model_name = settings.GEMINI_MODEL or "gemini-2.5-flash"

                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=config
                )
                if response and response.text:
                    return response.text
            except Exception as e:
                logger.warning(f"Gemini API call failed ({e}). Using offline deterministic generator.")

        # 2. OpenAI API
        elif provider == "openai" and settings.OPENAI_API_KEY:
            try:
                headers = {
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                    "Content-Type": "application/json"
                }
                messages = []
                if system_instruction:
                    messages.append({"role": "system", "content": system_instruction})
                messages.append({"role": "user", "content": prompt})

                payload = {
                    "model": settings.OPENAI_MODEL or "gpt-4o-mini",
                    "messages": messages,
                    "temperature": temperature
                }
                if json_output:
                    payload["response_format"] = {"type": "json_object"}

                with httpx.Client(timeout=30.0) as client:
                    resp = client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        return data["choices"][0]["message"]["content"]
            except Exception as e:
                logger.warning(f"OpenAI API call failed ({e}). Using offline deterministic generator.")

        # 3. If no API key or mock, raise exception so each node's smart deterministic heuristic handles it!
        raise RuntimeError("No external LLM API key configured. Utilizing local deterministic analytics engine.")
