import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { spawn } from "child_process";
import { existsSync } from "fs";
import { componentTagger } from "lovable-tagger";
import { loadLiveQuotes } from "./src/server/liveQuotes";

const venvPython = path.join(process.cwd(), ".venv/bin/python");
const PY = process.env.SINAYICI_PYTHON || (existsSync(venvPython) ? venvPython : "python3");

function runSinayici(route: string, body: unknown): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const child = spawn(PY, ["-m", "sinayici.site_api"], { cwd: process.cwd() });
    let out = "";
    let err = "";
    child.stdout.on("data", (chunk) => {
      out += chunk;
    });
    child.stderr.on("data", (chunk) => {
      err += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(err || out || `python ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(out));
      } catch {
        reject(new Error(err || out));
      }
    });
    child.stdin.write(JSON.stringify({ path: route, body }));
    child.stdin.end();
  });
}

function readJson(req: import("http").IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
  });
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabasePublishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || "";

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    define: {
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabasePublishableKey),
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      {
        name: "bist-quotes",
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const route = req.url?.split("?")[0] ?? "";
            if (route === "/api/backtest" || route === "/api/optimize" || route === "/api/ornek-yaml" || route === "/api/ornek_yaml" || route === "/api/saglik") {
              try {
                const body = req.method === "POST" ? await readJson(req) : {};
                const result = await runSinayici(route, body);
                res.statusCode = result.status || 200;
                res.setHeader("content-type", "application/json; charset=utf-8");
                res.end(JSON.stringify(result.body));
              } catch (error) {
                res.statusCode = 500;
                res.setHeader("content-type", "application/json; charset=utf-8");
                res.end(JSON.stringify({ detail: error instanceof Error ? error.message : "motor yok" }));
              }
              return;
            }
            if (route !== "/api/bist-quotes") return next();
            try {
              const stocks = await loadLiveQuotes();
              res.setHeader("content-type", "application/json");
              res.end(JSON.stringify({ source: "yahoo", asOf: new Date().toISOString(), stocks }));
            } catch {
              res.statusCode = 502;
              res.setHeader("content-type", "application/json");
              res.end(JSON.stringify({ error: "Canlı veri alınamadı" }));
            }
          });
        },
      },
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
    },
    build: {
      // 977 kB → parçalara böl, ilk yükleme hızlansın
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-react": ["react", "react-dom", "react-router-dom"],
            "vendor-charts": ["recharts"],
            "vendor-radix": [
              "@radix-ui/react-dialog",
              "@radix-ui/react-tabs",
              "@radix-ui/react-tooltip",
              "@radix-ui/react-popover",
              "@radix-ui/react-dropdown-menu",
              "@radix-ui/react-select",
            ],
            "vendor-supabase": ["@supabase/supabase-js", "@tanstack/react-query"],
            "vendor-icons": ["lucide-react"],
          },
        },
      },
    },
  };
});
