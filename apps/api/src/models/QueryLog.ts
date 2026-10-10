import mongoose, { Schema } from "mongoose";

export interface QueryLogDoc {
  userId: mongoose.Types.ObjectId;
  role: string;
  query: string;
  extractedContext: Record<string, unknown>;
  answer: string;
  confidence: number;
  escalate: boolean;
  sources: unknown[];
  createdAt: Date;
}

const schema = new Schema<QueryLogDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: String,
    query: String,
    extractedContext: { type: Schema.Types.Mixed, default: {} },
    answer: String,
    confidence: Number,
    escalate: Boolean,
    sources: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

schema.index({ createdAt: -1 });
schema.index({ confidence: 1 });

export const QueryLog = mongoose.model("QueryLog", schema);
