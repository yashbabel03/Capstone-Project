import mongoose from "mongoose";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { seedDemoData } from "./services/seedUsers.js";

const here = path.dirname(fileURLToPath(import.meta.url));

export async function connectDb() {
  mongoose.set("strictQuery", true);
  mongoose.set("toJSON", {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret: Record<string, unknown>) => {
      ret.id = String(ret._id);
    },
  });

  try {
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 2000 });
    console.log(`[MongoDB] Connected to ${config.mongoUri}`);
  } catch (err) {
    console.warn(`[MongoDB] Could not connect to ${config.mongoUri} (${(err as Error).message}). Falling back to embedded MongoMemoryServer...`);
    try {
      const { MongoMemoryServer } = await import("mongodb-memory-server");
      const dbPath = path.resolve(here, "../../../data/mongodb");
      fs.mkdirSync(dbPath, { recursive: true });

      let mongod: InstanceType<typeof MongoMemoryServer>;
      try {
        mongod = await MongoMemoryServer.create({
          instance: {
            port: 27017,
            dbPath,
            storageEngine: "wiredTiger",
          },
        });
      } catch {
        mongod = await MongoMemoryServer.create({
          instance: {
            dbPath,
            storageEngine: "wiredTiger",
          },
        });
      }
      const uri = mongod.getUri() + "restaurantops";
      await mongoose.connect(uri);
      console.log(`[MongoDB] Connected to embedded Mongo at ${uri}`);
    } catch (fallbackErr) {
      console.error("[MongoDB] Failed to start embedded MongoMemoryServer:", fallbackErr);
      throw err;
    }
  }

  await seedDemoData();
}
