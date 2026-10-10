import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config, ROLE_RANK, type Role } from "../config.js";
import { ForbiddenError, UnauthorizedError } from "../utils/errors.js";
import { User } from "../models/User.js";

export interface AuthedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: Role;
    name: string;
    department: string;
  };
}

interface AccessPayload {
  sub: string;
  email: string;
  role: Role;
  typ: "access";
}

export function signAccess(user: { id: string; email: string; role: Role }) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, typ: "access" },
    config.accessSecret,
    { expiresIn: "20m" },
  );
}

export function signRefresh(user: { id: string }) {
  return jwt.sign({ sub: user.id, typ: "refresh" }, config.refreshSecret, { expiresIn: "7d" });
}

export function setAuthCookies(res: Response, access: string, refresh: string) {
  const base = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: config.cookieSecure,
  };
  res.cookie("accessToken", access, { ...base, maxAge: 20 * 60 * 1000, path: "/" });
  res.cookie("refreshToken", refresh, { ...base, maxAge: 7 * 24 * 60 * 60 * 1000, path: "/" });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie("accessToken", { path: "/" });
  res.clearCookie("refreshToken", { path: "/" });
}

export async function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.accessToken as string | undefined;
    if (!token) throw new UnauthorizedError();
    const payload = jwt.verify(token, config.accessSecret) as AccessPayload;
    if (payload.typ !== "access") throw new UnauthorizedError();
    const user = await User.findById(payload.sub);
    if (!user || !user.active) throw new UnauthorizedError("Account disabled");
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      department: user.department,
    };
    next();
  } catch (err) {
    next(err instanceof UnauthorizedError ? err : new UnauthorizedError("Invalid session"));
  }
}

export function requireRole(...roles: Role[]) {
  const min = Math.min(...roles.map((r) => ROLE_RANK[r]));
  return (req: AuthedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new UnauthorizedError());
    if (ROLE_RANK[req.user.role] < min) return next(new ForbiddenError());
    next();
  };
}
