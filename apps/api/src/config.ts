import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, "../../../.env") });
dotenv.config();

export const config = {
  env: process.env.NODE_ENV ?? "development",
  port: Number(process.env.API_PORT ?? 4000),
  mongoUri: process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/restaurantops",
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
  accessSecret: process.env.JWT_ACCESS_SECRET ?? "dev-access",
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh",
  cookieSecure: process.env.COOKIE_SECURE === "true",
  aiUrl: process.env.AI_SERVICE_URL ?? "http://127.0.0.1:8002",
  internalAiKey: process.env.INTERNAL_AI_KEY ?? "dev-internal",
  uploadDir: resolveFromRoot(process.env.UPLOAD_DIR, "data/uploads"),
};

function resolveFromRoot(value: string | undefined, fallback: string) {
  const root = path.resolve(here, "../../..");
  if (!value) return path.join(root, fallback);
  return path.isAbsolute(value) ? value : path.resolve(root, value);
}

export const ROLES = ["admin", "manager", "chef", "staff"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_RANK: Record<Role, number> = {
  staff: 1,
  chef: 2,
  manager: 3,
  admin: 4,
};
