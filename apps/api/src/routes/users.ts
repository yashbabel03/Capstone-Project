import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { User } from "../models/User.js";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth.js";
import { ROLES } from "../config.js";
import { writeAudit } from "../middleware/audit.js";

export const usersRouter = Router();
usersRouter.use(requireAuth);

usersRouter.get("/directory", requireRole("manager"), async (_req, res, next) => {
  try {
    const users = await User.find({ active: true }).select("name email role department").sort({ name: 1 });
    res.json({ users });
  } catch (e) {
    next(e);
  }
});

usersRouter.use(requireRole("admin"));

usersRouter.get("/", async (_req, res, next) => {
  try {
    const users = await User.find().select("-passwordHash").sort({ name: 1 });
    res.json({ users });
  } catch (e) {
    next(e);
  }
});

usersRouter.post("/", async (req: AuthedRequest, res, next) => {
  try {
    const body = z
      .object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(8),
        role: z.enum(ROLES),
        department: z.string().default("kitchen"),
      })
      .parse(req.body);
    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await User.create({ ...body, email: body.email.toLowerCase(), passwordHash });
    await writeAudit(req, "user.create", "user", { email: user.email, role: user.role });
    res.status(201).json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) {
    next(e);
  }
});
