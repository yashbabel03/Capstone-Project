import mongoose, { Schema } from "mongoose";

export interface AuditDoc {
  actorId: mongoose.Types.ObjectId | null;
  actorEmail: string;
  action: string;
  resource: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

const schema = new Schema<AuditDoc>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    actorEmail: { type: String, default: "" },
    action: { type: String, required: true },
    resource: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

schema.index({ createdAt: -1 });
schema.index({ action: 1, createdAt: -1 });

export const AuditLog = mongoose.model("AuditLog", schema);
