import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { Sensor } from "../models/Sensor.js";

const USERS = [
  { name: "Asha Patel", email: "wendy.h@example.net", role: "admin" as const, department: "office" },
  { name: "Marcus Chen", email: "walt.e@example.net", role: "manager" as const, department: "kitchen" },
  { name: "Lila Romero", email: "ivan.p@example.net", role: "chef" as const, department: "kitchen" },
  { name: "Jordan Blake", email: "zoe.m@example.net", role: "staff" as const, department: "kitchen" },
];

export async function seedDemoData() {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log("[Seed] No users found. Seeding demo accounts...");
      const passwordHash = await bcrypt.hash("Demo@1234!", 10);
      for (const u of USERS) {
        await User.findOneAndUpdate(
          { email: u.email },
          { ...u, passwordHash, active: true },
          { upsert: true, new: true },
        );
      }
      console.log("[Seed] Demo accounts created successfully (password: Demo@1234!).");
    }

    const sensorCount = await Sensor.countDocuments();
    if (sensorCount === 0) {
      await Sensor.findOneAndUpdate(
        { sensorId: "WALK-IN-FZ-01" },
        {
          sensorId: "WALK-IN-FZ-01",
          name: "Walk-in freezer",
          location: "Kitchen rear, left of prep",
          unit: "°C",
          value: -20,
          minSafe: -24,
          maxSafe: -18,
          status: "ok",
        },
        { upsert: true },
      );
      await Sensor.findOneAndUpdate(
        { sensorId: "WALK-IN-CL-01" },
        {
          sensorId: "WALK-IN-CL-01",
          name: "Walk-in cooler",
          location: "Kitchen rear, right of prep",
          unit: "°C",
          value: 2.4,
          minSafe: 0,
          maxSafe: 4,
          status: "ok",
        },
        { upsert: true },
      );
    }
  } catch (err) {
    console.warn("[Seed] Demo seeding check failed:", err);
  }
}
