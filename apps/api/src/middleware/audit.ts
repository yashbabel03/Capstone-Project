import { AuditLog } from "../models/AuditLog.js";
import type { AuthedRequest } from "./auth.js";

export async function writeAudit(
  req: AuthedRequest,
  action: string,
  resource: string,
  metadata: Record<string, unknown> = {},
) {
  await AuditLog.create({
    actorId: req.user?.id ?? null,
    actorEmail: req.user?.email ?? "",
    action,
    resource,
    metadata,
  });
}
