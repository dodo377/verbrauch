# Verbrauch-App Frontend

React + Vite Frontend für das Verbrauchs-Dashboard.

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

## API-Anbindung

Das Frontend nutzt `/graphql` als Endpoint. In der Vite-Konfiguration ist dafür ein Proxy auf das Backend gesetzt:

- `/graphql` -> `http://localhost:4000`

Damit sind im Frontend keine hardcodierten IP-Adressen nötig.
