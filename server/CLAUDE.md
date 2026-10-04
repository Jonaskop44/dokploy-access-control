# CLAUDE.md

NestJS backend for the Dokploy access-control UI (`../web` is a separate Next.js project, no shared code). Reply to the user in German; code, comments, commits and names stay English. Full conventions: [NEW-PROJECT-BRIEFING.md](NEW-PROJECT-BRIEFING.md).

## Rules

- Install packages with `npm install <pkg> --legacy-peer-deps` (`nestjs-zod` does not declare Nest 12 peer support).
- ESM: every relative import needs the `.js` extension; use `import type` for type-only imports.
- No `process.env` in code, use `AppConfigService` (only exception: `PrismaService`). New env vars go into `src/config/env.validation.ts` and `.env.example` under the same `//Section` heading.
- DTOs are zod schema + `createZodDto` in one file; request DTOs are `.strict()`. Every handler returning data uses `@ZodSerializerDto(...)` with a non-strict response schema. No `class-validator`.
- Decorator order on handlers: HTTP method, `@Throttle`, `@UseGuards`, `@ZodSerializerDto`.
- Controllers stay thin; Prisma access only in services.
- Domains (`user/`, ...) live at the top of `src/`; infrastructure lives in `src/config/<name>/`; guards in `src/guards/`.
- No circular imports between providers and no `forwardRef()`; extract shared logic into a third service.
- Comments only for the non-obvious "why".

## Commands

- `npm run start:dev`, `npm run build`, `npm run openapi` (writes `openapi.json`)
- `npm test`, `npm run test:e2e`
- `npx prisma migrate dev --name <descriptive_name>` after schema changes (client is generated into `src/config/prisma/generated`, git-ignored)
- Before finishing: `npm run format`, `npm run lint`, `npx tsc -p tsconfig.build.json --noEmit`

## Auth (Microsoft Entra ID)

- Login is backend-driven: `GET /auth/login` redirects to Entra (authorization code + PKCE via `@azure/msal-node`, tenant-specific authority), `GET /auth/callback` redeems the code, upserts the `User` by Entra `oid` and sets our own httpOnly `accessToken` / `refreshToken` cookies (see `SessionService`). The frontend never handles Entra tokens.
- Redirect URI registered in the Entra app must equal `ENTRA_REDIRECT_URI` (`/api/v1/auth/callback`).
- Refresh token storage: raw JWT -> SHA-256 -> bcrypt -> `User.hashedRefreshToken`. Always go through `SessionService.hashRefreshTokenInput()`.
- Roles: `User.role` defaults to `USER`; admins are promoted manually in the DB until a `RolesGuard` exists.
