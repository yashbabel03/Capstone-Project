# RestaurantOps AI

Evidence-grounded operational intelligence for restaurant knowledge, incidents, and organizational memory.

Staff describe a situation in plain language. The system retrieves **authorized, current** procedures with citations, manages the incident through manager verification, and stores the outcome as organizational memory.

This is a decision-support system. It does not act autonomously and does not guarantee food safety.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite |
| API | Node.js, Express, MongoDB |
| AI / retrieval | Python, FastAPI, ChromaDB, hybrid BM25 + dense retrieval, RRF |
| Auth | HttpOnly JWT cookies, RBAC (Admin, Manager, Chef, Staff) |

## Quick start (development)

1. Install [Node.js 20+](https://nodejs.org/), [Python 3.11+](https://www.python.org/), and [MongoDB 7](https://www.mongodb.com/).
2. Copy environment file:

```bash
copy .env.example .env
```

3. Start MongoDB locally (or `docker compose up mongo -d`).
4. Install and seed:

```bash
npm install
python -m venv apps/ai/.venv
apps\ai\.venv\Scripts\pip install -r apps/ai/requirements.txt
npm run seed
```

5. Run all services:

```bash
npm run dev
```

- App: http://localhost:5173
- API: http://localhost:4000/health
- AI: http://localhost:8002/health

### Demo accounts (password `Demo@1234!`)

| Role | Email |
| --- | --- |
| Admin | wendy.h@example.net |
| Manager | walt.e@example.net |
| Chef | ivan.p@example.net |
| Staff | zoe.m@example.net |

Optional: set `OPENAI_API_KEY` in `.env` for LLM-written answers. Without it, the assistant still returns **extractive, cited** guidance from retrieved SOPs.

## Production-style Docker

```bash
copy .env.example .env
docker compose up --build
```

Open http://localhost:8080 then run seed against the API container:

```bash
docker compose exec api node dist/seed.js
```

## What is in scope

- Document upload, versioning, metadata, review dates, role permissions
- Ingestion: PDF/DOCX/text extraction, OCR fallback, classification, chunking, embeddings
- Hybrid retrieval with permission filtering inside the retriever
- Cited assistant answers with confidence and safe escalation
- Incident report → assign → resolve → manager verify
- Similar-incident retrieval (references, not diagnoses)
- Knowledge-gap detection, outdated documents, recurring failures
- Audit trail of searches, sources, and responses
- Simulated walk-in freezer temperature sensor

## Out of scope (synopsis)

Autonomous decisions, real IoT/POS integration, multi-outlet deployment, food-safety guarantees.
