# Mole Database Manager - Technical Documentation

## System Architecture

Mole Database Manager ist eine moderne Web-Anwendung zur Verwaltung und Synchronisierung von Datenbankverbindungen. Das System besteht aus folgenden Komponenten:

### Komponenten

1. **React UI (mole-ui)**
   - Moderne Benutzeroberfläche basierend auf React und Material UI
   - Ermöglicht die Verwaltung von Datenbankverbindungen, das Durchsuchen von Tabellen und die Ausführung von SQL-Abfragen
   - Implementiert in JavaScript/React mit Material UI für das Styling

2. **Database Sync Service (db-sync)**
   - Python-basierter Dienst für die Synchronisierung von Daten zwischen Datenbanken
   - Plant und führt Synchronisierungsaufgaben aus
   - Unterstützt verschiedene Datenbanktypen (MySQL, PostgreSQL, SQLite)

3. **Node.js Backend Server**
   - Express-basierter API-Server für Datenbankverbindungsverwaltung
   - Stellt RESTful API-Endpunkte für Frontend-Operationen bereit
   - Verwaltet Datenbankverbindungen, Authentifizierung und E-Mail-Funktionalität
   - Speichert Datenbankverbindungen in JSON-Dateien (mit Fallback im Frontend über localStorage)

4. **Datenbank-Container**
   - MySQL: Container mit MySQL-Datenbankserver
   - PostgreSQL: Container mit PostgreSQL-Datenbankserver
   - InfluxDB: Container mit InfluxDB (optional)

## Datenbankschema

### Systemdatenbank

Die Mole-Anwendung verwendet eine interne Systemdatenbank zur Speicherung von Konfigurationen und Verbindungsinformationen. Die Daten werden in einer SQLite-Datenbank gespeichert (mole.db), die im Backend-Datenverzeichnis abgelegt ist.

#### Tabelle: database_connections

| Spaltenname   | Typ      | Beschreibung                           |
|---------------|----------|----------------------------------------|
| id            | INTEGER  | Primärschlüssel                        |
| name          | TEXT     | Benutzerfreundlicher Name der Verbindung |
| engine        | TEXT     | Datenbanktyp (PostgreSQL, MySQL, SQLite) |
| host          | TEXT     | Hostname oder IP-Adresse (bei SQLite leer) |
| port          | INTEGER  | Port (bei SQLite leer)                  |
| database      | TEXT     | Datenbankname oder Dateipfad bei SQLite |
| username      | TEXT     | Benutzername für die Verbindung        |
| password      | TEXT     | Passwort (verschlüsselt gespeichert)   |
| ssl_enabled   | BOOLEAN  | SSL-Verbindung aktiviert               |
| notes         | TEXT     | Benutzernotizen zur Verbindung         |
| isSample      | BOOLEAN  | Kennzeichen für Demo-Datenbankverbindung |
| created_at    | DATETIME | Erstellungszeit                        |
| last_connected| DATETIME | Zeitpunkt der letzten Verbindung       |

#### Tabelle: sync_tasks

| Spaltenname        | Typ      | Beschreibung                       |
|--------------------|----------|-----------------------------------|
| id                 | INTEGER  | Primärschlüssel                   |
| name               | TEXT     | Name der Synchronisierungsaufgabe |
| source_connection_id | INTEGER | FK auf database_connections.id   |
| target_connection_id | INTEGER | FK auf database_connections.id   |
| tables             | TEXT     | Zu synchronisierende Tabellen (JSON) |
| schedule           | TEXT     | Cron-Expression für die Planung   |
| last_sync          | DATETIME | Letzte erfolgreiche Synchronisierung |
| enabled            | BOOLEAN  | Aufgabe aktiviert                 |
| created_at         | DATETIME | Erstellungszeit                   |
| updated_at         | DATETIME | Letzte Aktualisierung             |

#### Tabelle: sync_logs

| Spaltenname | Typ      | Beschreibung                          |
|-------------|----------|--------------------------------------|
| id          | INTEGER  | Primärschlüssel                      |
| task_id     | INTEGER  | FK auf sync_tasks.id                 |
| start_time  | DATETIME | Startzeit                            |
| end_time    | DATETIME | Endzeit                              |
| status      | TEXT     | Status (success, error)              |
| message     | TEXT     | Detaillierte Nachricht oder Fehlermeldung |
| rows_synced | INTEGER  | Anzahl der synchronisierten Zeilen   |

## Datenbankmigrationen

### Migration 001 - Basistabellen (2023-06-01)

```sql
CREATE TABLE database_connections (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    engine TEXT NOT NULL,
    host TEXT,
    port INTEGER,
    database TEXT NOT NULL,
    username TEXT,
    password TEXT,
    ssl_enabled BOOLEAN DEFAULT 0,
    notes TEXT,
    isSample BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_connected DATETIME
);

CREATE TABLE sync_tasks (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    source_connection_id INTEGER,
    target_connection_id INTEGER,
    tables TEXT,
    schedule TEXT,
    last_sync DATETIME,
    enabled BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_connection_id) REFERENCES database_connections(id),
    FOREIGN KEY (target_connection_id) REFERENCES database_connections(id)
);

CREATE TABLE sync_logs (
    id INTEGER PRIMARY KEY,
    task_id INTEGER,
    start_time DATETIME,
    end_time DATETIME,
    status TEXT,
    message TEXT,
    rows_synced INTEGER,
    FOREIGN KEY (task_id) REFERENCES sync_tasks(id)
);
```

### Migration 002 - Erweiterung für Demo-Datenbanken (2023-11-10)

```sql
-- Falls isSample noch nicht existiert, fügen wir es hinzu
ALTER TABLE database_connections ADD COLUMN IF NOT EXISTS isSample BOOLEAN DEFAULT 0;

-- Index für schnellere Abfragen nach Demo-Datenbanken
CREATE INDEX IF NOT EXISTS idx_is_sample ON database_connections(isSample);
```

### Migration 003 - Umstellung auf SQLite-Datenbank (2024-08-01)

In dieser Migration wurden die Datenbankverbindungen von einer JSON-Datei zu einer SQLite-Datenbank migriert. Folgende Änderungen wurden vorgenommen:

1. Implementierung eines SQLite-Datenbank-Modells in `/app/backend/models/database.js`
2. Automatische Migration vorhandener Datenbankverbindungen aus `database_connections.json` in die SQLite-Datenbank
3. Aktualisierung des DatabaseController für SQLite-Operationen
4. Beibehaltung der Abwärtskompatibilität für ältere API-Endpunkte

Die SQLite-Datenbank bietet folgende Vorteile:
- Verbesserte Datenintegrität durch ACID-Eigenschaften
- Bessere Skalierbarkeit für größere Datenmengen
- Einfachere Abfrage- und Filtermöglichkeiten durch SQL
- Vorbereitung für zukünftige Erweiterungen wie Benutzerauthentifizierung

Die Migration läuft automatisch ab, wenn das Backend gestartet wird. Vorhandene Verbindungen in der JSON-Datei werden in die SQLite-Datenbank übertragen und die JSON-Datei wird mit der Erweiterung `.migrated` umbenannt.

```sql
-- SQLite-Tabellendefinitionen, wie in models/database.js implementiert
CREATE TABLE IF NOT EXISTS database_connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  engine TEXT NOT NULL,
  host TEXT,
  port INTEGER,
  database TEXT NOT NULL,
  username TEXT,
  password TEXT,
  ssl_enabled BOOLEAN DEFAULT 0,
  notes TEXT,
  isSample BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_connected DATETIME
);

CREATE TABLE IF NOT EXISTS sync_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  source_connection_id INTEGER,
  target_connection_id INTEGER,
  tables TEXT,
  schedule TEXT,
  last_sync DATETIME,
  enabled BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_connection_id) REFERENCES database_connections(id),
  FOREIGN KEY (target_connection_id) REFERENCES database_connections(id)
);

CREATE TABLE IF NOT EXISTS sync_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER,
  start_time DATETIME,
  end_time DATETIME,
  status TEXT,
  message TEXT,
  rows_synced INTEGER,
  FOREIGN KEY (task_id) REFERENCES sync_tasks(id)
);

-- Index für schnellere Abfragen nach Demo-Datenbanken
CREATE INDEX IF NOT EXISTS idx_is_sample ON database_connections(isSample);
```

### Migration 004 - Real Database Schema and Query Execution (2024-09-20)

In dieser Migration wurden Funktionen für den Zugriff auf echte Datenbanken implementiert. Folgende Änderungen wurden vorgenommen:

1. **Backend-API-Erweiterungen:**
   - Neuer Endpunkt `/api/databases/:id/schema` zum Abrufen des Datenbankschemas (Tabellen, Spalten)
   - Neuer Endpunkt `/api/databases/:id/execute` zur Ausführung von SQL-Abfragen
   - Unterstützung für MySQL und PostgreSQL mit entsprechenden Adaptern
   - Ver- und Entschlüsselung von Datenbankpasswörtern für sicheren Zugriff

2. **Frontend-Erweiterungen:**
   - Aktualisierung des `DatabaseService` zur Nutzung der neuen API-Endpunkte
   - Dynamische Anzeige von Tabellen- und Spaltendaten aus echten Datenbanken
   - Ausführung von SQL-Abfragen gegen echte Datenbanken
   - Verbesserte Benutzeroberfläche für Tabellenauswahl und Strukturansicht

Diese Erweiterungen ermöglichen folgende neue Funktionen:
- Anzeige aller Tabellen und Views aus realen Datenbanken
- Detaillierte Anzeige der Tabellenstruktur mit Spaltentypen, Primärschlüsseln und anderen Eigenschaften
- Ausführung beliebiger SQL-Abfragen mit Ergebnisanzeige
- Automatische Generierung von SQL-Abfragen basierend auf der Tabellenauswahl

Für die Implementierung wurden die bestehenden Backend-Controller und Frontend-Komponenten erweitert, sodass sowohl die Sample-Datenbank als auch echte Datenbanken unterstützt werden. Die Sample-Datenbank wird nur angezeigt, wenn keine echten Datenbankverbindungen vorhanden sind.

```sql
-- Keine Datenbankänderungen notwendig, da die Schema- und Abfrageausführung
-- direkt auf den konfigurierten Datenbanken arbeitet und keine lokale Speicherung erfordert
```

### Migration 005 - Backend als Single Source of Truth (2025-04-29)

In dieser Migration wurde die Abhängigkeit von localStorage im Frontend entfernt und das Backend als einzige Quelle der Wahrheit (Single Source of Truth) etabliert. Folgende Änderungen wurden vorgenommen:

1. **Frontend-Refactoring:**
   - Entfernung aller localStorage-basierten Speicher- und Abrufroutinen für Datenbankverbindungen
   - Entfernung der syncStoredDatabases-Funktion und aller diesbezüglichen Aufrufe
   - Umstellung aller Komponenten zur ausschließlichen Verwendung von API-Aufrufen
   - Vereinfachung der Fehlerbehandlung durch konsistente Propagierung von API-Fehlern

2. **Verbesserte Zuverlässigkeit:**
   - Beseitigung von Inkonsistenzen zwischen lokaler Speicherung und Backend-Datenbank
   - Zuverlässigeres Verhalten bei der Anzeige, Bearbeitung und Löschung von Verbindungen
   - Klare Trennung zwischen Frontend-Darstellung und Backend-Datenhaltung
   - Verbesserter Umgang mit der Sample-Datenbank (wird nur angezeigt, wenn keine echten Verbindungen vorhanden sind)

3. **Architekturelle Vorteile:**
   - Bessere Skalierbarkeit für zukünftige Mehrbenutzerszenarien
   - Vereinfachte Code-Wartung durch Entfernung von Fallback-Logik
   - Höhere Datenkonsistenz durch Eliminierung mehrerer Wahrheitsquellen

Betroffene Komponenten:
- `DatabaseService.js`: Entfernung von localStorage-Fallbacks und Synchronisierungsfunktionen
- `DatabasesList.js`: Direkte API-Aufrufe statt localStorage-Lesezugriffe
- `DatabaseForm.js`: API-basierte Datenabfrage und -speicherung
- `DatabaseDetails.js`: Direkte API-Aufrufe zum Abrufen von Verbindungsdetails und Schema

Die Migration erfolgte ohne Änderungen am Datenbankschema, da ausschließlich die Frontend-Datenzugriffslogik modifiziert wurde. Die bestehende SQLite-Datenbank im Backend bleibt unverändert.

### Migration 006 - Health-Status Monitoring (2025-04-29)

In dieser Migration wurde die Echtzeitüberwachung des Gesundheitszustands für Datenbankverbindungen implementiert. Folgende Änderungen wurden vorgenommen:

1. **Backend-API-Erweiterungen:**
   - Neuer Endpunkt `/api/databases/:id/health` zur Echtzeitprüfung des Verbindungsstatus
   - Motorspezifische Gesundheitschecks:
     - PostgreSQL: Verbindungstest und einfache Query-Ausführung
     - MySQL: Verbindungstest mit Ping-Funktion
     - SQLite: Überprüfung der Dateiexistenz
   - Standardisierte Antwortstruktur: `{ status: 'OK'|'Error'|'Unknown', message: '...' }`

2. **Frontend-Erweiterungen:**
   - Neue `getDatabaseHealth()`-Methode im `DatabaseService`
   - Dynamische Abfrage des Gesundheitsstatus für alle konfigurierten Datenbanken
   - Visuelle Anzeige des Verbindungsstatus im Health-Tab des Dashboards:
     - Grüne Färbung für erfolgreiche Verbindungen
     - Rote Färbung für fehlgeschlagene Verbindungen
     - Gelbe Färbung während der Statusprüfung

3. **Architekturelle Vorteile:**
   - Kontinuierliche Überwachung des Verbindungsstatus in Echtzeit
   - Klare visuelle Rückmeldung über den aktuellen Zustand der Datenbankverbindungen
   - Verbesserte Benutzeroberfläche zur schnellen Fehlererkennung
   - Grundlage für zukünftige erweiterte Metriken (z.B. Abfragegeschwindigkeit, Cache-Nutzung)

Diese Erweiterung ermöglicht dem Benutzer schnelles Feedback über den Status jeder konfigurierten Datenbankverbindung direkt im Dashboard. Die API wurde so gestaltet, dass sie in Zukunft leicht um zusätzliche Metriken erweitert werden kann. Für die Sample-Datenbank wird ein Hinweis angezeigt, dass der Health-Check nicht anwendbar ist.

Die Migration erfolgte ohne Änderungen am Datenbankschema, da die Funktionalität vollständig durch neue API-Endpunkte und Frontend-Komponenten implementiert wurde.

### Migration 007 - Table View with Server-Side Pagination and Sorting (2025-05-21)

In dieser Migration wurde eine spezialisierte Tabellenansicht mit Server-seitiger Paginierung und Sortierung implementiert. Diese Funktionalität ermöglicht eine effiziente Anzeige und Navigation auch in großen Datentabellen. Folgende Änderungen wurden vorgenommen:

1. **Backend-API-Erweiterungen:**
   - Neuer Endpunkt `/api/databases/:id/tables/:tableName/data` zum Abrufen von paginierten Tabellendaten
   - Implementierung von Server-seitigem Paging mit parametrisierten Abfragen (`page`, `limit`)
   - Unterstützung für dynamische Sortierung (`sortBy`, `sortOrder`)
   - Rückgabe formatierter Daten mit spaltenspezifischen Metadaten und Gesamtzeilenanzahl

2. **Frontend-Erweiterungen:**
   - Neue `TableView.js` Komponente mit Material UI DataGrid für optimierte Tabellenanzeige
   - Integration des `@mui/x-data-grid` für erweiterte Tabellenfunktionalität:
     - Intelligentes Rendering großer Datensätze
     - Dynamische Spaltenformatierung basierend auf Datentypen
     - Tooltips mit Spaltenmetadaten (Datentyp, Nullable, Default-Werte)
     - Voll funktionsfähige Toolbar mit Filterung, Export und Dichteeinstellungen
   - Implementierung von Server-seitiger Paginierung:
     - Dynamische Seitenwechsel ohne Neuladen der gesamten Tabelle
     - Konfigurierbare Einträge pro Seite (10, 25, 50, 100)
     - Aktualisierung des Datenmodells bei Paginierungsänderungen
   - Unterstützung für Server-seitige Sortierung:
     - Spaltensortierung durch Klick auf Spaltenüberschriften
     - Automatische API-Anfragen bei Sortierungsänderungen
     - Beibehaltung von Sortier- und Filtereinstellungen bei Navigation

3. **Architekturelle Verbesserungen:**
   - Erweiterung des `DatabaseService` um eine neue `getTableData`-Methode für paginierte Tabellenanzeige
   - Intelligente Fehlerbehandlung mit spezifischen Fehlermeldungen für verschiedene Datenbankengines
   - Optimierte Datenbankabfragen für bessere Performance bei großen Tabellen
   - Neue Routing-Integration in `App.js` für die dedizierte Tabellenansicht
   - Verbesserte Breadcrumb-Navigation für eindeutige Orientierung

Diese Erweiterung bietet eine professionelle, leistungsfähige Tabellenansicht mit folgenden Vorteilen:
- Effiziente Anzeige sehr großer Datentabellen ohne Performance-Einbußen
- Intuitive Benutzeroberfläche mit modernen Datentabellen-Features
- Konsistente Darstellung verschiedener Datentypen
- Nahtlose Integration in die bestehende Datenbankdetailansicht
- Zuverlässige Funktionalität selbst bei langsamen Netzwerkverbindungen

Die neue Tabellenansicht wird automatisch aktiviert, wenn ein Benutzer auf einen Tabellennamen in der Datenbankdetailansicht klickt, wodurch eine spezialisierte Seite für die ausgewählte Tabelle geladen wird.

### Migration 008 - Removal of localStorage for Database Connections (2025-05-22)

Diese Migration entfernte die Abhängigkeit von localStorage für die Verwaltung von Datenbankverbindungen und verbesserte damit die Architektur der Anwendung. Folgende Änderungen wurden implementiert:

1. **Architekturelle Verbesserungen:**
   - Vollständige Entfernung der localStorage-Fallback-Logik für Datenbankverbindungen
   - Konsequente Nutzung der Backend-API als einzige Datenquelle für Verbindungsdetails
   - Vereinfachung des Datenmodells und der Datenverwaltung
   - Verbesserte Fehlererkennung und -behandlung im Frontend

2. **Frontend-Änderungen:**
   - Refactoring des `DatabaseService.js`:
     - Entfernung aller localStorage-bezogenen Funktionen
     - Direktes Weiterleiten von API-Fehlern an die aufrufenden Komponenten
     - Implementierung einer neuen `getConnectionById`-Methode für einzelne Verbindungsdetails
   - Aktualisierung aller abhängigen Komponenten:
     - `DatabasesList.js`: Verwendet jetzt ausschließlich API-Aufrufe für Verbindungslisten
     - `DatabaseForm.js`: Lädt Verbindungsdetails im Edit-Modus direkt von der API
     - `DatabaseDetails.js`: Entfernt localStorage-Lookups und synchronisiert nicht mehr mit lokalem Speicher

3. **Beibehaltene Funktionalität:**
   - Sample Database bleibt verfügbar, wenn keine echten Verbindungen existieren
   - Die Sample Database wird jetzt korrekt über API-Fehlerbehandlung implementiert
   - Alle bestehenden Funktionen (Erstellen, Bearbeiten, Testen und Löschen von Verbindungen) bleiben erhalten

Diese Migration verbesserte die Anwendung durch:
- Vereinfachung des Codes und Verbesserung der Wartbarkeit
- Beseitigung von potenziellen Synchronisierungsproblemen zwischen localStorage und Backend
- Konsistentere Datenverwaltung, da Verbindungsdaten nur an einer Stelle gespeichert werden
- Verbesserte Sicherheit durch Verringerung der im Browser gespeicherten sensiblen Daten
- Klare Trennung von Verantwortlichkeiten im Code (Frontend vs. Backend)

Für Endbenutzer bleibt die Funktionalität identisch, während die Anwendung intern robuster und wartungsfreundlicher wird.

## Frontend-Komponenten

### Hauptkomponenten

1. **DatabasesList**: Zeigt eine Liste aller konfigurierten Datenbankverbindungen an
   - Übersichtliche Darstellung aller Datenbankverbindungen als Karten
   - Intelligentes Demo-Datenbankmanagement:
     - Zeigt eine einzelne Demo-Datenbankverbindung für neue Benutzer
     - Entfernt Demo-Datenbankverbindungen automatisch, sobald echte hinzugefügt werden
     - Bringt Demo-Verbindung zurück, wenn alle echten Verbindungen gelöscht werden
   - Filterfunktion zur schnellen Suche in Datenbankverbindungen
   - Sortieroptionen nach Namen, Engine oder letztem Verbindungszeitpunkt
   - Kontextmenü mit Optionen zum Bearbeiten und Löschen von Verbindungen
   - Button zum Hinzufügen neuer Datenbankverbindungen
   - Holt Datenbankverbindungen direkt vom Backend-API
2. **DatabaseDetails**: Zeigt Details einer ausgewählten Datenbank (Tabellen, Struktur, usw.)
   - Anzeige von Grundinformationen zur Datenbank (Engine, Host, Port, Benutzer)
   - Tabellenansicht mit Übersicht aller Tabellen und Views
   - Strukturansicht mit Detailinformationen zum Datenbankschema
   - SQL-Query-Editor für die direkte Ausführung von SQL-Abfragen
   - Responsive Benutzeroberfläche mit Material UI
3. **DatabaseForm**: Formular zum Erstellen und Bearbeiten von Datenbankverbindungen
   - Stepper-basierter Ansatz für eine übersichtliche Dateneingabe
   - Verbindet zu bestehenden Datenbanken (lokal oder remote)
   - Validierung der Verbindungsdaten durch Test-Verbindungsaufbau
   - Unterstützung verschiedener Datenbanktypen (PostgreSQL, MySQL, SQLite)
4. **DatabaseCreate**: Formular zur Erstellung neuer Datenbanken
   - Ermöglicht das Erstellen neuer Datenbanken direkt aus der Web-Oberfläche
   - Stepper-basierter Ansatz für eine übersichtliche Dateneingabe
   - Unterstützung für verschiedene Datenbanktypen (PostgreSQL, MySQL, InfluxDB)
   - Benötigt Administratorrechte auf dem Datenbankserver
   - Speichert neu erstellte Datenbanken automatisch in der Verbindungsliste
5. **QueryEditor**: SQL-Editor zum Ausführen von Abfragen
   - Zwei Modi: Einfacher Modus und Experten-Modus
   - Einfacher Modus: Benutzerfreundliche Oberfläche zur Tabellenverwaltung ohne SQL-Kenntnisse
     - Visuelle Darstellung von Tabellen und Spalten
     - Formular zum Erstellen neuer Tabellen mit Spalten-Definition
     - Aktionen wie Tabelle löschen, Spalte hinzufügen
   - Experten-Modus: Traditioneller SQL-Editor mit Syntax-Hervorhebung
     - Direktes Schreiben und Ausführen von SQL-Befehlen
     - Anzeige der Ergebnisse in tabellarischer Form
     - Export-Möglichkeit für Ergebnisse
6. **Settings**: Umfassende Einstellungsseite für die Anwendungskonfiguration
   - Erscheinungsbild-Einstellungen (Dark Mode, Sprache, Schriftgröße)
   - Benachrichtigungseinstellungen
   - Datenbankeinstellungen (Standard-Datenbanktyp, Zeichensatz, Backup-Konfiguration)
   - Synchronisierungseinstellungen für DB-Sync-Service
   - Sicherheitseinstellungen (Passwort, Sitzungsverwaltung)
   - Informationsbereich zur Anwendung
7. **TableView**: Spezialisierte Ansicht für Tabellendaten mit erweiterten Funktionen
   - Implementiert mit `@mui/x-data-grid` für eine moderne, leistungsfähige Tabellenansicht
   - Server-seitige Paginierung für effiziente Anzeige großer Datensätze
   - Dynamische Sortierung durch Klick auf Spaltenüberschriften
   - Automatische Datentyperkennung für korrekte Spaltenformatierung
   - Responsive Benutzeroberfläche mit Material UI
   - Umfassende Toolbar mit Filterung, CSV-Export und Anzeigeoptionen
   - Detaillierte Spalteninformationen als Tooltips (Datentyp, Nullable, etc.)
   - Optimierte Datenabfragen durch parametrisierte API-Anfragen

### Dashboard Komponente

Das Dashboard bietet eine zentrale Übersicht über alle Datenbanken und Systemfunktionen:

1. **Datenbank-Management**
   - Statistik-Karte mit Gesamtzahl der konfigurierten Datenbanken
   - Zwei-Button-Ansatz für Datenbankverwaltung:
     - "Connect Database": Verbindet zu einer bestehenden Datenbank (lokaler oder Remote-Server)
     - "Create Database": Erstellt eine neue Datenbank direkt aus der Web-Oberfläche
   - Liste der zuletzt verwendeten Datenbanken mit Schnellzugriff

2. **System-Informationen**
   - Echtzeitstatistiken zu CPU-, Speicher- und Festplattennutzung
   - Systemlaufzeit und Performance-Metriken
   - Visuelle Darstellung der Ressourcennutzung mit Fortschrittsbalken

3. **Registerkarten-Navigation**
   - Übersicht: Kernstatistiken und Verbindungsinformationen
   - Gesundheit: Status und Monitoring-Informationen zu Datenbanken
   - Performance: Detaillierte Leistungsmetriken und Abfragestatistiken
   - KI-Assistent: Natürlichsprachliche Datenbankabfragen und Analyse

### KI-Assistent

Der KI-Assistent ermöglicht die natürlichsprachliche Abfrage von Datenbanken und ist wie folgt implementiert:

1. **AI Assistant Tab im Dashboard**
   - Integriert in das Dashboard als separate Registerkarte
   - Einfache Texteingabe für die Fragestellung
   - Anzeige der KI-Antwort mit formatiertem Text
   - Beispielabfragen zur Vereinfachung des Einstiegs

2. **Backend-Endpunkt für KI-Abfragen**
   - REST API Endpunkt unter `/api/ai/query`
   - Verarbeitung der natürlichsprachlichen Eingabe
   - Konvertierung in SQL oder andere datenbankspezifische Abfragen
   - Ausführung der generierten Abfragen und Rückgabe strukturierter Ergebnisse

3. **Verbesserte NL-zu-SQL Funktionalität** (Version 0.4.2)
   - Vollständige Unterstützung für verschiedene Datenbanktypen:
     - Erweiterte Muster-Erkennung für PostgreSQL-Datenbanken
     - MySQL-spezifische Abfragemusterunterstützung
     - SQLite-Unterstützung für lokale Datenbanken
   - Intelligente Analyse der natürlichen Sprache:
     - Erkennung von Datenbankabfragekontexten mit natürlicher Sprache
     - Extraktion von Tabellennamen und Spalten aus natürlichersprachlichen Anfragen
     - Kontextbasierte SQL-Generierung basierend auf der Datenbank-Engine
   - Sample-Datenbank mit umfangreichen Beispieldaten:
     - Vordefinierte Abfragen für bekannte Muster
     - Generierung simulierter Antworten für konsistente Benutzererfahrung
     - Automatische Fallback-Nutzung bei fehlender Datenbankangabe

4. **Optimierte Datenbankabfrage-Ausführung** (Version 0.4.2)
   - Engine-spezifische Verbindungslogik:
     - Optimierte PostgreSQL-Verbindungen mit psycopg2
     - Verbesserte MySQL-Verbindungen mit error-handling
     - SQLite-Unterstützung für lokale Datenbanken
   - Erweiterte Fehlerbehandlung und Logging:
     - Detaillierte Fehlerprotokolle für Debugging
     - Benutzerfreundliche Fehlermeldungen
     - Konsistente Ergebnisformatierung für verschiedene Abfragetypen
   - Optimierte Ergebnisdarstellung:
     - Formatierte Ergebnisse für bessere Lesbarkeit
     - Tabellarische Darstellung für mehrere Ergebniszeilen
     - Spezielle Formatierung für aggregierte Ergebnisse (COUNT, AVG, MIN, MAX)

5. **KI-Konfigurationsschnittstelle**
   - Teil der Einstellungsseite
   - Auswahl und Konfiguration verschiedener KI-Modelle:
     - **OpenAI** (GPT-3.5, GPT-4) - erfordert API-Schlüssel
     - **Hugging Face** - Auswahl aus verschiedenen offenen NLP-Modellen
     - **Lokale Modelle** - Möglichkeit zur Ausführung lokaler Modelle für erhöhte Datensicherheit
   - Einstellungen für Abfragegenauigkeit und -geschwindigkeit
   - Möglichkeit, benutzerdefinierte Prompt-Vorlagen zu erstellen

## Verwendete KI-Technologien

Mole Database Manager unterstützt verschiedene KI-Technologien zur Datenabfrage:

1. **OpenAI API** (GPT-Modelle)
   - Standardoption für hochpräzise natürlichsprachliche Verarbeitung
   - Fortgeschrittenes Verständnis komplexer Abfragen
   - Erfordert einen gültigen OpenAI API-Schlüssel

2. **Perplexity AI**
   - Leistungsstarkes KI-Suchmodell für datenintensive Abfragen
   - Hervorragend für analytische Aufgaben und komplexe Datenbankabfragen
   - Effiziente Verarbeitung großer Datenmengen mit präzisen Ergebnissen
   - Erfordert einen gültigen Perplexity API-Schlüssel

3. **Hugging Face Transformers**
   - Open-Source-Alternative für natürlichsprachliche Verarbeitung
   - Unterstützung für verschiedene spezialisierte Modelle
   - Geringere Anforderungen an API-Schlüssel (einige Modelle erfordern dennoch Authentifizierung)

4. **LLama-basierte lokale Modelle**
   - Vollständig lokale Ausführung für höhere Datensicherheit
   - Geeignet für sensible Daten, die nicht an externe Dienste gesendet werden sollen
   - Höhere Hardware-Anforderungen für die Ausführung

5. **SQLPal (integriertes Spezialmodell)**
   - Leichtgewichtiges, auf SQL-Abfragen spezialisiertes KI-Modell
   - Optimiert für schnelle Antwortzeiten bei Standardabfragen
   - Vollständig lokal ausführbar ohne externe Abhängigkeiten

Die Auswahl und Konfiguration des KI-Modells erfolgt über die Einstellungsseite der Anwendung. Standardmäßig wird SQLPal verwendet, um ohne zusätzliche Konfiguration sofort betriebsbereit zu sein.

## Änderungsprotokoll

### Version 0.5.0 (aktuell)
- Vollständige Integration eines KI-Assistenten mit umfassender Konfigurationsoberfläche:
  - Benutzerfreundliche Konfiguration für API-Tokens und Modellauswahl
  - Automatische Auswahl der KI mit SQLPal als Fallback-Modell 
  - Backend-Integration mit Node.js- und Python-Komponenten:
    - Node.js-Controller zur Verwaltung von Einstellungen (`aiController.js`)
    - Python-Backend zur Ausführung der AI-Modelle
    - Sichere Speicherung verschlüsselter API-Keys
  - Erweiterte AI-Service-Komponente auf der Frontend-Seite
  - Verbesserte KI-Antworten mit Anzeige des verwendeten Providers
  - Anzeige der generierten SQL-Abfragen und Ergebnisdaten in Tabellenform
  - Zukunftssicher durch einfache Erweiterbarkeit um weitere KI-Anbieter
  - Anpassbare Einstellungen für SQL-Generierung und Abfrageparameter
- Integration des axios-Pakets in die Backend-Abhängigkeiten
  - Implementierung für HTTP-Anfragen zwischen Node.js-Backend und Python-Service
  - Sichere Übertragung von KI-Einstellungen zwischen den Diensten
- Verbesserung der Python-Containerumgebung:
  - Umstellung auf Debian-basiertes Docker-Image für vollständige KI-Kompatibilität
  - Integration von Rust und allen notwendigen Build-Tools für Tokenizers
  - Vollständige Unterstützung für PyTorch und Hugging Face Transformers
  - Sicherstellung der Kompatibilität aller KI-Modelle (lokal und remote)

### Version 0.4.3 (in Entwicklung)
- Behebung eines wichtigen Fehlers bei der Anzeige von Datenbankverbindungen:
  - Korrektur der Navigation von der Datenbankübersicht zur Detailansicht mit erweitertem Routing-Format (`/database/id/:id`)
  - Implementierung einer konsistenten URL-Struktur für Datenbankdetails
  - Verbesserung der Datenbanksuche nach ID in der DatabaseDetails-Komponente
  - Behebung der Konsistenzprobleme zwischen verschiedenen localStorage-Einträgen
  - Hinzufügung einer verbesserten Synchronisierungsfunktion für localStorage-Datenbankinformationen:
    - Zusammenführung von Daten zwischen `mole_real_databases` und `mole_database_connections`
    - Automatische Synchronisierung bei App-Initialisierung
    - Korrektes Speichern von Datenbanken beim Anklicken in der Liste
  - Sicherstellung der korrekten Anzeige von echten Datenbankverbindungen anstelle von Sample-Daten
  - Verbesserung des String-Vergleichs für Datenbank-IDs mit `toString()`-Konvertierung
- API-URL-Verbesserungen:
  - Dynamische Generierung der API-Basis-URL basierend auf dem aktuellen Hostnamen
  - Verbesserung der Anwendungsportabilität zwischen verschiedenen Umgebungen
  - Korrektur der API-Endpunkte für Datenbankschema und Abfrageausführung:
    - Standardisierung der Pfade zu `/api/databases/:id/schema` und `/api/databases/:id/execute`
    - Beseitigung inkonsistenter URL-Formate mit `/connections/`
    - Einheitliche API-Struktur für verbesserte Code-Wartbarkeit und Fehlerbehebung
  - Behebung kritischer Fehler bei Datenbankoperationen:
    - Korrektur der API-Endpunkte für alle Datenbankaktionen (Speichern, Aktualisieren, Löschen)
    - Konsistente Verwendung direkter API-Routen ohne `/connections/`-Segment
    - Fixierung des Problems, dass gelöschte Datenbankverbindungen nach dem Neuladen wieder erscheinen
    - Sicherstellung einer korrekten Datenpersistenz zwischen Frontend und Backend

### Version 0.4.2 (in Entwicklung)
- Umfangreiche Verbesserungen am KI-Assistenten:
  - Vollständige Überarbeitung der natürlichsprachlichen Übersetzungsfunktion (`natural_language_to_sql`)
  - Optimierte SQL-Abfrageausführung für verschiedene Datenbanktypen
  - Verbesserte Fehlerbehandlung und Logging
  - Intelligentere Erkennung von Abfragemustern in natürlicher Sprache
  - Erweiterte Unterstützung für PostgreSQL, MySQL und SQLite Datenbanken
  - Neue `get_sample_query_results` Funktion für konsistente Demo-Datenbankergebnisse
  - Verbesserte Formatierung von KI-Antworten für bessere Lesbarkeit
- API-Endpunkt-Überarbeitung:
  - Modernisierte REST-API Struktur für `/api/ai/query`
  - Verbesserte Parameter-Validierung
  - Erweiterte Ergebnis-Rückgabestruktur mit formatierter Anzeige und Rohdaten
  - Konsistente Fehlerbehandlung für Frontend-Integration

### Version 0.4.1 (in Entwicklung)
- Implementierung der neuen Datenbankerstellen-Funktionalität
  - Neue DatabaseCreate-Komponente für die Erstellung eigener Datenbanken
  - Klare Unterscheidung zwischen "Connect Database" und "Create Database" im Dashboard
  - Unterstützung für die Erstellung von PostgreSQL, MySQL und InfluxDB Datenbanken
  - API-Endpunkt für die Datenbankerstellen über create-database.php
- Frontend-Verbesserungen für das Dashboard:
  - Neu gestaltete Datenbankstatistik-Karte mit zwei-Button-Design
  - Farbliche Unterscheidung zwischen Verbinden (blau) und Erstellen (grün)
  - Verbesserte visuelle Hierarchie für wichtige Aktionen
- Umstellung der Datenbankverbindungsspeicherung von JSON auf SQLite:
  - Implementierung eines SQLite-Datenbankmodells zur Speicherung von Verbindungen
  - Automatische Migration vorhandener Verbindungen aus JSON
  - Verbesserte Datenpersistenz und -integrität
  - Abwärtskompatibilität mit älteren API-Endpunkten
  - Vorbereitung für erweiterte Abfrage- und Filtermöglichkeiten
- Modernisierung der Datenbankarchitektur:
  - Integration von Sequelize ORM für robuste Datenbankinteraktionen
  - Implementierung eines Service-Layers für bessere Trennung der Zuständigkeiten
  - Verbesserte Sicherheit durch Verschlüsselung sensibler Verbindungsdaten
  - Unterstützung für mehrere Datenbanktypen mit einheitlicher API
  - Verbesserte Fehlerbehandlung und Validierung

### Version 0.4.0 (aktuell)
- Integration eines KI-basierten Assistenten für natürlichsprachliche Datenbankabfragen
  - Benutzer können in natürlicher Sprache Fragen zu ihren Daten stellen
  - KI analysiert die Anfrage und erstellt automatisch passende Datenbankabfragen
  - Unterstützung verschiedener Abfragetypen (Temperatur, Energieverbrauch, Nutzeraktivitäten, etc.)
- Erweitertes Monitoring-Dashboard mit verbesserter Datenvisualisierung
  - Neuer Gesundheitsbereich mit visuellen Indikatoren für Datenbankzustand
  - Detaillierte Performance-Metriken für Abfragen und Transaktionen
  - Überwachung von Lock-Konflikten und Index-Nutzung
- Umfangreiche KI-Konfigurationsoptionen in den Einstellungen
  - Auswahl verschiedener KI-Modelle (OpenAI, Hugging Face, lokale Modelle)
  - Anpassbare Prompt-Vorlagen für spezifische Anwendungsfälle
  - API-Schlüsselverwaltung für verschiedene KI-Provider

### Version 0.3.1 (in Entwicklung)
- Verbessertes Dark Theme mit konsistenterer Farbpalette und besserem Kontrast
- Funktionale Implementierung der oberen Navigationsleisten-Buttons:
  - Theme-Wechsler-Button für das Umschalten zwischen Hell- und Dunkel-Modus
  - Benachrichtigungsmenü mit Anzeige aktueller Systemnachrichten
  - Vereinfachte Navigation mit integriertem Settings-Zugriff im Profilmenü
  - Vereinfachtes Profilmenü mit den Optionen "Profile", "Settings" und "Sign Out"
- Neue E-Mail-Funktionalität:
  - Konfigurierbare SMTP-Einstellungen für Benachrichtigungen
  - E-Mail-Service zum Senden von Benachrichtigungen
  - Testfunktionen für SMTP-Verbindungen
  - Speicherung von SMTP-Konfigurationen
  - Anpassbare E-Mail-Adresse für Benachrichtigungen im Profil
- Verbesserte Profilseite mit integrierten Konto- und Sicherheitseinstellungen:
  - Zusammenführung der Profil- und Kontofunktionen in einer übersichtlichen Oberfläche
  - Umfassende Verwaltung persönlicher Informationen und Sicherheitseinstellungen
- Erweiterte Benachrichtigungsfunktionen:
  - Integration von E-Mail-Benachrichtigungen für wichtige Systemereignisse
  - Konfigurierbare Benachrichtigungspräferenzen für verschiedene Ereignistypen
  - Anpassbare E-Mail-Adresse für Benachrichtigungen
  - Detaillierte Einstellungen für In-App und E-Mail-Benachrichtigungen
- Verbesserte UI-Elemente mit konsistenten Schatten, Rändern und Hintergrundfarben
- Bessere visuelle Hierarchie durch angepasste Kontraste und Farbakzente
- Optimierung der Benutzeroberfläche für bessere Lesbarkeit und ergonomische Bedienung
- Optimierte Datenbankverwaltung für bessere Benutzerfreundlichkeit:
  - Reduzierung auf eine einzelne Demo-Datenbank für neue Benutzer
  - Automatische Entfernung der Demo-Datenbank, sobald eine echte Datenbank hinzugefügt wird
  - Verbesserte Kennzeichnung von Demo-Inhalten
  - Verwendung von LocalStorage zur Persistierung von Datenbankverbindungen im Browser
- Verbesserte Favicon-Integration für korrekte Darstellung im Browser

### Version 0.3.0 (in Entwicklung)
- Implementierung der neuen DatabaseDetails-Komponente für detaillierte Datenbankansicht
- Hinzufügung einer umfassenden Settings-Seite mit Konfigurationsoptionen
- Verbesserter SQL Editor mit zwei Modi:
  - Einfacher Modus für Benutzer ohne SQL-Kenntnisse
  - Experten-Modus für direktes SQL-Schreiben
- Dark Mode als Standardthema für bessere Lesbarkeit und Augenkomfort
- Verbesserte Navigation zwischen Datenbanken und Tabellen
- Optimierte Routenstruktur für konsistente URL-Pfade
- Entfernung der nicht implementierten Login-Komponente aus dem Routing
- Behebung von Docker-Volumes-Problemen für zuverlässigere Datenbank-Container
- Hinzufügung von client-seitiger Routing-Konfiguration für bessere Navigation
- Verbesserte PostgreSQL-Unterstützung:
  - Korrekte Verarbeitung von Tabellen- und Spaltennamen mit Bindestrichen
  - Automatische Umschließung von Bezeichnern mit doppelten Anführungszeichen
  - Robustes Fehlerhandling für komplexe Datenbankstrukturen

### Version 0.2.0
- Umstellung von Adminer auf moderne React-basierte Benutzeroberfläche
- Implementierung von Material UI für einheitliches, modernes Design
- Verbesserte Benutzererfahrung für Datenbankmanagement
- Responsive Design für Desktop- und Mobile-Nutzung

### Version 0.1.0
- Erste Version mit Adminer als Web-UI
- Grundlegende Funktionalität für Datenbankzugriff
- Database Sync Service für die Datensynchronisierung 

## Verzeichnis- und Dateistruktur

Die Anwendung ist wie folgt strukturiert:

```
mole/
├── mole.md                    # Projekt-Dokumentation
├── build-log.txt              # Build-Protokoll
├── docker-compose.yml         # Docker-Compose-Konfiguration
├── README.md                  # Allgemeine Readme-Datei
├── .cursor/                   # Cursor-Editor-Konfiguration
│   └── rules/
│       └── documentation.mdc  # Dokumentationsrichtlinien
├── app/                       # Hauptverzeichnis für Anwendungscode
│   ├── Dockerfile             # Docker-Konfiguration für die Hauptanwendung
│   ├── react-ui/              # Frontend-Anwendung (React)
│   │   ├── src/               # React-Quellcode
│   │   │   ├── App.js         # Hauptkomponente der React-Anwendung
│   │   │   ├── App.css        # Globale CSS-Stile
│   │   │   ├── index.js       # Entry-Point der React-Anwendung
│   │   │   ├── index.css      # Basis-CSS
│   │   │   ├── routes.js      # Routing-Konfiguration
│   │   │   ├── reportWebVitals.js # Performance-Messung
│   │   │   ├── pages/         # Seitenkomponenten
│   │   │   │   ├── Dashboard.js       # Dashboard-Hauptseite
│   │   │   │   ├── DatabasesList.js   # Liste aller Datenbanken
│   │   │   │   ├── DatabaseList.js    # Alternative Datenbankansicht
│   │   │   │   ├── Databases.js       # Datenbankverwaltung
│   │   │   │   ├── DatabaseDetails.js # Detailansicht einer Datenbank
│   │   │   │   ├── DatabaseForm.js    # Formular für Datenbankbearbeitung
│   │   │   │   ├── DatabaseCreate.js  # Datenbankerstellung (längere Form)
│   │   │   │   ├── CreateDatabase.js  # Datenbankerstellung (kürzere Form)
│   │   │   │   ├── TableView.js       # Tabellenansicht
│   │   │   │   ├── TableList.js       # Liste von Tabellen
│   │   │   │   ├── QueryEditor.js     # SQL-Abfrageeditor
│   │   │   │   ├── Settings.js        # Einstellungsseite
│   │   │   │   └── Profile.js         # Profilseite mit persönlichen Informationen und Kontoeinstellungen
│   │   │   ├── components/    # Wiederverwendbare Komponenten
│   │   │   │   ├── TopBar.js         # Obere Navigationsleiste
│   │   │   │   ├── Sidebar.js        # Seitenleiste
│   │   │   │   └── Navbar.js         # Navigationselement
│   │   │   ├── services/      # Service-Komponenten
│   │   │   │   ├── DatabaseService.js # Service für Datenbankverbindungsverwaltung
│   │   │   │   ├── AuthService.js    # Authentifizierungsservice
│   │   │   │   └── EmailService.js   # E-Mail-Service für Benachrichtigungen
│   │   │   └── layouts/       # Layout-Komponenten
│   │   │       └── DashboardLayout.js # Hauptlayout für Dashboard
│   │   ├── public/            # Öffentliche Dateien
│   │   │   ├── index.html     # HTML-Einstiegspunkt
│   │   │   ├── manifest.json  # Web-App-Manifest
│   │   │   ├── images/        # Bildressourcen
│   │   │   │   ├── logo.png   # Anwendungslogo
│   │   │   │   └── favicon.png # Favicon-Quellbild
│   │   │   ├── favicon.ico    # Browser-Favicon
│   │   │   └── robots.txt     # Robots.txt-Datei
│   │   └── package.json       # NPM-Paket-Konfiguration
│   ├── backend/               # Node.js-Backend mit Express
│   │   ├── server.js          # Haupteinstiegspunkt für den Backend-Server
│   │   ├── controllers/       # Controller für verschiedene Ressourcen
│   │   │   ├── databaseController.js  # Controller für Datenbankverbindungsverwaltung
│   │   │   ├── emailController.js     # Controller für E-Mail-Funktionalität
│   │   │   └── authController.js      # Controller für Authentifizierung
│   │   ├── models/            # Datenbankmodelle 
│   │   │   ├── database.js            # SQLite-Datenbankverbindung und Initialisierung
│   │   │   ├── DatabaseConnection.js  # ORM-Modell für Datenbankverbindungen
│   │   │   └── Connection.js          # Alternativer Verbindungstyp
│   │   ├── routes/            # API-Routen
│   │   │   ├── databaseRoutes.js      # Routen für Datenbankoperationen 
│   │   │   ├── emailRoutes.js         # Routen für E-Mail-Funktionalität
│   │   │   └── authRoutes.js          # Routen für Authentifizierung
│   │   ├── services/          # Backend-Services
│   │   │   └── databaseService.js     # Service für Datenbankoperationen
│   │   ├── utils/             # Hilfsfunktionen
│   │   │   └── encryptionUtil.js      # Ver- und Entschlüsselungsfunktionen
│   │   └── data/              # Datendateien für die Persistenzschicht
│   │       └── database_connections.json # Gespeicherte Datenbankverbindungen
│   ├── themes/                # Theme-Definitionen (Verzeichnis für zukünftige Nutzung)
│   ├── db-sync/               # Datenbank-Synchronisierungsdienst
│   │   ├── Dockerfile         # Docker-Konfiguration für Sync-Service
│   │   ├── requirements.txt   # Python-Abhängigkeiten
│   │   ├── sync_manager.py    # Hauptpython-Skript für Synchronisierung
│   │   ├── sync.sh            # Shell-Skript für Sync-Initialisierung
│   │   ├── entrypoint.sh      # Docker-Entrypoint
│   │   ├── config/            # Konfigurationen für Sync-Service
│   │   │   └── sync.yml       # YAML-Konfigurationsdatei
│   │   ├── logs/              # Log-Dateien
│   │   └── scripts/           # Hilfsskripte
│   │       ├── postgresql_sync.sh # PostgreSQL-spezifisches Sync-Skript
│   │       └── mysql_sync.sh      # MySQL-spezifisches Sync-Skript
│   └── db-creation/           # Datenbankerstellungsskripte
│       └── create-database.php # PHP-Skript zur Datenbankerstellung
```

Diese Struktur zeigt die Organisation des Projekts mit Fokus auf eine klare Trennung der Komponenten:

1. **Frontend (react-ui)**: Enthält die React-basierte Benutzeroberfläche mit Seiten, Komponenten und Layouts.
2. **Backend (Node.js)**: Enthält den Express-basierten API-Server mit Controllern, Modellen und Routen.
3. **Sync-Service (db-sync)**: Enthält den Python-basierten Synchronisierungsdienst mit Konfigurationen und Skripten.
4. **Datenbank-Hilfsmittel (db-creation)**: Enthält Skripte zur Datenbankerstellung und -verwaltung.
5. **Konfiguration und Dokumentation**: Enthält Docker-Compose, Dokumentationsdateien und Konfigurationen.

Die Struktur ermöglicht eine klare Trennung der Verantwortlichkeiten und erleichtert die Wartung und Erweiterung der Anwendung. 

## Frontend-Services

Die Anwendung verwendet mehrere Service-Klassen für die Kommunikation mit dem Backend:

1. **AuthService**
   - Verwaltet die Authentifizierung und Benutzersitzungen
   - Führt Login, Logout und Registrierung durch
   - Speichert Tokens im LocalStorage und fügt sie automatisch zu API-Anfragen hinzu
   - Verwendet dynamisch generierte API-URLs basierend auf dem aktuellen Hostnamen

2. **EmailService**
   - Verwaltet E-Mail-bezogene Funktionen
   - Konfiguriert SMTP-Einstellungen für E-Mail-Benachrichtigungen
   - Testet SMTP-Verbindungen und sendet Test-E-Mails
   - Verwendet dynamisch generierte API-URLs basierend auf dem aktuellen Hostnamen

3. **DatabaseService**
   - Kommuniziert mit der Backend-API für Datenbankverbindungen
   - Führt CRUD-Operationen für Datenbankverbindungen durch
   - Bietet Fallback-Funktionalität mit LocalStorage, wenn die API nicht erreichbar ist
   - Test-Verbindungsfunktionalität für Datenbankverbindungen
   - Verwendet dynamisch generierte API-URLs basierend auf dem aktuellen Hostnamen
   - Bietet Synchronisierungsfunktion für localStorage-Datenbankeinträge

## Benutzerprofilsystem

Die Anwendung umfasst folgende Benutzerprofil-Funktionen:

1. **Grundlegende Profilinformationen**
   - Anzeige und Bearbeitung von Name, E-Mail, etc.
   - Rollen-basierte Berechtigungen (Administrator, Benutzer)

2. **Profilbildverwaltung**
   - Hochladen und Ändern des Profilbildes
   - Automatische Anzeige von Initialen, wenn kein Bild vorhanden ist
   - Benutzerfreundliche Benutzeroberfläche mit Badge-Icon für die Bildauswahl

3. **Verbindungsübersicht**
   - Anzeige aller Datenbankverbindungen des Benutzers
   - Direkter Link zur Erstellung neuer Verbindungen
   - Farbcodierung nach Datenbanktyp (MySQL, PostgreSQL, InfluxDB)

4. **Benachrichtigungseinstellungen**
   - Einstellungen für App-Benachrichtigungen
   - Konfiguration von E-Mail-Benachrichtigungen
   - Detaillierte Kontrolle über Benachrichtigungstypen

5. **Sicherheitseinstellungen**
   - Passwortänderung
   - Zwei-Faktor-Authentifizierung (vorgesehen für zukünftige Implementierung)

## Browser-Integration

Die Anwendung unterstützt moderne Browser-Funktionen:

1. **Favicon und Browser-Icon-Unterstützung**
   - Optimierte Favicons für verschiedene Geräte und Auflösungen
   - Spezifische Icons für verschiedene Plattformen (Desktop, Mobile, Tablet)
   - Apple Touch Icon für iOS-Geräte

2. **Progressive Web App (PWA) Features**
   - Manifest-Datei für Installation als App
   - Angepasste Themes für Browser-UI
   - Anpassungsfähiges Design für verschiedene Bildschirmgrößen

Diese Systeme verbessern die Sicherheit und Benutzerfreundlichkeit der Anwendung, indem sie sichere Authentifizierung und zeitnahe Benachrichtigungen bieten. 

## Bekannte Probleme und To-Dos

### Dashboard ESLint-Fehler (✓ Behoben)
Bei der Produktion-Build des Frontend trat ein ESLint-Fehler auf, da die Variable `activeDatabaseId` in Dashboard.js nicht definiert war. Folgende Änderung wurde vorgenommen:

1. Die fehlende State-Variable `activeDatabaseId` wurde zur Dashboard-Komponente hinzugefügt
2. Initialisierung mit `useState(null)` für konsistente State-Verwaltung
3. Der Fehler wurde behoben, sodass der Produktion-Build erfolgreich durchläuft

Diese Änderung ermöglicht korrekte AI-Abfragen mit Datenbankkontext und behebt den ESLint-Fehler "activeDatabaseId is not defined".

### Datenbankspeicherung
Derzeit werden die Datenbankverbindungen im Backend als JSON-Datei und im Frontend als localStorage-Einträge gespeichert. Für eine robustere Lösung sollte eine relationale Datenbank verwendet werden, wie sie bereits im Datenbankschema definiert ist.

### Docker-Konfiguration (✓ Behoben)
Das Backend war nicht korrekt in der Docker-Compose-Konfiguration eingebunden. Es wurden folgende Änderungen vorgenommen:

1. Ein neuer Service `backend` wurde in der `docker-compose.yml` Datei hinzugefügt, der den Node.js Express-Server hostet
2. Ein `Dockerfile` für das Backend wurde erstellt, um die Abhängigkeiten zu installieren und den Server zu starten
3. Der Frontend-Service `mole-ui` wurde aktualisiert, um vom Backend-Service abhängig zu sein
4. Ein Docker-Volume `backend_data` wurde hinzugefügt, um persistente Datenspeicherung für die Backend-Datenbankverbindungen zu ermöglichen

**Update:** Es gab ein Problem mit den Volume-Mounts, wodurch die Node.js-Module nicht korrekt verfügbar waren. Dies wurde behoben durch:
1. Änderung der Volume-Konfiguration, um nur spezifische Verzeichnisse zu mounten, anstatt das gesamte /app-Verzeichnis
2. Das verhindert, dass der Container-eigene `node_modules`-Ordner durch den Host-Ordner überschrieben wird
3. Zusätzliche Diagnose-Befehle wurden im Dockerfile hinzugefügt, um sicherzustellen, dass alle Module korrekt installiert werden

Diese Änderungen ermöglichen die vollständige Containerisierung der Anwendung, wobei die Abhängigkeiten automatisch mit `docker compose up --build` installiert werden.

### Authentifizierung (✓ Behoben)
Die Login-Funktionalität war nicht funktionsfähig, weil die Authentifizierungsdaten nicht korrekt persistiert wurden. Folgende Änderungen wurden vorgenommen:

1. Eine vorinitialisierte `users.json`-Datei wurde erstellt, die einen Admin-Benutzer mit den Standard-Anmeldedaten (admin@example.com / admin) enthält
2. Das JWT-Secret wurde als Umgebungsvariable im Docker-Compose-Setup konfiguriert
3. Der `data`-Ordner mit Benutzerinformationen wurde als persistentes Volume konfiguriert, um Daten zwischen Container-Neustarts zu bewahren

Diese Änderungen ermöglichen die Anmeldung mit dem Demo-Konto unmittelbar nach dem Start der Anwendung, ohne dass weitere Konfigurationen notwendig sind.

### Fehlende Datenbankabhängigkeiten (✓ Behoben)
Das Backend konnte nicht korrekt starten, weil die notwendigen Datenbankabhängigkeiten fehlten. Folgende Änderungen wurden vorgenommen:

1. Die package.json-Datei wurde um die fehlenden Abhängigkeiten ergänzt:
   - `mysql2` für MySQL-Datenbankzugriff
   - `pg` für PostgreSQL-Datenbankzugriff

2. Diese Abhängigkeiten werden bei Container-Start automatisch installiert, sodass die Datenbankfunktionalität vollständig zur Verfügung steht

Die fehlenden Abhängigkeiten waren die Ursache für den Fehler `Cannot find module 'mysql2/promise'`, der zuvor beim Start des Backends auftrat.

### Docker-Netzwerkkonfiguration (✓ Behoben)
Die Frontend-Services konnten nicht mit dem Backend kommunizieren, da sie "localhost" als Hostname verwendeten, was im Docker-Kontext nicht korrekt ist. Folgende Änderungen wurden vorgenommen:

1. Die API-URLs in den Service-Dateien wurden angepasst, um den Docker-Service-Namen anstelle von "localhost" zu verwenden:
   - In `AuthService.js`: `http://backend:3001/api/auth` statt `http://localhost:3001/api/auth`
   - In `DatabaseService.js`: `http://backend:3001/api/databases` statt `http://localhost:3001/api/databases`
   - In `EmailService.js`: `http://backend:3001/api/email` statt `http://localhost:3001/api/email`

2. In Docker-Compose-Umgebungen können Container über ihre Service-Namen miteinander kommunizieren, was durch das gemeinsame Netzwerk `mole-network` ermöglicht wird.

Diese Änderungen beheben die "Connection Refused"-Fehler, die auftraten, wenn die Frontend-Container versuchten, über "localhost" mit dem Backend zu kommunizieren.

### Aktualisierte Probleme

#### Datenbankverbindungsanzeige (✓ Behoben)
Bei Klick auf eine Datenbankverbindung wurde nicht die tatsächliche Datenbank angezeigt, sondern immer die Sample-Datenbank. Folgende Änderungen wurden vorgenommen:

1. Die Navigation von der Datenbankübersicht zur Detailansicht wurde korrigiert, um das richtige Routing-Format zu verwenden (`/database/id/:id`)
2. Die DatabaseDetails-Komponente wurde aktualisiert, um Datenbanken anhand ihrer ID zu suchen
3. Eine Synchronisierungsfunktion für localStorage-Datenbankinformationen wurde hinzugefügt
4. Die Anzeige von echten Datenbankverbindungen wurde sichergestellt

Diese Änderungen ermöglichen die korrekte Anzeige der tatsächlichen Datenbankverbindungen statt der Sample-Datenbank. 

#### Real-Datenbank-Funktionalität (✓ Behoben)
Die Real-Datenbank-Funktionalität konnte Tabellen und Spalten nicht korrekt anzeigen und SQL-Abfragen nicht ausführen. Folgende Änderungen wurden vorgenommen:

1. Backend-Endpunkte für Schema-Abfrage und SQL-Ausführung implementiert:
   - `GET /api/databases/:id/schema` für Tabellen- und Spalteninformationen
   - `POST /api/databases/:id/execute` für SQL-Abfrageausführung
   
2. Frontend-Komponenten aktualisiert:
   - `DatabaseService.js` um neue Endpunkte anzusprechen
   - `DatabaseDetails.js` für dynamische Anzeige von Tabellen und Ausführung von Abfragen
   - Interaktive Tabellenauswahl mit Strukturansicht
   - SQL-Abfragefunktion mit Ergebnisanzeige

3. Implementierung von Datenbankadaptern:
   - MySQL-Unterstützung mit `mysql2`-Modul
   - PostgreSQL-Unterstützung mit `pg`-Modul
   - SQLite-Basisunterstützung (eingeschränkt)

Diese Änderungen ermöglichen die vollständige Interaktion mit echten Datenbanken, einschließlich Schemaanzeige und Abfrageausführung. Die Sample-Datenbank wird jetzt nur noch angezeigt, wenn keine echten Datenbankverbindungen vorhanden sind. 

### DatabaseService

Der DatabaseService stellt die zentrale Schnittstelle für alle API-Aufrufe bezüglich Datenbankverbindungen dar. Dieser Service:
- Verwaltet Datenbankverbindungen über die Backend-API
- Führt CRUD-Operationen für Verbindungen durch
- Testet Verbindungen und ruft Datenbankschemata ab
- Führt Abfragen gegen verbundene Datenbanken aus
- Bietet spezialisierte Methoden für Tabellenansichten und Datenfilterung

Die Hauptmethoden umfassen:
- `getDatabaseConnections()`: Lädt alle verfügbaren Datenbankverbindungen
- `getConnectionById(id)`: Lädt eine spezifische Datenbankverbindung anhand ihrer ID
- `saveConnection(connection)`: Speichert eine neue Datenbankverbindung
- `updateConnection(id, connection)`: Aktualisiert eine bestehende Verbindung
- `deleteConnection(id)`: Löscht eine Verbindung
- `testConnection(connection)`: Testet die Verbindung zu einer Datenbank
- `getDatabaseSchema(id)`: Ruft das Schema einer verbundenen Datenbank ab
- `executeQuery(id, query)`: Führt eine SQL-Abfrage gegen eine verbundene Datenbank aus
- `getTableData(id, tableName, params)`: Lädt paginierte Tabellendaten mit Sortierung