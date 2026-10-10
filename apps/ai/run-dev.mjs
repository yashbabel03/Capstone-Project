import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const win = process.platform === "win32";
const venv = win
  ? path.join(dir, ".venv", "Scripts", "python.exe")
  : path.join(dir, ".venv", "bin", "python");
const py = existsSync(venv) ? venv : "python";

const child = spawn(
  py,
  ["-m", "uvicorn", "app.main:app", "--reload", "--host", "127.0.0.1", "--port", "8002"],
  { cwd: dir, stdio: "inherit", windowsHide: true },
);
child.on("exit", (code) => process.exit(code ?? 1));
