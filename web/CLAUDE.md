# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Frontend work: design rules (mandatory)

- When writing ANY frontend code (pages, components, styles), always follow [DESIGN.md](DESIGN.md). It is the source of truth for colors, typography, spacing, radii, elevation and components. Use its tokens, never invent ad-hoc values.
- Always use the skills in `.claude/skills/` to get the best result: `design-taste-frontend`, `high-end-visual-design`, `minimalist-ui` and `full-output-enforcement`. Invoke the relevant ones via the Skill tool before building or restyling UI.
- If a skill's guidance conflicts with DESIGN.md, DESIGN.md wins.

## Commands

Run from this `web/` directory (the sibling `../server` is a separate NestJS project).

- `npm run dev` — start dev server (http://localhost:3000)
- `npm run build` / `npm run start` — production build / serve
- `npm run lint` — ESLint (flat config, `eslint.config.mjs`)

There is no test runner configured in `web/`.

## Architecture

- Next.js 16 App Router with React 19 and the React Compiler enabled (`reactCompiler: true` in `next.config.ts`) — avoid manual `useMemo`/`useCallback` unless needed.
- Source lives in `src/` (`app/`, `components/`, `lib/`); import via the `@/*` alias → `src/*`.
- Tailwind CSS v4 (configured through `src/app/globals.css` and `@tailwindcss/postcss`, no tailwind config file).
- shadcn/ui with the `base-nova` style on `@base-ui/react` (see `components.json`): UI primitives go in `@/components/ui`, `cn` helper in `@/lib/utils`, icons via lucide (`@iconify/react` also available), animation via `motion` / `tw-animate-css`.
- Data fetching is intended to use `@tanstack/react-query` + `axios`; `orval` is installed for generating API clients from the backend's OpenAPI spec (no orval config exists yet).
- The backend is the NestJS app in `../server`; this frontend is an access-control UI for Dokploy.
