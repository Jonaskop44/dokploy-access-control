# Briefing: Neues Backend-Projekt im Stil von „Code Control"

Dieses Dokument beschreibt Tech-Stack, Projektstruktur und Coding Style eines bestehenden Referenzprojekts (NestJS/Prisma-Backend). Das neue Projekt soll **dieselbe Technologie und denselben Coding Style** verwenden. Setze das Backend entsprechend auf und halte dich bei allem neuen Code an diese Konventionen.

Antworte dem Nutzer auf **Deutsch**. Code, Kommentare, Commit-Messages, Variablen- und Dateinamen bleiben **Englisch**.

---

## 1. Tech-Stack

| Bereich | Technologie |
|---|---|
| Framework | NestJS `^12` (Express-Plattform) |
| Sprache | TypeScript `^6`, **ESM** (`"type": "module"`), `strict: true` |
| Datenbank | PostgreSQL |
| ORM | Prisma `^7` mit `@prisma/adapter-pg` + `pg` (Driver Adapter) |
| Validierung / DTOs | `zod` `^4` + `nestjs-zod` (`createZodDto`) – **kein** `class-validator` |
| Auth | Eigene JWT-Auth (`@nestjs/jwt`, `passport`, `passport-jwt`, `passport-local`), `bcrypt` |
| 2FA | `otplib` (TOTP) + `qrcode` |
| Mail | `nodemailer` + `handlebars`-Templates (eigener SMTP-Server) |
| Config | `@nestjs/config` + zod-Schema für Env-Validierung |
| Rate Limiting | `@nestjs/throttler` |
| API-Doku | `@nestjs/swagger` + `cleanupOpenApiDoc` aus `nestjs-zod` |
| Tests | `vitest` (+ `supertest` für e2e, `@vitest/coverage-v8`) |
| Linter | `oxlint` |
| Formatter | `prettier` (`singleQuote: true`, `trailingComma: "all"`) |
| Cookies | `cookie-parser`, Tokens ausschließlich als httpOnly-Cookies |

Das Frontend ist ein separates Next.js-Projekt. Es gibt **kein** Code-/Typ-Sharing zwischen Frontend und Backend (bewusste Entscheidung, keine Workspaces).

> Verwende immer die jeweils zum Projektstart aktuellen kompatiblen Versionen. Die obigen Versionen sind die des Referenzprojekts.

---

## 2. Befehle

Alle Installationen mit `--legacy-peer-deps` (`nestjs-zod` deklariert Peer-Support nur für Nest 10/11, wir nutzen Nest 12):

```bash
npm install <pkg> --legacy-peer-deps
```

`package.json`-Scripts:

```json
{
  "build": "nest build",
  "deploy": "nest deploy",
  "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
  "start": "nest start",
  "start:dev": "nest start --watch",
  "start:debug": "nest start --debug --watch",
  "start:prod": "node dist/main",
  "lint": "oxlint src/ test/",
  "openapi": "nest build && node dist/generate-openapi.js",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:cov": "vitest run --coverage",
  "test:debug": "vitest --inspect-brk --no-file-parallelism",
  "test:e2e": "vitest run --config ./vitest.config.e2e.ts"
}
```

Prisma: Nach Schema-Änderung `npx prisma migrate dev --name <descriptive_name>` direkt aufrufen (kein festverdrahtetes npm-Script mit `--name init` für Folge-Migrationen), bei Bedarf `npx prisma generate`.

Type-Check ohne Emit: `npx tsc -p tsconfig.build.json --noEmit`

---

## 3. Konfigurationsdateien

**`.prettierrc`**
```json
{
  "singleQuote": true,
  "trailingComma": "all"
}
```

**`oxlint.json`**
```json
{
  "$schema": "https://raw.githubusercontent.com/oxc-project/oxc/main/crates/oxc_linter/src/rules.rs",
  "rules": {
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-floating-promises": "warn"
  },
  "env": { "node": true }
}
```

**`tsconfig.json`**
```json
{
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "resolvePackageJsonExports": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2023",
    "sourceMap": true,
    "outDir": "./dist",
    "incremental": true,
    "skipLibCheck": true,
    "strict": true,
    "strictPropertyInitialization": false,
    "types": ["vitest/globals", "node"]
  }
}
```
`tsconfig.build.json` hat `rootDir: "src"` und schließt Tests aus.

**`nest-cli.json`**
```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "assets": ["config/mail/templates/**/*.hbs"],
    "watchAssets": true
  }
}
```

**`vitest.config.ts`** (e2e: eigene `vitest.config.e2e.ts` mit `include: ['**/*.e2e-spec.ts']`)
```ts
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: { globals: true, root: './', include: ['**/*.spec.ts'] },
});
```

**`prisma/schema.prisma`** – Client wird **innerhalb von `src/`** generiert (wegen `rootDir` im Build):
```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/config/prisma/generated"
}

datasource db {
  provider = "postgresql"
}
```
**`prisma7.config.ts`**: `defineConfig({ schema: "prisma/schema.prisma", migrations: { path: "prisma/migrations" }, datasource: { url: process.env["DATABASE_URL"] } })` mit `import "dotenv/config"`.

---

## 4. Projektstruktur

```
server/
├── prisma/            schema.prisma + migrations/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── swagger.config.ts
│   ├── generate-openapi.ts
│   ├── guards/                  # querschnittliche Guards (jwt-auth, jwt-refresh, local-auth, ...)
│   ├── config/                  # Infrastruktur-Module (KEINE Fach-Domänen)
│   │   ├── app-config/          # AppConfigModule/Service (typisierte Env-Getter)
│   │   ├── env.validation.ts    # zod EnvSchema
│   │   ├── prisma/              # PrismaModule/Service + generated/
│   │   └── mail/                # MailModule/Service, TemplateService, templates/*.hbs, interface/
│   ├── auth/                    # Fach-Domäne
│   │   ├── auth.module|controller|service.ts
│   │   ├── decorators/  dto/  strategies/  types/
│   │   └── <feature>/           # z. B. two-factor/, email-verification/, password-reset/, session/
│   └── user/                    # Fach-Domäne
│       ├── user.module|controller|service.ts
│       └── dto/
├── .env / .env.example
├── CLAUDE.md
└── README.md
```

Regeln:
- **Fach-Domänen** (`auth/`, `user/`, …) liegen auf oberster Ebene in `src/`, **Infrastruktur/Plumbing** (Config, Prisma, Mail, …) immer unter `src/config/<name>/` in einem eigenen Unterordner.
- **Guards** liegen in `src/guards/`, nicht in der Domäne.
- Dateinamen: `kebab-case` mit Suffix (`user.service.ts`, `create-user.dto.ts`, `jwt-access.strategy.ts`, `current-user.decorator.ts`).
- Jedes Feature = eigenes Modul mit `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`.

---

## 5. Coding-Konventionen

### ESM & Imports
- ESM durchgehend: **jeder relative Import braucht die `.js`-Endung**, auch bei Type-Imports (`import { X } from './x.service.js'`).
- Reine Typ-Imports mit `import type { ... }` (z. B. `import type { Response } from 'express'`).
- Prisma-Client/Enums kommen aus `config/prisma/generated/client.js` bzw. `.../enums.js`.
- Kein `process.env` im Code – immer über `AppConfigService` (einzige Ausnahme: `PrismaService`, weil der Adapter im `super(...)`-Call gebaut werden muss).

### Config / Env
- Alle Env-Variablen werden beim Start in `src/config/env.validation.ts` per zod geprüft (`ConfigModule.forRoot({ isGlobal: true, validate: (config) => EnvSchema.parse(config) })`). Fehlende/ungültige Variablen → Fail-fast beim Boot.
- Das Schema ist mit Kommentaren gruppiert (`//Server Configuration`, `//Database Configuration`, `//Auth Configuration`, …) – dieselben Überschriften in `.env.example`.
- `AppConfigService` ist eine Fassade mit **typisierten Gettern** (`get port(): number`, `get jwtAccessSecret(): string`, …) auf Basis von `configService.getOrThrow<T>('KEY')`. Optionale Werte nutzen `configService.get<T>`.
- `AppConfigModule` ist `@Global()` und registriert **einmalig** `PassportModule.register({ defaultStrategy: 'jwt' })` und re-exportiert es – Feature-Module importieren `PassportModule` nie selbst.
- `PrismaModule` und `MailModule` sind ebenfalls `@Global()`.

Beispiel `env.validation.ts`:
```ts
export const EnvSchema = z.object({
  //Server Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),

  //Database Configuration
  DATABASE_URL: z.url(),
  ...
});
export type Env = z.infer<typeof EnvSchema>;
```

### DTOs & Validierung (zod)
- DTO = zod-Schema + `createZodDto`. Schema und Klasse stehen in derselben Datei:
```ts
export const LoginSchema = z
  .object({
    email: z.email().meta({ example: 'max.mustermann@example.com' }),
    password: z.string().min(1).meta({ example: 'GeheimesPasswort1!' }),
    rememberMe: z.boolean().optional().default(false),
  })
  .strict();

export class LoginDto extends createZodDto(LoginSchema) {}
```
- Request-DTOs immer mit **`.strict()`** (unbekannte Felder werden abgelehnt).
- Swagger-Beispiele über `.meta({ example: ... })`.
- Fehlermeldungen für Validierungsregeln als Englisch-String direkt in der Regel (`.min(8, 'Password must be at least 8 characters long')`).
- Globale Registrierung in `app.module.ts`: `ZodValidationPipe` als `APP_PIPE`, `ZodSerializerInterceptor` als `APP_INTERCEPTOR`.
- **Response-Shaping:** Jeder Handler, der Daten zurückgibt, bekommt `@ZodSerializerDto(SomeResponseDto)`. Response-Schemas sind nicht `.strict()` – Felder, die nicht im Schema stehen (z. B. `password`, `hashedRefreshToken`), werden dadurch entfernt. Sensible Felder nie manuell in Services „rausdestrukturieren" und sich darauf verlassen.
- Enums aus Prisma in zod: `z.enum(Role)`.

### Controller
- Dünn: nur Routing, Guards, Decorators, Delegation an den Service. Kein Business-Code.
- Constructor-Injection mit `private readonly`:
```ts
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle({ default: { ttl: 15 * 60_000, limit: 5 } })
  @UseGuards(LocalAuthGuard)
  @ZodSerializerDto(LoginResponseSchema)
  login(
    @CurrentUser() user: Express.User,
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.login(user, dto.rememberMe, response);
  }
}
```
- Decorator-Reihenfolge: HTTP-Methode → `@Throttle` → `@UseGuards` → `@ZodSerializerDto`.
- Aktueller User über Custom-Decorator `@CurrentUser()` (liest `request.user`, optional Key).
- Handler-Methoden geben i. d. R. direkt das Service-Ergebnis zurück (kein `async/await` nötig, wenn nur durchgereicht).

### Services
- `@Injectable()`, `private readonly logger = new Logger(XService.name)` wo geloggt wird.
- Prisma-Zugriffe nur in Services. Kurze Methoden, die nur eine Prisma-Query kapseln, geben das Promise direkt zurück (ohne `async`):
```ts
updateHashedRefreshToken(userId: string, hashedRefreshToken: string | null) {
  return this.prisma.user.update({ where: { id: userId }, data: { hashedRefreshToken } });
}
```
- Methoden-Naming: `findById` / `findByEmail` (werfen `NotFoundException`), `findByEmailOrNull` (gibt `null` zurück), `create`, `updateX`, `markX`, `enableX`/`disableX`.
- Fehler über Nest-HTTP-Exceptions (`NotFoundException`, `ConflictException`, `UnauthorizedException`, …) mit kurzer englischer Meldung.
- Prisma-Unique-Violation abfangen: `error instanceof Error && 'code' in error && error.code === 'P2002'` → `ConflictException`.
- Passwörter: `bcrypt.hash(pw, 12)` (12 Salt-Rounds).

### Zirkuläre Abhängigkeiten
- **Keine direkten zirkulären Imports zwischen zwei `@Injectable`-Providern.** Wegen echtem ESM + `emitDecoratorMetadata` führt das zu `ReferenceError: Cannot access 'X' before initialization`. **Kein `forwardRef()`** – stattdessen gemeinsame Logik in einen dritten Service auslagern (z. B. `SessionService`), sodass der Abhängigkeitsgraph ein DAG bleibt.

### Kommentare
- Sparsam. Nur das **Warum** bei nicht offensichtlichen Entscheidungen (z. B. `trust proxy`, Cookie-Pfad-Scoping). Englisch. Keine Kommentare, die nur den Code wiederholen.

### Formatierung
- Prettier-Defaults + `singleQuote` + `trailingComma: all`, 2 Spaces, Semikolons.
- Numerische Literale mit Unterstrich: `60_000`, `24 * 60 * 60_000`.
- Vor dem Abschluss: `npm run format`, `npm run lint`, `npx tsc -p tsconfig.build.json --noEmit`.

---

## 6. Bootstrap (`main.ts`)

```ts
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const appConfigService = app.get(AppConfigService);

  // Reverse proxy (Traefik) is the single hop in front of this service,
  // so trust exactly one hop to get the real client IP from X-Forwarded-For.
  app.set('trust proxy', 1);

  app.use(cookieParser());
  app.enableCors({ origin: appConfigService.frontendUrl, credentials: true });
  app.setGlobalPrefix('api/v1');

  SwaggerModule.setup('api/v1/api-docs', app, buildSwaggerDocument(app), {
    jsonDocumentUrl: 'api/v1/api-docs-json',
  });

  await app.listen(appConfigService.port);
}

await bootstrap();
```
- Globaler Prefix `api/v1`, Swagger unter `api/v1/api-docs` (JSON: `api/v1/api-docs-json`), Cookie-Auth-Scheme `addCookieAuth('accessToken')`.
- `swagger.config.ts` exportiert `buildSwaggerDocument(app)` (nutzt `cleanupOpenApiDoc`); `generate-openapi.ts` schreibt `openapi.json` (muss denselben Prefix setzen). Das OpenAPI-JSON dient dem Frontend zur Typ-Generierung.

`app.module.ts`: `ConfigModule` (global, validate) → `ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }])` → `AppConfigModule`, `MailModule`, `PrismaModule`, Feature-Module; Provider: `APP_PIPE` (ZodValidationPipe), `APP_INTERCEPTOR` (ZodSerializerInterceptor), `APP_GUARD` (ThrottlerGuard).

---

## 7. Auth-Architektur (falls das neue Projekt Auth braucht)

Übernimm dieses Konzept 1:1, sofern Login/Accounts gebraucht werden:

- **Custom JWT-Auth**, Access- **und** Refresh-Token ausschließlich als **httpOnly-Cookies** (nie im JSON-Body).
  - Access-Cookie: `path: '/'`.
  - Refresh-Cookie: `path: '/api/v1/auth/refresh'` (bewusst eng gescoped).
  - `domain` nur in Production setzen (`AppConfigService.cookieDomain`), in Dev `undefined`.
- Zwei unabhängige Secrets (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`), pro Aufruf per `JwtService.signAsync(payload, { secret, expiresIn })` signiert; `JwtModule.register({})` ohne Default-Secret.
- **Refresh-Token-Speicherung:** Raw-JWT → **SHA-256** → **bcrypt** → `User.hashedRefreshToken`. Der SHA-256-Vorschritt ist Pflicht (bcrypt kürzt bei 72 Bytes). Immer über `SessionService.hashRefreshTokenInput()` laufen lassen. Rotation bei Login/Register/Refresh.
- **Remember me** steckt im JWT-Payload (`sub.rememberMe`) und steuert Refresh-Laufzeit (`JWT_REFRESH_EXPIRES_IN` vs. kürzere `JWT_REFRESH_SESSION_EXPIRES_IN`) sowie Persistent- vs. Session-Cookie.
- **`SessionService`** kapselt `completeLogin()` (Tokens signieren, Refresh-Hash speichern, Cookies setzen) – `AuthService`, `TwoFactorService`, `EmailVerificationService` hängen einseitig davon ab.
- **Guards:** `JwtAuthGuard` (`AuthGuard('jwt')`), `JwtRefreshGuard`, `JwtTwoFactorGuard`, `LocalAuthGuard` – je eine Passport-Strategie in `auth/strategies/`.
- **Verification-Tokens** (E-Mail-Verifizierung, Passwort-Reset): keine JWTs, sondern `randomBytes(32).toString('hex')`, in der DB nur als SHA-256-Hash (`tokenHash`, unique) gespeichert, einmalig verwendbar (`usedAt`), über `VerificationTokenService.issue()/consume()`. Enum `VerificationTokenType` wird für neue Token-Features erweitert.
- **E-Mail-Verifizierung** wird beim Login erzwungen; `verify-email` loggt automatisch ein.
- **Passwort-Reset:** `forgot-password` antwortet immer gleich (Anti-Enumeration), Mail-Fehler werden dort nur geloggt; nach Reset **kein** Auto-Login, Refresh-Token wird invalidiert.
- **2FA (TOTP):** Zwischen Passwort-Login und TOTP-Check gibt es ein kurzlebiges, zweckgebundenes `twoFactorToken`-Cookie (eigenes Secret, eigene Strategy, eingeschränkter Cookie-Pfad).
- `@Roles(...)`-Decorator via `SetMetadata` – ein `RolesGuard` muss noch ergänzt werden, falls Rollen gebraucht werden.

---

## 8. Mail

- `MailModule` (`@Global()`), `MailService` baut einen `Transporter` im Constructor aus `AppConfigService.mail*` und ruft `transporter.verify()` in `onModuleInit()` auf (loggt Erfolg/Fehler, blockiert den Start nicht). `auth` nur setzen, wenn `MAIL_USER` gesetzt ist.
- Handlebars-Templates in `src/config/mail/templates/*.hbs` (`base.hbs` als Layout), kompiliert + gecacht (`Map`) im `TemplateService`. `nest-cli.json` kopiert sie per `assets` nach `dist/`.
- `IMailPayload<T>` ist generisch über die Keys von `MailTemplateContextMap` → Template-Kontext ist typgeprüft. Neues Template = zuerst Key + Kontext in `MailTemplateContextMap` ergänzen.

---

## 9. Rate Limiting

`ThrottlerGuard` global als `APP_GUARD` (Default 60 Req/min/IP). Strengere Limits per `@Throttle({ default: { ttl, limit } })` auf sensiblen Endpoints, z. B.:
- `register`: 3 / Tag
- `login`: 5 / 15 min
- 2FA enable/disable/authenticate: 5 / 15 min
- `forgot-password`, `resend-verification`: 3 / Stunde
- `reset-password`: 5 / 15 min

`app.set('trust proxy', 1)` ist dafür zwingend (Traefik als einzelner Proxy-Hop).

---

## 10. Datenbank-Konventionen (Prisma)

- IDs: `String @id @default(uuid())`.
- Standardfelder: `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`.
- Enums im Prisma-Schema (`Role { ADMIN USER }`), Feldnamen `camelCase`, Modelle `PascalCase` Singular.
- Relationen mit `onDelete: Cascade` wo sinnvoll, Index auf häufig gefilterten Feldern (`@@index([userId, type])`).
- Migrationen mit beschreibenden Namen (`add_user_table`, `add_two_factor_auth`, …).
- `PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy` mit `PrismaPg`-Adapter:
```ts
constructor() {
  super({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
}
```

---

## 11. Umgebung (`.env.example`)

Sektionen mit `#`-Überschriften, passend zum `EnvSchema`:
```
#Server Configuration
PORT=4000
DOMAIN=example.com

#Database Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=...
POSTGRES_PASSWORD=...
POSTGRES_NAME=...
DATABASE_URL="postgresql://user:pass@localhost:5432/dbname"

#Auth Configuration
JWT_ACCESS_SECRET=dev-access-secret-change-me
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=dev-refresh-secret-change-me
JWT_REFRESH_EXPIRES_IN=7d
JWT_REFRESH_SESSION_EXPIRES_IN=1d
...

#CORS Configuration
FRONTEND_URL=http://localhost:3000

#Mail Configuration
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=change-me
MAIL_PASSWORD=change-me
MAIL_FROM_NAME=...
MAIL_FROM_ADDRESS=no-reply@example.com
```
`.env` nie committen, nur `.env.example`.

---

## 12. Vorgehen für das neue Projekt

1. Backend-Ordner mit `nest new` (oder manuell) aufsetzen und auf die oben genannte Konfiguration (ESM, tsconfig, nest-cli, prettier, oxlint, vitest) umstellen. Alte Defaults (Jest, ESLint, class-validator) **entfernen**.
2. Infrastruktur zuerst: `config/app-config`, `config/env.validation.ts`, `config/prisma`, danach (falls nötig) `config/mail`.
3. `main.ts`, `app.module.ts`, `swagger.config.ts`, `generate-openapi.ts` nach Vorlage aus Abschnitt 6.
4. Fach-Domänen (`user`, `auth`, …) jeweils als Modul mit Controller/Service/DTOs.
5. Eine `CLAUDE.md` im neuen Projekt anlegen, die die hier gültigen Regeln (insbesondere `--legacy-peer-deps`, `.js`-Imports, zod-DTOs, `AppConfigService`, keine zirkulären Provider) zusammenfasst und bei Architektur-Entscheidungen fortgeschrieben wird.
6. Nach jeder Änderung: `npm run format`, `npm run lint`, Type-Check, Tests.

**Offene Fragen an den Nutzer vor dem Start:** Name/Domäne des neuen Projekts, welche Fach-Domänen es braucht, ob Auth/2FA/Mail aus dem Referenzprojekt übernommen werden sollen, ob es wieder ein Next.js-Frontend gibt.
