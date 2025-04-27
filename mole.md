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

3. **Datenbank-Container**
   - MySQL: Container mit MySQL-Datenbankserver
   - PostgreSQL: Container mit PostgreSQL-Datenbankserver
   - InfluxDB: Container mit InfluxDB (optional)

## Datenbankschema

### Systemdatenbank

Die Mole-Anwendung verwendet eine interne Systemdatenbank zur Speicherung von Konfigurationen und Verbindungsinformationen.

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

## Frontend-Komponenten

### Hauptkomponenten

1. **DatabasesList**: Zeigt eine Liste aller konfigurierten Datenbankverbindungen an
2. **DatabaseDetails**: Zeigt Details einer ausgewählten Datenbank (Tabellen, Struktur, usw.)
   - Anzeige von Grundinformationen zur Datenbank (Engine, Host, Port, Benutzer)
   - Tabellenansicht mit Übersicht aller Tabellen und Views
   - Strukturansicht mit Detailinformationen zum Datenbankschema
   - SQL-Query-Editor für die direkte Ausführung von SQL-Abfragen
   - Responsive Benutzeroberfläche mit Material UI
3. **DatabaseForm**: Formular zum Erstellen und Bearbeiten von Datenbankverbindungen
4. **QueryEditor**: SQL-Editor zum Ausführen von Abfragen
   - Zwei Modi: Einfacher Modus und Experten-Modus
   - Einfacher Modus: Benutzerfreundliche Oberfläche zur Tabellenverwaltung ohne SQL-Kenntnisse
     - Visuelle Darstellung von Tabellen und Spalten
     - Formular zum Erstellen neuer Tabellen mit Spalten-Definition
     - Aktionen wie Tabelle löschen, Spalte hinzufügen
   - Experten-Modus: Traditioneller SQL-Editor mit Syntax-Hervorhebung
     - Direktes Schreiben und Ausführen von SQL-Befehlen
     - Anzeige der Ergebnisse in tabellarischer Form
     - Export-Möglichkeit für Ergebnisse
5. **Settings**: Umfassende Einstellungsseite für die Anwendungskonfiguration
   - Erscheinungsbild-Einstellungen (Dark Mode, Sprache, Schriftgröße)
   - Benachrichtigungseinstellungen
   - Datenbankeinstellungen (Standard-Datenbanktyp, Zeichensatz, Backup-Konfiguration)
   - Synchronisierungseinstellungen für DB-Sync-Service
   - Sicherheitseinstellungen (Passwort, Sitzungsverwaltung)
   - Informationsbereich zur Anwendung

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

3. **KI-Konfigurationsschnittstelle**
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
  - Einstellungsmenü mit schnellem Zugriff auf häufig verwendete Optionen
  - Vollständig funktionierendes Profilmenü
- Verbesserte UI-Elemente mit konsistenten Schatten, Rändern und Hintergrundfarben
- Bessere visuelle Hierarchie durch angepasste Kontraste und Farbakzente
- Optimierung der Benutzeroberfläche für bessere Lesbarkeit und ergonomische Bedienung

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
│   │   │   │   └── Settings.js        # Einstellungsseite
│   │   │   ├── components/    # Wiederverwendbare Komponenten
│   │   │   │   ├── TopBar.js         # Obere Navigationsleiste
│   │   │   │   ├── Sidebar.js        # Seitenleiste
│   │   │   │   └── Navbar.js         # Navigationselement
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
2. **Backend (db-sync)**: Enthält den Python-basierten Synchronisierungsdienst mit Konfigurationen und Skripten.
3. **Datenbank-Hilfsmittel (db-creation)**: Enthält Skripte zur Datenbankerstellung und -verwaltung.
4. **Konfiguration und Dokumentation**: Enthält Docker-Compose, Dokumentationsdateien und Konfigurationen.

Die Struktur ermöglicht eine klare Trennung der Verantwortlichkeiten und erleichtert die Wartung und Erweiterung der Anwendung. 