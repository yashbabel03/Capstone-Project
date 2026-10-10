from __future__ import annotations

import json
from typing import Any

import chromadb
from chromadb.utils import embedding_functions

from .config import settings

_client = chromadb.PersistentClient(path=settings.chroma_path)
_embed = embedding_functions.DefaultEmbeddingFunction()

docs_col = _client.get_or_create_collection("knowledge_chunks", embedding_function=_embed)
inc_col = _client.get_or_create_collection("incident_memory", embedding_function=_embed)


def upsert_chunks(chunks: list[dict[str, Any]]) -> int:
    if not chunks:
        return 0
    docs_col.upsert(
        ids=[c["id"] for c in chunks],
        documents=[c["text"] for c in chunks],
        metadatas=[c["metadata"] for c in chunks],
    )
    return len(chunks)


def delete_document(document_id: str) -> None:
    try:
        docs_col.delete(where={"document_id": document_id})
    except Exception:
        pass


def all_knowledge() -> dict:
    if docs_col.count() == 0:
        return {"ids": [], "documents": [], "metadatas": []}
    return docs_col.get(include=["documents", "metadatas"])


def query_dense(query: str, n: int = 12) -> dict:
    if docs_col.count() == 0:
        return {"ids": [[]], "documents": [[]], "metadatas": [[]], "distances": [[]]}
    return docs_col.query(query_texts=[query], n_results=min(n, docs_col.count()), include=["documents", "metadatas", "distances"])


def upsert_incident(item: dict[str, Any]) -> None:
    text = " ".join(
        [
            item.get("title", ""),
            item.get("description", ""),
            item.get("cause", ""),
            item.get("actionTaken", ""),
            item.get("resolution", ""),
            item.get("equipment", ""),
        ]
    )
    inc_col.upsert(
        ids=[item["incidentId"]],
        documents=[text],
        metadatas=[
            {
                "incident_id": item["incidentId"],
                "title": item.get("title", "")[:200],
                "equipment": item.get("equipment", ""),
                "status": item.get("status", ""),
            }
        ],
    )


def query_incidents(query: str, n: int = 5) -> list[dict[str, Any]]:
    if inc_col.count() == 0:
        return []
    res = inc_col.query(query_texts=[query], n_results=min(n, inc_col.count()), include=["metadatas", "distances", "documents"])
    out = []
    for i, _id in enumerate(res["ids"][0]):
        meta = res["metadatas"][0][i] or {}
        dist = res["distances"][0][i] if res.get("distances") else 1
        out.append(
            {
                "incident_id": meta.get("incident_id", _id),
                "title": meta.get("title", ""),
                "equipment": meta.get("equipment", ""),
                "score": round(1 / (1 + float(dist)), 4),
                "excerpt": (res["documents"][0][i] or "")[:280],
            }
        )
    return out


def parse_roles(meta: dict) -> list[str]:
    raw = meta.get("applicable_roles", "[]")
    if isinstance(raw, list):
        return raw
    try:
        return json.loads(raw)
    except Exception:
        return ["staff", "chef", "manager", "admin"]
