# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

NestJS backend for the Dokploy access-control UI (`../web` is a separate Next.js project, no shared code). Reply to the user in German; code, comments, commits and names stay English. Full conventions: [NEW-PROJECT-BRIEFING.md](NEW-PROJECT-BRIEFING.md). That briefing describes a reference project: its mail, password/local login, 2FA and verification-token sections do **not** exist here (auth is Entra-only, see below), and its zod/nestjs-zod sections are superseded: this project uses `class-validator` / `class-transformer` (rules below win).

## Rules

- Install packages with plain `npm install <pkg>`; `--legacy-peer-deps` was only needed for the removed `nestjs-zod`.
- ESM: every relative import needs the `.js` extension; use `import type` for type-only imports. Prisma types/enums come from `config/prisma/generated/client.js` / `enums.js`.
- No `process.env` in code, use `AppConfigService` (only exception: `PrismaService`). New env vars go into `src/config/env.validation.ts` and `.env.example` under the same `//Section` heading.
- DTOs are classes with `class-validator` decorators plus `@ApiProperty` (no Swagger CLI plugin, so every field needs it or it is missing from `openapi.json` and the frontend types). Query values arrive as strings: booleans need an explicit `@Transform`, numbers are converted by `transform: true` only when the property has an explicit type. No zod.
- Request DTOs: unknown properties are stripped by the global pipe, not rejected (Entra's callback sends extra query params).
- Response DTOs mark every sent field with `@Expose()`. Handlers returning data use `@SerializeOptions({ type: XDto, excludeExtraneousValues: true })` plus `@ApiOkResponse({ type: XDto })`; the first is what strips `hashedRefreshToken` etc., the second documents the response (without it the frontend client types it as `void`). Nullable fields: `@ApiProperty({ type: String, nullable: true })`; dates: `@ApiProperty({ type: String, format: 'date-time' })` on a `Date` property.
- Decorator order on handlers: HTTP method, `@HttpCode`, `@Throttle`, `@UseGuards`, `@SerializeOptions`, `@ApiOkResponse`.
- Controllers stay thin; Prisma access only in services.
- Domains (`user/`, ...) live at the top of `src/`; infrastructure lives in `src/config/<name>/`; guards in `src/guards/`.
- No circular imports between providers and no `forwardRef()` (real ESM + `emitDecoratorMetadata` causes `Cannot access 'X' before initialization`); extract shared logic into a third service.
- Comments only for the non-obvious "why".

## Commands

- `npm run start:dev`, `npm run build`, `npm run openapi` (boots `AppModule`, so `.env` must pass validation; writes git-ignored `openapi.json` used by the frontend for type generation)
- `npm test`, single file: `npx vitest run src/path/to/file.spec.ts`; e2e: `npm run test:e2e` (`*.e2e-spec.ts`). No tests exist yet.
- `npx prisma migrate dev --name <descriptive_name>` after schema changes; don't use `npm run prisma` (hardcodes `--name init`). The client is generated into `src/config/prisma/generated` (git-ignored), so run `npx prisma generate` after a fresh clone. Prisma config lives in `prisma7.config.ts` (picked up automatically).
- `npm run dokploy:generate` re-fetches `dokploy-openapi.json` from the live Dokploy instance (needs `DOKPLOY_URL`/`DOKPLOY_API_KEY`) and regenerates the typed client in `src/config/dokploy/generated` via orval (only the tags listed in `orval.config.ts`; widen them to use more endpoints). Never edit `generated/` by hand.
- Before finishing: `npm run format`, `npm run lint` (type-aware oxlint; `no-floating-promises` is an error), `npx tsc -p tsconfig.build.json --noEmit`

## App wiring

- Global prefix `api/v1`; Swagger at `/api/v1/api-docs`. `trust proxy` is 1 (Traefik), required for per-IP throttling.
- Env vars are validated at boot by `validateEnv` in `config/env.validation.ts` (class-validator class, `enableImplicitConversion`; give non-string fields an explicit type annotation or they stay strings).
- `app.module.ts` registers globally: `ValidationPipe({ whitelist: true, transform: true })`, `ClassSerializerInterceptor`, `ThrottlerGuard` (60 req/min default; auth routes override via `@Throttle`). `AppConfigModule` and `PrismaModule` are `@Global()`; `AppConfigModule` also registers/exports `PassportModule`, so feature modules never import it.
- `AuthModule` lists `UserService` directly in its providers rather than importing `UserModule`.

## Auth (Microsoft Entra ID)

- Login is backend-driven: `GET /auth/login?rememberMe=` redirects to Entra (authorization code + PKCE via `@azure/msal-node`, tenant-specific authority). State, PKCE verifier and `rememberMe` are kept in a short-lived httpOnly `oauthState` cookie scoped to the callback path. `GET /auth/callback` validates state, redeems the code, upserts the `User` by Entra `oid` (email/name refreshed on every login) and sets our own httpOnly `accessToken` / `refreshToken` cookies (both path `/`) via `SessionService.completeLogin()`. The refresh cookie is deliberately not scoped to the refresh route: the frontend's `proxy.ts` reads it to renew an expired session server-side (that is what makes "remember me" survive the short access-token lifetime). Clear cookies only through `SessionService.clearAuthCookies()` so domain/path match. Success redirects to `FRONTEND_URL`, any failure to `FRONTEND_URL/?error=auth_failed`. The frontend never handles Entra tokens.
- Redirect URI registered in the Entra app must equal `ENTRA_REDIRECT_URI` (`/api/v1/auth/callback`).
- Refresh token storage: raw JWT -> SHA-256 -> bcrypt -> `User.hashedRefreshToken`. Always go through `SessionService.hashRefreshTokenInput()`. Tokens rotate on every refresh; logout nulls the hash.
- `rememberMe` lives in the JWT payload (`sub.rememberMe`) and selects refresh lifetime (`JWT_REFRESH_EXPIRES_IN` vs `JWT_REFRESH_SESSION_EXPIRES_IN`) and persistent vs session refresh cookie.
- `JwtAccessStrategy.validate()` returns only `{ id }`, so on `JwtAuthGuard` routes `request.user` holds just the id despite the `Express.User` typing; load the user via `UserService` when more is needed.
- Roles: `Role` enum is `TEACHER` / `STUDENT`. Role and `className` are derived from the Entra display name by `user/classify-user.ts` on every login (provisional rule: `, <class>` suffix = student, else teacher), so manual DB edits are overwritten. Protect routes with `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(Role.TEACHER)`; `RolesGuard` reads the role from the DB, so the module must provide `UserService` (import `UserModule`).

## Projects & Dokploy

- A `Project` is a student's git-based docker-compose app. Each one maps 1:1 to a Dokploy project + compose service (`dokployProjectId`, `composeId`, `appName` stored locally). `DokployProjectService` is the only code that talks to Dokploy; it calls the orval-generated functions, whose HTTP goes through `dokployInstance` (axios; base URL and `x-api-key` set once in `DokployModule`'s constructor; every failure is mapped to `BadGatewayException`). Generated responses are often untyped, so they are cast to hand-written types in `project/types/`.
- Dokploy and the local DB are not transactional: `create` makes the Dokploy side first and rolls it back (`removeProject`) if the DB insert fails; keep that ordering when adding steps.
- Access: TEACHER sees and manages every project; STUDENT only projects they are a member of, and only `OWNER` members may update/deploy/delete. Non-members get 404, not 403 (`ProjectService.getAccess`).
- Deploy flow (`ProjectService.deploy`): read the converted compose from Dokploy -> `analyzeCompose` rejects escape hatches (privileged, host network/pid/ipc, `include`, host bind mounts outside the repo, ...) and collects published ports -> `ProjectPortService.sync` assigns stable, globally unique host ports from `PROJECT_PORT_RANGE_START..END` (retries on unique-constraint collisions) -> `buildOverride` renders a compose override file (`ports: !override`), stored as a Dokploy file mount -> the compose `command` is rewritten to pass both files with `-f`, then the deploy is triggered. Students never control host ports; auto-deploy is disabled.
- Start/stop/status: any member or teacher may start and stop (`ProjectService.start/stop`, 409 before the first deploy). `GET /projects/:id/status` derives `NOT_DEPLOYED | DEPLOYING | RUNNING | STOPPED | ERROR` from Dokploy's `composeStatus` (deployment state only) combined with container states from `docker.getContainersByAppNameMatch`; a finished deploy with no running container is `ERROR`.
