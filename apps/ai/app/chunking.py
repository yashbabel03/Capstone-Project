from __future__ import annotations

import re

FRONT_MATTER_KEYS = (
    "document type:",
    "version:",
    "effective date:",
    "review date:",
    "applicable roles:",
    "department:",
    "classification:",
)


def strip_front_matter(text: str) -> str:
    lines = text.splitlines()
    start = 0
    if len(lines) >= 2 and lines[0].strip():
        if lines[1].strip().lower().startswith(FRONT_MATTER_KEYS):
            start = 1
    kept = [line for line in lines[start:] if not line.strip().lower().startswith(FRONT_MATTER_KEYS)]
    return "\n".join(kept).strip()


def chunk_text(text: str, size: int = 900, overlap: int = 150) -> list[dict]:
    text = strip_front_matter(text)
    sections = _split_sections(text)
    chunks: list[dict] = []
    for section, body in sections:
        parts = _window(body, size, overlap)
        for i, part in enumerate(parts):
            chunks.append({"section": section, "text": part.strip(), "index": len(chunks)})
            if not part.strip():
                chunks.pop()
    if not chunks and text.strip():
        chunks.append({"section": "Body", "text": text.strip()[:size], "index": 0})
    return chunks


def _split_sections(text: str) -> list[tuple[str, str]]:
    parts = re.split(r"(?=^Section\s+\d+|^SOP-|^RCP-)", text, flags=re.M)
    out: list[tuple[str, str]] = []
    for part in parts:
        part = part.strip()
        if not part:
            continue
        first = part.splitlines()[0][:80]
        out.append((first, part))
    return out or [("Body", text)]


def _window(text: str, size: int, overlap: int) -> list[str]:
    words = text.split()
    if not words:
        return []
    chunks = []
    i = 0
    while i < len(words):
        piece = words[i : i + size]
        chunks.append(" ".join(piece))
        i += max(size - overlap, 1)
    return chunks
