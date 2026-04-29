# Verbrauch-App Frontend

React + Vite Frontend für das Verbrauchs-Dashboard.

## Features (UI)

- Zeitraumfilter: 7 Tage, 30 Tage, Monat, Jahr
- Statistik-Kacheln inkl. aktuellem Periodenwert
- Eigene Seite „AI Insights" als zusätzlicher Button in der oberen Typ-Navigation
- Typ-Tabs auf der AI-Insights-Seite (Haushaltsstrom, Wärmepumpe, Wasser, Temperatur)
- Konfigurierbare Anomalie-Schwellen (IQR + Z-Score) direkt auf der AI-Insights-Seite
- Badge in der ersten Zeile nur auf „AI Insights", wenn Auffälligkeiten vorhanden sind
- Letzte Einträge mit Einheiten (`kWh`, `m³`, `°C`)
- Inline Edit/Delete für Einträge
- Urlaubseintrag per einblendbarem Formular
- Mobile-optimierte Filter-/Select-Anordnung

## Voraussetzungen

- Node.js 18+
- laufendes Backend auf `http://localhost:4000`

## Installation

```bash
npm install
```

## Entwicklung

```bash
npm run dev
```

Frontend läuft standardmäßig auf `http://localhost:5173`.

## Build

```bash
npm run build
```

## Preview

```bash
npm run preview
```

## Lint

```bash
npm run lint
```

## Build-Check

```bash
npm run build
```

## API-Anbindung

Das Frontend nutzt `/graphql` als Endpoint. In der Vite-Konfiguration ist dafür ein Proxy auf das Backend gesetzt:

- `/graphql` -> `http://localhost:4000`

Damit sind im Frontend keine hardcodierten IP-Adressen nötig.

## Docker (Produktion)

Das Frontend wird per Multi-Stage-Build gebaut und über Nginx ausgeliefert.

Dateien:

- `Dockerfile`
- `nginx/default.conf.template`

Im Compose läuft das Frontend auf Container-Port `5173` und wird standardmäßig auf Host-Port `8080` gemappt (konfigurierbar über `FRONTEND_HOST_PORT`).

Wichtiger Hinweis:

- Keine sensiblen Werte direkt in Dockerfile oder Nginx-Konfiguration eintragen.
- Backend-Upstream wird über Environment (`BACKEND_UPSTREAM`) gesetzt.
