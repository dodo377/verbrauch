# Verbrauch New

Energie-, Wasser-, Temperatur- und Müll-Dashboard mit Node.js/GraphQL-Backend, MongoDB und React/Tailwind-Frontend.

## Ziel des Projekts

Das Projekt dokumentiert und analysiert Verbrauchs- und Umweltdaten mit einem klaren Fokus auf:

- korrekte fachliche Auswertung statt reiner Rohdatenanzeige
- AI-First-Denke für Insights und Auffälligkeitserkennung
- Clean Code und Clean Architecture
- testbare Business-Logik mit TDD-orientierter Entwicklung

## Kernfunktionen

### Verbrauchsauswertung

- Haushaltsstrom und Wärmepumpe als Verbrauchsdifferenzen zwischen zwei Zählerständen
- Wasser als Verbrauch auf Basis der wöchentlichen Ablesungen
- Außentemperatur als Realwertverlauf
- Müll als Dokumentation nach Tonnenart und Anzahl der Rausstellungen
- Urlaubszeiträume zur automatischen Glättung bei fehlenden Mess-Tagen

### Dashboard-Features

- Zeitraumfilter für letzte 7 Tage, letzte 30 Tage und Monatsansichten
- Statistik-Kacheln je Datentyp
- Diagramme mit `Recharts`
- AI-Insights mit Trend- und Anomalie-Erkennung
- klickbare Strom-Auffälligkeiten mit Bemerkungsfunktion
- Dokumentation von Müll-Rausstellungen nach Art und Häufigkeit
- Urlaub im Frontend eintragen/löschen (Start/Ende + optionale Notiz)

## Tech Stack

### Backend

- Node.js
- Express
- Apollo GraphQL Server
- Mongoose / MongoDB

### Frontend

- React
- Vite
- Tailwind CSS
- `urql` für GraphQL
- `recharts` für Visualisierung

### Tests / Qualität

- Jest
- mongodb-memory-server
- ESLint

## Projektstruktur

```text
verbrauch_new/
├── backend/
│   ├── server.js
│   └── src/
│       ├── context/          # JWT-Context (buildContext)
│       ├── models/
│       │   └── VacationPeriod.js
│       ├── resolvers/
│       │   └── requireAuth.js  # zentraler Auth-Guard
│       ├── schema/
│       └── services/
│           ├── AuthService.js    # Registrierung, Login, Lockout, JWT-Verify
│           ├── DashboardInsightsService.js
│           └── ReadingService.js
├── frontend/
│   └── src/
│       ├── components/
│       ├── graphql/
│       ├── lib/
│       └── pages/
│           └── Login.jsx       # Fehler-Mapping, Lockout-Meldung
├── demo_readings_import.json
└── README.md
```

## Architekturprinzipien

## AI-First Ansatz

AI-First bedeutet in diesem Projekt nicht, dass UI-Komponenten selbst "intelligent" rechnen. Stattdessen werden Erkenntnisse systematisch im Backend vorbereitet und dem Frontend als saubere, konsumierbare Daten bereitgestellt.

Konkret:

- Business- und Analyse-Logik liegen in Services
- das Frontend ist Presenter, nicht Rechenkern
- Insights werden als API-Vertrag modelliert
- Auffälligkeiten, Trends und Kennzahlen entstehen im Backend und werden im Frontend nur visualisiert

Beispiel:

- `DashboardInsightsService` berechnet Trend, Mittelwerte, Min/Max und Anomalien
- `ReadingService` liefert fachlich korrekte Diagrammdaten
- React-Komponenten rendern nur den Zustand und die Daten

## Clean Architecture

Die Struktur folgt einer pragmatischen Clean-Architecture-Ausrichtung:

- `models/`: Persistenzmodell
- `services/`: Domänenlogik und Anwendungslogik
- `resolvers/`: API-Schicht / Orchestrierung
- `schema/`: GraphQL-Verträge
- `pages/` und `components/`: Darstellungsschicht

### Wichtige Regel

Fachlogik gehört nicht in Komponenten.

Das bedeutet konkret:

- keine Verbrauchsberechnung in React-Komponenten
- keine Anomalie-Erkennung im Frontend
- keine Dateninterpretation im JSX
- UI rendert nur bereits vorbereitete Ergebnisse

## Clean Code Leitlinien

- kleine, klar benannte Methoden
- sprechende Domänenbegriffe (`getChartData`, `getWasteSummary`, `build`, `detectAnomalies`)
- Single Responsibility pro Service-Methode
- defensive Verarbeitung gemischter Datenformate
- keine unnötige Kopplung zwischen Frontend und Berechnungslogik

## TDD-Ansatz

Der gewünschte Entwicklungsstil ist TDD-orientiert.

Aktueller Stand:

- Service-Tests für `ReadingService` und `DashboardInsightsService` sind vorhanden und ausgebaut
- zentrale fachliche Pfade und Randfälle sind in der Service-Schicht abgesichert
- der Fokus bleibt weiterhin auf weiterem Ausbau der Testabdeckung
- Zielzustand bleibt: neue Fachlogik zuerst als Test beschreiben, dann implementieren

### Empfehlung für neue Features

1. fachliche Regel beschreiben
2. Test für den Service schreiben
3. minimale Implementierung erstellen
4. refactoren
5. erst danach UI anbinden

### Besonders testrelevante Bereiche

- Differenzberechnung aus Zählerständen
- Referenzwert vor einem Zeitfenster
- Wasser-Auswertung mit Wochenlogik
- Temperatur-Auswertung ohne Differenzbildung
- Anomalie-Erkennung
- Müll-Auswertung nach Tonnenart und Anzahl
- Umgang mit migrierten Daten (`user_id`) und neuen Daten (`userId`)

## Datenmodell / wichtige Domänenregeln

### Readings

Es existieren verschiedene `ReadingType`-Werte:

- `household`
- `heatpump`
- `water`
- `temperature`
- `waste`

### Besondere Migrationsregel

Historische Daten verwenden teilweise `user_id`, neuere Einträge `userId`.

Darauf ist die Service-Schicht vorbereitet und berücksichtigt beide Felder in den Abfragen.

### Fachlogik je Typ

#### Strom / Wärmepumpe

- Eingabe: Zählerstand
- Anzeige im Diagramm: Differenz zwischen zwei Ablesungen
- Statistik: durchschnittlicher Tagesverbrauch im gewählten Zeitraum
- Bei Messlücken wird Verbrauch auf Tage verteilt; Urlaubstage werden mit 0 berücksichtigt

#### Wasser

- Eingabe: Zählerstand
- Anzeige: Verbrauchsereignisse auf Basis der Abstände zwischen Ablesungen
- Statistik: durchschnittlicher Wochenverbrauch

#### Außentemperatur

- Eingabe: Messwert
- Anzeige: Realwert, keine Differenzbildung
- Statistik: Durchschnitt sowie Min/Max
- keine Anomalieanzeige im UI

#### Müll

- Eingabe: Tonnenart / Rausstellung
- Anzeige: einfache Auswertung nach Art und Anzahl
- Dokumentation: letztes Datum der Rausstellung pro Tonnenart

## Authentifizierung

Die Authentifizierung verwendet JWT (JSON Web Tokens).

### Ablauf

1. Client meldet sich via `login(username, password)` an
2. Backend gibt ein JWT zurück, das der Client in `localStorage` speichert
3. Bei jedem GraphQL-Request sendet der Client `Authorization: Bearer <token>`
4. `buildContext` (`src/context/buildContext.js`) liest den Header aus, verifiziert das Token und lädt den User aus der DB
5. Apollo Server stellt den aufgelösten User als `context.user` bereit
6. Resolver prüfen Zugriff via `requireAuth(context)` (einheitlicher Guard)

### Schutz gegen Brute-Force

- Nach 5 Fehlversuchen wird der Benutzername für 15 Minuten gesperrt
- Konfigurierbar über Umgebungsvariablen: `MAX_FAILED_LOGIN_ATTEMPTS`, `LOGIN_LOCK_MINUTES`
- Erfolgreiches Login setzt Fehlversuche zurück
- Lockout-State ist in-memory pro Prozess (für Single-Instanz ausreichend)

### Umgebungsvariablen

| Variable | Standard | Bedeutung |
|---|---|---|
| `JWT_SECRET` | – | Signaturschlüssel für JWTs, **muss gesetzt sein** |
| `MAX_FAILED_LOGIN_ATTEMPTS` | `5` | Fehlversuche bis zur Sperre |
| `LOGIN_LOCK_MINUTES` | `15` | Sperrdauer in Minuten |
| `PORT` | `4000` | Port des GraphQL-Servers |

Setup:

```bash
cd backend
cp .env.example .env
# .env öffnen und JWT_SECRET durch ein sicheres Geheimnis ersetzen
```

Die `.env` ist über `.gitignore` vom Commit ausgeschlossen. Die `.env.example` wird eingecheckt und dient als Vorlage.

### GraphQL Auth-Schema

```graphql
mutation Register($username: String!, $password: String!, $firstName: String, $lastName: String) {
  register(username: $username, password: $password, firstName: $firstName, lastName: $lastName) {
    token
    user { id username }
  }
}

mutation Login($username: String!, $password: String!) {
  login(username: $username, password: $password) {
    token
    user { id username }
  }
}
```

## GraphQL-Grundsätze

- Enums werden als Enums verwendet, nicht als freie Strings
- `ReadingType` muss in Queries und Mutations korrekt typisiert sein
- Auth-Parameter heißen `password` (nicht `passwordHash`) in der öffentlichen API
- Query-Verträge sollen UI-freundlich und explizit sein

Beispiel:

- `getChartData(type: ReadingType!, ...)`
- `getDashboardInsights(type: ReadingType!, ...)`
- `getWasteSummary(...)`
- `getVacationPeriods()`
- `addVacationPeriod(startDate, endDate, note)`
- `deleteVacationPeriod(id)`
- `addReading(type, value, note, subtype)`
- `updateReading(id, value, note, subtype)`
- `deleteReading(id)`

### Urlaub (GraphQL)

```graphql
query {
  getVacationPeriods {
    id
    startDate
    endDate
    note
  }
}

mutation {
  addVacationPeriod(startDate: "2026-03-29", endDate: "2026-04-05", note: "Urlaub") {
    id
    startDate
    endDate
    note
  }
}
```

### Ablesungen (GraphQL)

Ablesungen können erstellt, gelesen, aktualisiert und gelöscht werden.

```graphql
mutation AddReading($type: ReadingType!, $value: Float!, $note: String, $subtype: String) {
  addReading(type: $type, value: $value, note: $note, subtype: $subtype) {
    id
    type
    value
    timestamp
    note
  }
}

mutation UpdateReading($id: ID!, $value: Float, $note: String, $subtype: String) {
  updateReading(id: $id, value: $value, note: $note, subtype: $subtype) {
    id
    type
    value
    timestamp
    note
  }
}

mutation DeleteReading($id: ID!) {
  deleteReading(id: $id)
}

query GetReadings($type: ReadingType!, $limit: Int) {
  getReadings(type: $type, limit: $limit) {
    id
    type
    value
    timestamp
    note
    subtype
  }
}
```

## Lokale Entwicklung

## Voraussetzungen

- Node.js
- npm
- laufende MongoDB-Instanz

## Backend starten

Aus dem Ordner [backend](backend):

```bash
cp .env.example .env   # einmalig: Vorlage kopieren und JWT_SECRET anpassen
node server.js
```

Hinweis: Der Server verbindet sich mit MongoDB und stellt GraphQL unter `http://localhost:4000/graphql` bereit.

## Frontend starten

Aus dem Ordner [frontend](frontend):

- `npm run dev`

Standardmäßig läuft das Frontend unter `http://localhost:5173/`.

## Zugriff im Heimnetz

Für den Zugriff von anderen Geräten im selben WLAN:

1. Backend starten:

```bash
cd backend
node server.js
```

2. Frontend starten:

```bash
cd ../frontend
npm run dev
```

3. Auf dem anderen Gerät öffnen:

- `http://<server-ip>:5173`

Beispiel:

- `http://192.168.178.33:5173`

Hinweis: Ohne HTTPS ist die klassische „Installieren als App“-Funktion je nach Browser/Plattform eingeschränkt.

## Tests ausführen

Backend-Tests aus dem Ordner [backend](backend):

- `npm test`

Der aktuelle Fokus der Tests liegt auf der Service-Schicht und dem Auth-Context, insbesondere auf:

- Zählerstands-Differenzlogik
- Referenzwerten vor Zeitfenstern
- Müll-Auswertung
- Bemerkungs-Updates
- AI-Insights und Anomalie-Erkennung
- JWT-Context-Aufbau (mit/ohne Token, ungültiges Token)
- Login-Lockout nach Fehlversuchen
- Reset des Lockouts bei erfolgreichem Login

Aktueller Teststatus: 4 Suites, 29 Tests, alle grün (+3 Tests für `updateReading` und `deleteReading`).

## Entwicklungsworkflow

Empfohlene Reihenfolge für neue Features:

1. Domänenregel definieren
2. Service-Test schreiben
3. Service implementieren
4. GraphQL-Vertrag ergänzen
5. Resolver anbinden
6. Frontend konsumiert nur den API-Vertrag
7. UI verfeinern

## Bestehende Services

### `AuthService`

Verantwortlich für:

- Benutzerregistrierung mit gehashtem Passwort (`bcryptjs`)
- Login mit Passwortprüfung
- JWT-Generierung und -Verifizierung
- in-memory Brute-Force-Lockout (username-basiert, konfigurierbar)

### `ReadingService`

Verantwortlich für:

- Speichern neuer Readings (`addReading`)
- Laden von Readings (`getReadings`)
- Aktualisierung von Readings (`updateReading`)
- Löschen von Readings (`deleteReading`)
- Aufbereitung der Chart-Daten (`getChartData`)
- Müll-Auswertung (`getWasteSummary`)
- Aktualisierung von Bemerkungen (`updateReadingNote`)
- Urlaubssensitive Tagesverteilung bei Messlücken
- Verwalten von Urlaubszeiträumen (`getVacationPeriods`, `addVacationPeriod`, `deleteVacationPeriod`)

### `DashboardInsightsService`

Verantwortlich für:

- Durchschnittswerte
- Min/Max
- Trendbewertung
- Anomalie-Erkennung
- textuelle AI-Insights

## UI-Verhalten

- `ConsumptionChart` visualisiert Daten, berechnet sie aber nicht fachlich neu
- `Dashboard` orchestriert Auswahl, Abfragen und Darstellung
- Auffällige Stromwerte sind klickbar und können mit Bemerkungen versehen werden
- Urlaubstage können direkt im Dashboard gepflegt werden und werden im Chart berücksichtigt
- **Inline-Edit/Delete**: in der Liste „Letzte Einträge" können Ablesungen durch Klick auf „Bearbeiten" direkt editiert werden (Wert, Notiz, Subtype)
- **Toast-Feedback**: Nach Speichern oder Löschen erscheint eine kurze Bestätigung / Fehlerbenachrichtigung unten rechts

## Nächste sinnvolle Ausbaustufen

- konfigurierbare Schwellenwerte für Anomalie-Erkennung
- Hervorhebung auffälliger Punkte direkt im Diagramm
- Export / Reporting
- dedizierte Waste-Planung mit nächstem Abholtermin
- Login-Lockout auf Redis-Basis für Produktivbetrieb mit mehreren Instanzen
- Bulk-Import / CSV-Upload von Ablesungen

## Dokumentationsprinzip

Diese README ist bewusst architekturorientiert gehalten.

Wenn neue Features ergänzt werden, sollte immer dokumentiert werden:

- welche Domänenregel gilt
- in welchem Service die Logik liegt
- wie der GraphQL-Vertrag aussieht
- wie das Frontend die Daten konsumiert
- welche Tests ergänzt werden müssen

## Entwicklersektion

Diese Sektion dient als kompakte Arbeitsgrundlage für neue Features und Refactorings.

### Definition of Done

Ein Feature gilt erst dann als fertig, wenn alle folgenden Punkte erfüllt sind:

- die fachliche Regel ist eindeutig beschrieben
- die Business-Logik liegt in einem Service und nicht in der UI
- der GraphQL-Vertrag ist klar und explizit modelliert
- das Frontend konsumiert nur vorbereitete Daten
- relevante Tests wurden ergänzt oder angepasst
- vorhandene Funktionen wurden nicht unbeabsichtigt beschädigt
- die README wurde aktualisiert, falls sich Architektur oder Domänenlogik geändert hat

### Test-Checkliste

Bei neuen Features sollten mindestens folgende Fragen beantwortet werden:

- Ist die Kernlogik isoliert in einer testbaren Service-Methode?
- Gibt es Tests für Normalfälle?
- Gibt es Tests für Randfälle?
- Gibt es Tests für fehlerhafte oder unvollständige Daten?
- Wurden Migrationsbesonderheiten wie `user_id` und `userId` berücksichtigt?
- Ist das Verhalten über Zeiträume hinweg korrekt (7 Tage, 30 Tage, Monat)?
- Ist Auth-Schutz vorhanden, wenn der Resolver Nutzerdaten verwendet?
- Werden fehlende oder ungültige Tokens sauber abgefangen?

### Frontend-Komponenten

#### `Toast`

Einfache Benachrichtigungskomponente für Erfolgs- und Fehlermeldungen. Auto-Closes nach 3 Sekunden.

- Position: unten rechts, `z-50`
- Typen: `success` (grün) oder `error` (rot)
- verwendet in `Dashboard` für Feedback zu Speichern/Löschen/Fehler
- optional mit onClose-Callback für benutzerdefinierte Cleanup-Logik

### Architekturregeln für neue Features

#### 1. Keine Fachlogik in React-Komponenten

Nicht erlaubt:

- Berechnung von Verbrauchsdifferenzen im JSX
- Anomalie-Erkennung in Komponenten
- Interpretation von Rohdaten direkt im Frontend

Erlaubt:

- Rendering vorbereiteter Daten
- UI-States wie Loading, Error, Empty, Success
- Benutzerinteraktionen wie Filter, Auswahl, Formulare

#### 2. Services kapseln die Domänenlogik

Neue fachliche Regeln gehören in die Service-Schicht, z. B.:

- `ReadingService`
- `DashboardInsightsService`
- zukünftige spezialisierte Services wie `WastePlanningService` oder `ForecastService`

#### 3. Resolver orchestrieren nur

Resolver sollen:

- Requests validieren
- Services aufrufen
- Ergebnisse zurückgeben

Resolver sollen nicht:

- Fachregeln neu berechnen
- komplexe Datenaggregation enthalten
- UI-spezifische Sonderlogik implementieren

#### 4. GraphQL bewusst modellieren

Neue API-Felder sollen:

- klar benannt sein
- fachlich eindeutig sein
- möglichst UI-fertig sein
- keine unnötigen Rohdaten erzwingen, wenn ein fachliches DTO sinnvoller ist

#### 5. Refactoring-Regel

Wenn Logik in der UI auffällig komplex wird, ist das ein Signal, sie in einen Service zu verschieben.

### Empfohlener Workflow für neue Features

1. Fachregel formulieren
2. Ziel-Datenvertrag definieren
3. Testfälle skizzieren
4. Service implementieren
5. Resolver anbinden
6. Frontend minimal anbinden
7. README und ggf. Tests ergänzen

### Beispiel für gutes Vorgehen

Statt:

- Rohdaten im Frontend laden
- in Komponenten auswerten
- Sonderfälle per `if`-Logik im JSX behandeln

Besser:

- Service liefert bereits fachlich korrekte Kennzahlen
- GraphQL liefert strukturierte Daten
- Frontend rendert nur Karten, Listen und Diagramme
