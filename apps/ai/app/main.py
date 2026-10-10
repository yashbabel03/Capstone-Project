from __future__ import annotations

import json
import tempfile
from pathlib import Path

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from pydantic import BaseModel, Field

from .chunking import chunk_text
from .config import settings
from .context import extract_context
from .extract import classify_document, extract_text
from .generate import confidence_from, extractive_answer, llm_answer, should_escalate
from .retrieve import hybrid_retrieve, sources_from
from .store import delete_document, query_incidents, upsert_chunks, upsert_incident

app = FastAPI(title="RestaurantOps AI Retrieval Service", version="1.0.0")


def require_internal(x_internal_key: str = Header(default="")):
    if x_internal_key != settings.internal_ai_key:
        raise HTTPException(status_code=401, detail="Invalid internal key")


@app.get("/health")
def health():
    return {"ok": True, "service": "restaurantops-ai"}


@app.post("/ingest", dependencies=[Depends(require_internal)])
async def ingest(
    document_id: str = Form(...),
    version: str = Form(...),
    title: str = Form(...),
    code: str = Form(...),
    doc_type: str = Form("sop"),
    applicable_roles: str = Form("[]"),
    departments: str = Form("[]"),
    mime_type: str = Form(""),
    file: UploadFile = File(...),
):
    suffix = Path(file.filename or "upload.txt").suffix
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name
    text = extract_text(tmp_path, mime_type)
    Path(tmp_path).unlink(missing_ok=True)
    if not text.strip():
        raise HTTPException(status_code=422, detail="No text could be extracted")
    classification = classify_document(text, doc_type)
    roles = json.loads(applicable_roles) if applicable_roles else []
    depts = json.loads(departments) if departments else []
    pieces = chunk_text(text)
    records = []
    for piece in pieces:
        records.append(
            {
                "id": f"{document_id}:{version}:{piece['index']}",
                "text": piece["text"],
                "metadata": {
                    "document_id": document_id,
                    "version": version,
                    "title": title,
                    "code": code,
                    "doc_type": classification,
                    "section": piece["section"][:180],
                    "applicable_roles": json.dumps(roles),
                    "departments": json.dumps(depts),
                },
            }
        )
    delete_document(document_id)
    count = upsert_chunks(records)
    return {
        "ok": True,
        "classification": classification,
        "extracted_chars": len(text),
        "chunk_count": count,
    }


class Message(BaseModel):
    role: str = "user"
    content: str = ""


class QueryBody(BaseModel):
    query: str = Field(min_length=3)
    role: str = "staff"
    department: str = "kitchen"
    userId: str = ""
    history: list[Message] = Field(default_factory=list)


@app.post("/query", dependencies=[Depends(require_internal)])
def query(body: QueryBody):
    ctx = extract_context(body.query)
    history_text = "\n".join(f"{m.role}: {m.content}" for m in body.history[-6:] if m.content)
    enriched = body.query
    if ctx["equipment"] or ctx["readings"]:
        enriched = f"{body.query}\nContext:{json.dumps(ctx)}"
    items = hybrid_retrieve(enriched, body.role, k=6, history=history_text)
    conf = confidence_from(items)
    escalate = should_escalate(conf, items, body.query)
    answer = llm_answer(body.query, items, ctx, escalate, history_text) or extractive_answer(
        body.query, items, escalate
    )
    similar = query_incidents(body.query)
    return {
        "answer": answer,
        "confidence": conf,
        "escalate": escalate,
        "extracted_context": ctx,
        "sources": sources_from(items),
        "similar_incidents": similar,
        "disclaimer": "Decision support only. Not a food-safety guarantee. Similar incidents are references, not diagnoses.",
    }


class SimilarBody(BaseModel):
    description: str
    role: str = "staff"
    excludeId: str | None = None


@app.post("/similar-incidents", dependencies=[Depends(require_internal)])
def similar(body: SimilarBody):
    matches = [m for m in query_incidents(body.description) if m["incident_id"] != body.excludeId]
    return {"matches": matches, "note": "References only — not confirmed diagnoses."}


class IncidentBody(BaseModel):
    incidentId: str
    title: str = ""
    description: str = ""
    cause: str = ""
    actionTaken: str = ""
    resolution: str = ""
    equipment: str = ""
    status: str = ""


@app.post("/index-incident", dependencies=[Depends(require_internal)])
def index_incident(body: IncidentBody):
    upsert_incident(body.model_dump())
    return {"ok": True}
