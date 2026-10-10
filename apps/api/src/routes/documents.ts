import { Router } from "express";
import multer from "multer";
import crypto from "node:crypto";
import fs from "node:fs";
import { z } from "zod";
import { KnowledgeDoc, DOC_TYPES } from "../models/Document.js";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth.js";
import { config, ROLE_RANK, type Role } from "../config.js";
import type mongoose from "mongoose";
import { ForbiddenError, NotFoundError } from "../utils/errors.js";
import { ingestFile } from "../services/ai.js";
import { writeAudit } from "../middleware/audit.js";

fs.mkdirSync(config.uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, config.uploadDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`),
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
});

export const documentsRouter = Router();
documentsRouter.use(requireAuth);

function visible(doc: { applicableRoles: string[] }, role: Role) {
  if (role === "admin") return true;
  return doc.applicableRoles.includes(role) || doc.applicableRoles.some((r) => ROLE_RANK[r as Role] <= ROLE_RANK[role]);
}

documentsRouter.get("/", async (req: AuthedRequest, res, next) => {
  try {
    const q = String(req.query.q ?? "");
    const type = String(req.query.type ?? "");
    const filter: Record<string, unknown> = { status: { $ne: "archived" } };
    if (type) filter.type = type;
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ title: rx }, { code: rx }, { tags: rx }, { classification: rx }];
    }
    const docs = await KnowledgeDoc.find(filter).sort({ updatedAt: -1 });
    res.json({ documents: docs.filter((d) => visible(d, req.user!.role)) });
  } catch (e) {
    next(e);
  }
});

documentsRouter.get("/:id", async (req: AuthedRequest, res, next) => {
  try {
    const doc = await KnowledgeDoc.findById(req.params.id);
    if (!doc) throw new NotFoundError("Document not found");
    if (!visible(doc, req.user!.role)) throw new ForbiddenError();
    res.json({ document: doc });
  } catch (e) {
    next(e);
  }
});

documentsRouter.post(
  "/",
  requireRole("manager"),
  upload.single("file"),
  async (req: AuthedRequest, res, next) => {
    try {
      if (!req.file) throw new Error("File is required");
      const body = z
        .object({
          title: z.string().min(1),
          code: z.string().min(1),
          type: z.enum(DOC_TYPES),
          version: z.string().default("1.0"),
          applicableRoles: z.string().optional(),
          departments: z.string().optional(),
          tags: z.string().optional(),
          reviewDate: z.string().optional(),
        })
        .parse(req.body);

      const applicableRoles = body.applicableRoles
        ? JSON.parse(body.applicableRoles)
        : ["staff", "chef", "manager", "admin"];
      const departments = body.departments ? JSON.parse(body.departments) : [];
      const tags = body.tags ? JSON.parse(body.tags) : [];
      const checksum = crypto.createHash("sha256").update(fs.readFileSync(req.file.path)).digest("hex");

      let doc = await KnowledgeDoc.findOne({ code: body.code });
      if (doc) {
        doc.currentVersion = body.version;
        doc.title = body.title;
        doc.type = body.type;
        doc.applicableRoles = applicableRoles;
        doc.departments = departments;
        doc.tags = tags;
        if (body.reviewDate) doc.reviewDate = new Date(body.reviewDate);
        doc.versions.push({
          version: body.version,
          storageKey: req.file.path,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          checksum,
          extractedChars: 0,
          chunkCount: 0,
          uploadedBy: req.user!.id as unknown as mongoose.Types.ObjectId,
          createdAt: new Date(),
        });
        await doc.save();
      } else {
        doc = await KnowledgeDoc.create({
          title: body.title,
          code: body.code,
          type: body.type,
          status: "published",
          currentVersion: body.version,
          applicableRoles,
          departments,
          tags,
          reviewDate: body.reviewDate ? new Date(body.reviewDate) : null,
          classification: body.type,
          createdBy: req.user!.id,
          versions: [
            {
              version: body.version,
              storageKey: req.file.path,
              originalName: req.file.originalname,
              mimeType: req.file.mimetype,
              checksum,
              extractedChars: 0,
              chunkCount: 0,
              uploadedBy: req.user!.id,
              createdAt: new Date(),
            },
          ],
        });
      }

      let ingestMeta: Record<string, unknown> = {};
      try {
        ingestMeta = (await ingestFile({
          documentId: doc.id,
          version: body.version,
          title: body.title,
          code: body.code,
          type: body.type,
          applicableRoles,
          departments,
          filePath: req.file.path,
          mimeType: req.file.mimetype,
        })) as Record<string, unknown>;
        const last = doc.versions[doc.versions.length - 1];
        last.extractedChars = Number(ingestMeta.extracted_chars ?? 0);
        last.chunkCount = Number(ingestMeta.chunk_count ?? 0);
        if (ingestMeta.classification) doc.classification = String(ingestMeta.classification);
        await doc.save();
      } catch (err) {
        ingestMeta = { warning: err instanceof Error ? err.message : "ingest failed" };
      }

      await writeAudit(req, "document.upload", "document", { code: doc.code, version: body.version });
      res.status(201).json({ document: doc, ingest: ingestMeta });
    } catch (e) {
      next(e);
    }
  },
);

documentsRouter.patch("/:id", requireRole("manager"), async (req: AuthedRequest, res, next) => {
  try {
    const doc = await KnowledgeDoc.findById(req.params.id);
    if (!doc) throw new NotFoundError();
    const body = z
      .object({
        status: z.enum(["draft", "published", "archived"]).optional(),
        reviewDate: z.string().nullable().optional(),
        applicableRoles: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
      })
      .parse(req.body);
    Object.assign(doc, body);
    if (body.reviewDate !== undefined) doc.reviewDate = body.reviewDate ? new Date(body.reviewDate) : null;
    await doc.save();
    await writeAudit(req, "document.update", "document", { id: doc.id, ...body });
    res.json({ document: doc });
  } catch (e) {
    next(e);
  }
});
