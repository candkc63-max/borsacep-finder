import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { loadLiveQuotes } from "./src/server/liveQuotes";

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
            if (req.url?.split("?")[0] !== "/api/bist-quotes") return next();
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
