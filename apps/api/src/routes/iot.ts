import { Router } from "express";
import { z } from "zod";
import { Sensor } from "../models/Sensor.js";
import { Incident } from "../models/Incident.js";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth.js";
import { writeAudit } from "../middleware/audit.js";

export const iotRouter = Router();
iotRouter.use(requireAuth);

iotRouter.get("/sensors", async (_req, res, next) => {
  try {
    const sensors = await Sensor.find().sort({ sensorId: 1 });
    res.json({ sensors, note: "Simulated sensors only. Not connected to physical hardware." });
  } catch (e) {
    next(e);
  }
});

iotRouter.post("/simulate", requireRole("manager"), async (req: AuthedRequest, res, next) => {
  try {
    const body = z
      .object({
        sensorId: z.string().default("WALK-IN-FZ-01"),
        value: z.number(),
      })
      .parse(req.body);
    const sensor = await Sensor.findOne({ sensorId: body.sensorId });
    if (!sensor) {
      return res.status(404).json({ error: "Unknown sensor" });
    }
    sensor.value = body.value;
    if (body.value > sensor.maxSafe + 3) sensor.status = "alarm";
    else if (body.value > sensor.maxSafe) sensor.status = "warn";
    else sensor.status = "ok";
    await sensor.save();

    let incident = null;
    if (sensor.status === "alarm") {
      incident = await Incident.create({
        title: `${sensor.name} temperature alarm`,
        description: `Simulated sensor ${sensor.sensorId} at ${sensor.location} read ${body.value}${sensor.unit}. Authorized band is ${sensor.minSafe} to ${sensor.maxSafe}${sensor.unit}. Follow SOP-FS-014. This is a simulated IoT event, not a live probe.`,
        equipment: sensor.sensorId,
        department: "kitchen",
        severity: body.value > sensor.maxSafe + 6 ? "critical" : "high",
        source: "iot_sim",
        reportedBy: req.user!.id,
        sensorPayload: { sensorId: sensor.sensorId, value: body.value, unit: sensor.unit },
      });
      await writeAudit(req, "iot.alarm", "sensor", { sensorId: sensor.sensorId, value: body.value });
    }

    res.json({ sensor, incident });
  } catch (e) {
    next(e);
  }
});
