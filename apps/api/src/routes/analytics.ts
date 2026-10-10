import { Router } from "express";
import { KnowledgeDoc } from "../models/Document.js";
import { Incident } from "../models/Incident.js";
import { QueryLog } from "../models/QueryLog.js";
import { AuditLog } from "../models/AuditLog.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const analyticsRouter = Router();
analyticsRouter.use(requireAuth, requireRole("manager"));

analyticsRouter.get("/overview", async (_req, res, next) => {
  try {
    const now = new Date();
    const [outdated, incidents, lowConfidence, openIncidents, docs, queries] = await Promise.all([
      KnowledgeDoc.find({ reviewDate: { $ne: null, $lt: now }, status: "published" }).select(
        "title code reviewDate currentVersion",
      ),
      Incident.find().select("equipment status severity createdAt resolvedAt"),
      QueryLog.find({ $or: [{ confidence: { $lt: 0.45 } }, { escalate: true }] })
        .sort({ createdAt: -1 })
        .limit(50)
        .select("query confidence escalate createdAt role"),
      Incident.countDocuments({ status: { $in: ["open", "assigned", "in_progress"] } }),
      KnowledgeDoc.countDocuments({ status: "published" }),
      QueryLog.countDocuments(),
    ]);

    const byEquipment: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let resolutionMs: number[] = [];
    for (const i of incidents) {
      const eq = i.equipment || "unspecified";
      byEquipment[eq] = (byEquipment[eq] ?? 0) + 1;
      byStatus[i.status] = (byStatus[i.status] ?? 0) + 1;
      if (i.resolvedAt) resolutionMs.push(i.resolvedAt.getTime() - i.createdAt.getTime());
    }
    const recurring = Object.entries(byEquipment)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([equipment, count]) => ({ equipment, count }));

    const avgResolutionHours =
      resolutionMs.length === 0 ? 0 : resolutionMs.reduce((a, b) => a + b, 0) / resolutionMs.length / 36e5;

    const knowledgeGaps = lowConfidence.map((q) => ({
      query: q.query,
      confidence: q.confidence,
      escalate: q.escalate,
      at: q.createdAt,
      role: q.role,
    }));

    res.json({
      kpis: {
        publishedDocuments: docs,
        openIncidents,
        queries,
        avgResolutionHours: Number(avgResolutionHours.toFixed(2)),
        outdatedCount: outdated.length,
        gapCount: knowledgeGaps.length,
      },
      outdated,
      recurring,
      byStatus,
      knowledgeGaps,
    });
  } catch (e) {
    next(e);
  }
});

analyticsRouter.get("/audit", async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 100), 500);
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(limit);
    res.json({ logs });
  } catch (e) {
    next(e);
  }
});
