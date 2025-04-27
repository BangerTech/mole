#!/usr/bin/env python3
"""
Mole Database Sync Manager
Handles scheduled database synchronizations between different database servers.
"""

import os
import time
import logging
import yaml
import schedule
from datetime import datetime
import subprocess
import sys
import json
import requests
from typing import Dict, List, Optional, Union, Any
import psutil
from flask import Flask, jsonify, request
from flask_cors import CORS

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
        schedule.clear()
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
            schedule.every().hour.do(job_function)
            logger.info(f"Scheduled {name} to run hourly")
        
        elif frequency == "daily":
            time_str = schedule_config.get("time", "02:00")
            schedule.every().day.at(time_str).do(job_function)
            logger.info(f"Scheduled {name} to run daily at {time_str}")
        
        elif frequency == "weekly":
            time_str = schedule_config.get("time", "02:00")
            days = schedule_config.get("days", [1])  # Monday by default
            
            for day in days:
                if day == 1:
                    schedule.every().monday.at(time_str).do(job_function)
                elif day == 2:
                    schedule.every().tuesday.at(time_str).do(job_function)
                elif day == 3:
                    schedule.every().wednesday.at(time_str).do(job_function)
                elif day == 4:
                    schedule.every().thursday.at(time_str).do(job_function)
                elif day == 5:
                    schedule.every().friday.at(time_str).do(job_function)
                elif day == 6:
                    schedule.every().saturday.at(time_str).do(job_function)
                elif day == 7:
                    schedule.every().sunday.at(time_str).do(job_function)
            
            logger.info(f"Scheduled {name} to run weekly on days {days} at {time_str}")
        
        elif frequency == "monthly":
            time_str = schedule_config.get("time", "02:00")
            day = schedule_config.get("day", 1)
            
            # For monthly, we need a custom check
            def monthly_job():
                today = datetime.now()
                if today.day == day:
                    job_function()
            
            schedule.every().day.at(time_str).do(monthly_job)
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
                    schedule.every().minute.do(job_function)
                else:
                    for m in minute.split(','):
                        schedule.every().hour.at(f":{m}").do(job_function)
                
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
                schedule.run_pending()
                
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
    # Get real system information
    cpu_usage = psutil.cpu_percent()
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    
    boot_time = datetime.fromtimestamp(psutil.boot_time())
    uptime = datetime.now() - boot_time
    days = uptime.days
    hours, remainder = divmod(uptime.seconds, 3600)
    
    system_info = {
        'cpuUsage': cpu_usage,
        'memoryUsage': memory.percent,
        'diskUsage': disk.percent,
        'uptime': f"{days} days, {hours} hours"
    }
    
    return jsonify(system_info)

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
def ai_query():
    try:
        data = request.json
        query = data.get('query', '')
        
        if not query:
            return jsonify({'error': 'No query provided'}), 400
        
        # In a real implementation, this would:
        # 1. Parse the natural language query
        # 2. Translate it to SQL or database-specific commands
        # 3. Execute the query against the appropriate database
        # 4. Format the results in a user-friendly way
        
        # For now, we'll provide mock responses based on keyword matching
        response = analyze_query(query)
        
        return jsonify({'result': response})
    except Exception as e:
        logger.error(f"Error processing AI query: {str(e)}")
        return jsonify({'error': 'An error occurred processing your query'}), 500

def analyze_query(query):
    """
    Analyze a natural language query and provide a response.
    This is a placeholder - in a real implementation, 
    this would use NLP and database connections.
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
            return "There are currently 342 active user accounts with an average of 24 interactions per user per week."
    
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

# Add a new API endpoint for database creation
@app.route('/api/database/create', methods=['POST'])
def create_database():
    """
    Create a new database using the create-database.php script
    """
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['db_type', 'db_name', 'db_host', 'db_port', 'db_user', 'db_pass']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'message': f'Missing required field: {field}'})
        
        # Forward request to the create-database.php script
        create_db_url = "http://app/db-creation/create-database.php"
        response = requests.post(create_db_url, data=data)
        
        # Log the response
        logger.info(f"Database creation request: {data['db_type']} - {data['db_name']} on {data['db_host']}")
        
        # Return the response from the PHP script
        try:
            return response.json()
        except:
            return jsonify({
                'success': False, 
                'message': f'Error parsing response from create-database.php: {response.text}'
            })
            
    except Exception as e:
        logger.error(f"Error creating database: {str(e)}")
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'})

if __name__ == "__main__":
    sync_manager = DatabaseSync()
    # start the sync manager as a thread so it doesn't block the API server
    import threading
    thread = threading.Thread(target=sync_manager.run)
    thread.daemon = True
    thread.start()
    
    # Start the API server
    logger.info("Starting API server on port 5000")
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False) 