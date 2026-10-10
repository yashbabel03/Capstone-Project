import mongoose, { Schema } from "mongoose";
import type { Role } from "../config.js";

export interface UserDoc {
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  department: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<UserDoc>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: ["admin", "manager", "chef", "staff"] },
    department: { type: String, default: "kitchen" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const User = mongoose.model("User", schema);
