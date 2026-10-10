import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { queryKnowledge } from "../services/ai.js";
import { QueryLog } from "../models/QueryLog.js";
import { writeAudit } from "../middleware/audit.js";

export const assistantRouter = Router();
assistantRouter.use(requireAuth);

assistantRouter.post("/query", async (req: AuthedRequest, res, next) => {
  try {
    const body = z
      .object({
        query: z.string().min(3).max(2000),
        history: z
          .array(z.object({ role: z.string(), content: z.string().max(4000) }))
          .max(20)
          .optional(),
      })
      .parse(req.body);
    const result = (await queryKnowledge({
      query: body.query,
      role: req.user!.role,
      department: req.user!.department,
      userId: req.user!.id,
      history: body.history ?? [],
    })) as {
      answer: string;
      confidence: number;
      escalate: boolean;
      sources: unknown[];
      extracted_context: Record<string, unknown>;
    };

    await QueryLog.create({
      userId: req.user!.id,
      role: req.user!.role,
      query: body.query,
      extractedContext: result.extracted_context ?? {},
      answer: result.answer,
      confidence: result.confidence,
      escalate: result.escalate,
      sources: result.sources ?? [],
    });
    await writeAudit(req, "assistant.query", "assistant", {
      query: body.query,
      confidence: result.confidence,
      escalate: result.escalate,
      sourceCount: Array.isArray(result.sources) ? result.sources.length : 0,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
});
