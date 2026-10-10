import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { User } from "../models/User.js";
import { config } from "../config.js";
import {
  clearAuthCookies,
  requireAuth,
  setAuthCookies,
  signAccess,
  signRefresh,
  type AuthedRequest,
} from "../middleware/auth.js";
import { UnauthorizedError } from "../utils/errors.js";
import { writeAudit } from "../middleware/audit.js";

export const authRouter = Router();

authRouter.post("/login", async (req, res, next) => {
  try {
    const body = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
    const user = await User.findOne({ email: body.email.toLowerCase() });
    if (!user || !user.active) throw new UnauthorizedError("Invalid credentials");
    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) throw new UnauthorizedError("Invalid credentials");
    const access = signAccess({ id: user.id, email: user.email, role: user.role });
    const refresh = signRefresh({ id: user.id });
    setAuthCookies(res, access, refresh);
    await writeAudit({ user: { id: user.id, email: user.email } } as AuthedRequest, "auth.login", "user", {
      role: user.role,
    });
    res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department },
    });
  } catch (e) {
    next(e);
  }
});

authRouter.post("/refresh", async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken as string | undefined;
    if (!token) throw new UnauthorizedError();
    const payload = jwt.verify(token, config.refreshSecret) as { sub: string; typ: string };
    if (payload.typ !== "refresh") throw new UnauthorizedError();
    const user = await User.findById(payload.sub);
    if (!user || !user.active) throw new UnauthorizedError();
    const access = signAccess({ id: user.id, email: user.email, role: user.role });
    const refresh = signRefresh({ id: user.id });
    setAuthCookies(res, access, refresh);
    res.json({ ok: true });
  } catch (e) {
    next(new UnauthorizedError("Session expired"));
  }
});

authRouter.post("/logout", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    clearAuthCookies(res);
    await writeAudit(req, "auth.logout", "user");
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  res.json({ user: req.user });
});
