import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");
const budget = 500 * 1024;

const html = readFileSync(resolve(dist, "index.html"), "utf8");
const initialJs = Array.from(
  new Set(
    Array.from(html.matchAll(/(?:src|href)="([^"]+\.js)"/g)).map((match) => match[1]),
  ),
);

if (initialJs.length === 0) {
  console.error("No initial JavaScript found in dist/index.html");
  process.exit(1);
}

let total = 0;
for (const asset of initialJs) {
  const path = resolve(dist, `.${asset}`);
  statSync(path);
  const bytes = gzipSync(readFileSync(path)).length;
  total += bytes;
  console.log(`${asset}: ${(bytes / 1024).toFixed(2)} kB gzipped`);
}

const sw = resolve(dist, "sw.js");
statSync(sw);
console.log(`service worker: ${(statSync(sw).size / 1024).toFixed(2)} kB`);

console.log(`initial JavaScript: ${(total / 1024).toFixed(2)} kB gzipped (budget 500 kB)`);
if (total >= budget) {
  console.error("Initial JavaScript exceeds the 500 kB gzipped budget.");
  process.exit(1);
}
