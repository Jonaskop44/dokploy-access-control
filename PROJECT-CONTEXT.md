# HTL-Dock: Projektkontext

Stand: 2026-10-07. Dieses Dokument hält fest, was im Gespräch über das Projekt geklärt wurde. Grundlage ist der Projektauftrag (Projektbeginn 28.09.2026, Auftraggeber HTL Villach). Meilensteine aus dem Auftrag sind für die Planung nicht maßgeblich.

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

Noch **nicht** vorhanden: Dokploy-Anbindung, Projekte, Git/Deployments, Limits, `RolesGuard`, Lehrer-Dashboard, Logs/Monitoring, Tests.

## Rollen

- Nur `TEACHER` und `STUDENT`. Eine Admin-Rolle gibt es nicht (im Auftrag erwähnt, wird gestrichen).
- **Lehrererkennung (vorläufig):** Ein Name mit Suffix `, <Klasse>` ist ein Schüler, z. B. `KROPIUNIG Jonas Leon, 5AHITN`. Alles andere ist ein Lehrer. Die Regel (ca. `,\s*\d[A-Z]+$`) kommt in **eine austauschbare Funktion**.
- **Offen:** Die endgültige Methode klärt Jonas am Montag mit seinem Lehrer. Alternativen waren Entra-Gruppen-Claim, Entra-Attribute oder eine Allowlist.
- Die Klasse wird beim Login aus dem Namen gelesen und als Feld am `User` gespeichert. Sie aktualisiert sich bei jedem Login (Klassenwechsel).
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
- Das UI zeigt pro Projekt eine Tabelle: Service, Container-Port, `VM-IP:Host-Port`.

## Compose-Prüfer (Sicherheit)

Vor dem Deploy wird die Compose-Datei geprüft und angepasst:
- **Ablehnen** bei `privileged`, `network_mode: host`, `/var/run/docker.sock` und Host-Pfaden als Volume. Sonst kann ein Schüler die VM übernehmen.
- Host-Ports umschreiben (siehe oben).
- CPU/RAM-Limits **pro Service/Container** einsetzen.

## Limits

Auflösung: **Schüler überschreibt Klasse, Klasse überschreibt global.** Lehrer können alle drei Ebenen einstellen (global für alle, pro Klasse, pro Schüler).

| Limit | Bedeutung |
|---|---|
| Max. angelegte Projekte | pro Schüler |
| Max. gleichzeitig laufende Projekte | pro Schüler |
| CPU / RAM | pro Container bzw. Service |
| Speicher | **vorerst weggelassen, vorgemerkt** |

Verhalten bei Erreichen: Nur **Erstellen und Starten** werden blockiert. Laufende Projekte bleiben an. Der Schüler bekommt die Meldung, sich an den Lehrer zu wenden. Weitere Limits (z. B. Mitglieder pro Gruppe) sind nicht nötig.

**Vorgemerktes Speicher-Limit:** Nahe am Limit darf nichts Neues erstellt werden, über dem Limit ebenso nicht. Die Messung der Volume-Größen ist nicht über die Dokploy-API sicher möglich und bräuchte z. B. einen Hilfsdienst in der VM.

## Monitoring und Logs

Logs, Status und Metriken von Dokploy werden **einfach durchgereicht**. Ob live (WebSocket) oder per Neuladen, ist noch nicht entschieden.

## Plan (jede Etappe endet lauffähig)

1. **Dokploy-Spike:** `DOKPLOY_URL` und `DOKPLOY_API_KEY` in `.env`/`env.validation.ts`, ein `DokployService`. Manuell testen: Compose aus öffentlichem GitLab-Repo anlegen, deployen, stoppen, löschen. Klären, ob Compose-Umschreiben (Ports, Limits) über Dokploy geht oder wir die Datei selbst holen und "raw" übergeben müssen. Außerdem Logs/Metriken und die Port-Bereichsgröße prüfen.
2. **Datenmodell:** `User.className`, `Project`, `ProjectMember`, `Limit`; Migration.
3. **Rollen:** austauschbare Namensregel, `RolesGuard`, `@Roles()`.
4. **Projekt-CRUD** mit Mitglieder-Checks.
5. **Deployment:** Repo-URL, Branch, Compose-Pfad, Compose-Prüfer, automatische Port-Vergabe.
6. **Start, Stopp, Status.**
7. **Limits** mit Prüfung vor Erstellen und Starten.
8. **Frontend Schüler:** Projektliste, Anlegen, Detailseite, Deploy, Limit-Meldung.
9. **Frontend Lehrer:** alle Projekte, Benutzer, Limit-Verwaltung.
10. **Logs und Monitoring.**
11. **Gruppen-UI:** Mitglieder hinzufügen und entfernen.
12. **Tests und Doku** (technisch und Benutzer).

## Offene Punkte

- Endgültige Lehrererkennung (Montag, Rücksprache mit dem Lehrer).
- Speicher-Limit und Messung der Volume-Größen.
- Logs live oder per Neuladen.
- Dokploy-URL und API-Key der VM eintragen (nicht im Chat teilen, nur in `server/.env`).
- Domain-/Subdomain-Variante (`projektname.htl-dock.htl-villach.at`) bleibt optional für später.
- Skalierung (Anzahl Schüler, Serverausstattung) ist bewusst noch nicht relevant.
