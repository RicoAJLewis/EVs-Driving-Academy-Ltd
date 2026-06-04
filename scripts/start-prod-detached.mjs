import { spawn } from "node:child_process";
import { mkdirSync, openSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = process.cwd();
const outDir = resolve(projectRoot, ".codex-runtime");

mkdirSync(outDir, { recursive: true });

const stdout = openSync(resolve(outDir, "evs-prod.out.log"), "a");
const stderr = openSync(resolve(outDir, "evs-prod.err.log"), "a");

const child = spawn(
  process.execPath,
  [resolve(projectRoot, "node_modules", "next", "dist", "bin", "next"), "start", "-p", "3001"],
  {
    cwd: projectRoot,
    detached: true,
    stdio: ["ignore", stdout, stderr]
  }
);

child.unref();

process.stdout.write(String(child.pid));
