import os

from dotenv import load_dotenv
from groq import Groq

load_dotenv()

# Qwen 3.8 accepts both text and image inputs. The previous Llama model IDs
# were retired from Groq and now return a 404 model_not_found error.
TEXT_MODEL = "qwen/qwen3.8-27b"
VISION_MODEL = "qwen/qwen3.8-27b"


def get_client() -> Groq:
    return Groq(api_key=os.getenv("GROQ_API_KEY"))


def _history_messages(history: list[dict] | None) -> list[dict[str, str]]:
    if not history:
        return []

    messages: list[dict[str, str]] = []
    for item in history[-16:]:
        if not isinstance(item, dict):
            continue
        role = item.get("role")
        content = item.get("content")
        if role in {"user", "assistant"} and isinstance(content, str) and content.strip():
            messages.append({"role": role, "content": content[-6000:]})
    return messages


def chat_text(
    prompt: str,
    context: str | None = None,
    history: list[dict] | None = None,
) -> str:
    client = get_client()
    if context:
        prompt = f"[Konteks Dokumen]\n{context}\n\n[Pertanyaan User]\n{prompt}"

    messages = _history_messages(history)
    messages.append({"role": "user", "content": prompt})

    response = client.chat.completions.create(
        model=TEXT_MODEL,
        messages=messages,
        temperature=0.3,
        max_tokens=4096,
    )
    return response.choices[0].message.content


def chat_vision(
    base64_image: str,
    mime_type: str,
    prompt: str,
    history: list[dict] | None = None,
) -> str:
    client = get_client()
    messages = _history_messages(history)
    messages.append(
        {
            "role": "user",
            "content": [
                {"type": "text", "text": prompt or "Jelaskan isi gambar ini secara detail."},
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:{mime_type};base64,{base64_image}"},
                },
            ],
        }
    )
    response = client.chat.completions.create(
        model=VISION_MODEL,
        messages=messages,
        temperature=0.3,
        max_tokens=4096,
    )
    return response.choices[0].message.content
