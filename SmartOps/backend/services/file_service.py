import base64
import io

import fitz


def encode_image_base64(file_bytes: bytes) -> str:
    return base64.b64encode(file_bytes).decode("utf-8")


def extract_pdf_text(file_bytes: bytes) -> str:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    pages = []
    for page in doc:
        text = page.get_text().strip()
        if text:
            pages.append(text)
    doc.close()
    if not pages:
        return "[PDF kosong atau tidak bisa dibaca]"
    return "\n\n".join(pages)


def is_image(mime_type: str) -> bool:
    return mime_type and mime_type.startswith("image/")


def is_pdf(mime_type: str) -> bool:
    return mime_type == "application/pdf"
