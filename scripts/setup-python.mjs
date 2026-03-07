import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const rootDir = process.cwd();
const venvDir = path.join(rootDir, ".venv");
const venvPython = process.platform === "win32"
  ? path.join(venvDir, "Scripts", "python.exe")
  : path.join(venvDir, "bin", "python");

function run(cmd, args, message) {
  const result = spawnSync(cmd, args, { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(message);
  }
}

if (!existsSync(venvPython)) {
  const creator = process.platform === "win32" ? "py" : "python3";
  const createArgs = process.platform === "win32"
    ? ["-3", "-m", "venv", ".venv"]
    : ["-m", "venv", ".venv"];
  run(creator, createArgs, "Falha ao criar .venv");
}

run(venvPython, ["-m", "pip", "install", "--upgrade", "pip"], "Falha ao atualizar pip no .venv");
run(venvPython, ["-m", "pip", "install", "-r", "requirements.txt"], "Falha ao instalar requirements no .venv");

console.log("Python .venv pronto.");
