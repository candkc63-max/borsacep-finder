import { readFileSync } from "node:fs";
import { build } from "esbuild";

const entries = [
  ["src/server/http/healthHandler.ts", "api/health.mjs"],
  ["src/server/http/chartBarsHandler.ts", "api/chart-bars.mjs"],
  ["src/server/http/quotesHandler.ts", "api/bist-quotes.mjs"],
];

for (const [entry, outfile] of entries) {
  await build({
    entryPoints: [entry],
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node20",
    outfile,
    legalComments: "none",
  });
  const text = readFileSync(outfile, "utf8");
  if (/from\s+["']\.\.?[/]/.test(text) || /import\s*\(\s*["']\.\.?[/]/.test(text)) {
    throw new Error(`${outfile} hâlâ göreli import içeriyor`);
  }
}
