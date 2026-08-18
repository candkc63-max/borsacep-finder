# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

BORSACEP is a Turkish-language BIST100 technical-analysis scanner. Vite + React 18 + TypeScript SPA, styled with Tailwind + shadcn/ui, backed by Supabase (Auth + Edge Functions), and packaged for iOS/Android through Capacitor. User-facing strings, comments, and UI copy are Turkish — preserve that language when editing.

## Commands

```bash
npm run dev          # Vite dev server on :8080
npm run build        # production build → dist/
npm run build:dev    # build with mode=development (keeps lovable-tagger)
npm run lint         # eslint .
npm run test         # vitest run (single pass)
npm run test:watch   # vitest watch mode
npm run mobile:build # build + cap sync (refresh iOS/Android wrappers)
npm run cap:android  # open Android Studio project
npm run cap:ios      # open Xcode project
```

Single test: `npx vitest run src/test/indicators.test.ts` or target by name with `-t "<name>"`. Tests live under `src/**/*.{test,spec}.{ts,tsx}`; jsdom + `src/test/setup.ts` (matchMedia polyfill + jest-dom) wires the env.

The repo has both `bun.lockb` and `package-lock.json` — use npm unless the user specifies otherwise.

## Environment

`.env` (see `.env.example`) needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. `vite.config.ts` aliases `VITE_SUPABASE_ANON_KEY` → `VITE_SUPABASE_PUBLISHABLE_KEY` at build time, so either name works. `src/lib/backend.ts` also hard-codes fallback URL + anon key for the shared dev project, so `hasBackend` is effectively always true — do not assume a code path for "no backend".

## Architecture

### Data flow (live vs mock)
- `useBistStocks` (`src/hooks/useBistStocks.ts`) invokes the `bist-stocks` Supabase Edge Function via React Query (5-min staleTime, 2 retries).
- `pages/Index.tsx` does `const stockData = liveStocks ?? mockStocks` — the generated mock data in `src/lib/stockData.ts` is the deterministic fallback rendered while/if the live fetch is unavailable.
- When the edge function returns fundamentals, they are pushed into a runtime cache via `setRealFundamentals` (`src/lib/fundamentals.ts`); `getFundamentals` layers that cache over a deterministic hash-based fallback. Filters read through `getFundamentals`, so they work with or without live data.

### Price/volume convention (critical)
All indicator and strategy functions in `src/lib/indicators.ts` expect **newest-first** arrays (`prices[0]` = today, `prices[1]` = yesterday). `calcPrevEMA`/`calcPrevSMA` shift by slicing `prices.slice(1)`. The edge function and `generateStockData()` both produce newest-first arrays (note the `.reverse()` at the tail of the mock generator). Any new data source must match this ordering or all signals flip.

### Strategies
`StrategyId` is a closed union and `applyStrategy` uses an exhaustive `switch` with a `never` default. Adding a strategy requires three coordinated edits:
1. Extend the `StrategyId` union.
2. Append to `strategies[]` (id/name/description/style/timeframe — timeframe drives the Kısa/Orta/Uzun Vade filter in `Index.tsx`).
3. Add a `case` returning a `StrategyResult` (signal + Turkish `details` + indicator values for the detail modal).

`Signal` values are the Turkish literals `"AL" | "SAT" | "NÖTR"` — they are also rendered directly in the UI and read from localStorage, so don't translate them.

### Supabase layout
- `src/integrations/supabase/client.ts` and `src/lib/backend.ts` both create Supabase clients. `backend.ts` is the one wired into hooks (`useAuth`, `useBistStocks`); keep new code on that client.
- Edge functions live under `supabase/functions/`:
  - `bist-stocks` — public (`verify_jwt = false` in `supabase/config.toml`), fetches Yahoo Finance `*.IS` tickers with a 1y daily range and shapes them into the `Stock` type used by the UI.
  - `borsa-egitmeni-chat` — proxies the Anthropic Messages API (needs `ANTHROPIC_API_KEY` set in the Supabase project), trims to the last 20 messages, system prompt enforces the Turkish "Borsa Eğitmeni" persona and education-only tone.
- `supabase/migrations/` sets up `profiles` with RLS + an `on_auth_user_created` trigger. `src/integrations/supabase/types.ts` is the generated Database type — regenerate rather than hand-edit.

### UI
- Routing is flat in `src/App.tsx` (`BrowserRouter` + `ErrorBoundary` + `QueryClientProvider` at the root). Main scanner is `/`; auxiliary pages (`/auth`, `/egitmen`, `/gizlilik`, `/kullanim-kosullari`, `/kvkk`) are static and localized.
- shadcn/ui lives in `src/components/ui` (config in `components.json`, base color `slate`, alias `@/`). Prefer composing existing primitives over pulling new shadcn components unless the user asks.
- `@/` → `src/` alias is defined in `vite.config.ts`, `vitest.config.ts`, and all tsconfigs — keep imports using it.
- Small persisted UI state (strategy id, signal filter, favorites, portfolio) is written directly to `localStorage` with `try/catch` guards and keys prefixed `borsacep-*`. Follow the same pattern for new preferences rather than introducing a store.

### Capacitor
`capacitor.config.ts` points `webDir` at `dist`, so native shells only see the production build. After changing web code that should ship to mobile, run `npm run mobile:build` before `cap:android` / `cap:ios`.

## Conventions

- ESLint runs with `@typescript-eslint/no-unused-vars` disabled and `react-hooks` recommended rules enabled; `react-refresh/only-export-components` is a warn. Don't re-enable `no-unused-vars` project-wide without discussion.
- Error messages surfaced to users in hooks (`useBistStocks`, `useAuth`, etc.) are Turkish and mapped from specific failure signatures (`FunctionsFetchError`, `401/403`). Keep the Turkish copy and the mapping structure when adding new error branches.
