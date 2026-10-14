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


def chat_text(prompt: str, context: str | None = None) -> str:
    client = get_client()
    if context:
        full_prompt = (
            f"[Konteks Dokumen]\n{context}\n\n"
            f"[Pertanyaan User]\n{prompt}"
        )
    else:
        full_prompt = prompt

    response = client.chat.completions.create(
        model=TEXT_MODEL,
        messages=[{"role": "user", "content": full_prompt}],
        temperature=0.3,
        max_tokens=4096,
    )
    return response.choices[0].message.content


def chat_vision(base64_image: str, mime_type: str, prompt: str) -> str:
    client = get_client()
    response = client.chat.completions.create(
        model=VISION_MODEL,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt or "Jelaskan isi gambar ini secara detail."},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{base64_image}",
                        },
                    },
                ],
            }
        ],
        temperature=0.3,
        max_tokens=4096,
    )
    return response.choices[0].message.content
