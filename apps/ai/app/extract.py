from __future__ import annotations

from pathlib import Path


def extract_text(file_path: str, mime_type: str = "") -> str:
    path = Path(file_path)
    suffix = path.suffix.lower()
    raw = path.read_bytes()

    if suffix in {".txt", ".md"} or mime_type.startswith("text/"):
        return raw.decode("utf-8", errors="ignore")

    if suffix == ".pdf" or mime_type == "application/pdf":
        from pypdf import PdfReader
        from io import BytesIO

        reader = PdfReader(BytesIO(raw))
        pages = []
        for i, page in enumerate(reader.pages, start=1):
            text = page.extract_text() or ""
            pages.append(f"[Page {i}]\n{text}")
        joined = "\n\n".join(pages).strip()
        if len(joined) < 40:
            ocr = _ocr_bytes(raw, suffix)
            if ocr:
                return ocr
        return joined

    if suffix in {".docx"} or "wordprocessingml" in mime_type:
        import docx
        from io import BytesIO

        document = docx.Document(BytesIO(raw))
        return "\n".join(p.text for p in document.paragraphs if p.text.strip())

    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        ocr = _ocr_bytes(raw, suffix)
        return ocr or ""


def _ocr_bytes(raw: bytes, suffix: str) -> str:
    try:
        import pytesseract
        from PIL import Image
        from io import BytesIO
    except Exception:
        return ""
    try:
        if suffix == ".pdf":
            return ""
        image = Image.open(BytesIO(raw))
        return pytesseract.image_to_string(image)
    except Exception:
        return ""


def classify_document(text: str, hinted: str = "") -> str:
    hay = text.lower()
    rules = [
        ("allergen", ["allergen", "peanut", "gluten", "cross-contact"]),
        ("recipe", ["yield:", "ingredients", "method:"]),
        ("equipment_manual", ["setpoint", "alarm code", "operator manual"]),
        ("food_safety", ["haccp", "temperature excursion", "discard"]),
        ("training", ["training", "onboarding", "competency"]),
        ("sop", ["sop-", "section 1", "procedure"]),
    ]
    for label, keys in rules:
        if any(k in hay for k in keys):
            return label
    return hinted or "sop"
