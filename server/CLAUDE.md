# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

NestJS backend for the Dokploy access-control UI (`../web` is a separate Next.js project, no shared code). Reply to the user in German; code, comments, commits and names stay English. Full conventions: [NEW-PROJECT-BRIEFING.md](NEW-PROJECT-BRIEFING.md). That briefing describes a reference project: its mail, password/local login, 2FA and verification-token sections do **not** exist here (auth is Entra-only, see below).

## Rules

- Install packages with `npm install <pkg> --legacy-peer-deps` (`nestjs-zod` does not declare Nest 12 peer support).
- ESM: every relative import needs the `.js` extension; use `import type` for type-only imports. Prisma types/enums come from `config/prisma/generated/client.js` / `enums.js`.
- No `process.env` in code, use `AppConfigService` (only exception: `PrismaService`). New env vars go into `src/config/env.validation.ts` and `.env.example` under the same `//Section` heading.
- DTOs are zod schema + `createZodDto` in one file; request DTOs are `.strict()`. Every handler returning data uses `@ZodSerializerDto(...)` with a non-strict response schema (this is what strips `hashedRefreshToken` etc.). No `class-validator`.
- Decorator order on handlers: HTTP method, `@HttpCode`, `@Throttle`, `@UseGuards`, `@ZodSerializerDto`.
- Controllers stay thin; Prisma access only in services.
- Domains (`user/`, ...) live at the top of `src/`; infrastructure lives in `src/config/<name>/`; guards in `src/guards/`.
- No circular imports between providers and no `forwardRef()` (real ESM + `emitDecoratorMetadata` causes `Cannot access 'X' before initialization`); extract shared logic into a third service.
- Comments only for the non-obvious "why".

## Commands

- `npm run start:dev`, `npm run build`, `npm run openapi` (boots `AppModule`, so `.env` must pass validation; writes git-ignored `openapi.json` used by the frontend for type generation)
- `npm test`, single file: `npx vitest run src/path/to/file.spec.ts`; e2e: `npm run test:e2e` (`*.e2e-spec.ts`). No tests exist yet.
- `npx prisma migrate dev --name <descriptive_name>` after schema changes; don't use `npm run prisma` (hardcodes `--name init`). The client is generated into `src/config/prisma/generated` (git-ignored), so run `npx prisma generate` after a fresh clone. Prisma config lives in `prisma7.config.ts` (picked up automatically).
- Before finishing: `npm run format`, `npm run lint` (type-aware oxlint; `no-floating-promises` is an error), `npx tsc -p tsconfig.build.json --noEmit`

## App wiring

- Global prefix `api/v1`; Swagger at `/api/v1/api-docs`. `trust proxy` is 1 (Traefik), required for per-IP throttling.
- `app.module.ts` registers globally: `ZodValidationPipe`, `ZodSerializerInterceptor`, `ThrottlerGuard` (60 req/min default; auth routes override via `@Throttle`). `AppConfigModule` and `PrismaModule` are `@Global()`; `AppConfigModule` also registers/exports `PassportModule`, so feature modules never import it.
- `AuthModule` lists `UserService` directly in its providers rather than importing `UserModule`.

## Auth (Microsoft Entra ID)

- Login is backend-driven: `GET /auth/login?rememberMe=` redirects to Entra (authorization code + PKCE via `@azure/msal-node`, tenant-specific authority). State, PKCE verifier and `rememberMe` are kept in a short-lived httpOnly `oauthState` cookie scoped to the callback path. `GET /auth/callback` validates state, redeems the code, upserts the `User` by Entra `oid` (email/name refreshed on every login) and sets our own httpOnly `accessToken` / `refreshToken` cookies (both path `/`) via `SessionService.completeLogin()`. The refresh cookie is deliberately not scoped to the refresh route: the frontend's `proxy.ts` reads it to renew an expired session server-side (that is what makes "remember me" survive the short access-token lifetime). Clear cookies only through `SessionService.clearAuthCookies()` so domain/path match. Success redirects to `FRONTEND_URL`, any failure to `FRONTEND_URL/?error=auth_failed`. The frontend never handles Entra tokens.
- Redirect URI registered in the Entra app must equal `ENTRA_REDIRECT_URI` (`/api/v1/auth/callback`).
- Refresh token storage: raw JWT -> SHA-256 -> bcrypt -> `User.hashedRefreshToken`. Always go through `SessionService.hashRefreshTokenInput()`. Tokens rotate on every refresh; logout nulls the hash.
- `rememberMe` lives in the JWT payload (`sub.rememberMe`) and selects refresh lifetime (`JWT_REFRESH_EXPIRES_IN` vs `JWT_REFRESH_SESSION_EXPIRES_IN`) and persistent vs session refresh cookie.
- `JwtAccessStrategy.validate()` returns only `{ id }`, so on `JwtAuthGuard` routes `request.user` holds just the id despite the `Express.User` typing; load the user via `UserService` when more is needed.
- Roles: `Role` enum is `TEACHER` / `STUDENT`, default `STUDENT`. A `@Roles()` decorator exists but no `RolesGuard` yet; teachers are promoted manually in the DB.
