import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/errors.js";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message, code: err.code });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Invalid request", code: "VALIDATION", details: err.flatten() });
  }
  if (typeof err === "object" && err && "code" in err && (err as { code?: number }).code === 11000) {
    return res.status(409).json({ error: "Already exists", code: "DUPLICATE" });
  }
  console.error(err);
  return res.status(500).json({ error: "Internal server error", code: "INTERNAL" });
}
