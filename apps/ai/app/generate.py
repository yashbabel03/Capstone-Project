from __future__ import annotations

import json
import re

import httpx

from .config import settings
from .retrieve import _synonym_set, _tokens

_SENT = re.compile(r"(?<=[.!?])\s+|\n+")


def confidence_from(items: list[dict]) -> float:
    if not items:
        return 0.12
    top = float(items[0].get("score", items[0].get("rerank", 0)) or 0)
    docs = {
        (it.get("metadata") or {}).get("document_id") or (it.get("metadata") or {}).get("code")
        for it in items[:5]
    }
    docs.discard(None)
    conf = 0.22 + 0.5 * min(top, 1.0) + 0.12 * min(len(docs) / 3, 1)
    return round(min(0.94, max(0.08, conf)), 3)


def should_escalate(conf: float, items: list[dict], query: str) -> bool:
    if conf < 0.42 or not items:
        return True
    if re.search(r"\b(discard|allergen|reaction|ambulance|chemical)\b", query, re.I) and conf < 0.6:
        return True
    return False


def _strip_heading(text: str, section: str) -> str:
    t = (text or "").strip()
    s = (section or "").strip()
    if s and t.lower().startswith(s.lower()):
        t = t[len(s):]
    return t.strip(" .:—-\t")


def _cite(meta: dict) -> str:
    code = meta.get("code") or meta.get("title") or "document"
    version = meta.get("version") or ""
    section = re.sub(r"^Section\s+\d+\.?\s*", "", (meta.get("section") or ""), flags=re.I).strip()
    cite = f"{code} v{version}".strip()
    if section:
        cite += f" · {section}"
    return cite


def _sentence_candidates(items: list[dict], query: str) -> list[dict]:
    q_set = _synonym_set(_tokens(query))
    out: list[dict] = []
    for item in items[:4]:
        meta = item.get("metadata") or {}
        body = _strip_heading(item.get("text", ""), meta.get("section", ""))
        for sent in _SENT.split(body):
            sent = sent.strip(" -•\t")
            if len(sent) < 12:
                continue
            st = set(_tokens(sent))
            if not st:
                continue
            overlap = len(q_set & st) / max(len(q_set), 1)
            bonus = 0.05 if re.search(r"\d", sent) else 0.0
            rank_bias = 0.15 * float(item.get("score", item.get("rrf", 0)) or 0)
            out.append({"text": sent, "score": overlap + bonus + rank_bias, "cite": _cite(meta)})
    return out


def extractive_answer(query: str, items: list[dict], escalate: bool) -> str:
    if not items:
        return (
            "I couldn't find an authorized, current procedure for this in the knowledge base. "
            "Please escalate to the on-duty manager — do not improvise a food-safety decision."
        )

    candidates = _sentence_candidates(items, query)
    candidates.sort(key=lambda c: c["score"], reverse=True)

    picked: list[dict] = []
    seen: set[str] = set()
    for c in candidates:
        key = re.sub(r"\W+", " ", c["text"].lower()).strip()
        if key in seen:
            continue
        seen.add(key)
        picked.append(c)
        if len(picked) >= 4:
            break

    lines: list[str] = []
    if escalate:
        lines.append("I only have limited authorized evidence for this, so confirm with a manager before acting.")
    else:
        lines.append("Here's what the current procedures say:")

    if picked:
        lines.append("")
        lines.append(f"{picked[0]['text']}  [{picked[0]['cite']}]")

    rest = picked[1:]
    if rest:
        lines.append("")
        lines.append("Steps and detail:")
        for c in rest:
            lines.append(f"• {c['text']}  [{c['cite']}]")

    if escalate:
        lines.append("")
        lines.append(
            "This is thin evidence — get manager confirmation before discarding product or resetting equipment."
        )
    return "\n".join(lines).strip()


def llm_answer(query: str, items: list[dict], context: dict, escalate: bool, history: str = "") -> str | None:
    if not settings.openai_api_key:
        return None
    sources = []
    for item in items:
        meta = item.get("metadata") or {}
        sources.append(
            {
                "cite": f"{meta.get('code')} v{meta.get('version')} / {meta.get('section')}",
                "text": item.get("text", "")[:1200],
            }
        )
    system = (
        "You are RestaurantOps AI, a friendly, evidence-grounded kitchen operations assistant. "
        "Reply conversationally and concisely, as if chatting with a staff member. "
        "Use ONLY the provided sources. Cite document code, version, and section inline. "
        "If sources are insufficient, tell the user to escalate. "
        "Never invent setpoints, discard times, or recipes. "
        "Do not claim to control equipment. Similar incidents are references, not diagnoses."
    )
    user = json.dumps(
        {
            "situation": query,
            "conversation": history,
            "extracted_context": context,
            "sources": sources,
            "suggest_escalate": escalate,
        }
    )
    try:
        with httpx.Client(timeout=40) as client:
            res = client.post(
                f"{settings.openai_base_url.rstrip('/')}/chat/completions",
                headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                json={
                    "model": settings.openai_model,
                    "temperature": 0.1,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                },
            )
            res.raise_for_status()
            return res.json()["choices"][0]["message"]["content"]
    except Exception:
        return None
