/**
 * Pre-package step: copy built Control UI assets into the extension directory
 * so they can be bundled into the .vsix.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, "../../../dist/control-ui");
const dst = path.resolve(here, "../control-ui");

if (!fs.existsSync(path.join(src, "index.html"))) {
  console.error("Error: Control UI not built. Run `pnpm ui:build` first.");
  process.exit(1);
}

fs.cpSync(src, dst, { recursive: true });
console.log(`Copied Control UI assets: ${src} -> ${dst}`);
