import { watch } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

const rootDir = process.cwd();
const buildScript = path.join(rootDir, "scripts", "build-docs.mjs");
const watchDirs = ["data", "templates", "scripts", "assets"];
const ignoredPaths = new Set([
  "data/embeds-manifest.json",
  "data/radical-svg-cache.json",
  "data/kanjivg-cache.json"
]);

let timer = null;
let running = false;
let pending = false;
let suppressEventsUntil = 0;

function runBuild() {
  if (running) {
    pending = true;
    return;
  }

  running = true;
  suppressEventsUntil = Date.now() + 800;
  const child = spawn(process.execPath, [buildScript], {
    cwd: rootDir,
    stdio: "inherit",
    env: {
      ...process.env,
      BUILD_DOCS_WATCH: "1",
      BUILD_DOCS_SKIP_DECKS: "1"
    }
  });

  child.on("exit", () => {
    running = false;
    suppressEventsUntil = Date.now() + 300;
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

function toRelativeNormalized(targetDir, filename) {
  return path
    .relative(rootDir, path.join(targetDir, filename))
    .split(path.sep)
    .join("/");
}

for (const dir of watchDirs) {
  const target = path.join(rootDir, dir);
  watch(target, { recursive: true }, (_eventType, filename) => {
    if (Date.now() < suppressEventsUntil) {
      return;
    }

    if (filename) {
      const relPath = toRelativeNormalized(target, filename.toString());
      if (ignoredPaths.has(relPath)) {
        return;
      }
    }
    queueBuild();
  });
}

console.log("Watching data/, templates/, scripts/ e assets/ for changes...");
runBuild();
