from __future__ import annotations

import re

from rank_bm25 import BM25Okapi

from .graph import build_graph, related_document_ids
from .store import all_knowledge, parse_roles, query_dense

ROLE_RANK = {"staff": 1, "chef": 2, "manager": 3, "admin": 4}

_STOP = {
    "the", "a", "an", "and", "or", "for", "with", "of", "to", "in", "on", "at",
    "by", "is", "are", "was", "were", "be", "been", "being", "am", "do", "does",
    "did", "done", "doing", "this", "that", "these", "those", "it", "its", "i",
    "we", "you", "me", "my", "our", "your", "he", "she", "they", "them", "his",
    "her", "their", "there", "here", "what", "when", "where", "who", "whom",
    "why", "how", "which", "if", "then", "than", "so", "as", "not", "no", "yes",
    "can", "could", "should", "would", "will", "shall", "may", "might", "must",
    "have", "has", "had", "get", "got", "just", "about", "from", "into", "out",
    "up", "down", "over", "under", "again", "any", "some", "all", "one", "two",
}


_SYNONYMS = {
    "clean": {"wipe", "wash", "filter", "sanitize", "flush"},
    "fix": {"repair", "replace", "fault", "broken"},
    "repair": {"fix", "fault"},
    "fridge": {"cooler", "freezer", "walk-in"},
    "temp": {"temperature"},
    "oil": {"grease"},
    "fryer": {"vat", "kettle"},
    "freezer": {"walk-in"},
}


def _tokens(text: str) -> list[str]:
    return [t for t in re.findall(r"[a-z0-9]+", (text or "").lower()) if t not in _STOP and len(t) > 1]


def _synonym_set(tokens: list[str]) -> set[str]:
    out = set(tokens)
    for t in tokens:
        out |= _SYNONYMS.get(t, set())
    return out


def allowed(role: str, meta: dict) -> bool:
    if role == "admin":
        return True
    roles = parse_roles(meta)
    user_rank = ROLE_RANK.get(role, 1)
    return any(user_rank >= ROLE_RANK.get(r, 1) for r in roles) or role in roles


def hybrid_retrieve(query: str, role: str, k: int = 6, history: str = "") -> list[dict]:
    """Permission-filtered hybrid retrieval: dense + BM25 + graph, fused with RRF."""
    corpus = all_knowledge()
    documents = corpus.get("documents") or []
    metadatas = corpus.get("metadatas") or []
    ids = corpus.get("ids") or []
    if not documents:
        return []

    q_tokens = _tokens(query)
    q_set = _synonym_set(q_tokens)
    ctx_set = _synonym_set(_tokens(f"{history} {query}"))

    filtered = []
    for i, doc in enumerate(documents):
        meta = metadatas[i] or {}
        if not allowed(role, meta):
            continue
        filtered.append({"id": ids[i], "text": doc or "", "metadata": meta})
    if not filtered:
        return []

    # --- BM25 lexical relevance (only non-negative matches count) ---
    bm_norm: dict[str, float] = {}
    tokenized = [_tokens(d["text"]) for d in filtered]
    if q_set and any(tokenized):
        try:
            bm25 = BM25Okapi(tokenized)
            raw_bm = [max(0.0, float(s)) for s in bm25.get_scores(list(q_set))]
            top = max(raw_bm) if raw_bm else 0.0
            if top > 0:
                for d, s in zip(filtered, raw_bm):
                    bm_norm[d["id"]] = s / top
        except Exception:
            bm_norm = {}

    # --- dense semantic relevance ---
    dense_norm: dict[str, float] = {}
    dense = query_dense(query, n=min(24, len(documents)))
    if dense.get("ids") and dense["ids"][0]:
        raw_dense: dict[str, float] = {}
        for i, _id in enumerate(dense["ids"][0]):
            meta = dense["metadatas"][0][i] or {}
            if not allowed(role, meta):
                continue
            dist = dense["distances"][0][i] if dense.get("distances") else 1.0
            raw_dense[_id] = 1.0 / (1.0 + float(dist))
        if raw_dense:
            top = max(raw_dense.values()) or 1.0
            for _id, s in raw_dense.items():
                dense_norm[_id] = s / top

    bm_rank = _rank_map(bm_norm)
    dense_rank = _rank_map(dense_norm)
    graph = build_graph()
    related = related_document_ids(query, graph)

    scored = []
    for d in filtered:
        meta = d["metadata"] or {}
        d_tokens = set(_tokens(d["text"]))
        heading_tokens = set(_tokens(f"{meta.get('title', '')} {meta.get('code', '')} {meta.get('section', '')}"))
        overlap = len(q_set & d_tokens) / max(len(q_set), 1)
        heading_overlap = len(q_set & heading_tokens) / max(len(q_set), 1) if q_set else 0.0
        rrf = _rrf(bm_rank.get(d["id"])) + _rrf(dense_rank.get(d["id"]))
        doc_id = str(meta.get("document_id") or meta.get("code") or "")
        graph_boost = 0.08 if doc_id in related else 0.0
        score = (
            0.55 * rrf * 30
            + 0.25 * dense_norm.get(d["id"], 0.0)
            + 0.15 * bm_norm.get(d["id"], 0.0)
            + 0.12 * overlap
            + 0.10 * heading_overlap
            + graph_boost
        )
        if ctx_set:
            score += 0.04 * (len(ctx_set & d_tokens) / max(len(ctx_set), 1))
        scored.append({"id": d["id"], "text": d["text"], "metadata": meta, "score": score, "rrf": rrf})

    scored.sort(key=lambda x: x["score"], reverse=True)

    out: list[dict] = []
    seen: set[tuple] = set()
    for item in scored:
        if item["score"] <= 0.06:
            continue
        meta = item["metadata"] or {}
        key = (meta.get("document_id") or meta.get("code"), meta.get("section"))
        if key in seen:
            continue
        seen.add(key)
        item["score"] = round(float(item["score"]), 6)
        out.append(item)
        if len(out) >= k:
            break
    return out


def _rrf(rank: int | None, k: int = 60) -> float:
    if rank is None:
        return 0.0
    return 1.0 / (k + rank)


def _rank_map(scores: dict[str, float]) -> dict[str, int]:
    ordered = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
    return {doc_id: i + 1 for i, (doc_id, s) in enumerate(ordered) if s > 0}


def sources_from(items: list[dict]) -> list[dict]:
    out = []
    for item in items:
        meta = item.get("metadata") or {}
        out.append(
            {
                "document_id": meta.get("document_id"),
                "title": meta.get("title"),
                "code": meta.get("code"),
                "version": meta.get("version"),
                "section": meta.get("section"),
                "type": meta.get("doc_type"),
                "score": round(float(item.get("score", item.get("rrf", 0)) or 0), 4),
                "excerpt": item.get("text", "")[:420],
            }
        )
    return out
