import fs from "node:fs/promises";
import { config } from "../config.js";
import { AppError } from "../utils/errors.js";

async function aiFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${config.aiUrl}${path}`, {
    ...init,
    headers: {
      "x-internal-key": config.internalAiKey,
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new AppError(502, `AI service error (${res.status}): ${body.slice(0, 400)}`, "AI_DOWN");
  }
  return res.json();
}

export async function ingestFile(input: {
  documentId: string;
  version: string;
  title: string;
  code: string;
  type: string;
  applicableRoles: string[];
  departments: string[];
  filePath: string;
  mimeType: string;
}) {
  const buf = await fs.readFile(input.filePath);
  const form = new FormData();
  form.set("document_id", input.documentId);
  form.set("version", input.version);
  form.set("title", input.title);
  form.set("code", input.code);
  form.set("doc_type", input.type);
  form.set("applicable_roles", JSON.stringify(input.applicableRoles));
  form.set("departments", JSON.stringify(input.departments));
  form.set("mime_type", input.mimeType);
  form.set("file", new Blob([buf]), input.filePath.split(/[/\\]/).pop() ?? "upload.bin");
  return aiFetch("/ingest", { method: "POST", body: form });
}

export async function queryKnowledge(input: {
  query: string;
  role: string;
  department: string;
  userId: string;
  history?: { role: string; content: string }[];
}) {
  return aiFetch("/query", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function similarIncidents(input: {
  description: string;
  role: string;
  excludeId?: string;
}) {
  return aiFetch("/similar-incidents", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function indexIncident(input: {
  incidentId: string;
  title: string;
  description: string;
  cause: string;
  actionTaken: string;
  resolution: string;
  equipment: string;
  status: string;
}) {
  return aiFetch("/index-incident", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function aiHealth() {
  try {
    const res = await fetch(`${config.aiUrl}/health`);
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}
