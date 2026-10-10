import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { connectDb } from "./db.js";
import { User } from "./models/User.js";
import { KnowledgeDoc } from "./models/Document.js";
import { Incident } from "./models/Incident.js";
import { Sensor } from "./models/Sensor.js";
import { ingestFile, indexIncident } from "./services/ai.js";
import { config } from "./config.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const seedDocs = path.resolve(here, "../seed/docs");

const USERS = [
  { name: "Asha Patel", email: "wendy.h@example.net", role: "admin" as const, department: "office" },
  { name: "Marcus Chen", email: "walt.e@example.net", role: "manager" as const, department: "kitchen" },
  { name: "Lila Romero", email: "ivan.p@example.net", role: "chef" as const, department: "kitchen" },
  { name: "Jordan Blake", email: "zoe.m@example.net", role: "staff" as const, department: "kitchen" },
];

const DOCS: {
  file: string;
  title: string;
  code: string;
  type: "sop" | "recipe" | "food_safety" | "allergen" | "equipment_manual";
  version: string;
  roles: string[];
  departments: string[];
  reviewDate: string;
  tags: string[];
}[] = [
  {
    file: "sop-freezer-temperature.txt",
    title: "Walk-in Freezer Temperature Excursion",
    code: "SOP-FS-014",
    type: "food_safety",
    version: "3.2",
    roles: ["staff", "chef", "manager", "admin"],
    departments: ["kitchen", "prep", "receiving"],
    reviewDate: "2026-12-01",
    tags: ["freezer", "temperature", "haccp"],
  },
  {
    file: "sop-allergen-cross-contact.txt",
    title: "Allergen Cross-Contact Control",
    code: "SOP-AL-006",
    type: "allergen",
    version: "4.0",
    roles: ["chef", "manager", "admin"],
    departments: ["kitchen", "expo"],
    reviewDate: "2026-10-15",
    tags: ["allergen", "guest-safety"],
  },
  {
    file: "sop-fryer-oil.txt",
    title: "Fryer Oil Quality and Change",
    code: "SOP-EQ-011",
    type: "equipment_manual",
    version: "2.1",
    roles: ["staff", "chef", "manager", "admin"],
    departments: ["kitchen"],
    reviewDate: "2026-11-02",
    tags: ["fryer", "oil"],
  },
  {
    file: "sop-closing-checklist.txt",
    title: "Closing Checklist — Kitchen and FOH",
    code: "SOP-OPS-002",
    type: "sop",
    version: "1.6",
    roles: ["staff", "chef", "manager", "admin"],
    departments: ["kitchen", "foh"],
    reviewDate: "2027-02-20",
    tags: ["close", "checklist"],
  },
  {
    file: "recipe-house-vinaigrette.txt",
    title: "House Red Wine Vinaigrette",
    code: "RCP-GAR-003",
    type: "recipe",
    version: "1.3",
    roles: ["chef", "manager", "admin"],
    departments: ["prep"],
    reviewDate: "2026-09-01",
    tags: ["recipe", "prep"],
  },
  {
    file: "manual-true-freezer.txt",
    title: "TRUE Freezer Operator Manual (excerpt)",
    code: "EQ-MAN-TRUE-T-49",
    type: "equipment_manual",
    version: "1.0",
    roles: ["staff", "chef", "manager", "admin"],
    departments: ["kitchen", "facilities"],
    reviewDate: "2026-06-01",
    tags: ["equipment", "freezer", "alarm"],
  },
];

async function main() {
  await connectDb();
  fs.mkdirSync(config.uploadDir, { recursive: true });
  const passwordHash = await bcrypt.hash("Demo@1234!", 12);

  const users = [];
  for (const u of USERS) {
    const user = await User.findOneAndUpdate(
      { email: u.email },
      { ...u, passwordHash, active: true },
      { upsert: true, new: true },
    );
    users.push(user);
  }
  const admin = users[0]!;
  const manager = users[1]!;
  const chef = users[2]!;
  const staff = users[3]!;

  for (const d of DOCS) {
    const src = path.join(seedDocs, d.file);
    const dest = path.join(config.uploadDir, d.file);
    fs.copyFileSync(src, dest);
    const doc = await KnowledgeDoc.findOneAndUpdate(
      { code: d.code },
      {
        title: d.title,
        code: d.code,
        type: d.type,
        status: "published",
        currentVersion: d.version,
        applicableRoles: d.roles,
        departments: d.departments,
        tags: d.tags,
        reviewDate: new Date(d.reviewDate),
        classification: d.type,
        createdBy: admin._id,
        versions: [
          {
            version: d.version,
            storageKey: dest,
            originalName: d.file,
            mimeType: "text/plain",
            checksum: "seed",
            extractedChars: fs.readFileSync(src, "utf8").length,
            chunkCount: 0,
            uploadedBy: admin._id,
            createdAt: new Date(),
          },
        ],
      },
      { upsert: true, new: true },
    );
    try {
      await ingestFile({
        documentId: doc.id,
        version: d.version,
        title: d.title,
        code: d.code,
        type: d.type,
        applicableRoles: d.roles,
        departments: d.departments,
        filePath: dest,
        mimeType: "text/plain",
      });
      console.log("ingested", d.code);
    } catch (err) {
      console.warn("ingest skipped for", d.code, err instanceof Error ? err.message : err);
    }
  }

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

  await Incident.deleteOne({ title: "Walk-in freezer door left ajar overnight" });
  const pastCreatedAt = new Date(Date.now() - 86400000 * 13);
  const past = await Incident.findOneAndUpdate(
    { title: "Walk-in freezer door left ajar overnight" },
    {
      title: "Walk-in freezer door left ajar overnight",
      description:
        "Opener found WALK-IN-FZ-01 at -9°C. Door gasket had a sheet pan blocking the close. Product on the door-side top shelf was assessed per SOP-FS-014.",
      equipment: "WALK-IN-FZ-01",
      department: "kitchen",
      severity: "high",
      status: "verified",
      source: "manual",
      reportedBy: staff._id,
      assignedTo: chef._id,
      verifiedBy: manager._id,
      cause: "Sheet pan prevented door latch. No mechanical fault.",
      actionTaken: "Door cleared, product probed, RTE on top shelf discarded, remainder marked EXC-HOLD.",
      resolution: "Retrained night porter on close SOP-OPS-002. Magnet sign added.",
      resolvedAt: new Date(Date.now() - 86400000 * 12),
      verifiedAt: new Date(Date.now() - 86400000 * 11),
    },
    { upsert: true, new: true },
  );
  await Incident.collection.updateOne({ _id: past._id }, { $set: { createdAt: pastCreatedAt } });
  past.createdAt = pastCreatedAt;

  try {
    await indexIncident({
      incidentId: past.id,
      title: past.title,
      description: past.description,
      cause: past.cause,
      actionTaken: past.actionTaken,
      resolution: past.resolution,
      equipment: past.equipment,
      status: past.status,
    });
  } catch (err) {
    console.warn("incident index skipped", err instanceof Error ? err.message : err);
  }

  console.log("Seed complete. Login with wendy.h@example.net / Demo@1234!");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
