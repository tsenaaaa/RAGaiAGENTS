import json

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from services.file_service import encode_image_base64, extract_pdf_text, is_image, is_pdf
from services.groq_service import chat_text, chat_vision

app = FastAPI(title="SmartOps API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/chat")
async def chat(
    message: str = Form(...),
    file: UploadFile | None = File(None),
    history: str = Form("[]"),
):
    try:
        parsed_history = json.loads(history)
    except (TypeError, json.JSONDecodeError):
        parsed_history = []

    if not isinstance(parsed_history, list):
        parsed_history = []

    if file:
        file_bytes = await file.read()
        mime = file.content_type or ""

        if is_image(mime):
            b64 = encode_image_base64(file_bytes)
            reply = chat_vision(b64, mime, message, history=parsed_history)
            return {"reply": reply, "type": "image"}

        if is_pdf(mime):
            text = extract_pdf_text(file_bytes)
            reply = chat_text(message, context=text, history=parsed_history)
            return {"reply": reply, "type": "pdf"}

    reply = chat_text(message, history=parsed_history)
    return {"reply": reply, "type": "text"}


@app.get("/health")
def health():
    return {"status": "ok"}
