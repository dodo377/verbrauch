# Verbrauch-App Backend

Node.js/Express/Apollo-GraphQL Backend für das Verbrauchs-Dashboard.

## Voraussetzungen

- Node.js 18+
- MongoDB (lokal oder remote)

## Installation

```bash
npm install
```

## Konfiguration

```bash
cp .env.example .env
```

Wichtige Variablen:

- `JWT_SECRET` (Pflicht)
- `MONGO_URI` (Pflicht für Docker/Remote-DB)
- `PORT` (Standard: `4000`)
- `MAX_FAILED_LOGIN_ATTEMPTS` (Standard: `5`)
- `LOGIN_LOCK_MINUTES` (Standard: `15`)

Hinweis zu sensiblen Daten:

- Keine echten Secrets in README, Dockerfile oder Repository hinterlegen.
- Für Doku und Beispiele nur Platzhalter verwenden.

## Start

```bash
node server.js
```

GraphQL Endpoint:

- `http://localhost:4000/graphql`

## Docker

Das Backend kann direkt als Container gestartet werden.

Datei:

- `Dockerfile`

Beispiel (Compose nutzt diese Variablen):

- `MONGO_URI=mongodb://vtracker-db:27017/verbrauch` (interne Compose-DB)
- `MONGO_URI=mongodb://host.docker.internal:27018/verbrauch` (bestehende Host-DB)

Die bestehende Logik im `ReadingService` für `user_id` und `userId` bleibt durch den Docker-Betrieb unverändert.

## Tests

```bash
npm test
```

Aktueller Stand:

- 4 Test-Suites
- 32 Tests

### Testumfang

- Services: `ReadingService`, `DashboardInsightsService`, `AuthService`
- Integration: Auth-Context (`buildContext`) inkl. JWT-Verifikation

### Gezielte Testläufe

Nur ReadingService:

```bash
npx jest tests/services/ReadingService.test.js
```

Nur AuthService:

```bash
npx jest tests/services/AuthService.test.js
```

### Erwartetes Ergebnis

- Alle Test-Suites grün (`PASS`)
- Keine offenen Handles / keine hängenden Prozesse

### Typische Fehler & Hinweise

- **MongoDB nicht erreichbar**: lokale DB starten bzw. Verbindungsstring prüfen
- **Environment fehlt**: `.env` aus `.env.example` erzeugen
- **Port-Konflikt**: laufenden Server stoppen oder Port anpassen
- **Flaky Zeitreihen-Tests**: Zeitzonen-/Datumsnormalisierung prüfen (Berlin/UTC-Kontext)

## Kernfunktionen

- Reading CRUD (`addReading`, `updateReading`, `deleteReading`)
- Chartdaten-Aufbereitung inkl. Urlaubssensitivität
- Waste-Summary
- AI-Insights (Trend, Anomalien)
- Vacation-Period Verwaltung
- JWT Auth + Login-Lockout

## Architektur

- `src/models` → Persistenz
- `src/services` → Geschäftslogik
- `src/resolvers` → GraphQL-Orchestrierung
- `src/schema` → API-Verträge
