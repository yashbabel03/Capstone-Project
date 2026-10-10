import { Router } from "express";
import { z } from "zod";
import { Incident } from "../models/Incident.js";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth.js";
import { NotFoundError } from "../utils/errors.js";
import { indexIncident, similarIncidents } from "../services/ai.js";
import { writeAudit } from "../middleware/audit.js";

export const incidentsRouter = Router();
incidentsRouter.use(requireAuth);

incidentsRouter.get("/", async (_req, res, next) => {
  try {
    const incidents = await Incident.find()
      .populate("reportedBy", "name role")
      .populate("assignedTo", "name role")
      .sort({ createdAt: -1 })
      .limit(200);
    res.json({ incidents });
  } catch (e) {
    next(e);
  }
});

incidentsRouter.get("/:id", async (req, res, next) => {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate("reportedBy", "name role email")
      .populate("assignedTo", "name role")
      .populate("verifiedBy", "name role")
      .populate("relatedDocumentIds", "title code currentVersion")
      .populate("similarIncidentIds", "title status equipment severity");
    if (!incident) throw new NotFoundError();
    res.json({ incident });
  } catch (e) {
    next(e);
  }
});

incidentsRouter.post("/", async (req: AuthedRequest, res, next) => {
  try {
    const body = z
      .object({
        title: z.string().min(1),
        description: z.string().min(1),
        equipment: z.string().default(""),
        department: z.string().default("kitchen"),
        severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
        source: z.enum(["manual", "assistant", "iot_sim"]).default("manual"),
        relatedDocumentIds: z.array(z.string()).optional(),
      })
      .parse(req.body);

    const incident = await Incident.create({
      ...body,
      reportedBy: req.user!.id,
    });

    try {
      const similar = (await similarIncidents({
        description: `${body.title}. ${body.description}`,
        role: req.user!.role,
        excludeId: incident.id,
      })) as { matches?: { incident_id: string }[] };
      const ids = (similar.matches ?? []).map((m) => m.incident_id).filter(Boolean);
      if (ids.length) {
        incident.similarIncidentIds = ids as unknown as typeof incident.similarIncidentIds;
        await incident.save();
      }
    } catch {
      /* similar search is best-effort */
    }

    await writeAudit(req, "incident.create", "incident", { id: incident.id, severity: incident.severity });
    res.status(201).json({ incident });
  } catch (e) {
    next(e);
  }
});

incidentsRouter.post("/:id/assign", requireRole("manager"), async (req: AuthedRequest, res, next) => {
  try {
    const body = z.object({ assignedTo: z.string() }).parse(req.body);
    const incident = await Incident.findById(req.params.id);
    if (!incident) throw new NotFoundError();
    incident.assignedTo = body.assignedTo as unknown as typeof incident.assignedTo;
    incident.status = "assigned";
    await incident.save();
    await writeAudit(req, "incident.assign", "incident", { id: incident.id });
    res.json({ incident });
  } catch (e) {
    next(e);
  }
});

incidentsRouter.post("/:id/progress", async (req: AuthedRequest, res, next) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) throw new NotFoundError();
    incident.status = "in_progress";
    await incident.save();
    res.json({ incident });
  } catch (e) {
    next(e);
  }
});

incidentsRouter.post("/:id/resolve", async (req: AuthedRequest, res, next) => {
  try {
    const body = z
      .object({
        cause: z.string().min(1),
        actionTaken: z.string().min(1),
        resolution: z.string().min(1),
      })
      .parse(req.body);
    const incident = await Incident.findById(req.params.id);
    if (!incident) throw new NotFoundError();
    Object.assign(incident, body);
    incident.status = "resolved";
    incident.resolvedAt = new Date();
    await incident.save();
    await writeAudit(req, "incident.resolve", "incident", { id: incident.id });
    res.json({ incident });
  } catch (e) {
    next(e);
  }
});

incidentsRouter.post("/:id/verify", requireRole("manager"), async (req: AuthedRequest, res, next) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) throw new NotFoundError();
    incident.status = "verified";
    incident.verifiedBy = req.user!.id as unknown as typeof incident.verifiedBy;
    incident.verifiedAt = new Date();
    await incident.save();
    try {
      await indexIncident({
        incidentId: incident.id,
        title: incident.title,
        description: incident.description,
        cause: incident.cause,
        actionTaken: incident.actionTaken,
        resolution: incident.resolution,
        equipment: incident.equipment,
        status: incident.status,
      });
    } catch {
      /* index is best-effort */
    }
    await writeAudit(req, "incident.verify", "incident", { id: incident.id });
    res.json({ incident });
  } catch (e) {
    next(e);
  }
});
