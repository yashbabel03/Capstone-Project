async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
    ...init,
  });
  if (res.status === 401 && path !== "/api/auth/me" && path !== "/api/auth/login") {
    const refreshed = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
    if (refreshed.ok) {
      const retry = await fetch(path, { credentials: "include", headers: { "content-type": "application/json", ...(init.headers ?? {}) }, ...init });
      if (!retry.ok) throw await asError(retry);
      return retry.json();
    }
  }
  if (!res.ok) throw await asError(res);
  return res.json();
}

async function asError(res: Response) {
  try {
    const body = await res.json();
    return new Error(body.error || res.statusText);
  } catch {
    return new Error(res.statusText);
  }
}

export const api = {
  me: () => request<{ user: User }>("/api/auth/me"),
  login: (email: string, password: string) =>
    request<{ user: User }>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => request("/api/auth/logout", { method: "POST" }),
  documents: (q = "") => request<{ documents: Doc[] }>(`/api/documents${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  document: (id: string) => request<{ document: Doc }>(`/api/documents/${id}`),
  uploadDocument: (form: FormData) =>
    fetch("/api/documents", { method: "POST", body: form, credentials: "include" }).then(async (r) => {
      if (!r.ok) throw await asError(r);
      return r.json();
    }),
  query: (query: string, history: { role: string; content: string }[] = []) =>
    request<AssistantResponse>("/api/assistant/query", {
      method: "POST",
      body: JSON.stringify({ query, history }),
    }),
  incidents: () => request<{ incidents: Incident[] }>("/api/incidents"),
  incident: (id: string) => request<{ incident: Incident }>(`/api/incidents/${id}`),
  createIncident: (body: Partial<Incident>) =>
    request<{ incident: Incident }>("/api/incidents", { method: "POST", body: JSON.stringify(body) }),
  resolveIncident: (id: string, body: { cause: string; actionTaken: string; resolution: string }) =>
    request<{ incident: Incident }>(`/api/incidents/${id}/resolve`, { method: "POST", body: JSON.stringify(body) }),
  verifyIncident: (id: string) =>
    request<{ incident: Incident }>(`/api/incidents/${id}/verify`, { method: "POST" }),
  assignIncident: (id: string, assignedTo: string) =>
    request<{ incident: Incident }>(`/api/incidents/${id}/assign`, { method: "POST", body: JSON.stringify({ assignedTo }) }),
  analytics: () => request<Analytics>("/api/analytics/overview"),
  audit: () => request<{ logs: Audit[] }>("/api/analytics/audit"),
  users: () => request<{ users: User[] }>("/api/users"),
  directory: () => request<{ users: User[] }>("/api/users/directory"),
  createUser: (body: { name: string; email: string; password: string; role: Role; department: string }) =>
    request<{ user: User }>("/api/users", { method: "POST", body: JSON.stringify(body) }),
  sensors: () => request<{ sensors: Sensor[]; note: string }>("/api/iot/sensors"),
  simulate: (sensorId: string, value: number) =>
    request("/api/iot/simulate", { method: "POST", body: JSON.stringify({ sensorId, value }) }),
};

export type Role = "admin" | "manager" | "chef" | "staff";
export type User = { id: string; name: string; email: string; role: Role; department: string };
export type Doc = {
  _id: string;
  title: string;
  code: string;
  type: string;
  status: string;
  currentVersion: string;
  applicableRoles: string[];
  departments: string[];
  tags: string[];
  reviewDate?: string;
  versions: { version: string; originalName: string; chunkCount: number; createdAt: string }[];
};
export type Incident = {
  _id: string;
  title: string;
  description: string;
  equipment: string;
  department: string;
  severity: string;
  status: string;
  source: string;
  cause: string;
  actionTaken: string;
  resolution: string;
  createdAt: string;
  similarIncidentIds?: { _id: string; title: string; status: string; equipment: string }[];
  reportedBy?: { name: string };
  assignedTo?: { _id?: string; name: string };
};
export type AssistantResponse = {
  answer: string;
  confidence: number;
  escalate: boolean;
  extracted_context: Record<string, unknown>;
  sources: { title: string; code: string; version: string; section: string; excerpt: string; score: number }[];
  similar_incidents?: { incident_id: string; title: string; equipment: string; score: number; excerpt: string }[];
  disclaimer: string;
};
export type Analytics = {
  kpis: Record<string, number>;
  outdated: Doc[];
  recurring: { equipment: string; count: number }[];
  byStatus: Record<string, number>;
  knowledgeGaps: { query: string; confidence: number; escalate: boolean; at: string }[];
};
export type Audit = { _id: string; actorEmail: string; action: string; resource: string; createdAt: string; metadata: Record<string, unknown> };
export type Sensor = { sensorId: string; name: string; location: string; value: number; unit: string; minSafe: number; maxSafe: number; status: string };
