import mongoose, { Schema } from "mongoose";

export const INCIDENT_STATUSES = [
  "open",
  "assigned",
  "in_progress",
  "resolved",
  "verified",
  "closed",
] as const;

export interface IncidentDoc {
  title: string;
  description: string;
  equipment: string;
  department: string;
  severity: "low" | "medium" | "high" | "critical";
  status: (typeof INCIDENT_STATUSES)[number];
  source: "manual" | "assistant" | "iot_sim";
  reportedBy: mongoose.Types.ObjectId;
  assignedTo: mongoose.Types.ObjectId | null;
  verifiedBy: mongoose.Types.ObjectId | null;
  cause: string;
  actionTaken: string;
  resolution: string;
  relatedDocumentIds: mongoose.Types.ObjectId[];
  similarIncidentIds: mongoose.Types.ObjectId[];
  sensorPayload: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  verifiedAt: Date | null;
}

const schema = new Schema<IncidentDoc>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    equipment: { type: String, default: "" },
    department: { type: String, default: "kitchen" },
    severity: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
    status: { type: String, enum: INCIDENT_STATUSES, default: "open" },
    source: { type: String, enum: ["manual", "assistant", "iot_sim"], default: "manual" },
    reportedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    cause: { type: String, default: "" },
    actionTaken: { type: String, default: "" },
    resolution: { type: String, default: "" },
    relatedDocumentIds: [{ type: Schema.Types.ObjectId, ref: "KnowledgeDocument" }],
    similarIncidentIds: [{ type: Schema.Types.ObjectId, ref: "Incident" }],
    sensorPayload: { type: Schema.Types.Mixed, default: null },
    resolvedAt: { type: Date, default: null },
    verifiedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

schema.index({ equipment: 1, createdAt: -1 });
schema.index({ status: 1, createdAt: -1 });

export const Incident = mongoose.model("Incident", schema);
