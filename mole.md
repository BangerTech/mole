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

### Migration 006 - Database Table View Display Improvements (2024-06-28)

In dieser Migration wurden umfassende Verbesserungen an der Tabellenanzeige und Datenverarbeitung vorgenommen, um korrekte Darstellung von PostgreSQL-Daten zu gewährleisten. Folgende Änderungen wurden implementiert:

1. **Backend-Datenverarbeitung (databaseController.js):**
   - Korrekte Behandlung von NULL-Werten durch Entfernung von COALESCE-Funktionen
   - Verbesserte SQL-Abfragen mit korrekter Identifizierer-Quotierung
   - Typgetreue Datenkonvertierung für Datums-, Zeit- und numerische Felder
   - Hinzufügung von Datentyp-Metadaten zu den API-Antworten

2. **Frontend-Tabellenanzeige (TableView.js):**
   - Implementierung typenspezifischer valueGetter- und renderCell-Funktionen
   - Korrekte Lokalisierung von Dezimalzahlen (Punkt statt Komma als Dezimaltrennzeichen)
   - Verbesserte Darstellung von Datums- und Zeitformaten
   - Korrekte Anzeige von NULL-Werten
   - Debugging-Funktionalität zur Anzeige von Rohdaten und transformierten Daten

3. **UI-Verbesserungen:**
   - Unterstützung für das Ändern der Spaltenbreite durch Ziehen der Spaltenränder
   - Unterstützung für das Umsortieren von Spalten durch Drag & Drop
   - Verbesserte Darstellung von Zeitstempeln und Zeitdaten
   - Konsistente Formatierung von numerischen Werten

Diese Verbesserungen adressieren folgende Probleme:
- Fehlende oder falsch angezeigte Felder wie "time", "uptime" und "raw_uptime"
- Inkorrekte Zahlenformatierung (Komma statt Punkt als Dezimaltrennzeichen)
- Nicht funktionierende Spaltengrößenänderung und -neuanordnung

Die Änderungen stellen sicher, dass die Daten in der Mole Database Manager-Anwendung korrekt und konsistent mit den tatsächlichen Datenbankinhalten angezeigt werden, insbesondere für die PostgreSQL-Datenbanken wie "greencooling" und "greencooling-backup".

### Migration 007 - Database Synchronization UI Implementation (2024-10-17)

In dieser Migration wurde die Benutzeroberfläche für die Datenbanksynchronisationsfunktion implementiert. Diese neue Funktionalität ermöglicht es Benutzern, Datenbanken zu synchronisieren und die Synchronisationseinstellungen über die Benutzeroberfläche zu verwalten. Folgende Änderungen wurden vorgenommen:

1. **Frontend-UI-Erweiterungen:**
   - Hinzufügung eines neuen "Sync" Tabs zur DatabaseDetails-Seite
   - Implementierung einer DatabaseSyncTab-Komponente mit folgenden Elementen:
     - Ein- und Ausschalten der Synchronisierung (Toggle-Switch)
     - Frequenzauswahl via Dropdown-Menü (Stündlich, Täglich, Wöchentlich)
     - "Sync Now" Button für sofortige manuelle Synchronisierung
   - Integration eines Sync-Status-Indikators
   - Anpassungen an das bestehende Tab-System für einheitliche Navigation

2. **Backend-Service-Erweiterungen:**
   - Erweiterung des DatabaseService mit Methoden für Synchronisationsfunktionen:
     - `getSyncSettings(databaseId)`: Abrufen der Synchronisationseinstellungen
     - `updateSyncSettings(databaseId, settings)`: Aktualisieren der Synchronisationseinstellungen
     - `triggerSync(databaseId)`: Manuelles Auslösen einer Synchronisation
   - Vorbereitung für die Integration mit dem Python-basierten db-sync-Dienst

3. **Verbesserte Benutzerführung:**
   - Informative Meldungen über den Synchronisationsstatus
   - Fehlerbehandlung für fehlgeschlagene Synchronisationsversuche
   - Visuelle Rückmeldung während laufender Synchronisationsvorgänge

Diese Erweiterungen legen die Grundlage für eine vollständige Datenbanksynchronisationsfunktion, die es Benutzern ermöglicht, Daten zwischen verschiedenen Datenbanken automatisch oder manuell zu synchronisieren. Die Implementierung folgt dem bestehenden Architekturmuster mit einer klaren Trennung zwischen Frontend-UI und Backend-Services.

Die vollständigen Endpunkte für die Synchronisations-API werden vom Node.js-Backend bereitgestellt und interagieren mit der `sync_tasks`-Tabelle und dem `db-sync`-Service, wie bereits in der Dokumentation beschrieben.

### Migration 009 - Database Synchronization UI Implementation (2024-10-17)

In dieser Migration wurde die Benutzeroberfläche für die Datenbanksynchronisationsfunktion implementiert. Diese neue Funktionalität ermöglicht es Benutzern, Datenbanken zu synchronisieren und die Synchronisationseinstellungen über die Benutzeroberfläche zu verwalten. Folgende Änderungen wurden vorgenommen:

1. **Frontend-UI-Erweiterungen:**
   - Hinzufügung eines neuen "Sync" Tabs zur DatabaseDetails-Seite
   - Implementierung einer DatabaseSyncTab-Komponente mit folgenden Elementen:
     - Ein- und Ausschalten der Synchronisierung (Toggle-Switch)
     - Frequenzauswahl via Dropdown-Menü (Stündlich, Täglich, Wöchentlich)
     - "Sync Now" Button für sofortige manuelle Synchronisierung
   - Integration eines Sync-Status-Indikators
   - Anpassungen an das bestehende Tab-System für einheitliche Navigation

2. **Backend-Service-Erweiterungen:**
   - Erweiterung des DatabaseService mit Methoden für Synchronisationsfunktionen:
     - `getSyncSettings(databaseId)`: Abrufen der Synchronisationseinstellungen
     - `updateSyncSettings(databaseId, settings)`: Aktualisieren der Synchronisationseinstellungen
     - `triggerSync(databaseId)`: Manuelles Auslösen einer Synchronisation
   - Vorbereitung für die Integration mit dem Python-basierten db-sync-Dienst

3. **Verbesserte Benutzerführung:**
   - Informative Meldungen über den Synchronisationsstatus
   - Fehlerbehandlung für fehlgeschlagene Synchronisationsversuche
   - Visuelle Rückmeldung während laufender Synchronisationsvorgänge

Diese Erweiterungen legen die Grundlage für eine vollständige Datenbanksynchronisationsfunktion, die es Benutzern ermöglicht, Daten zwischen verschiedenen Datenbanken automatisch oder manuell zu synchronisieren. Die Implementierung folgt dem bestehenden Architekturmuster mit einer klaren Trennung zwischen Frontend-UI und Backend-Services.

Die vollständigen Endpunkte für die Synchronisations-API werden vom Node.js-Backend bereitgestellt und interagieren mit der `sync_tasks`-Tabelle und dem `db-sync`-Service, wie bereits in der Dokumentation beschrieben.

### Migration 010 - SQL Editor Enhancements (2024-11-15)

In dieser Migration wurden umfassende Verbesserungen am SQL Editor vorgenommen, um die Benutzerfreundlichkeit zu erhöhen und die Funktionalität zu erweitern. Folgende Änderungen wurden implementiert:

1. **Simple Mode Erweiterungen:**
   - Implementierung einer GUI zum Bearbeiten von Tabellendaten mit Unterstützung für:
     - Hinzufügen neuer Zeilen über ein dynamisches Formular
     - Bearbeiten vorhandener Zeilen durch Selektion in der Datenvorschau
     - Löschen von Zeilen mit Bestätigungsdialog
   - Hinzufügung eines Löschen-Buttons für Tabellen neben dem Erstellen-Button
   - Verbesserte Selektion und Hervorhebung von Tabellenzeilen
   - Vorbereitete Methoden im `DatabaseService` für Zeilen-CRUD-Operationen

2. **Expert Mode Verbesserungen:**
   - Integration des Ace Editors für erweiterte SQL-Bearbeitungsfunktionen:
     - Syntax-Highlighting für SQL
     - Basis-Autocompletion für SQL-Befehle
     - Zeilennummerierung und verbesserte Code-Darstellung
   - Verbesserte Benutzeroberfläche mit klarer Trennung zwischen Editor und Ergebnisbereich

3. **Layout-Optimierungen:**
   - Überarbeitung des Layouts mit Flexbox für eine flexible Höhenanpassung
   - Beseitigung von Problemen mit festen Pixelwerten in Höhenberechnungen
   - Verbesserte Container-Organisation für optimales Verhalten bei unterschiedlichen Bildschirmgrößen
   - Korrekte Scrollbereiche für Tabellenliste, Abfrageergebnisse und Datenvorschau

4. **Paket-Abhängigkeiten:**
   - Hinzufügung von `react-ace` und `ace-builds` zu den Projekt-Abhängigkeiten
   - Integration der erforderlichen Ace Editor Modi und Erweiterungen

5. **Benutzerfreundlichkeit und Klarheit:**
   - Simple Mode dient als benutzerfreundliche Oberfläche für Nutzer ohne SQL-Kenntnisse
     - GUI-basierte Interaktion mit Tabellendaten (Ansehen, Hinzufügen, Bearbeiten, Löschen)
     - Kein direktes Schreiben von SQL-Abfragen erforderlich
   - Expert Mode bietet erweiterte Funktionen für SQL-erfahrene Benutzer
     - Direktes Schreiben und Ausführen von beliebigen SQL-Abfragen
     - Syntax-Highlighting und Editor-Komfort durch Ace Editor
     - Volle Kontrolle über komplexe Datenbankoperationen

Diese Verbesserungen machen den SQL Editor intuitiver und leistungsfähiger, wobei der Simple Mode nun die grundlegende Datenverwaltung ohne SQL-Kenntnisse ermöglicht, während der Expert Mode erweiterte Features für SQL-Profis bietet. Die Sample-Datenbank bleibt weiterhin schreibgeschützt, um unbeabsichtigte Änderungen zu verhindern.

### Version 0.6.0 (aktuell)
- Implementierung der Datenbank-Synchronisationsfunktion:
  - Neue UI-Komponenten für Synchronisationssteuerung
  - "Sync" Tab in der Datenbankdetailansicht
  - Backend-Service-Erweiterungen für Synchronisationsfunktionen
  - Vorbereitung für die Integration mit dem Python-basierten db-sync-Dienst
- UI-Verbesserungen:
  - Verbesserte Benutzerführung bei der Datenbankinteraktion
  - Visuelles Feedback für Synchronisationsaktionen
  - Konsistente Benutzerführung durch alle Synchronisationsprozesse
- Fehlerbehebungen:
  - Korrektur des Sidebar-Toggle-Buttons
  - Verbesserungen am Layout und der Navigation
  - Übersetzung der deutschen Texte in Englisch

## Frontend-Komponenten Übersicht

### Wichtige UI-Komponenten und ihre Dateipfade

Um die Navigation im Codebase zu erleichtern, hier eine Übersicht der wichtigsten UI-Komponenten:

1. **Hauptnavigation:**
   - Seitenleiste: `/app/frontend/src/components/Sidebar.js`
   - Hauptmenü: `/app/frontend/src/components/MainMenu.js`
   - Burger-Menü-Button: `/app/frontend/src/components/Header.js`

2. **Datenbankansicht:**
   - Datenbankverbindungsliste: `/app/frontend/src/components/DatabaseList.js`
   - Verbindungsdetails: `/app/frontend/src/components/ConnectionDetails.js`
   - Tabellenansicht: `/app/frontend/src/components/TableView.js`
   - Abfrageeditor: `/app/frontend/src/components/QueryEditor.js`

3. **Datenverwaltung:**
   - Datenbankkontroller: `/app/backend/controllers/databaseController.js`
   - Verbindungsservice: `/app/frontend/src/services/DatabaseService.js`
   - Datenkonverter: `/app/frontend/src/utils/dataTypeUtils.js`

Diese Übersicht soll helfen, schnell die relevanten Dateien für bestimmte UI-Elemente oder Funktionalitäten zu finden, ohne den gesamten Codebase durchsuchen zu müssen.

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

### Datenbankverbindungsanzeige (✓ Behoben)
Bei Klick auf eine Datenbankverbindung wurde nicht die tatsächliche Datenbank angezeigt, sondern immer die Sample-Datenbank. Folgende Änderungen wurden vorgenommen:

1. Die Navigation von der Datenbankübersicht zur Detailansicht wurde korrigiert, um das richtige Routing-Format zu verwenden (`/database/id/:id`)
2. Die DatabaseDetails-Komponente wurde aktualisiert, um Datenbanken anhand ihrer ID zu suchen
3. Eine Synchronisierungsfunktion für localStorage-Datenbankinformationen wurde hinzugefügt
4. Die Anzeige von echten Datenbankverbindungen wurde sichergestellt

Diese Änderungen ermöglichen die korrekte Anzeige der tatsächlichen Datenbankverbindungen statt der Sample-Datenbank. 

### Real-Datenbank-Funktionalität (✓ Behoben)
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

### System-Performance-Monitoring (✓ Behoben)
Es gab mehrere Probleme mit der System-Performance-Überwachung und der Anzeige von Systemstatistiken:

1. **404-Fehler bei API-Endpunkten** (✓ Behoben)
   - Die Endpunkte `/api/system/performance-history` und andere lieferten 404-Fehler
   - Ursache: Die Flask-Anwendung im `mole-sync` Container startete nicht korrekt
   - Lösung:
     - Integration von Gunicorn als WSGI-Server für die Flask-Anwendung
     - Behebung von "Address already in use"-Konflikten durch Entfernung des direkten Flask-Starts
     - Hinzufügung von Gunicorn zu den Python-Requirements
     - Optimierung des Docker-Entrypoints für den Gunicorn-Start

2. **Unvollständige System-Status-Anzeige** (✓ Behoben)
   - Die System-Status-Karte zeigte nur CPU-Metriken, nicht aber Speicher/Storage/Swap
   - Ursache: Fehlende Verbindung zur Python-API für vollständige Metriken
   - Lösung:
     - Korrektur der API-Endpunkte und ihrer Implementierung
     - Verbesserte Fehlerbehandlung im Frontend
     - Korrekte Anzeige aller Systemmetriken (CPU, Speicher, Festplatte, Swap)

3. **Top Tables Tile lädt nicht** (✓ Behoben)
   - Die Top Tables Kachel blieb leer oder zeigte Fehler
   - Ursache: Fehler in der `getTopTables`-Funktion und der `parseSizeToBytes`-Hilfsfunktion
   - Lösung:
     - Verbesserung der `getTopTables`-Funktion in `databaseController.js`
     - Optimierung der `parseSizeToBytes`-Funktion für bessere Fehlerbehandlung
     - Korrektes Parsing und Sortieren von Tabellengrößen
     - Zuverlässige Fehlerbehandlung für nicht erreichbare Datenbanken

4. **UI-Scrollbar-Probleme** (✓ Behoben)
   - Unerwünschte Scrollbars erschienen im Browser
   - Ursache: Fehlende CSS-Overflow-Einstellungen
   - Lösung:
     - Hinzufügung von `overflow-y: hidden` zu html und body Elementen in index.css
     - Verbesserte Container-Höhenberechnung für verschiedene Bildschirmgrößen
     - Optimierte Layout-Komponenten für konsistente Darstellung ohne Überlauf

Diese Änderungen sorgen für eine vollständige und korrekte Anzeige aller Systemmetriken im Dashboard sowie eine verbesserte Benutzeroberfläche ohne unerwünschte Scrollbars.

### Datenbankerstellungsfunktion (✓ Behoben)
Die Funktion zum Erstellen neuer Datenbanken war unvollständig implementiert oder funktionierte nicht wie erwartet:

1. **Unvollständige API-Integration** (✓ Behoben)
   - Die Datenbankerstellungsfunktion verwendete veraltete PHP-basierte Skripte statt vollständiger API-Integration
   - Ursache: Fehlende Backend-Endpunkte für Datenbankerstellung
   - Lösung:
     - Implementierung eines umfassenden `/api/databases/create-instance` Endpunkts im Node.js-Backend
     - Verbindung zu Datenbankadmin-Schnittstellen über umgebungsvariablen-gesteuerte Zugangsdaten
     - Unterstützung für drei Datenbanktypen (PostgreSQL, MySQL, InfluxDB)
     - Ordnungsgemäße Fehlerbehandlung und Validierung

2. **Unzureichende Benutzeroberfläche** (✓ Behoben)
   - Die Benutzeroberfläche für die Datenbankerstellung war unvollständig oder nicht benutzerfreundlich
   - Ursache: Inkonsistente Frontend-Implementation
   - Lösung:
     - Vollständige Implementierung der `DatabaseCreate`-Komponente mit intuitivem Stepper-Design
     - Verbesserung der Benutzererfahrung durch schrittweise Anleitung
     - Echtzeit-Validierung von Benutzereingaben
     - Klare Fehlermeldungen und Erfolgsbenachrichtigungen

3. **Sicherheitsprobleme** (✓ Behoben)
   - Potenzielle Sicherheitslücken bei der Datenbankadministration
   - Ursache: Unzureichende Validierung und Einschränkung von Benutzereingaben
   - Lösung:
     - Strenge Validierung und Bereinigung aller Benutzereingaben
     - Beschränkung der Datenbanknamen auf sichere Zeichensätze (alphanumerisch + Unterstrich)
     - Vermeidung von SQL-Injektionen durch parameterisierte Abfragen
     - Minimale Berechtigungen für Admin-Verbindungen

4. **Mangelnde Integration mit bestehenden Verbindungen** (✓ Behoben)
   - Nach der Datenbankerstellung wurde keine Verbindung automatisch hinzugefügt
   - Ursache: Fehlende Integration zwischen Erstellungs- und Verbindungsfunktionen
   - Lösung:
     - Automatisches Speichern von neu erstellten Datenbanken als Verbindungen
     - Nahtlose Integration in den Datenbankverbindungs-Workflow
     - Direkte Navigation zur neuen Datenbank nach erfolgreicher Erstellung
     - Verbessertes Benutzererlebnis durch einheitlichen Workflow

Diese Verbesserungen ermöglichen eine vollständig funktionsfähige Datenbankerstellungsfunktion, die es Benutzern ermöglicht, schnell und unkompliziert neue Datenbanken zu erstellen und sofort mit ihnen zu arbeiten.

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

### Synchronisation API Endpoints (via Node.js Backend)

Diese Endpunkte werden vom Node.js-Backend bereitgestellt, um Synchronisationseinstellungen zu verwalten und Aufgaben zu triggern. Sie interagieren intern mit der `sync_tasks`-Tabelle und dem `db-sync`-Service.

| Methode | Pfad                                   | Beschreibung                                        |
|---------|----------------------------------------|-----------------------------------------------------|
| GET     | `/api/sync/:databaseId/settings`       | Ruft die Synchronisationseinstellungen für eine DB ab |
| PUT     | `/api/sync/:databaseId/settings`       | Aktualisiert die Synchronisationseinstellungen      |
| POST    | `/api/sync/:databaseId/trigger`        | Stößt eine manuelle Synchronisation an               |

#### Hinweise zur Implementierung:

*   **`PUT /api/sync/:databaseId/settings`:**
    *   Akzeptiert `{ enabled: boolean, schedule: string, target_connection_id: number | "__CREATE_NEW__" }` im Body.
    *   Wenn `target_connection_id` auf `"__CREATE_NEW__"` gesetzt ist, versucht der Controller, intern den Endpunkt `POST /api/databases/create-instance` aufzurufen, um eine neue Zieldatenbank zu erstellen. Der Name der neuen Datenbank wird automatisch basierend auf dem Namen der Quelldatenbank generiert (z.B. `source_name_sync_copy_timestamp`). Die Engine wird von der Quelle übernommen. Die Verbindungsdetails für die neue Verbindung (Benutzer/Passwort) müssen im `create-instance`-Payload angegeben werden (aktuell hardcoded Platzhalter, sollten konfigurierbar sein oder von der Quelle übernommen werden, falls sinnvoll).
    *   Die ID der neu erstellten Verbindung wird dann als `target_connection_id` in der `sync_tasks`-Tabelle gespeichert. Die ID wird auch im Response Body als `newTargetId` zurückgegeben.
    *   Wenn ein Task für die `source_connection_id` bereits existiert, wird er aktualisiert. Ansonsten wird ein neuer Task erstellt (nur wenn `enabled: true` und eine gültige `target_connection_id` (Zahl oder neu erstellt) vorhanden ist).
*   **`POST /api/sync/:databaseId/trigger`:**
    *   Liest den zugehörigen Task aus `sync_tasks`.
    *   Ruft die Verbindungsdetails für Quelle und Ziel ab.
    *   Sendet die Task-ID, Quell-/Ziel-Verbindungsdetails (inkl. entschlüsseltem Passwort) und die zu synchronisierenden Tabellen (aus `sync_tasks.tables`) im Body einer **`POST /trigger_sync`** Anfrage an den Python `db-sync`-Service (Standard-URL: `http://db-sync:5000`).
    *   Der Python-Service startet die Synchronisation in einem Hintergrundthread und gibt einen "Accepted"-Status zurück.

### Migration 009 - Database Synchronization UI Implementation (2024-10-17)

In dieser Migration wurde die Benutzeroberfläche für die Datenbanksynchronisationsfunktion implementiert. Diese neue Funktionalität ermöglicht es Benutzern, Datenbanken zu synchronisieren und die Synchronisationseinstellungen über die Benutzeroberfläche zu verwalten. Folgende Änderungen wurden vorgenommen:

1. **Frontend-UI-Erweiterungen:**
   - Hinzufügung eines neuen "Sync" Tabs zur DatabaseDetails-Seite
   - Implementierung einer DatabaseSyncTab-Komponente mit folgenden Elementen:
     - Ein- und Ausschalten der Synchronisierung (Toggle-Switch)
     - Frequenzauswahl via Dropdown-Menü (Stündlich, Täglich, Wöchentlich)
     - "Sync Now" Button für sofortige manuelle Synchronisierung
   - Integration eines Sync-Status-Indikators
   - Anpassungen an das bestehende Tab-System für einheitliche Navigation

2. **Backend-Service-Erweiterungen:**
   - Erweiterung des DatabaseService mit Methoden für Synchronisationsfunktionen:
     - `getSyncSettings(databaseId)`: Abrufen der Synchronisationseinstellungen
     - `updateSyncSettings(databaseId, settings)`: Aktualisieren der Synchronisationseinstellungen
     - `triggerSync(databaseId)`: Manuelles Auslösen einer Synchronisation
   - Vorbereitung für die Integration mit dem Python-basierten db-sync-Dienst

3. **Verbesserte Benutzerführung:**
   - Informative Meldungen über den Synchronisationsstatus
   - Fehlerbehandlung für fehlgeschlagene Synchronisationsversuche
   - Visuelle Rückmeldung während laufender Synchronisationsvorgänge

Diese Erweiterungen legen die Grundlage für eine vollständige Datenbanksynchronisationsfunktion, die es Benutzern ermöglicht, Daten zwischen verschiedenen Datenbanken automatisch oder manuell zu synchronisieren. Die Implementierung folgt dem bestehenden Architekturmuster mit einer klaren Trennung zwischen Frontend-UI und Backend-Services.

Die vollständigen Endpunkte für die Synchronisations-API werden vom Node.js-Backend bereitgestellt und interagieren mit der `sync_tasks`-Tabelle und dem `db-sync`-Service, wie bereits in der Dokumentation beschrieben.

## Benutzerbezogene Einstellungen (User Settings)

Seit Version X werden alle Benutzereinstellungen (z.B. Benachrichtigungen, Security, AI, SMTP) **pro User** gespeichert und verschlüsselt abgelegt.

### Speicherung
- Die Einstellungen werden verschlüsselt (AES) in `data/user_settings/{userId}.json` gespeichert.
- Sensible Felder wie Passwörter und API-Keys werden mit AES-256 verschlüsselt.

### API-Endpunkte
- `GET /api/user/settings` – Liefert die entschlüsselten Settings für den eingeloggten User.
- `POST /api/user/settings` – Speichert die Settings für den eingeloggten User (verschlüsselt sensible Felder).

### Beispiel für das Settings-Objekt
```json
{
  "notifications": {
    "inApp": true,
    "email": false,
    "events": {
      "dbConnectionIssues": true,
      "syncCompleted": true
    }
  },
  "security": {
    "autoLogout": true,
    "logoutTimeout": 30
  },
  "ai": {
    "provider": "openai",
    "openaiApiKey": "<verschlüsselt>",
    "perplexityApiKey": "<verschlüsselt>",
    "huggingfaceApiKey": "<verschlüsselt>",
    "huggingfaceModel": "",
    "localModelPath": ""
  },
  "smtp": {
    "host": "smtp.example.com",
    "port": "587",
    "username": "user@example.com",
    "password": "<verschlüsselt>",
    "encryption": "tls",
    "fromEmail": "",
    "fromName": ""
  }
}
```

### Frontend-Integration
- Die React-UI lädt und speichert die Settings über `UserSettingsService`.
- Sowohl die Settings-Seite als auch das User-Profil greifen auf dieselben User-Settings zu. Änderungen sind überall synchron.
- Die Datenbankverbindungen im Profil werden weiterhin separat geladen und verwaltet.

## Benutzerauthentifizierung und -verwaltung (Version 0.7.0+)

Seit Version 0.7.0 verfügt Mole Database Manager über ein robustes System zur Benutzerauthentifizierung und -verwaltung.

### Authentifizierungsablauf

1.  **Initiales Setup (Erstinbetriebnahme):**
    *   Beim allerersten Start der Anwendung (oder wenn keine Administratorkonten in `data/users.json` existieren) wird der Benutzer zur `/setup`-Seite geleitet.
    *   Auf der Setup-Seite hat der Benutzer zwei Optionen:
        1.  **Neuen Admin-Account erstellen:** Eingabe von Name, E-Mail und Passwort. Dieser Account erhält die Rolle `admin`.
        2.  **Mit Demo-Account einloggen:** Ein Klick auf "Login with Demo Account" loggt den Benutzer mit den fest kodierten Demo-Zugangsdaten (`demo@example.com` / Passwort: `demo`) ein. Dieser Account hat die Rolle `user` und dient reinen Testzwecken.
    *   Nach erfolgreicher Admin-Erstellung wird der Benutzer zur `/login`-Seite weitergeleitet. Nach erfolgreichem Demo-Login wird er zum `/dashboard` geleitet.

2.  **Standard-Login (`/login`):**
    *   Benutzer geben ihre E-Mail und ihr Passwort ein.
    *   Das Backend prüft die Anmeldedaten gegen die in `data/users.json` gespeicherten (gehashten) Passwörter.
    *   Bei Erfolg wird ein JWT (JSON Web Token) generiert und im `localStorage` (`mole_auth_token`) gespeichert. Die Benutzerdaten (ohne Passwort) werden ebenfalls im `localStorage` (`moleUser`) gespeichert und im `UserContext` der Anwendung bereitgestellt.
    *   Der Benutzer wird zum `/dashboard` weitergeleitet.

3.  **Registrierung (`/register`):**
    *   Benutzer können sich jederzeit über das Registrierungsformular (Name, E-Mail, Passwort) einen neuen Account erstellen.
    *   Diese Accounts erhalten standardmäßig die Rolle `user`.
    *   Nach erfolgreicher Registrierung wird der Benutzer automatisch eingeloggt und zum Dashboard weitergeleitet.

4.  **Logout:**
    *   Entfernt den JWT und die Benutzerdaten aus dem `localStorage`.
    *   Leitet zur `/login`-Seite weiter.

### Benutzerdaten

*   Benutzerinformationen (ID, Name, E-Mail, gehashtes Passwort, Rolle, Erstellungsdatum) werden in der Datei `mole/app/backend/data/users.json` gespeichert.
*   **Wichtig:** Beim ersten Start der Anwendung (wenn `users.json` nicht existiert) wird automatisch ein `demo@example.com`-Benutzer (Rolle: `user`, Passwort: `demo`) erstellt.

### Admin-Funktionen (`/users` - nur für Admins)

Eingeloggte Administratoren haben Zugriff auf die Benutzerverwaltungsseite (`/users`), erreichbar über einen eigenen Menüpunkt in der Sidebar. Dort können sie:

*   Alle existierenden Benutzer auflisten (ID, Name, E-Mail, Rolle, Erstellungsdatum).
*   Neue Benutzer erstellen (und ihnen die Rolle `user` oder `admin` zuweisen).
*   Bestehende Benutzer bearbeiten (Name, E-Mail, Passwort (optional ändern), Rolle).
*   Benutzer löschen (mit Bestätigungsdialog). Das Löschen des letzten verbleibenden Admin-Accounts wird verhindert.

### Sicherheitsaspekte

*   Passwörter werden mit `bcryptjs` gehasht gespeichert.
*   API-Endpunkte für die Benutzerverwaltung sind durch Authentifizierungs- (`authMiddleware`) und Admin-Rollen-Middleware (`adminMiddleware`) geschützt.
*   Der Endpunkt zum Erstellen des ersten Admin-Accounts (`POST /api/users` während des Setups) ist nur dann ungeschützt, wenn noch kein Admin-Account existiert. Sobald ein Admin vorhanden ist, erfordert auch dieser Endpunkt Admin-Rechte.
*   Ein ungeschützter Endpunkt `GET /api/auth/check-admin-exists` erlaubt dem Frontend beim Start zu prüfen, ob ein Admin-Setup notwendig ist, ohne dass bereits ein Benutzer eingeloggt sein muss.

### API-Endpunkte für Benutzerverwaltung (geschützt)

Alle Endpunkte unter `/api/users` erfordern Authentifizierung und Admin-Rechte, mit Ausnahme des initialen `POST`-Requests während des Setups.

| Methode | Pfad        | Beschreibung                       |
|---------|-------------|------------------------------------|
| GET     | `/`         | Alle Benutzer auflisten            |
| GET     | `/:id`      | Einen spezifischen Benutzer abrufen |
| POST    | `/`         | Neuen Benutzer erstellen           |
| PUT     | `/:id`      | Bestehenden Benutzer aktualisieren |
| DELETE  | `/:id`      | Benutzer löschen                   |

## AI Assistant & Perplexity-Integration (seit 2024-06)

### Architektur & Backend-Integration
- Die gesamte AI-Provider-Logik (Provider-Liste, Test, Query) wird jetzt ausschließlich im Node.js-Backend gehandhabt. Es gibt keine Weiterleitung mehr an den Python-Service (`db-sync`).
- Neue Endpunkte im Backend:
  - `GET /api/ai/providers` – Liefert die Liste der unterstützten AI-Provider (z.B. OpenAI, Perplexity, HuggingFace, Local).
  - `POST /api/ai/test` – Testet die Konfiguration (API-Key, Modell) eines Providers und gibt Feedback zurück.
  - `POST /api/ai/query` – Führt eine AI-Abfrage aus (z.B. SQL-Generierung, Datenbank-Fragen) und gibt das Ergebnis zurück.
- Perplexity-Integration: Das Backend ruft die Perplexity-API direkt auf. Unterstützte Modelle werden validiert (z.B. `sonar-pro`). Fehlerhafte Modelle oder ungültige API-Keys werden klar zurückgemeldet.
- Die AI-Settings werden pro User verschlüsselt gespeichert (siehe User-Settings-Schema).

### Frontend-Änderungen
- Im AI Assistant Settings-Tab kann für jeden Provider der API-Key eingegeben und direkt getestet werden ("Test"-Button neben dem Eingabefeld).
- Die Auswahl des AI-Providers bleibt nach dem Speichern persistent.
- Test-Feedback (Erfolg/Fehler) wird direkt unter dem Eingabefeld angezeigt.
- Die AI-Tab kann jetzt mit Perplexity und anderen Providern genutzt werden, inkl. Fehlerbehandlung für ungültige Keys/Modelle.

### Perplexity-Modelle
- Unterstütztes Modell: `sonar-pro` (frühere Namen wie `pplx-7b-online` oder `sonar-medium-online` sind veraltet und führen zu Fehlern).
- Das Backend prüft die Modellnamen und gibt bei Fehlern eine verständliche Rückmeldung.

### Sensitive Daten & .gitignore
- Der Ordner `/app/backend/data` (inkl. `users.json`, `ai_settings.json`, `mole.db`) ist in `.gitignore` eingetragen und wird nicht mehr zu GitHub hochgeladen.
- Bereits getrackte Dateien wurden mit `git rm --cached` entfernt und die Änderungen gepusht.

### Sample Database Query Execution
- Das Backend unterstützt jetzt die Ausführung von SQL wie `SELECT COUNT(*) FROM users` auf der Sample-Datenbank (liest aus `users.json`).
- Für andere Queries auf der Sample-DB wird ein "Not implemented"-Fehler zurückgegeben.
- Für echte Datenbanken (MySQL/PostgreSQL) werden die Queries wie gewohnt ausgeführt.
- Die AI-Query-API gibt jetzt sowohl das generierte SQL als auch das Abfrageergebnis (oder Fehler) an das Frontend zurück.

### Migration 011 - AI Assistant & Perplexity-Integration (2024-06-XX)

In dieser Migration wurden folgende Features eingeführt:

1. **AI-Provider-Logik ins Node.js-Backend verlagert** (keine Weiterleitung an Python-Service mehr)
2. **Perplexity-Integration** mit echtem API-Call, Modellvalidierung und Fehlerbehandlung
3. **Frontend-Verbesserungen**: Test-Button, persistente Provider-Auswahl, Feedback
4. **Sensitive Daten**: .gitignore und Git-Index-Bereinigung für `/app/backend/data`
5. **Sample-DB-Query**: Unterstützung für `SELECT COUNT(*) FROM users` auf der Sample-Datenbank

```sql
-- Keine SQL-Änderungen, aber neue Service- und Settings-Dateien im Backend
-- AI-Settings werden verschlüsselt in data/user_settings/{userId}.json gespeichert
```

### AI-Settings im User-Settings-Schema

Die AI-Settings werden pro User verschlüsselt gespeichert:

| Feld                | Typ     | Beschreibung                                  |
|---------------------|---------|-----------------------------------------------|
| provider            | TEXT    | Gewählter AI-Provider (z.B. openai, perplexity)|
| openaiApiKey        | TEXT    | OpenAI API-Key (verschlüsselt)                |
| perplexityApiKey    | TEXT    | Perplexity API-Key (verschlüsselt)            |
| huggingfaceApiKey   | TEXT    | HuggingFace API-Key (verschlüsselt)           |
| huggingfaceModel    | TEXT    | Modellname für HuggingFace                    |
| localModelPath      | TEXT    | Pfad zu lokalem Modell (optional)             |

Beispiel (verschlüsselte Felder als Platzhalter):
```json
"ai": {
  "provider": "perplexity",
  "openaiApiKey": "<verschlüsselt>",
  "perplexityApiKey": "<verschlüsselt>",
  "huggingfaceApiKey": "<verschlüsselt>",
  "huggingfaceModel": "",
  "localModelPath": ""
}
```

### Migration 012 - UI Layout und SQL Editor Fixes (2025-05-13)

In dieser Migration wurden Anpassungen am globalen Layout vorgenommen, um einen konsistenteren und reduzierten oberen Abstand auf allen Seiten zu erreichen. Zusätzlich wurden Fehlerbehebungen für den SQL Editor und die Anzeige von Tabelleninformationen implementiert.

1.  **Globale Layout-Anpassungen (`mole/app/react-ui/src/layouts/DashboardLayout.js`):**
    *   Die Konstanten `APP_BAR_MOBILE`, `APP_BAR_DESKTOP`, `NAVBAR_MARGIN_TOP` und `EXTRA_PADDING_TOP` wurden modifiziert.
    *   Ziel war ein globaler `paddingTop` von ca. `37px` für Desktop-Ansichten und ca. `28px` für mobile Ansichten für alle Seiten, die dieses Layout verwenden.
        *   `APP_BAR_MOBILE` geändert von `64` auf `28`.
        *   `APP_BAR_DESKTOP` geändert von `92` auf `37`.
        *   `NAVBAR_MARGIN_TOP` geändert von `16` auf `0`.
        *   `EXTRA_PADDING_TOP` geändert von `16` auf `0` (und blieb bei späteren Anpassungen auf `0`).

2.  **Seiten-spezifische Padding-Normalisierung (in jeweiligen Page-Komponenten unter `mole/app/react-ui/src/pages/`):**
    *   Das Styling der jeweiligen Root-Container (`RootStyle` oder Wurzel-`Box`) in den folgenden Seitenkomponenten wurde so angepasst, dass deren eigener `paddingTop` auf `0` gesetzt wurde. Dies stellt sicher, dass der globale `paddingTop` aus `DashboardLayout.js` konsistent angewendet wird:
        *   `Dashboard.js`: `RootStyle` padding geändert von `theme.spacing(3)` zu `theme.spacing(0, 3, 3, 3)`.
        *   `DatabasesList.js`: `RootStyle` padding geändert von `theme.spacing(3)` zu `theme.spacing(0, 3, 3, 3)`.
        *   `UserManagement.js`: `RootStyle` padding geändert von `'24px'` zu `theme.spacing(0, 3, 3, 3)`.
        *   `Profile.js`: `RootStyle` padding geändert von `'24px'` zu `theme.spacing(0, 3, 3, 3)`.
        *   `Settings.js`: Die `sx`-Prop der Wurzel-`Box` wurde von `py: 3` zu `pt: 0, pb: 3` geändert.
    *   In `QueryEditor.js` war der `paddingTop` des `RootStyle` bereits `0` und bedurfte keiner diesbezüglichen Anpassung.

3.  **SQL Editor & Datenbankdetails: Korrektur der Zeilenanzahl-Anzeige (`mole/app/backend/services/databaseService.js`):**
    *   Die Funktion `_fetchSchemaDetails` wurde für PostgreSQL-Datenbanken so modifiziert, dass die exakte Zeilenanzahl pro Tabelle mittels `SELECT COUNT(*)` ermittelt wird.
    *   Dies behebt das Problem, bei dem zuvor `-1` als Zeilenanzahl angezeigt wurde, da die Schätzung über `reltuples` ungenau sein konnte.

4.  **SQL Editor Simple Mode: Korrektur der Spaltenanzeige in der Datenvorschau:**
    *   **Backend (`mole/app/backend/services/databaseService.js`):** Die Funktion `executeDbQuery` gibt für PostgreSQL-Abfragen Spalteninformationen jetzt im vereinfachten Format `{ name: 'spaltenname' }` zurück (statt `{ name: 'spaltenname', dataTypeID: 123 }`).
    *   **Frontend (`mole/app/react-ui/src/pages/QueryEditor.js`):** In der Funktion `fetchSimpleModeDataPreview` wird die `result.columns`-Liste nun korrekt zu einem Array von Strings (den Spaltennamen) transformiert, bevor sie an die Tabellenkomponente übergeben wird.
    *   Diese Änderungen beheben den "Minified React error #31", der auftrat, weil versucht wurde, ein Objekt direkt als Spaltenüberschrift zu rendern.

```sql
-- Keine direkten SQL-Datenbankänderungen in dieser Migration.
-- Die Änderungen betreffen primär die Frontend-Layout-Logik und Backend-Datenabrufmethoden für Metadaten.
```