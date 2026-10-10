import mongoose, { Schema } from "mongoose";

export interface SensorReading {
  sensorId: string;
  name: string;
  location: string;
  unit: string;
  value: number;
  minSafe: number;
  maxSafe: number;
  status: "ok" | "warn" | "alarm";
  updatedAt: Date;
}

const schema = new Schema<SensorReading>(
  {
    sensorId: { type: String, unique: true, required: true },
    name: String,
    location: String,
    unit: { type: String, default: "°C" },
    value: Number,
    minSafe: Number,
    maxSafe: Number,
    status: { type: String, enum: ["ok", "warn", "alarm"], default: "ok" },
  },
  { timestamps: true },
);

export const Sensor = mongoose.model("Sensor", schema);
