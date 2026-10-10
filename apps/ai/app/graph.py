from __future__ import annotations

import re
from collections import defaultdict

from .store import all_knowledge, parse_roles

EQUIP_RE = re.compile(
    r"\b(walk-?in|freezer|cooler|fryer|grill|oven|probe|gasket|compressor|allergen|oil|vinaigrette)\b",
    re.I,
)


def build_graph() -> dict[str, set[str]]:
    """Equipment/topic → document_id adjacency used as retrieval context."""
    corpus = all_knowledge()
    docs = corpus.get("documents") or []
    metas = corpus.get("metadatas") or []
    graph: dict[str, set[str]] = defaultdict(set)
    for i, text in enumerate(docs):
        meta = metas[i] or {}
        doc_id = str(meta.get("document_id") or meta.get("code") or "")
        hay = f"{meta.get('title', '')} {meta.get('code', '')} {meta.get('section', '')} {text or ''}"
        for m in EQUIP_RE.finditer(hay):
            graph[m.group(0).lower()].add(doc_id)
        for dept in _list(meta.get("departments")):
            graph[f"dept:{dept.lower()}"].add(doc_id)
    return graph


def related_document_ids(query: str, graph: dict[str, set[str]]) -> set[str]:
    ids: set[str] = set()
    for m in EQUIP_RE.finditer(query or ""):
        ids |= graph.get(m.group(0).lower(), set())
    return ids


def _list(raw) -> list[str]:
    if isinstance(raw, list):
        return [str(x) for x in raw]
    if isinstance(raw, str):
        try:
            import json

            parsed = json.loads(raw)
            if isinstance(parsed, list):
                return [str(x) for x in parsed]
        except Exception:
            return [raw]
    return []


# parse_roles imported for callers that share permission graph nodes
__all__ = ["build_graph", "related_document_ids", "parse_roles"]
