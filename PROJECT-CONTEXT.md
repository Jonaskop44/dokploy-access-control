# HTL-Dock: Projektkontext

Stand: 2026-10-13. Dieses Dokument hält fest, was im Gespräch über das Projekt geklärt wurde. Grundlage ist der Projektauftrag (Projektbeginn 28.09.2026, Auftraggeber HTL Villach). Meilensteine aus dem Auftrag sind für die Planung nicht maßgeblich.

## Zielbild

HTL-Dock ist die **Cloud-Variante von Docker Desktop** für die HTL Villach. Ein Schüler meldet sich mit seinem Microsoft-365-Schulaccount an, gibt ein **öffentliches GitLab-Repo** (meist mit `docker-compose.yml`) an und klickt **Deploy**. Das Projekt läuft danach so, als würde er es lokal in Docker starten. Lehrer sehen und verwalten alle Projekte aller Schüler und steuern die Limits.

- Das Projekt wird von **einer Person** (Jonas) allein umgesetzt. Ein "David" existiert nicht, der Passus im Auftrag ist hinfällig.
- Nur aus dem **Schulnetz** erreichbar, nicht aus dem Internet. Das wird über die Netzwerkseite sichergestellt, nicht im Code.
- Schüler müssen sich innerhalb des Schulnetzes zu Datenbank, Backend, Frontend und allen anderen Diensten ihres Projekts verbinden können.

## Architektur

- Monorepo: `web/` (Next.js 16, React 19, Tailwind v4, shadcn/ui) und `server/` (NestJS, Prisma 7, Postgres). Die Details stehen in `server/CLAUDE.md` und `web/CLAUDE.md`.
- Dokploy läuft in einer **Ubuntu-VM unter VMware Workstation Pro**. Das Backend steuert Dokploy **nur über dessen API** an. Schüler sehen Dokploy nie.
- Postgres läuft lokal in Docker auf dem Entwicklungsrechner (`docker-compose.yml`), das Schema liegt in `server/prisma/schema.prisma`.
- **Weg A:** Alle Projekte laufen in **einem** Dokploy-Account (ein API-Key). Die Isolation zwischen Schülern liegt ausschließlich in unserer DB und in den Rechteprüfungen des Backends. Jeder Endpunkt prüft die Mitgliedschaft, **bevor** Dokploy angesprochen wird.
- Projekt-URLs: Zugriff über **`VM-IP:Port`**. Die Idee `projektname.htl-dock.htl-villach.at` ist möglich, aber später und optional. Es muss auch ohne Domain laufen.

## Aktueller Code-Stand

Vorhanden:
- Entra-ID-Login (backend-getrieben, PKCE, eigene JWT-Cookies), `User` mit `TEACHER`/`STUDENT`, `JwtAuthGuard`.
- Dashboard-Grundgerüst im Frontend (Sidebar, Header, Übersicht), orval-generierter API-Client.
- Dokploy-Anbindung im Backend: `DOKPLOY_URL`/`DOKPLOY_API_KEY` in `env.validation.ts`, orval-generierter Client in `server/src/config/dokploy/generated` (Tags `project`, `environment`, `compose`, `deployment`, `docker`), Mutator `dokploy-instance.ts`, `DokployModule` setzt URL und Key beim Start. Neu generieren mit `npm run dokploy:generate` (lädt die Spec mit dem Key aus `.env`). Die Antworten sind ungetypt (`{ [key: string]: unknown }`), weil Dokploys Spec sie nicht beschreibt; genutzte Felder werden bei Bedarf mit class-validator geprüft.
- Validierung und Serialisierung mit `class-validator`/`class-transformer` (zod und nestjs-zod wurden entfernt, weil nestjs-zod 5 `@nestjs/swagger` 12 nicht unterstützt). Global in `app.module.ts`: `ValidationPipe({ whitelist: true, transform: true })` (unbekannte Felder werden entfernt, nicht abgelehnt, da Entras Callback z. B. `session_state` mitschickt) und `ClassSerializerInterceptor`. Response-DTOs geben nur `@Expose()`-Felder heraus (`@SerializeOptions({ type, excludeExtraneousValues: true })` am Handler), jedes Feld braucht `@ApiProperty`, sonst fehlt es im `openapi.json` und in den Frontend-Typen. Env-Validierung über `validateEnv` in `env.validation.ts`. Details in `server/CLAUDE.md`.
- Rollen: Namensregel in `server/src/user/classify-user.ts` setzt `role` und `className` bei jedem Login neu, `RolesGuard` (liest die Rolle aus der DB) mit `@Roles()`.

- Datenmodell (Prisma): `User.className` (wird beim Login aus dem Namen gesetzt), `Project` mit `dokployProjectId`/`composeId`/`appName`, `ProjectMember` (`OWNER`/`MEMBER`), `ProjectPort`, `Limit`. Umgebungsvariablen und Status liegen nur in Dokploy. Beim `Limit` ergibt sich die Ebene aus dem gesetzten Feld (`userId` = Schüler, `className` = Klasse, keines = global), `null` heißt erben. Die globale Zeile (`id = 'global'`, 3 Projekte, 1 laufend, 0,5 CPU, 512 MB) legt die Migration an, ein CHECK verbietet `className` und `userId` gleichzeitig.

Noch **nicht** vorhanden: Deployments (Compose-Prüfer, Port-Vergabe, Start/Stopp), Limits, Lehrer-Dashboard, Logs/Monitoring, Tests. Der `RolesGuard` wird noch von keinem Endpunkt genutzt.

## Rollen

- Nur `TEACHER` und `STUDENT`. Eine Admin-Rolle gibt es nicht (im Auftrag erwähnt, wird gestrichen).
- **Lehrererkennung (vorläufig):** Ein Name mit Suffix `, <Klasse>` ist ein Schüler, z. B. `KROPIUNIG Jonas Leon, 5AHITN`. Alles andere ist ein Lehrer. Umgesetzt in der austauschbaren Funktion `classifyUser` (`server/src/user/classify-user.ts`, Regex `,\s*(\d[A-Z]+)\s*$`).
- **Offen:** Die endgültige Methode klärt Jonas mit seinem Lehrer. Alternativen waren Entra-Gruppen-Claim, Entra-Attribute oder eine Allowlist. Eine Änderung betrifft nur `classifyUser`.
- Rolle und Klasse werden bei **jedem** Login neu bestimmt (Klassenwechsel greift automatisch). Manuelle Änderungen der Rolle in der DB werden dabei überschrieben.
- Geschützte Routen: `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(Role.TEACHER)`. Der Guard liest die Rolle aus der DB, nicht aus dem JWT, damit ein Rollenwechsel sofort wirkt.
- Lehrer dürfen **alle Projekte aller Schüler ansehen, bearbeiten und löschen**.

## Projekte

- Ein Projekt ist meist eine **docker-compose mit mehreren Services**. Datenbanken, die ein Schüler anlegt, gehören zum Projekt.
- Quelle ist ein **öffentliches** GitLab-Repo (gitlab.com, Schul-Login `…@edu.htl-villach.at`). GitHub und Gitea kommen später oder gar nicht, private Repos ebenfalls später.
- Deployment erst nur per Klick auf **Deploy**, kein Webhook.
- Der Schüler gibt Umgebungsvariablen, Branch, Compose-Pfad usw. selbst an.
- **Gruppenprojekte** von Anfang an: `Project` + `ProjectMember(userId, projectId, role)`, nicht `ownerId`.
  - Nur der **Ersteller** verwaltet Mitglieder, deployt und löscht.
  - Mitglieder dürfen **ansehen, starten und stoppen**.
  - Ein Gruppenprojekt zählt nur gegen das Limit des **Erstellers**.
- **Löschen** entfernt auch die Volumes (Daten), mit Bestätigungsdialog.

## Ports und Netzwerk

- Alles, was der Schüler in seiner Compose per `ports:` veröffentlicht, ist im Schulnetz erreichbar, auch die Datenbank. Es verhält sich wie Docker Desktop.
- Das Backend **schreibt nur die Host-Seite um**: aus `"3000:3000"` wird z. B. `"20017:3000"`. Der Host-Port wird automatisch aus einem freien Bereich vergeben (Vorschlag `20000–29999`, änderbar). Die Firewall der VM muss ihn im Schulnetz freigeben.
- Services ohne `ports:` bleiben nur untereinander erreichbar.
- **`ProjectPort` ist die Quelle der Host-Ports**, keine Kopie: Host-Ports entstehen nur in unserer Override-Datei, und die wird aus dieser Tabelle erzeugt. Abgleich bei jedem Deploy in einer Transaktion:
  - Gleicher Service mit gleichem Container-Port und Protokoll behält seinen Host-Port, die Adresse bleibt über Redeploys stabil.
  - Neue `ports:`-Einträge bekommen einen freien Port aus dem Bereich.
  - Nicht mehr vorhandene Einträge werden gelöscht, der Port wird frei.
  - `hostPort` ist global unique, das verhindert Doppelvergabe auch bei gleichzeitigen Deploys.
  - Beim Löschen eines Projekts verschwinden die Ports per Cascade.
- Das UI zeigt pro Projekt eine Tabelle: Service, Container-Port, `VM-IP:Host-Port`.

## Compose-Prüfer (Sicherheit)

Vor dem Deploy wird die Compose-Datei geprüft und angepasst:
- **Ablehnen** bei `privileged`, `network_mode: host`, `/var/run/docker.sock` und absoluten Host-Pfaden als Volume. Sonst kann ein Schüler die VM übernehmen.
- **Relative Bind-Mounts innerhalb des Repos erlauben** (z. B. `./nginx/nginx.conf`, `../src`), solange sie nicht aus dem geklonten Repo herausführen. Typische Schülerprojekte nutzen sie, ein pauschales Verbot würde sie blockieren.
- Host-Ports umschreiben (siehe oben).
- CPU/RAM-Limits **pro Service/Container** einsetzen.
- Anonyme Volumes (vom Image per `VOLUME` angelegt) als benannte Volumes setzen, damit das Löschen sie mit entfernt (siehe Dokploy-Erkenntnisse).

**Umsetzung (im Spike verifiziert):** Die Git-Quelle bleibt erhalten, denn mit `raw` fehlt das Repo und `build:` sowie relative Bind-Mounts zeigen ins Leere. Stattdessen:
1. Compose aus dem Repo lesen: `compose.loadServices` mit `type: 'fetch'` klont, danach liefert `compose.getConvertedCompose` die Datei.
2. Prüfen und eine Override-Datei erzeugen (`ports: !override` für die Host-Ports, `deploy.resources.limits` für CPU/RAM).
3. Override per `mounts.create` (`type: 'file'`, `serviceType: 'compose'`) ablegen; sie landet unter `/etc/dokploy/compose/<appName>/files/`.
4. Eigenen `command` setzen, der den Override per `-f` dazunimmt, z. B. `compose -p <appName> --env-file <dir>/.env -f ./<composePath> -f /etc/dokploy/compose/<appName>/files/<override> up -d --build --remove-orphans`.
   - Ohne führendes `docker`, Dokploy setzt es selbst davor.
   - Ohne `--project-directory`, sonst werden relative Build-Pfade falsch aufgelöst.

## Limits

Auflösung: **Schüler überschreibt Klasse, Klasse überschreibt global.** Lehrer können alle drei Ebenen einstellen (global für alle, pro Klasse, pro Schüler).

| Limit | Bedeutung |
|---|---|
| Max. angelegte Projekte | pro Schüler |
| Max. gleichzeitig laufende Projekte | pro Schüler |
| CPU / RAM | pro Container bzw. Service |
| Speicher | **vorerst weggelassen, vorgemerkt** |

Verhalten bei Erreichen: Nur **Erstellen und Starten** werden blockiert. Laufende Projekte bleiben an. Der Schüler bekommt die Meldung, sich an den Lehrer zu wenden. Weitere Limits (z. B. Mitglieder pro Gruppe) sind nicht nötig.

**Vorgemerktes Speicher-Limit:** Nahe am Limit darf nichts Neues erstellt werden, über dem Limit ebenso nicht. Die Messung geht über die Dokploy-API: `dockerVolume.getVolumesSize` liefert Name und Größe als String (z. B. `"40.01MB"`), die Zuordnung zum Projekt läuft über das Namenspräfix `<appName>_`. Ein Hilfsdienst in der VM ist nicht nötig.

## Monitoring und Logs

Logs, Status und Metriken von Dokploy werden **einfach durchgereicht**. Ob live (WebSocket) oder per Neuladen, ist noch nicht entschieden.

## Dokploy-Erkenntnisse (Spike, Dokploy v0.30.8)

- **Abbildung:** ein Dokploy-Projekt pro HTL-Projekt. `project.create` liefert `{ project, environment }` (Standard-Environment `production`), das Compose hängt am Environment. In der DB speichern: `dokployProjectId`, `composeId`, `appName`.
- **Öffentliche GitLab-Repos** brauchen keinen Git-Provider: `sourceType: 'git'`, `customGitUrl`, `customGitBranch`, `composePath`.
- **Neue Composes** haben `autoDeploy: true` und ein `refreshToken` (Webhook-URL). Beim Anlegen `autoDeploy` abschalten, da nur per Klick deployt wird.
- **`composeStatus` beschreibt das Deployment, nicht die Container:** `running` = Deploy läuft, `done` = Deploy fertig bzw. gestartet, `idle` = gestoppt, `error` = Deploy fehlgeschlagen. Ob ein Container abgestürzt ist, zeigt nur der Container-State aus `docker.getContainersByAppNameMatch` (`running`/`exited`).
- **Logs:** `compose.readLogs` braucht eine `containerId` und liefert Text mit Zeitstempeln. Container heißen `<appName>-<service>-<n>`, darüber läuft die Zuordnung zum Service.
- **Fehlgeschlagene Deploys:** `errorMessage` bleibt `null`, der Grund (z. B. `port is already allocated`) steht nur in `deployment.readLogs`.
- **Ports:** Ohne Umschreiben scheitert der Deploy bei belegten Ports (80/443 belegt Traefik von Dokploy). Veröffentlichte Ports waren vom Entwicklungsrechner aus erreichbar (HTTP und Postgres).
- **Löschen:** `compose.delete` mit `deleteVolumes: true` entfernt Container und benannte Volumes, danach `project.remove`. **Anonyme Volumes bleiben liegen** und tragen kein Compose-Label, deshalb im Override benennen (siehe Compose-Prüfer).
- **Firewall (nicht geprüft):** Von Docker veröffentlichte Ports umgehen `ufw` in der Regel. Die Freigabe nur fürs Schulnetz muss über die `DOCKER-USER`-Chain oder die Netzwerkseite laufen.

## Plan (jede Etappe endet lauffähig)

1. ~~**Dokploy-Spike:**~~ **Erledigt** (Ergebnisse siehe Dokploy-Erkenntnisse und Compose-Prüfer). `DOKPLOY_URL` und `DOKPLOY_API_KEY` in `.env`/`env.validation.ts`, ein `DokployService`. Manuell testen: Compose aus öffentlichem GitLab-Repo anlegen, deployen, stoppen, löschen. Klären, ob Compose-Umschreiben (Ports, Limits) über Dokploy geht oder wir die Datei selbst holen und "raw" übergeben müssen. Außerdem Logs/Metriken und die Port-Bereichsgröße prüfen.
2. ~~**Datenmodell:**~~ **Erledigt** (Migration `add_projects_and_limits`). `User.className`, `Project`, `ProjectMember`, `ProjectPort`, `Limit`; Migration.
3. ~~**Rollen:**~~ **Erledigt.** Austauschbare Namensregel, `RolesGuard`, `@Roles()`. Dabei Umstellung von zod auf class-validator/class-transformer.
4. ~~**Projekt-CRUD**~~ **Umgesetzt** (`server/src/project/`, noch nicht gegen die laufende Dokploy-Instanz getestet). `POST/GET/PATCH/DELETE /projects`: Anlegen erzeugt Dokploy-Projekt + Compose (Git-Quelle, `autoDeploy` aus), speichert die IDs und macht den Ersteller zum `OWNER`. Ansehen: Mitglieder und Lehrer (Nicht-Mitglieder bekommen 404). Bearbeiten/Löschen: `OWNER` und Lehrer. Löschen entfernt zuerst Dokploy (inkl. Volumes), dann die DB. Mitglieder hinzufügen/entfernen kommt erst in Etappe 11.
5. **Deployment:** Repo-URL, Branch, Compose-Pfad, Compose-Prüfer, automatische Port-Vergabe.
6. **Start, Stopp, Status.**
7. **Limits** mit Prüfung vor Erstellen und Starten.
8. **Frontend Schüler:** Projektliste, Anlegen, Detailseite, Deploy, Limit-Meldung.
9. **Frontend Lehrer:** alle Projekte, Benutzer, Limit-Verwaltung.
10. **Logs und Monitoring.**
11. **Gruppen-UI:** Mitglieder hinzufügen und entfernen.
12. **Tests und Doku** (technisch und Benutzer).

## Offene Punkte

- Endgültige Lehrererkennung (Rücksprache mit dem Lehrer), betrifft nur `classifyUser`.
- Speicher-Limit (Messung geht per API, Umsetzung noch offen).
- Firewall-Regeln der VM für den Port-Bereich (nur Schulnetz, `DOCKER-USER`-Chain).
- Logs live oder per Neuladen.
- Domain-/Subdomain-Variante (`projektname.htl-dock.htl-villach.at`) bleibt optional für später.
- Skalierung (Anzahl Schüler, Serverausstattung) ist bewusst noch nicht relevant.
