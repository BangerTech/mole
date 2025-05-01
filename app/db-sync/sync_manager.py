#!/usr/bin/env python3
"""
Mole Database Sync Manager
Handles scheduled database synchronizations between different database servers.
"""

import os
import time
import logging
import yaml
import atexit
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime
import subprocess
import sys
import json
import requests
from typing import Dict, List, Optional, Union, Any, Tuple
import psutil
from flask import Flask, jsonify, request
from flask_cors import CORS
import random

# AI model dependencies
import openai
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
import torch

# AI Configuration
AI_CONFIG_PATH = "/app/config/ai_config.yml"

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})  # Enable CORS for all /api routes with all origins

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("/app/logs/sync.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

CONFIG_PATH = "/app/config/sync.yml"
SCRIPTS_DIR = "/app/scripts"

# --- Global storage for metric history --- 
metrics_history: Dict[str, List[Dict[str, Union[float, int]]]] = {
    'cpu': [],
    'memory': []
}
MAX_HISTORY = 60 # Keep last 60 minutes (if collected every minute)

# --- Function to collect metrics --- 
def collect_metrics():
    try:
        logger.info("Attempting to collect system metrics...")
        cpu = psutil.cpu_percent(interval=0.1)
        mem = psutil.virtual_memory().percent
        timestamp = time.time() * 1000 # Use milliseconds timestamp
        
        logger.info(f"Collected: CPU={cpu}%, Memory={mem}%")
        
        metrics_history['cpu'].append({'timestamp': timestamp, 'value': round(cpu, 1)})
        metrics_history['memory'].append({'timestamp': timestamp, 'value': round(mem, 1)})
        
        # Trim old data
        if len(metrics_history['cpu']) > MAX_HISTORY:
            metrics_history['cpu'].pop(0)
        if len(metrics_history['memory']) > MAX_HISTORY:
            metrics_history['memory'].pop(0)
            
        logger.debug(f"Metrics history size: CPU={len(metrics_history['cpu'])}, Memory={len(metrics_history['memory'])}")
    except Exception as e:
        # Log the full error traceback
        logger.error(f"Error collecting metrics: {str(e)}", exc_info=True) 

# --- Initialize Scheduler --- 
scheduler = BackgroundScheduler(daemon=True)
scheduler.add_job(collect_metrics, 'interval', minutes=1, id='metric_collector')
scheduler.start()

# Ensure scheduler shuts down gracefully
atexit.register(lambda: scheduler.shutdown())

class DatabaseSync:
    """Main class to handle database synchronization tasks"""
    
    def __init__(self):
        """Initialize the sync manager"""
        self.config = self._load_config()
        self.sync_jobs = []
        
        # Set log level from config
        log_level = self.config.get("sync", {}).get("log_level", "info").upper()
        logger.setLevel(getattr(logging, log_level, logging.INFO))
        
        logger.info("Database Sync Manager initialized")
    
    def _load_config(self) -> Dict:
        """Load configuration from YAML file"""
        try:
            if not os.path.exists(CONFIG_PATH):
                logger.error(f"Configuration file not found: {CONFIG_PATH}")
                return {"sync": {"enabled": False, "connections": []}}
            
            with open(CONFIG_PATH, "r") as f:
                config = yaml.safe_load(f)
            
            return config
        except Exception as e:
            logger.error(f"Error loading configuration: {str(e)}")
            return {"sync": {"enabled": False, "connections": []}}
    
    def _reload_config(self):
        """Reload configuration"""
        logger.info("Reloading configuration")
        self.config = self._load_config()
        # Clear existing jobs
        scheduler.clear()
        # Setup jobs again
        self.setup_jobs()
    
    def setup_jobs(self):
        """Setup all scheduled sync jobs"""
        enabled = self.config.get("sync", {}).get("enabled", False)
        
        if not enabled:
            logger.info("Sync service is disabled in configuration")
            return
        
        connections = self.config.get("sync", {}).get("connections", [])
        if not connections:
            logger.info("No sync connections configured")
            return
        
        for conn in connections:
            if not conn.get("enabled", False):
                logger.info(f"Skipping disabled connection: {conn.get('name', 'Unnamed')}")
                continue
            
            try:
                self._setup_connection_job(conn)
            except Exception as e:
                logger.error(f"Error setting up job for connection {conn.get('name', 'Unnamed')}: {str(e)}")
    
    def _setup_connection_job(self, connection: Dict):
        """Setup a scheduled job for a specific connection"""
        name = connection.get("name", "Unnamed")
        logger.info(f"Setting up sync job for: {name}")
        
        schedule_config = connection.get("schedule", {})
        frequency = schedule_config.get("frequency", "daily")
        
        job_function = lambda: self._run_sync(connection)
        
        if frequency == "hourly":
            scheduler.every().hour.do(job_function)
            logger.info(f"Scheduled {name} to run hourly")
        
        elif frequency == "daily":
            time_str = schedule_config.get("time", "02:00")
            scheduler.every().day.at(time_str).do(job_function)
            logger.info(f"Scheduled {name} to run daily at {time_str}")
        
        elif frequency == "weekly":
            time_str = schedule_config.get("time", "02:00")
            days = schedule_config.get("days", [1])  # Monday by default
            
            for day in days:
                if day == 1:
                    scheduler.every().monday.at(time_str).do(job_function)
                elif day == 2:
                    scheduler.every().tuesday.at(time_str).do(job_function)
                elif day == 3:
                    scheduler.every().wednesday.at(time_str).do(job_function)
                elif day == 4:
                    scheduler.every().thursday.at(time_str).do(job_function)
                elif day == 5:
                    scheduler.every().friday.at(time_str).do(job_function)
                elif day == 6:
                    scheduler.every().saturday.at(time_str).do(job_function)
                elif day == 7:
                    scheduler.every().sunday.at(time_str).do(job_function)
            
            logger.info(f"Scheduled {name} to run weekly on days {days} at {time_str}")
        
        elif frequency == "monthly":
            time_str = schedule_config.get("time", "02:00")
            day = schedule_config.get("day", 1)
            
            # For monthly, we need a custom check
            def monthly_job():
                today = datetime.now()
                if today.day == day:
                    job_function()
            
            scheduler.every().day.at(time_str).do(monthly_job)
            logger.info(f"Scheduled {name} to run monthly on day {day} at {time_str}")
        
        elif frequency == "custom":
            cron = schedule_config.get("custom", "0 2 * * *")
            # Parse and set up cron-like schedule
            try:
                parts = cron.split()
                if len(parts) != 5:
                    raise ValueError("Invalid cron format")
                
                minute, hour, day_of_month, month, day_of_week = parts
                
                # This is a simplified implementation - for complex cron expressions,
                # you might want to use a library like croniter
                if minute == "*":
                    scheduler.every().minute.do(job_function)
                else:
                    for m in minute.split(','):
                        scheduler.every().hour.at(f":{m}").do(job_function)
                
                logger.info(f"Scheduled {name} with custom schedule: {cron}")
            except Exception as e:
                logger.error(f"Error parsing custom schedule for {name}: {str(e)}")
        
        # Also run once when starting up if required
        if connection.get("run_on_startup", False):
            logger.info(f"Running sync job for {name} on startup")
            self._run_sync(connection)
    
    def _run_sync(self, connection: Dict):
        """Execute the sync for a specific connection"""
        name = connection.get("name", "Unnamed")
        logger.info(f"Starting sync for: {name}")
        
        source = connection.get("source", {})
        target = connection.get("target", {})
        options = connection.get("options", {})
        
        source_type = source.get("type", "").lower()
        target_type = target.get("type", "").lower()
        
        # Validate source and target
        if not source_type or not target_type:
            logger.error(f"Missing source or target type for {name}")
            return
        
        if source_type not in ["mysql", "postgresql", "postgres", "influxdb"] or \
           target_type not in ["mysql", "postgresql", "postgres", "influxdb"]:
            logger.error(f"Unsupported database type for {name}: {source_type} to {target_type}")
            return
        
        # Normalize "postgres" to "postgresql"
        if source_type == "postgres":
            source_type = "postgresql"
        if target_type == "postgres":
            target_type = "postgresql"
        
        # Handle different sync types
        try:
            if source_type == target_type:
                # Same DB type, can use specialized tools
                if source_type == "mysql":
                    self._sync_mysql_to_mysql(name, source, target, options)
                elif source_type == "postgresql":
                    self._sync_postgresql_to_postgresql(name, source, target, options)
                elif source_type == "influxdb":
                    self._sync_influxdb_to_influxdb(name, source, target, options)
            else:
                # Different DB types, need to use a more generic approach
                self._sync_generic(name, source, target, options)
        
        except Exception as e:
            logger.error(f"Error during sync for {name}: {str(e)}")
            # Record the error in the status file
            self._update_sync_status(name, "error", str(e))
            return
        
        # Update sync status
        self._update_sync_status(name, "success")
        logger.info(f"Completed sync for: {name}")
    
    def _sync_mysql_to_mysql(self, name: str, source: Dict, target: Dict, options: Dict):
        """Sync from MySQL to MySQL"""
        logger.info(f"Performing MySQL to MySQL sync for {name}")
        
        script_path = os.path.join(SCRIPTS_DIR, "mysql_sync.sh")
        
        # Create the script if it doesn't exist
        if not os.path.exists(script_path):
            with open(script_path, "w") as f:
                f.write("""#!/bin/bash
set -e

# MySQL sync script
SRC_HOST="$1"
SRC_PORT="$2"
SRC_USER="$3"
SRC_PASS="$4"
SRC_DB="$5"
TGT_HOST="$6"
TGT_PORT="$7"
TGT_USER="$8"
TGT_PASS="$9"
TGT_DB="${10}"
TABLES_ONLY="${11}"
TABLES_EXCLUDE="${12}"
STRUCTURE_ONLY="${13}"
DROP_TARGET="${14}"

# Temp file for dump
DUMP_FILE="/tmp/mysql_dump_${SRC_DB}.sql"

# Export options
EXPORT_OPTS="--single-transaction --quick"

if [ "$STRUCTURE_ONLY" = "true" ]; then
    EXPORT_OPTS="$EXPORT_OPTS --no-data"
fi

# Table filtering
if [ ! -z "$TABLES_ONLY" ]; then
    for table in $(echo $TABLES_ONLY | tr ',' ' '); do
        EXPORT_OPTS="$EXPORT_OPTS --tables $table"
    done
fi

if [ ! -z "$TABLES_EXCLUDE" ]; then
    for table in $(echo $TABLES_EXCLUDE | tr ',' ' '); do
        EXPORT_OPTS="$EXPORT_OPTS --ignore-table=${SRC_DB}.$table"
    done
fi

echo "Exporting from source database..."
MYSQL_PWD=$SRC_PASS mysqldump -h $SRC_HOST -P $SRC_PORT -u $SRC_USER $EXPORT_OPTS $SRC_DB > $DUMP_FILE

# If drop target is enabled, drop the database and recreate it
if [ "$DROP_TARGET" = "true" ]; then
    echo "Dropping target database..."
    MYSQL_PWD=$TGT_PASS mysql -h $TGT_HOST -P $TGT_PORT -u $TGT_USER -e "DROP DATABASE IF EXISTS $TGT_DB; CREATE DATABASE $TGT_DB;"
fi

echo "Importing to target database..."
MYSQL_PWD=$TGT_PASS mysql -h $TGT_HOST -P $TGT_PORT -u $TGT_USER $TGT_DB < $DUMP_FILE

echo "Cleaning up..."
rm -f $DUMP_FILE

echo "Sync completed!"
""")
            os.chmod(script_path, 0o755)
        
        # Get source and target connection details
        src_host = source.get("host", "localhost")
        src_port = source.get("port", 3306)
        src_user = source.get("user", "root")
        src_pass = source.get("password", "")
        src_db = source.get("database", "")
        
        tgt_host = target.get("host", "localhost")
        tgt_port = target.get("port", 3306)
        tgt_user = target.get("user", "root")
        tgt_pass = target.get("password", "")
        tgt_db = target.get("database", "")
        
        # Get options
        tables_only = ",".join(options.get("tables_only", []))
        tables_exclude = ",".join(options.get("tables_exclude", []))
        structure_only = "true" if options.get("structure_only", False) else "false"
        drop_target = "true" if options.get("drop_target_first", False) else "false"
        
        # Run the script
        cmd = [
            script_path, 
            src_host, str(src_port), src_user, src_pass, src_db,
            tgt_host, str(tgt_port), tgt_user, tgt_pass, tgt_db,
            tables_only, tables_exclude, structure_only, drop_target
        ]
        
        logger.info(f"Running MySQL sync command for {name}")
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            logger.error(f"MySQL sync failed for {name}: {result.stderr}")
            raise Exception(f"MySQL sync failed: {result.stderr}")
        
        logger.info(f"MySQL sync completed for {name}")
    
    def _sync_postgresql_to_postgresql(self, name: str, source: Dict, target: Dict, options: Dict):
        """Sync from PostgreSQL to PostgreSQL"""
        logger.info(f"Performing PostgreSQL to PostgreSQL sync for {name}")
        
        script_path = os.path.join(SCRIPTS_DIR, "postgresql_sync.sh")
        
        # Create the script if it doesn't exist
        if not os.path.exists(script_path):
            with open(script_path, "w") as f:
                f.write("""#!/bin/bash
set -e

# PostgreSQL sync script
SRC_HOST="$1"
SRC_PORT="$2"
SRC_USER="$3"
SRC_PASS="$4"
SRC_DB="$5"
TGT_HOST="$6"
TGT_PORT="$7"
TGT_USER="$8"
TGT_PASS="$9"
TGT_DB="${10}"
TABLES_ONLY="${11}"
TABLES_EXCLUDE="${12}"
STRUCTURE_ONLY="${13}"
DROP_TARGET="${14}"

# Temp file for dump
DUMP_FILE="/tmp/pg_dump_${SRC_DB}.sql"

# Export options
EXPORT_OPTS="--no-owner --no-acl"

if [ "$STRUCTURE_ONLY" = "true" ]; then
    EXPORT_OPTS="$EXPORT_OPTS --schema-only"
fi

# Set up environment for source connection
export PGPASSWORD=$SRC_PASS

# Table filtering for PostgreSQL
TABLE_ARGS=""
if [ ! -z "$TABLES_ONLY" ]; then
    for table in $(echo $TABLES_ONLY | tr ',' ' '); do
        TABLE_ARGS="$TABLE_ARGS -t $table"
    done
fi

if [ ! -z "$TABLES_EXCLUDE" ]; then
    for table in $(echo $TABLES_EXCLUDE | tr ',' ' '); do
        TABLE_ARGS="$TABLE_ARGS -T $table"
    done
fi

echo "Exporting from source database..."
pg_dump -h $SRC_HOST -p $SRC_PORT -U $SRC_USER $EXPORT_OPTS $TABLE_ARGS $SRC_DB > $DUMP_FILE

# Set up environment for target connection
export PGPASSWORD=$TGT_PASS

# If drop target is enabled, drop the database and recreate it
if [ "$DROP_TARGET" = "true" ]; then
    echo "Dropping target database..."
    psql -h $TGT_HOST -p $TGT_PORT -U $TGT_USER -c "DROP DATABASE IF EXISTS $TGT_DB;" postgres
    psql -h $TGT_HOST -p $TGT_PORT -U $TGT_USER -c "CREATE DATABASE $TGT_DB;" postgres
fi

echo "Importing to target database..."
psql -h $TGT_HOST -p $TGT_PORT -U $TGT_USER -d $TGT_DB -f $DUMP_FILE

echo "Cleaning up..."
rm -f $DUMP_FILE

echo "Sync completed!"
""")
            os.chmod(script_path, 0o755)
        
        # Get source and target connection details
        src_host = source.get("host", "localhost")
        src_port = source.get("port", 5432)
        src_user = source.get("user", "postgres")
        src_pass = source.get("password", "")
        src_db = source.get("database", "")
        
        tgt_host = target.get("host", "localhost")
        tgt_port = target.get("port", 5432)
        tgt_user = target.get("user", "postgres")
        tgt_pass = target.get("password", "")
        tgt_db = target.get("database", "")
        
        # Get options
        tables_only = ",".join(options.get("tables_only", []))
        tables_exclude = ",".join(options.get("tables_exclude", []))
        structure_only = "true" if options.get("structure_only", False) else "false"
        drop_target = "true" if options.get("drop_target_first", False) else "false"
        
        # Run the script
        cmd = [
            script_path, 
            src_host, str(src_port), src_user, src_pass, src_db,
            tgt_host, str(tgt_port), tgt_user, tgt_pass, tgt_db,
            tables_only, tables_exclude, structure_only, drop_target
        ]
        
        logger.info(f"Running PostgreSQL sync command for {name}")
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            logger.error(f"PostgreSQL sync failed for {name}: {result.stderr}")
            raise Exception(f"PostgreSQL sync failed: {result.stderr}")
        
        logger.info(f"PostgreSQL sync completed for {name}")
    
    def _sync_influxdb_to_influxdb(self, name: str, source: Dict, target: Dict, options: Dict):
        """Sync from InfluxDB to InfluxDB"""
        logger.info(f"Performing InfluxDB to InfluxDB sync for {name}")
        # InfluxDB sync is more complex and would require a custom Python script
        # This is a placeholder for now
        logger.warning(f"InfluxDB sync not fully implemented yet for {name}")
        raise NotImplementedError("InfluxDB sync not fully implemented yet")
    
    def _sync_generic(self, name: str, source: Dict, target: Dict, options: Dict):
        """Generic sync between different database types"""
        logger.info(f"Performing generic sync for {name}")
        source_type = source.get("type", "").lower()
        target_type = target.get("type", "").lower()
        
        logger.warning(f"Generic sync from {source_type} to {target_type} not fully implemented yet for {name}")
        raise NotImplementedError(f"Generic sync from {source_type} to {target_type} not fully implemented yet")
    
    def _update_sync_status(self, name: str, status: str, message: str = ""):
        """Update the status of a sync job"""
        status_file = "/app/logs/sync_status.json"
        
        try:
            # Load existing status
            statuses = {}
            if os.path.exists(status_file):
                with open(status_file, "r") as f:
                    statuses = json.load(f)
            
            # Update status
            statuses[name] = {
                "status": status,
                "last_run": datetime.now().isoformat(),
                "message": message
            }
            
            # Save status
            with open(status_file, "w") as f:
                json.dump(statuses, f, indent=2)
        
        except Exception as e:
            logger.error(f"Error updating sync status: {str(e)}")
    
    def run(self):
        """Run the sync manager"""
        logger.info("Starting sync manager")
        self.setup_jobs()
        
        # Monitor for configuration changes
        last_modified = os.path.getmtime(CONFIG_PATH) if os.path.exists(CONFIG_PATH) else 0
        
        try:
            while True:
                scheduler.run_pending()
                
                # Check if config file was modified
                if os.path.exists(CONFIG_PATH):
                    current_modified = os.path.getmtime(CONFIG_PATH)
                    if current_modified > last_modified:
                        logger.info("Configuration file was modified, reloading")
                        self._reload_config()
                        last_modified = current_modified
                
                time.sleep(1)
        except KeyboardInterrupt:
            logger.info("Stopping sync manager")
        except Exception as e:
            logger.error(f"Error in sync manager: {str(e)}")
            raise

@app.route('/api/system/info', methods=['GET'])
def get_system_info():
    try: # Added try...except block
        # Get real system information
        cpu_usage = psutil.cpu_percent(interval=0.1) # Add interval for non-blocking call
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        swap = psutil.swap_memory() # Get swap info

        boot_time = datetime.fromtimestamp(psutil.boot_time())
        uptime = datetime.now() - boot_time
        days = uptime.days
        hours, remainder = divmod(uptime.seconds, 3600)
        minutes = int((remainder % 3600) // 60) # Correct calculation for minutes
        uptime_str = f"{days} days, {hours} hours, {minutes} mins" # Updated format

        # Helper to format bytes
        def format_bytes(bts):
            if bts < 1024: return f"{bts} Bytes"
            elif bts < 1024**2: return f"{bts/1024:.2f} KB"
            elif bts < 1024**3: return f"{bts/1024**2:.2f} MB"
            else: return f"{bts/1024**3:.2f} GB"

        system_info = {
            'cpuUsage': round(cpu_usage, 1), # Rounded CPU usage
            'memoryUsagePercent': round(memory.percent, 1),
            'memoryUsed': format_bytes(memory.used),
            'memoryTotal': format_bytes(memory.total),
            'diskUsagePercent': round(disk.percent, 1),
            'diskUsed': format_bytes(disk.used),
            'diskTotal': format_bytes(disk.total),
            'swapUsagePercent': round(swap.percent, 1), # Added Swap %
            'swapUsed': format_bytes(swap.used),       # Added Swap Used
            'swapTotal': format_bytes(swap.total),     # Added Swap Total
            'uptime': uptime_str
        }

        # Add logging to see what is returned
        logger.info(f"Returning system info: {system_info}")
        return jsonify(system_info)
        
    except Exception as e:
        logger.error(f"Error getting system info: {str(e)}", exc_info=True)
        # Return default structure with N/A values on error
        return jsonify({
            'cpuUsage': 0, 'memoryUsagePercent': 0, 'memoryUsed': 'N/A', 'memoryTotal': 'N/A',
            'diskUsagePercent': 0, 'diskUsed': 'N/A', 'diskTotal': 'N/A',
            'swapUsagePercent': 0, 'swapUsed': 'N/A', 'swapTotal': 'N/A',
            'uptime': 'N/A' 
        }), 500

@app.route('/api/databases', methods=['GET'])
def get_databases():
    # This is a placeholder - should be replaced with actual database discovery
    # You would connect to MySQL, PostgreSQL, etc to get real database information
    databases = [
        {'name': 'production_db', 'engine': 'PostgreSQL', 'size': '1.2 GB', 'tables': 32},
        {'name': 'testing_db', 'engine': 'MySQL', 'size': '450 MB', 'tables': 18},
        {'name': 'development_db', 'engine': 'PostgreSQL', 'size': '320 MB', 'tables': 24}
    ]
    return jsonify(databases)

@app.route('/api/ai/query', methods=['POST'])
def ai_query_endpoint():
    """
    Endpunkt zur Verarbeitung von natürlichsprachigen Anfragen durch den KI-Assistenten
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'error': 'No data provided'
            }), 400
            
        # Parameter für die AI-Query Funktion vorbereiten
        params = {
            'query': data.get('query'),
            'database_id': data.get('connectionId'),
            'provider': data.get('provider')  # KI-Provider kann optional angegeben werden
        }
        
        # AI-Query Funktion aufrufen
        result = ai_query(params)
        
        # Fehlerprüfung
        if 'error' in result:
            return jsonify({
                'query': params.get('query'),
                'sql': result.get('sql', 'No SQL generated'),
                'results': [],
                'formatted_results': result.get('error'),
                'error': result.get('error'),
                'provider': result.get('provider', 'none')
            }), 400
            
        # Erfolgreiche Antwort
        return jsonify({
            'query': result.get('query'),
            'sql': result.get('sql'),
            'results': result.get('results'),
            'formatted_results': result.get('formatted_results'),
            'database': result.get('database'),
            'provider': result.get('provider', 'unknown'),  # Verwendeter KI-Provider
            'available_providers': result.get('available_providers', []),  # Verfügbare Provider
            'error': None
        })
        
    except Exception as e:
        logger.error(f"Error processing AI query endpoint: {str(e)}", exc_info=True)
        return jsonify({
            'error': f"Error processing query: {str(e)}"
        }), 500

# Neuer Endpunkt für verfügbare KI-Provider
@app.route('/api/ai/providers', methods=['GET'])
def ai_providers_endpoint():
    """
    Endpunkt zum Abrufen der verfügbaren KI-Provider
    """
    try:
        # Liste der verfügbaren Provider abrufen
        available_providers = ai_manager.get_available_providers()
        default_provider = ai_manager.config.get("default_provider", "openai")
        
        # Konfigurationen für Frontend
        provider_configs = {}
        for name, provider in ai_manager.providers.items():
            if provider.is_available():
                # Nur relevante Informationen zurückgeben
                provider_configs[name] = {
                    "name": name,
                    "available": True,
                    "model": provider.config.get("model", "default"),
                    "is_default": name == default_provider
                }
            else:
                provider_configs[name] = {
                    "name": name,
                    "available": False,
                    "is_default": name == default_provider
                }
        
        return jsonify({
            'available_providers': available_providers,
            'default_provider': default_provider,
            'providers': provider_configs
        })
        
    except Exception as e:
        logger.error(f"Error getting AI providers: {str(e)}", exc_info=True)
        return jsonify({
            'error': f"Error getting AI providers: {str(e)}"
        }), 500

def format_query_results(results, sql_query):
    """
    Formatiert die Abfrageergebnisse für eine bessere Darstellung im Frontend
    """
    # Leere Ergebnisse behandeln
    if not results or len(results) == 0:
        return "Die Abfrage hat keine Ergebnisse zurückgegeben."
    
    # Überprüfen, ob es sich um eine Fehlermeldung handelt
    if len(results) == 1 and ('error' in results[0] or 'message' in results[0]):
        error_msg = results[0].get('error', results[0].get('message', 'Unbekannter Fehler'))
        return error_msg
    
    # Für COUNT, AVG, MIN, MAX Abfragen
    if len(results) == 1 and any(key in results[0] for key in ['count', 'average_price', 'min_price', 'max_price']):
        if 'count' in results[0]:
            return f"Die Anzahl beträgt: {results[0]['count']}"
        elif 'average_price' in results[0]:
            return f"Der Durchschnittspreis beträgt: {results[0]['average_price']:.2f}"
        elif 'max_price' in results[0]:
            return f"Der höchste Preis beträgt: {results[0]['max_price']:.2f}"
        elif 'min_price' in results[0]:
            return f"Der niedrigste Preis beträgt: {results[0]['min_price']:.2f}"
    
    # Für mehrere Ergebniszeilen oder komplexere Abfragen
    # Das Frontend kann die Rohdaten in der Tabelle anzeigen
    return f"{len(results)} Ergebnisse gefunden."

def ai_query(params):
    """
    Verarbeitet natürliche Sprachanfragen über den KI-Assistenten
    """
    # Logger aktivieren
    logger.info("AI Assistant query initiated")
    
    # Prüfen, ob eine Anfrage gesendet wurde
    query = params.get('query')
    if not query:
        logger.warning("AI Assistant called without a query")
        return {"error": "Keine Anfrage angegeben"}
    
    # Prüfen, ob ein bestimmter KI-Provider gewünscht ist
    provider_name = params.get('provider')
    
    # Liste der verfügbaren Provider für die Antwort
    available_providers = ai_manager.get_available_providers()
    
    # Prüfen, ob eine Datenbank-ID angegeben wurde
    db_id = params.get('database_id')
    if not db_id:
        logger.warning("AI Assistant called without a database_id")
        # Verwende die Sample-Datenbank als Fallback
        logger.info("Using sample database as fallback")
        db_connection = {
            'type': 'sample',
            'isSample': True,
            'name': 'Sample Database'
        }
    else:
        # Datenbankverbindung abrufen
        db_connection = get_database_connection(db_id)
        if not db_connection:
            logger.error(f"Database connection with ID {db_id} not found")
            return {
                "error": f"Datenbank mit ID {db_id} nicht gefunden", 
                "provider": provider_name or "none",
                "available_providers": available_providers
            }
    
    try:
        # Natürliche Sprachanfrage in SQL übersetzen
        logger.info(f"Translating natural language query: '{query}'")
        sql_query = natural_language_to_sql(query, db_connection)
        logger.info(f"Translated to SQL: {sql_query}")
        
        # Zusätzliche Information über den verwendeten KI-Provider
        used_provider = "none"
        if "SELECT 'Error using " in sql_query:
            # Extrahiere Provider-Name aus Fehlermeldung
            provider_parts = sql_query.split("Error using ")
            if len(provider_parts) > 1:
                used_provider = provider_parts[1].split(" ")[0].strip()
        elif "Successfully generated SQL using AI provider" in sql_query:
            # Extrahiere Provider-Name aus Erfolgslogmeldung
            provider_parts = sql_query.split("Successfully generated SQL using AI provider: ")
            if len(provider_parts) > 1:
                used_provider = provider_parts[1].strip()
        
        # SQL-Abfrage ausführen
        logger.info("Executing SQL query")
        results = execute_sql_query(sql_query, db_connection)
        
        # Ergebnisse formatieren und zurückgeben
        formatted_results = format_query_results(results, sql_query)
        
        # Antwort erstellen und zurückgeben
        response = {
            "query": query,
            "sql": sql_query,
            "results": results,
            "formatted_results": formatted_results,
            "database": db_connection.get('name', 'Unbekannte Datenbank'),
            "provider": used_provider,
            "available_providers": available_providers
        }
        
        return response
        
    except Exception as e:
        logger.error(f"Error in AI assistant: {str(e)}", exc_info=True)
        return {
            "error": f"Fehler bei der Verarbeitung der Anfrage: {str(e)}",
            "provider": provider_name or "none",
            "available_providers": available_providers
        }

def get_database_connection(database_id):
    """
    Holt Informationen zu einer Datenbankverbindung anhand der ID
    """
    try:
        # Wenn keine database_id angegeben wurde, verwende die Sample-Datenbank
        if not database_id:
            return {
                'type': 'sample',
                'isSample': True,
                'name': 'Sample Database'
            }
        
        # In einer echten Implementierung würden wir die Datenbankverbindungsinformationen
        # aus der SQLite-Datenbank oder Sequelize holen
        conn = get_db_connection()
        query = "SELECT * FROM database_connections WHERE id = ?"
        result = conn.execute(query, (database_id,)).fetchone()
        conn.close()
        
        if result:
            return {
                'type': 'real',
                'id': result['id'],
                'name': result['name'],
                'engine': result['engine'],
                'host': result['host'],
                'port': result['port'],
                'database': result['database'],
                'username': result['username'],
                'password': result['encrypted_password'],  # In der realen Implementierung würden wir das Passwort entschlüsseln
                'isSample': result['isSample'] == 1
            }
        return None
    except Exception as e:
        logger.error(f"Error getting database connection: {str(e)}")
        # Fallback zur Sample-Datenbank
        return {
            'type': 'sample',
            'name': 'Sample Database',
            'engine': 'mock'
        }

def get_postgres_tables(db_connection):
    """Holt die Liste der Tabellen aus einer PostgreSQL-Datenbank"""
    try:
        import psycopg2
        
        conn = psycopg2.connect(
            host=db_connection['host'],
            port=db_connection['port'],
            database=db_connection['database'],
            user=db_connection['username'],
            password=db_connection['password']
        )
        
        cur = conn.cursor()
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
        tables = [row[0] for row in cur.fetchall()]
        conn.close()
        return tables
    except Exception as e:
        logger.error(f"Error getting PostgreSQL tables: {str(e)}")
        return []

def get_mysql_tables(db_connection):
    """Holt die Liste der Tabellen aus einer MySQL-Datenbank"""
    try:
        import mysql.connector
        
        conn = mysql.connector.connect(
            host=db_connection['host'],
            port=int(db_connection['port']),
            database=db_connection['database'],
            user=db_connection['username'],
            password=db_connection['password']
        )
        
        cur = conn.cursor()
        cur.execute(f"SHOW TABLES FROM `{db_connection['database']}`")
        tables = [row[0] for row in cur.fetchall()]
        conn.close()
        return tables
    except Exception as e:
        logger.error(f"Error getting MySQL tables: {str(e)}")
        return []

def get_sqlite_tables(db_connection):
    """Holt die Liste der Tabellen aus einer SQLite-Datenbank"""
    try:
        import sqlite3
        
        db_path = db_connection.get('path', db_connection.get('database', ''))
        if not db_path:
            return []
            
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cur.fetchall()]
        conn.close()
        return tables
    except Exception as e:
        logger.error(f"Error getting SQLite tables: {str(e)}")
        return []

def natural_language_to_sql(query, db_connection):
    """
    Übersetzt eine natürliche Sprachanfrage in SQL
    """
    # Logger für Debugging
    logger.info(f"Processing natural language query: '{query}'")
    logger.info(f"Database connection type: {db_connection.get('type', 'unknown')}, isSample: {db_connection.get('isSample', False)}")
    
    query = query.lower()
    
    # Prüfen, ob es sich um eine Sample-Datenbank handelt
    is_sample = db_connection.get('type') == 'sample' or db_connection.get('isSample', False)
    
    # Sample-Datenbank: Versuchen, erst KI zu verwenden, dann Fallback auf Hard-coded Patterns
    if is_sample:
        logger.info("Processing sample database query")
        # Bereite Datenbankinformationen für die KI vor
        db_info = {
            'engine': 'sample',
            'tables': ['users', 'products', 'orders', 'categories']
        }
        
        # Liste der Tabellenstrukturen für die Sample-Datenbank
        table_structures = {
            'users': ['id', 'name', 'email', 'status'],
            'products': ['id', 'name', 'price'],
            'orders': ['id', 'user_id', 'total'],
            'categories': ['id', 'name']
        }
        
        # Struktur zur Datenbankinformation hinzufügen
        db_info['table_structures'] = table_structures
        
        # Versuche, SQL mit der KI zu generieren
        try:
            # Verwende den AI Manager, um SQL zu generieren
            sql, provider = ai_manager.generate_sql(query, db_info)
            
            # Prüfen, ob das generierte SQL einen Fehler enthält
            if "SELECT 'Error" in sql or "SELECT 'No AI" in sql:
                # Fallback auf Hard-coded Patterns
                logger.info(f"AI generation failed with provider {provider}, falling back to patterns")
            else:
                logger.info(f"Successfully generated SQL using AI provider: {provider}")
                return sql
        except Exception as e:
            logger.error(f"Error in AI SQL generation: {str(e)}")
            # Fallback auf Hard-coded Patterns folgt
        
        logger.info("Using sample database query patterns as fallback")
        # Vordefinierte Abfragen für die Sample-Datenbank
        predefined_queries = {
            # English patterns
            'how many users': "SELECT COUNT(*) as count FROM users",
            'number of users': "SELECT COUNT(*) as count FROM users",
            'count of users': "SELECT COUNT(*) as count FROM users",
            'users count': "SELECT COUNT(*) as count FROM users",
            'how many products': "SELECT COUNT(*) as count FROM products",
            'number of products': "SELECT COUNT(*) as count FROM products",
            'active users': "SELECT COUNT(*) as count FROM users WHERE status = 1",
            'inactive users': "SELECT COUNT(*) as count FROM users WHERE status = 0",
            'users with email': "SELECT COUNT(*) as count FROM users WHERE email IS NOT NULL",
            'average price': "SELECT AVG(price) as average_price FROM products",
            'mean price': "SELECT AVG(price) as average_price FROM products",
            'highest price': "SELECT MAX(price) as max_price FROM products",
            'maximum price': "SELECT MAX(price) as max_price FROM products",
            'max price': "SELECT MAX(price) as max_price FROM products",
            'lowest price': "SELECT MIN(price) as min_price FROM products",
            'minimum price': "SELECT MIN(price) as min_price FROM products",
            'min price': "SELECT MIN(price) as min_price FROM products",
            'total orders': "SELECT COUNT(*) as count FROM orders",
            'order count': "SELECT COUNT(*) as count FROM orders",
            'number of orders': "SELECT COUNT(*) as count FROM orders",
            'list all users': "SELECT id, name, email, status FROM users LIMIT 10",
            'show me the users': "SELECT id, name, email, status FROM users LIMIT 10",
            'list all products': "SELECT id, name, price FROM products LIMIT 10",
            'show me the products': "SELECT id, name, price FROM products LIMIT 10",
            'list all orders': "SELECT id, user_id, total FROM orders LIMIT 10",
            'show me the orders': "SELECT id, user_id, total FROM orders LIMIT 10",
            'expensive products': "SELECT id, name, price FROM products ORDER BY price DESC LIMIT 5",
            'highest priced products': "SELECT id, name, price FROM products ORDER BY price DESC LIMIT 5",
            'cheap products': "SELECT id, name, price FROM products ORDER BY price ASC LIMIT 5",
            'lowest priced products': "SELECT id, name, price FROM products ORDER BY price ASC LIMIT 5",
            
            # German patterns
            'wieviele user': "SELECT COUNT(*) as count FROM users",
            'wie viele user': "SELECT COUNT(*) as count FROM users",
            'anzahl user': "SELECT COUNT(*) as count FROM users",
            'benutzeranzahl': "SELECT COUNT(*) as count FROM users",
            'anzahl benutzer': "SELECT COUNT(*) as count FROM users",
            'wieviele produkte': "SELECT COUNT(*) as count FROM products",
            'wie viele produkte': "SELECT COUNT(*) as count FROM products",
            'anzahl produkte': "SELECT COUNT(*) as count FROM products",
            'aktive benutzer': "SELECT COUNT(*) as count FROM users WHERE status = 1",
            'inaktive benutzer': "SELECT COUNT(*) as count FROM users WHERE status = 0",
            'benutzer mit email': "SELECT COUNT(*) as count FROM users WHERE email IS NOT NULL",
            'durchschnittspreis': "SELECT AVG(price) as average_price FROM products",
            'mittlerer preis': "SELECT AVG(price) as average_price FROM products",
            'höchster preis': "SELECT MAX(price) as max_price FROM products",
            'maximaler preis': "SELECT MAX(price) as max_price FROM products",
            'max preis': "SELECT MAX(price) as max_price FROM products",
            'niedrigster preis': "SELECT MIN(price) as min_price FROM products",
            'minimaler preis': "SELECT MIN(price) as min_price FROM products",
            'min preis': "SELECT MIN(price) as min_price FROM products",
            'gesamtzahl bestellungen': "SELECT COUNT(*) as count FROM orders",
            'anzahl bestellungen': "SELECT COUNT(*) as count FROM orders",
            'bestellungsanzahl': "SELECT COUNT(*) as count FROM orders",
            'alle benutzer auflisten': "SELECT id, name, email, status FROM users LIMIT 10",
            'zeige alle benutzer': "SELECT id, name, email, status FROM users LIMIT 10",
            'zeige mir die benutzer': "SELECT id, name, email, status FROM users LIMIT 10",
            'liste alle produkte': "SELECT id, name, price FROM products LIMIT 10",
            'zeige mir die produkte': "SELECT id, name, price FROM products LIMIT 10",
            'alle bestellungen': "SELECT id, user_id, total FROM orders LIMIT 10",
            'zeige mir die bestellungen': "SELECT id, user_id, total FROM orders LIMIT 10",
            'teure produkte': "SELECT id, name, price FROM products ORDER BY price DESC LIMIT 5",
            'produkte mit höchstem preis': "SELECT id, name, price FROM products ORDER BY price DESC LIMIT 5",
            'günstige produkte': "SELECT id, name, price FROM products ORDER BY price ASC LIMIT 5",
            'produkte mit niedrigstem preis': "SELECT id, name, price FROM products ORDER BY price ASC LIMIT 5"
        }
        
        # Suche nach passenden Schlüsselwörtern in der Anfrage
        for key, sql in predefined_queries.items():
            if key in query:
                logger.info(f"Matched predefined query pattern: {key}")
                return sql
        
        # Wenn keine passende Abfrage gefunden wurde, versuche es nochmal mit der KI
        # aber mit einem allgemeineren Kontext
        try:
            additional_info = "This is a sample database with tables for users, products, orders and categories."
            enhanced_query = f"{query} {additional_info}"
            sql, provider = ai_manager.generate_sql(enhanced_query, db_info)
            if "SELECT 'Error" not in sql and "SELECT 'No AI" not in sql:
                return sql
        except:
            pass
            
        # Fallback für unbekannte Anfragen an die Sample-Datenbank
        return "SELECT 'The AI assistant cannot understand this query for the sample database' as message"
    
    # Für echte Datenbanken: KI-basierte SQL-Generierung
    engine = db_connection.get('engine', '').lower()
    logger.info(f"Processing real database query for engine: {engine}")
    
    # Sammle Datenbankinformationen für KI
    db_info = {
        'engine': engine,
        'host': db_connection.get('host', ''),
        'database': db_connection.get('database', '')
    }
    
    # Für echte Datenbanken, versuche immer zuerst KI
    try:
        # Hole Tabellenliste für die gewählte Datenbank, wenn möglich
        if engine in ['postgresql', 'postgres']:
            db_info['tables'] = get_postgres_tables(db_connection)
        elif engine == 'mysql':
            db_info['tables'] = get_mysql_tables(db_connection)
        elif engine == 'sqlite':
            db_info['tables'] = get_sqlite_tables(db_connection)
    except Exception as e:
        logger.warning(f"Could not get table list for {engine}: {str(e)}")
    
    # Versuche SQL mit KI zu generieren
    try:
        sql, provider = ai_manager.generate_sql(query, db_info)
        
        # Prüfen, ob das generierte SQL einen Fehler enthält
        if "SELECT 'Error" in sql or "SELECT 'No AI" in sql:
            logger.warning(f"AI generation failed with provider {provider}, falling back to pattern matching")
        else:
            logger.info(f"Successfully generated SQL using AI provider: {provider}")
            return sql
    except Exception as e:
        logger.error(f"Error in AI SQL generation for real database: {str(e)}")
        # Fallback auf Pattern Matching folgt
    
    # Fallback: Pattern-basierte SQL-Generierung als letztes Mittel
    # Schema/Tabellen für PostgreSQL oder MySQL holen
    if engine in ['postgresql', 'postgres', 'mysql']:
        try:
            # Einfache Muster-Erkennung für häufige Abfragen
            if 'list tables' in query or 'show tables' in query or 'what tables' in query:
                if engine in ['postgresql', 'postgres']:
                    return "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
                elif engine == 'mysql':
                    return f"SHOW TABLES FROM `{db_connection['database']}`"
            
            if 'count rows' in query and 'table' in query:
                # Versuchen, den Tabellennamen zu extrahieren
                words = query.split()
                table_idx = words.index('table') if 'table' in words else -1
                if table_idx > -1 and table_idx + 1 < len(words):
                    table_name = words[table_idx + 1].strip('.,?!')
                    return f"SELECT COUNT(*) FROM {table_name}"
            
            if ('schema' in query or 'structure' in query or 'columns' in query) and 'table' in query:
                # Versuchen, den Tabellennamen zu extrahieren
                words = query.split()
                table_idx = words.index('table') if 'table' in words else -1
                if table_idx > -1 and table_idx + 1 < len(words):
                    table_name = words[table_idx + 1].strip('.,?!')
                    if engine in ['postgresql', 'postgres']:
                        return f"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = '{table_name}'"
                    elif engine == 'mysql':
                        return f"DESCRIBE `{table_name}`"
            
            # Allgemeine Anfrage zum Auflisten aller Daten aus einer Tabelle
            if ('show' in query or 'list' in query or 'get' in query) and 'from' in query:
                words = query.split()
                if 'from' in words:
                    table_idx = words.index('from') + 1
                    if table_idx < len(words):
                        table_name = words[table_idx].strip('.,?!')
                        return f"SELECT * FROM {table_name} LIMIT 10"
            
            # Allgemeines SQL für andere Anfragen
            if 'select' in query:
                return query
            
            # Fallback für komplexere Anfragen
            if engine in ['postgresql', 'postgres']:
                return f"SELECT 'Could not convert query to SQL for PostgreSQL' as message"
            elif engine == 'mysql':
                return f"SELECT 'Could not convert query to SQL for MySQL' as message"
            
        except Exception as e:
            logger.error(f"Error in pattern matching for real database: {str(e)}")
            return f"SELECT 'Error generating SQL: {str(e)}' as error"
    
    # SQLite Unterstützung
    elif engine == 'sqlite':
        try:
            if 'list tables' in query or 'show tables' in query or 'what tables' in query:
                return "SELECT name FROM sqlite_master WHERE type='table'"
                
            if 'count rows' in query and 'table' in query:
                words = query.split()
                table_idx = words.index('table') if 'table' in words else -1
                if table_idx > -1 and table_idx + 1 < len(words):
                    table_name = words[table_idx + 1].strip('.,?!')
                    return f"SELECT COUNT(*) FROM {table_name}"
            
            if ('schema' in query or 'structure' in query or 'columns' in query) and 'table' in query:
                words = query.split()
                table_idx = words.index('table') if 'table' in words else -1
                if table_idx > -1 and table_idx + 1 < len(words):
                    table_name = words[table_idx + 1].strip('.,?!')
                    return f"PRAGMA table_info({table_name})"
                    
            if ('show' in query or 'list' in query or 'get' in query) and 'from' in query:
                words = query.split()
                if 'from' in words:
                    table_idx = words.index('from') + 1
                    if table_idx < len(words):
                        table_name = words[table_idx].strip('.,?!')
                        return f"SELECT * FROM {table_name} LIMIT 10"
        except Exception as e:
            logger.error(f"Error generating SQL for SQLite: {str(e)}")
            return f"SELECT 'Error generating SQL: {str(e)}' as error"
    
    # Fallback für nicht unterstützte Datenbank-Engines
    return f"SELECT 'Queries for {engine} engine could not be processed' as message"

def execute_sql_query(sql_query, db_connection):
    """
    Führt eine SQL-Abfrage auf der angegebenen Datenbank aus
    """
    logger.info(f"Executing SQL query: {sql_query}")
    logger.info(f"Using database connection: {db_connection.get('name', 'unnamed')}")
    
    # Prüfen, ob es sich um eine Sample-Datenbank handelt
    is_sample = db_connection.get('type') == 'sample' or db_connection.get('isSample', False)
    
    # Sample-Datenbank: Verwende die Funktion für Sample-Abfrageergebnisse
    if is_sample:
        logger.info("Using sample database response")
        return get_sample_query_results(sql_query)
    
    # Für echte Datenbanken: Abfrage ausführen und Ergebnisse zurückgeben
    try:
        engine = db_connection.get('engine', '').lower()
        
        if engine in ['postgresql', 'postgres']:
            import psycopg2
            import psycopg2.extras
            
            logger.info(f"Connecting to PostgreSQL database: {db_connection.get('database')}")
            conn = psycopg2.connect(
                host=db_connection['host'],
                port=db_connection['port'],
                database=db_connection['database'],
                user=db_connection['username'],
                password=db_connection['password']
            )
            
            # Dictionary-Cursor verwenden, um benannte Spalten zu erhalten
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute(sql_query)
            
            # Ergebnisse abrufen
            results = cur.fetchall()
            conn.close()
            
            # Konvertiere RealDictRow-Objekte in reguläre Dictionaries
            results = [dict(row) for row in results]
            logger.info(f"PostgreSQL query returned {len(results)} rows")
            return results
                
        elif engine == 'mysql':
            import mysql.connector
            from mysql.connector import Error
            
            logger.info(f"Connecting to MySQL database: {db_connection.get('database')}")
            conn = mysql.connector.connect(
                host=db_connection['host'],
                port=int(db_connection['port']),
                database=db_connection['database'],
                user=db_connection['username'],
                password=db_connection['password']
            )
            
            cur = conn.cursor(dictionary=True)
            cur.execute(sql_query)
            
            # Ergebnisse abrufen
            results = cur.fetchall()
            conn.close()
            
            logger.info(f"MySQL query returned {len(results)} rows")
            return results
        
        elif engine == 'sqlite':
            import sqlite3
            
            # SQLite-Datenbankpfad aus der Verbindungskonfiguration abrufen
            db_path = db_connection.get('path', '')
            
            if not db_path:
                logger.error("SQLite database path not specified")
                return [{"error": "SQLite database path not specified"}]
                
            logger.info(f"Connecting to SQLite database: {db_path}")
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
            
            cur = conn.cursor()
            cur.execute(sql_query)
            
            # Ergebnisse abrufen
            rows = cur.fetchall()
            conn.close()
            
            # Konvertiere Row-Objekte in Dictionaries
            results = [dict(row) for row in rows]
            logger.info(f"SQLite query returned {len(results)} rows")
            return results
        
        # Weitere Datenbanktypen hier hinzufügen...
        
        logger.warning(f"Unsupported database engine: {engine}")
        return [{"message": f"Die Datenbankengine '{engine}' wird derzeit nicht unterstützt."}]
        
    except Exception as e:
        logger.error(f"Error executing SQL query: {str(e)}")
        return [{"error": f"Fehler bei der Ausführung der SQL-Abfrage: {str(e)}"}]

def get_sample_query_results(sql_query):
    """
    Gibt simulierte Abfrageergebnisse für die Sample-Datenbank zurück
    """
    import random
    
    # Mock-Daten für die Sample-Datenbank
    mock_data = {
        'users': [
            {'id': i, 'name': f'User {i}', 'email': f'user{i}@example.com', 'status': i % 3 != 0} 
            for i in range(1, 235)  # 234 User insgesamt
        ],
        'products': [
            {'id': i, 'name': f'Product {i}', 'price': round(random.uniform(10, 1000), 2)} 
            for i in range(1, 1246)  # 1245 Produkte
        ],
        'orders': [
            {'id': i, 'user_id': random.randint(1, 234), 'total': round(random.uniform(50, 5000), 2)} 
            for i in range(1, 4893)  # 4892 Bestellungen
        ],
        'categories': [
            {'id': i, 'name': f'Category {i}'} 
            for i in range(1, 29)  # 28 Kategorien
        ]
    }
    
    # SQL-Abfrage analysieren und entsprechende Mock-Ergebnisse zurückgeben
    
    # COUNT(*) FROM users
    if "COUNT(*)" in sql_query and "FROM users" in sql_query:
        if "WHERE status = 1" in sql_query:
            # Aktive Benutzer zählen
            active_users = len([u for u in mock_data['users'] if u['status']])
            return [{"count": active_users}]
        
        elif "WHERE status = 0" in sql_query:
            # Inaktive Benutzer zählen
            inactive_users = len([u for u in mock_data['users'] if not u['status']])
            return [{"count": inactive_users}]
            
        elif "WHERE email IS NOT NULL" in sql_query:
            # Benutzer mit E-Mail zählen
            users_with_email = len([u for u in mock_data['users'] if u['email']])
            return [{"count": users_with_email}]
        
        # Alle Benutzer zählen
        return [{"count": len(mock_data['users'])}]
    
    # COUNT(*) FROM products
    elif "COUNT(*)" in sql_query and "FROM products" in sql_query:
        return [{"count": len(mock_data['products'])}]
        
    # AVG(price) FROM products
    elif "AVG(price)" in sql_query and "FROM products" in sql_query:
        avg_price = sum(p['price'] for p in mock_data['products']) / len(mock_data['products'])
        return [{"average_price": round(avg_price, 2)}]
        
    # MAX(price) FROM products
    elif "MAX(price)" in sql_query and "FROM products" in sql_query:
        max_price = max(p['price'] for p in mock_data['products'])
        return [{"max_price": max_price}]
        
    # MIN(price) FROM products
    elif "MIN(price)" in sql_query and "FROM products" in sql_query:
        min_price = min(p['price'] for p in mock_data['products'])
        return [{"min_price": min_price}]
        
    # COUNT(*) FROM orders
    elif "COUNT(*)" in sql_query and "FROM orders" in sql_query:
        return [{"count": len(mock_data['orders'])}]
    
    # SELECT * FROM users LIMIT
    elif "FROM users" in sql_query and ("LIMIT" in sql_query or "limit" in sql_query):
        limit = 10  # Standardwert
        
        # Versuchen, den LIMIT-Wert zu extrahieren
        limit_parts = sql_query.lower().split("limit")
        if len(limit_parts) > 1:
            try:
                limit = int(limit_parts[1].strip())
            except:
                pass
                
        return mock_data['users'][:limit]
    
    # SELECT * FROM products LIMIT
    elif "FROM products" in sql_query and ("LIMIT" in sql_query or "limit" in sql_query):
        limit = 10  # Standardwert
        
        # Versuchen, den LIMIT-Wert zu extrahieren
        limit_parts = sql_query.lower().split("limit")
        if len(limit_parts) > 1:
            try:
                limit = int(limit_parts[1].strip())
            except:
                pass
                
        # Sortierung nach Preis
        products = mock_data['products'].copy()
        if "ORDER BY price DESC" in sql_query:
            products.sort(key=lambda p: p['price'], reverse=True)
        elif "ORDER BY price ASC" in sql_query:
            products.sort(key=lambda p: p['price'])
            
        return products[:limit]
    
    # SELECT * FROM orders LIMIT
    elif "FROM orders" in sql_query and ("LIMIT" in sql_query or "limit" in sql_query):
        limit = 10  # Standardwert
        
        # Versuchen, den LIMIT-Wert zu extrahieren
        limit_parts = sql_query.lower().split("limit")
        if len(limit_parts) > 1:
            try:
                limit = int(limit_parts[1].strip())
            except:
                pass
                
        return mock_data['orders'][:limit]
    
    # Error message für unbekannte Abfragen
    return [{"message": "Die Abfrage konnte nicht auf der Sample-Datenbank ausgeführt werden."}]

def get_db_connection():
    """Hilfsfunktion für Datenbankzugriff auf die SQLite-Datenbank des Backend-Servers"""
    import sqlite3
    # Pfad zur SQLite-Datenbank des Backend
    db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend/data/mole.db')
    
    if not os.path.exists(db_path):
        logger.error(f"Database file not found at {db_path}")
        return None
        
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def analyze_query(query):
    """
    Legacy-Funktion für Kompatibilität
    Diese Funktion wird nur verwendet, wenn der neue AI-Abfragemechanismus fehlschlägt
    """
    query = query.lower()
    
    # Temperature related queries
    if 'temperature' in query or 'grad' in query or 'celsius' in query or 'fahrenheit' in query:
        if 'highest' in query or 'maximum' in query or 'max' in query:
            return "The highest temperature recorded was 38.5°C on July 15, 2023 at 14:30:22."
        elif 'lowest' in query or 'minimum' in query or 'min' in query:
            return "The lowest temperature recorded was -5.2°C on January 8, 2023 at 05:12:45."
        elif 'average' in query or 'mean' in query:
            return "The average temperature over the last year was 22.3°C. This is 1.2°C higher than the previous year."
        else:
            return "The current temperature is 24.3°C, which is within normal parameters for this time of year."
    
    # Electricity/energy consumption queries
    elif 'electricity' in query or 'power' in query or 'energy' in query or 'consumption' in query:
        if 'year' in query or 'annual' in query or '2023' in query:
            return "The total electricity consumption for 2023 was 5,420 kWh, which is 12% lower than 2022 (6,180 kWh)."
        elif 'month' in query or 'monthly' in query:
            return "The average monthly electricity consumption is 452 kWh. The highest month was December 2023 with 712 kWh."
        elif 'day' in query or 'daily' in query:
            return "The average daily consumption is 14.8 kWh. Weekdays average 16.3 kWh, while weekends average 11.7 kWh."
        else:
            return "The current power consumption is 3.2 kW, which is 15% below the usual rate for this time."
    
    # User activity queries
    elif 'user' in query or 'account' in query or 'login' in query:
        if 'active' in query or 'most' in query:
            return "The most active users are: user_id: 1042 (213 activities), user_id: 587 (189 activities), and user_id: 344 (176 activities)."
        elif 'inactive' in query or 'least' in query:
            return "There are 57 users who haven't logged in for over 90 days. The longest inactive account has been dormant for 412 days."
        else:
            return "There are currently 234 users in the database with an average of 24 interactions per user per week."
    
    # Transaction/order queries
    elif 'transaction' in query or 'order' in query or 'payment' in query:
        if 'average' in query or 'mean' in query:
            return "The average transaction value is $47.85. This represents a 5.3% increase over the previous quarter."
        elif 'largest' in query or 'highest' in query or 'maximum' in query:
            return "The largest transaction was $2,435.67 on March 3, 2023 (transaction_id: 78A52B)."
        elif 'volume' in query or 'count' in query or 'number' in query:
            return "There have been 23,517 transactions year-to-date, with an average of 87 transactions per day."
        else:
            return "The system processed 1,253 transactions in the last 7 days, with a total value of $59,841.32."
    
    # System performance queries
    elif 'system' in query or 'performance' in query or 'database' in query:
        if 'peak' in query or 'busiest' in query:
            return "Peak database activity occurs between 14:00 and 16:00 UTC daily, with an average of 1,245 transactions per minute."
        elif 'slowest' in query or 'slow' in query:
            return "The slowest database operations are joins on the order_items table, with an average execution time of 1.87 seconds."
        elif 'error' in query or 'fail' in query:
            return "There were 14 database errors in the last 24 hours, mostly related to connection timeouts during the maintenance window."
        else:
            return "The database currently shows good performance metrics with 95.8% cache hit ratio and average query time of 235ms."
    
    # Default response if no pattern matches
    else:
        return "I've analyzed your query but don't have specific information about that. Please try asking about temperatures, energy consumption, user activity, transactions, or system performance."

def get_sample_database():
    """
    Gibt die Konfiguration für die Sample-Datenbank zurück
    """
    try:
        # Sample-Datenbank-Konfiguration
        return {
            'type': 'sample',
            'isSample': True,
            'name': 'Sample Database',
            'engine': 'sample',
            'description': 'Eine Beispieldatenbank für Demo-Zwecke',
            'id': 'sample-db'
        }
    except Exception as e:
        logger.error(f"Error getting sample database: {str(e)}")
        return None

class AIProvider:
    """Base class for AI providers"""
    def __init__(self, config: Dict = None):
        self.config = config or {}
        self.name = "base"
        
    def generate_sql(self, query: str, db_info: Dict) -> str:
        """Generate SQL from natural language"""
        raise NotImplementedError("Subclasses must implement this method")
        
    def is_available(self) -> bool:
        """Check if this provider is available"""
        return False

class OpenAIProvider(AIProvider):
    """OpenAI API provider using GPT models"""
    def __init__(self, config: Dict = None):
        super().__init__(config)
        self.name = "openai"
        self.api_key = self.config.get("api_key", os.environ.get("OPENAI_API_KEY"))
        self.model = self.config.get("model", "gpt-3.5-turbo")
        
    def is_available(self) -> bool:
        return bool(self.api_key)
        
    def generate_sql(self, query: str, db_info: Dict) -> str:
        if not self.is_available():
            return "SELECT 'OpenAI API key not configured' as error"
            
        try:
            openai.api_key = self.api_key
            
            # Create system prompt with database structure information
            system_prompt = f"You are a SQL expert that translates natural language into SQL queries. "
            system_prompt += f"The database is a {db_info.get('engine', 'unknown')} database"
            
            if db_info.get('tables'):
                system_prompt += f" with the following tables: {', '.join(db_info.get('tables', []))}"
            
            # Make API call
            response = openai.ChatCompletion.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Convert this question to a SQL query: {query}"}
                ],
                temperature=0.1,  # Low temperature for more deterministic results
                max_tokens=150
            )
            
            # Extract SQL from response
            sql = response.choices[0].message.content.strip()
            
            # Clean up the SQL if it's enclosed in markdown code blocks
            if sql.startswith("```sql"):
                sql = sql.split("```sql")[1].split("```")[0].strip()
            elif sql.startswith("```"):
                sql = sql.split("```")[1].split("```")[0].strip()
                
            return sql
            
        except Exception as e:
            logger.error(f"Error using OpenAI API: {str(e)}")
            return f"SELECT 'Error using OpenAI API: {str(e)}' as error"

class PerplexityAIProvider(AIProvider):
    """Perplexity AI provider for database queries"""
    def __init__(self, config: Dict = None):
        super().__init__(config)
        self.name = "perplexity"
        self.api_key = self.config.get("api_key", os.environ.get("PERPLEXITY_API_KEY"))
        self.model = self.config.get("model", "pplx-7b-online")
        
    def is_available(self) -> bool:
        return bool(self.api_key)
        
    def generate_sql(self, query: str, db_info: Dict) -> str:
        if not self.is_available():
            return "SELECT 'Perplexity API key not configured' as error"
            
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            # Create system prompt with database structure information
            system_prompt = f"You are a SQL expert that translates natural language into SQL queries. "
            system_prompt += f"The database is a {db_info.get('engine', 'unknown')} database"
            
            if db_info.get('tables'):
                system_prompt += f" with the following tables: {', '.join(db_info.get('tables', []))}"
            
            # Prepare request payload
            payload = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Convert this question to a SQL query: {query}"}
                ]
            }
            
            # Make API call
            response = requests.post(
                "https://api.perplexity.ai/chat/completions",
                headers=headers,
                json=payload
            )
            
            if response.status_code != 200:
                logger.error(f"Perplexity API error: {response.text}")
                return f"SELECT 'Perplexity API error: {response.status_code}' as error"
                
            # Extract SQL from response
            result = response.json()
            sql = result["choices"][0]["message"]["content"].strip()
            
            # Clean up the SQL if it's enclosed in markdown code blocks
            if sql.startswith("```sql"):
                sql = sql.split("```sql")[1].split("```")[0].strip()
            elif sql.startswith("```"):
                sql = sql.split("```")[1].split("```")[0].strip()
                
            return sql
            
        except Exception as e:
            logger.error(f"Error using Perplexity API: {str(e)}")
            return f"SELECT 'Error using Perplexity API: {str(e)}' as error"

class LlamaProvider(AIProvider):
    """Local Llama model provider"""
    def __init__(self, config: Dict = None):
        super().__init__(config)
        self.name = "llama"
        self.model_path = self.config.get("model_path", "/app/models/llama")
        self.model = None
        self.tokenizer = None
        
    def is_available(self) -> bool:
        try:
            # Check if model files exist and GPU is available
            model_exists = os.path.exists(self.model_path)
            if not model_exists:
                return False
            
            # Initialize model and tokenizer if not already done
            if self.model is None and model_exists:
                self._load_model()
                
            return self.model is not None
        except Exception as e:
            logger.error(f"Error checking Llama availability: {str(e)}")
            return False
            
    def _load_model(self):
        """Load the Llama model and tokenizer"""
        try:
            logger.info(f"Loading Llama model from {self.model_path}")
            
            # Check if CUDA is available
            device = "cuda" if torch.cuda.is_available() else "cpu"
            logger.info(f"Using device: {device}")
            
            # Load tokenizer and model
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_path)
            self.model = AutoModelForCausalLM.from_pretrained(
                self.model_path,
                device_map=device,
                torch_dtype=torch.float16 if device == "cuda" else torch.float32
            )
            
            logger.info("Llama model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load Llama model: {str(e)}")
            self.model = None
            self.tokenizer = None
        
    def generate_sql(self, query: str, db_info: Dict) -> str:
        if not self.is_available():
            return "SELECT 'Llama model not available' as error"
            
        try:
            # Create system prompt with database structure information
            system_prompt = f"You are a SQL expert that translates natural language into SQL queries. "
            system_prompt += f"The database is a {db_info.get('engine', 'unknown')} database"
            
            if db_info.get('tables'):
                system_prompt += f" with the following tables: {', '.join(db_info.get('tables', []))}"
                
            # Full prompt
            full_prompt = f"{system_prompt}\n\nUser: Convert this question to a SQL query: {query}\n\nSQL:"
            
            # Generate SQL
            inputs = self.tokenizer(full_prompt, return_tensors="pt").to(self.model.device)
            outputs = self.model.generate(
                inputs.input_ids,
                max_new_tokens=150,
                temperature=0.1,
                top_p=0.95,
                do_sample=True
            )
            
            # Decode and extract SQL
            result = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
            sql = result.split("SQL:")[1].strip()
            
            # Clean up the SQL if it's enclosed in markdown code blocks
            if "```" in sql:
                sql = sql.split("```")[1].split("```")[0].strip()
                
            return sql
            
        except Exception as e:
            logger.error(f"Error using Llama model: {str(e)}")
            return f"SELECT 'Error using Llama model: {str(e)}' as error"

class SQLPalProvider(AIProvider):
    """SQLPal integrated specialized SQL model"""
    def __init__(self, config: Dict = None):
        super().__init__(config)
        self.name = "sqlpal"
        self.model = None
        self.pipeline = None
        self.model_path = self.config.get("model_path", "/app/models/sqlpal")
        
    def is_available(self) -> bool:
        try:
            # Check if model files exist
            model_exists = os.path.exists(self.model_path)
            if not model_exists:
                return False
                
            # Initialize model if not already done
            if self.model is None and model_exists:
                self._load_model()
                
            return self.pipeline is not None
        except Exception as e:
            logger.error(f"Error checking SQLPal availability: {str(e)}")
            return False
            
    def _load_model(self):
        """Load the SQLPal model"""
        try:
            logger.info(f"Loading SQLPal model from {self.model_path}")
            
            # Check available device
            device = 0 if torch.cuda.is_available() else -1
            
            # Create text-to-SQL pipeline
            self.pipeline = pipeline(
                "text2text-generation",
                model=self.model_path,
                device=device
            )
            
            logger.info("SQLPal model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load SQLPal model: {str(e)}")
            self.pipeline = None
        
    def generate_sql(self, query: str, db_info: Dict) -> str:
        if not self.is_available():
            return "SELECT 'SQLPal model not available' as error"
            
        try:
            # Create prompt with database context
            prompt = f"Database type: {db_info.get('engine', 'unknown')}\n"
            
            if db_info.get('tables'):
                prompt += f"Tables: {', '.join(db_info.get('tables', []))}\n"
                
            prompt += f"Question: {query}\nSQL:"
            
            # Generate SQL
            result = self.pipeline(prompt, max_length=150, do_sample=False)[0]['generated_text']
            
            # Extract SQL from result
            sql = result.strip()
            
            return sql
            
        except Exception as e:
            logger.error(f"Error using SQLPal model: {str(e)}")
            return f"SELECT 'Error using SQLPal model: {str(e)}' as error"

class AIManager:
    """Manages AI providers and selects the best one to use"""
    def __init__(self):
        self.providers = {}
        self.config = self._load_config()
        self._initialize_providers()
        
    def _load_config(self) -> Dict:
        """Load AI configuration from YAML file"""
        config = {
            "default_provider": "openai",
            "providers": {
                "openai": {"enabled": True, "model": "gpt-3.5-turbo"},
                "perplexity": {"enabled": True, "model": "pplx-7b-online"},
                "llama": {"enabled": True, "model_path": "/app/models/llama"},
                "sqlpal": {"enabled": True, "model_path": "/app/models/sqlpal"}
            }
        }
        
        try:
            if os.path.exists(AI_CONFIG_PATH):
                with open(AI_CONFIG_PATH, "r") as f:
                    yaml_config = yaml.safe_load(f)
                    # Update config with values from file
                    if yaml_config:
                        config.update(yaml_config)
        except Exception as e:
            logger.error(f"Error loading AI configuration: {str(e)}")
            
        return config
        
    def _reload_config(self):
        """Reload configuration and reinitialize providers"""
        logger.info("Reloading AI configuration")
        self.config = self._load_config()
        
        # Clear existing providers
        self.providers = {}
        
        # Initialize providers with new configuration
        self._initialize_providers()
        
    def _initialize_providers(self):
        """Initialize all configured AI providers"""
        provider_classes = {
            "openai": OpenAIProvider,
            "perplexity": PerplexityAIProvider,
            "llama": LlamaProvider,
            "sqlpal": SQLPalProvider
        }
        
        for name, cls in provider_classes.items():
            if self.config.get("providers", {}).get(name, {}).get("enabled", False):
                try:
                    provider_config = self.config.get("providers", {}).get(name, {})
                    self.providers[name] = cls(provider_config)
                    logger.info(f"Initialized AI provider: {name}")
                except Exception as e:
                    logger.error(f"Error initializing AI provider {name}: {str(e)}")
    
    def get_available_providers(self) -> List[str]:
        """Get list of available AI providers"""
        return [name for name, provider in self.providers.items() if provider.is_available()]
        
    def get_provider(self, name: str) -> Optional[AIProvider]:
        """Get a specific AI provider by name"""
        provider = self.providers.get(name)
        if provider and provider.is_available():
            return provider
        return None
        
    def get_best_provider(self) -> Optional[AIProvider]:
        """Get the best available AI provider based on priority"""
        # Default provider from config
        default_provider = self.config.get("default_provider", "openai")
        if default_provider in self.providers and self.providers[default_provider].is_available():
            return self.providers[default_provider]
            
        # Priority order (fallbacks)
        priority = ["openai", "perplexity", "llama", "sqlpal"]
        for name in priority:
            if name in self.providers and self.providers[name].is_available():
                return self.providers[name]
                
        return None
        
    def generate_sql(self, query: str, db_info: Dict, provider_name: str = None) -> Tuple[str, str]:
        """
        Generate SQL from natural language using the specified or best available provider
        Returns tuple of (sql, provider_name)
        """
        if provider_name and provider_name in self.providers:
            provider = self.providers[provider_name]
            if provider.is_available():
                sql = provider.generate_sql(query, db_info)
                return sql, provider.name
        
        # Use the best available provider
        provider = self.get_best_provider()
        if provider:
            sql = provider.generate_sql(query, db_info)
            return sql, provider.name
            
        # No providers available
        return "SELECT 'No AI providers available' as error", "none"

# Initialize AI Manager
ai_manager = AIManager()

# Add new route for updating AI settings from Node.js backend
@app.route('/api/ai/settings', methods=['POST'])
def update_ai_settings():
    """
    Endpoint to update AI provider settings from Node.js backend
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'error': 'No data provided'
            }), 400
            
        # Update config path
        config_path = AI_CONFIG_PATH
        
        # Convert from Node.js format to Python format
        python_config = {
            "default_provider": data.get("defaultProvider", "sqlpal"),
            "providers": {}
        }
        
        # Add provider configurations
        node_providers = data.get("providers", {})
        
        # OpenAI config
        if "openai" in node_providers:
            python_config["providers"]["openai"] = {
                "enabled": node_providers["openai"].get("enabled", True),
                "model": node_providers["openai"].get("model", "gpt-3.5-turbo"),
                "api_key": node_providers["openai"].get("apiKey", "")
            }
            
        # Perplexity config
        if "perplexity" in node_providers:
            python_config["providers"]["perplexity"] = {
                "enabled": node_providers["perplexity"].get("enabled", True),
                "model": node_providers["perplexity"].get("model", "pplx-7b-online"),
                "api_key": node_providers["perplexity"].get("apiKey", "")
            }
            
        # Llama config
        if "llama" in node_providers:
            python_config["providers"]["llama"] = {
                "enabled": node_providers["llama"].get("enabled", True),
                "model_path": node_providers["llama"].get("modelPath", "/app/models/llama")
            }
            
        # SQLPal config
        if "sqlpal" in node_providers:
            python_config["providers"]["sqlpal"] = {
                "enabled": node_providers["sqlpal"].get("enabled", True),
                "model_path": node_providers["sqlpal"].get("modelPath", "/app/models/sqlpal")
            }
            
        # SQL generation settings
        if "sqlGeneration" in data:
            python_config["sql_generation"] = {
                "max_tokens": data["sqlGeneration"].get("maxTokens", 150),
                "temperature": data["sqlGeneration"].get("temperature", 0.1),
                "include_schema": data["sqlGeneration"].get("includeSchema", True),
                "timeout": data["sqlGeneration"].get("timeout", 10)
            }
        
        # Ensure config directory exists
        os.makedirs(os.path.dirname(config_path), exist_ok=True)
        
        # Save configuration
        with open(config_path, 'w') as f:
            yaml.dump(python_config, f, default_flow_style=False)
            
        # Reinitialize AI manager with new settings
        ai_manager._reload_config()
        
        # Return success
        return jsonify({
            'success': True,
            'message': 'AI settings updated successfully'
        })
        
    except Exception as e:
        logger.error(f"Error updating AI settings: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': f"Error updating AI settings: {str(e)}"
        }), 500

# Add new route for testing AI provider connection
@app.route('/api/ai/test', methods=['POST'])
def test_ai_provider():
    """
    Endpoint to test connection to an AI provider
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'error': 'No data provided'
            }), 400
            
        provider = data.get('provider')
        api_key = data.get('api_key')
        
        if not provider:
            return jsonify({
                'success': False,
                'error': 'Provider not specified'
            }), 400
            
        # Test connection based on provider
        if provider == 'openai':
            try:
                openai.api_key = api_key
                # Simple model list request to test connection
                openai.Model.list()
                return jsonify({
                    'success': True,
                    'message': 'OpenAI connection successful'
                })
            except Exception as e:
                return jsonify({
                    'success': False,
                    'error': f'OpenAI connection failed: {str(e)}'
                })
                
        elif provider == 'perplexity':
            try:
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
                
                # Simple models request to test connection
                response = requests.get("https://api.perplexity.ai/models", headers=headers)
                
                if response.status_code == 200:
                    return jsonify({
                        'success': True,
                        'message': 'Perplexity connection successful'
                    })
                else:
                    return jsonify({
                        'success': False,
                        'error': f'Perplexity connection failed: {response.text}'
                    })
            except Exception as e:
                return jsonify({
                    'success': False,
                    'error': f'Perplexity connection failed: {str(e)}'
                })
                
        elif provider == 'llama':
            # Check if model path exists
            model_path = data.get('model_path', '/app/models/llama')
            if os.path.exists(model_path):
                return jsonify({
                    'success': True,
                    'message': 'Llama model path exists'
                })
            else:
                return jsonify({
                    'success': False,
                    'error': f'Llama model path not found: {model_path}'
                })
                
        elif provider == 'sqlpal':
            # SQLPal is a local model, just check if the path exists
            model_path = data.get('model_path', '/app/models/sqlpal')
            if os.path.exists(model_path):
                return jsonify({
                    'success': True,
                    'message': 'SQLPal model path exists'
                })
            else:
                # For SQLPal, we'll allow it to work even if the path doesn't exist yet
                return jsonify({
                    'success': True,
                    'message': 'SQLPal is enabled (model will be downloaded if needed)'
                })
        else:
            return jsonify({
                'success': False,
                'error': f'Unknown provider: {provider}'
            }), 400
            
    except Exception as e:
        logger.error(f"Error testing AI provider: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': f"Error testing AI provider: {str(e)}"
        }), 500

# --- Performance History Endpoint --- 
@app.route('/api/system/performance-history', methods=['GET'])
def get_performance_history_endpoint():
    """Endpoint to provide historical performance metrics."""
    metric = request.args.get('metric')
    limit = request.args.get('limit', default=MAX_HISTORY, type=int)
    logger.info(f"Received request for performance history: metric={metric}, limit={limit}")
    logger.debug(f"Current metrics history state: {metrics_history}")
    
    if metric in metrics_history:
        # Return the last 'limit' items
        history_data = metrics_history[metric][-limit:]
        logger.info(f"Found {len(history_data)} data points for metric '{metric}'")
        return jsonify({
            'success': True,
            'metric': metric,
            'history': history_data
        })
    else:
        logger.warning(f"Invalid or missing metric '{metric}'. Available: {list(metrics_history.keys())}")
        return jsonify({
            'success': False,
            'message': f'Invalid or missing metric parameter (use one of: {list(metrics_history.keys())})'
        }), 400

# --- End Performance History --- 