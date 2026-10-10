import mongoose, { Schema } from "mongoose";

export const DOC_TYPES = [
  "sop",
  "recipe",
  "food_safety",
  "allergen",
  "equipment_manual",
  "training",
  "incident_archive",
] as const;

export type DocType = (typeof DOC_TYPES)[number];

export interface DocumentVersion {
  version: string;
  storageKey: string;
  originalName: string;
  mimeType: string;
  checksum: string;
  extractedChars: number;
  chunkCount: number;
  uploadedBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

export interface KnowledgeDocument {
  title: string;
  code: string;
  type: DocType;
  status: "draft" | "published" | "archived";
  currentVersion: string;
  applicableRoles: string[];
  departments: string[];
  tags: string[];
  reviewDate: Date | null;
  classification: string;
  versions: DocumentVersion[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const versionSchema = new Schema<DocumentVersion>(
  {
    version: String,
    storageKey: String,
    originalName: String,
    mimeType: String,
    checksum: String,
    extractedChars: Number,
    chunkCount: Number,
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const schema = new Schema<KnowledgeDocument>(
  {
    title: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    status: { type: String, enum: ["draft", "published", "archived"], default: "published" },
    currentVersion: { type: String, required: true },
    applicableRoles: { type: [String], default: ["staff", "chef", "manager", "admin"] },
    departments: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    reviewDate: { type: Date, default: null },
    classification: { type: String, default: "sop" },
    versions: { type: [versionSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

schema.index({ title: "text", code: "text", tags: "text" });
schema.index({ reviewDate: 1, status: 1 });

export const KnowledgeDoc = mongoose.model("KnowledgeDocument", schema);
