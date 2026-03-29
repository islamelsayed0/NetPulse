import fs from "node:fs";
import path from "node:path";

const server = path.join(process.cwd(), ".next", "server");
const need = [
  "middleware-manifest.json",
  "pages-manifest.json",
  "app-paths-manifest.json",
];
const miss = need.filter((f) => !fs.existsSync(path.join(server, f)));
if (miss.length) {
  console.error(
    `[NetPulse] Production build is incomplete (.next/server missing: ${miss.join(", ")}). Run: npm run clean && npm run build`
  );
  process.exit(1);
}
