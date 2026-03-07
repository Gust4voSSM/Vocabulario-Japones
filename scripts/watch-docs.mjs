import { watch } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

const rootDir = process.cwd();
const buildScript = path.join(rootDir, "scripts", "build-docs.mjs");
const watchDirs = ["data", "templates", "scripts", "assets"];

let timer = null;
let running = false;
let pending = false;

function runBuild() {
  if (running) {
    pending = true;
    return;
  }

  running = true;
  const child = spawn(process.execPath, [buildScript], {
    cwd: rootDir,
    stdio: "inherit"
  });

  child.on("exit", () => {
    running = false;
    if (pending) {
      pending = false;
      runBuild();
    }
  });
}

function queueBuild() {
  clearTimeout(timer);
  timer = setTimeout(runBuild, 120);
}

for (const dir of watchDirs) {
  const target = path.join(rootDir, dir);
  watch(target, { recursive: true }, () => {
    queueBuild();
  });
}

console.log("Watching data/, templates/, scripts/ e assets/ for changes...");
runBuild();
