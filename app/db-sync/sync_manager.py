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
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime, timezone
import subprocess
import sys
import json
import requests
from typing import Dict, List, Optional, Union, Any, Tuple
import psutil
from flask import Flask, jsonify, request
from flask_cors import CORS
import random
import threading
import sqlite3

# Cryptography imports
import hashlib 
import binascii 
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding 
from cryptography.hazmat.backends import default_backend

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

# --- Flask App Initialization ---
app = Flask(__name__) # Gunicorn will look for this 'app' object
CORS(app, resources={r"/api/*": {"origins": "*"}})

# --- APScheduler Global Instance ---
scheduler = BackgroundScheduler(daemon=True) # daemon=True allows app to exit even if scheduler thread is running

# --- Global Constants ---
BACKEND_DB_PATH = "/app/backend/data/mole.db"

# --- Key Derivation for Decryption (Matches Node.js) ---
ENCRYPTION_KEY_RAW = os.getenv("MOLE_ENCRYPTION_KEY", 'a-default-key-that-should-be-changed-in-prod')
hashed_key_bytes = hashlib.sha256(ENCRYPTION_KEY_RAW.encode('utf-8')).digest()
hashed_key_hex = binascii.hexlify(hashed_key_bytes).decode('utf-8')
ENCRYPTION_KEY_FOR_CIPHER = hashed_key_hex[:32].encode('utf-8') 
IV_LENGTH = 16 # Bytes

# --- Decryption Function ---
def decrypt_password(encrypted_text_with_iv: str) -> Optional[str]:
    if not encrypted_text_with_iv: return ""
    if ':' not in encrypted_text_with_iv:
        logger.warning(f"Password format invalid for decryption: {encrypted_text_with_iv[:20]}...")
        return None 
    try:
        iv_hex, encrypted_hex = encrypted_text_with_iv.split(':', 1)
        if len(iv_hex) != IV_LENGTH * 2: return None
        iv = binascii.unhexlify(iv_hex)
        encrypted_data = binascii.unhexlify(encrypted_hex)
        cipher = Cipher(algorithms.AES(ENCRYPTION_KEY_FOR_CIPHER), modes.CBC(iv), backend=default_backend())
        decryptor = cipher.decryptor()
        decrypted_padded = decryptor.update(encrypted_data) + decryptor.finalize()
        unpadder = padding.PKCS7(algorithms.AES.block_size).unpadder()
        unpadded_data = unpadder.update(decrypted_padded) + unpadder.finalize()
        return unpadded_data.decode('utf-8')
    except Exception as e:
        logger.error(f"Decryption failed: {e}", exc_info=True)
        return None

# --- Metrics Collection --- (Simplified for brevity in this edit)
metrics_history: Dict[str, List[Dict[str, Union[float, int]]]] = {'cpu': [], 'memory': []}
MAX_HISTORY = 60
def collect_metrics():
    try:
        cpu = psutil.cpu_percent(interval=0.1); mem = psutil.virtual_memory().percent
        ts = time.time() * 1000
        metrics_history['cpu'].append({'timestamp': ts, 'value': round(cpu, 1)})
        metrics_history['memory'].append({'timestamp': ts, 'value': round(mem, 1)})
        if len(metrics_history['cpu']) > MAX_HISTORY: metrics_history['cpu'].pop(0)
        if len(metrics_history['memory']) > MAX_HISTORY: metrics_history['memory'].pop(0)
    except Exception as e: logger.error(f"Metrics error: {e}")

# --- DatabaseSync Class (Handles scheduling logic) ---
class DatabaseSync:
    def __init__(self):
        logger.info("DatabaseSync instance initializing...")
        self.setup_jobs() 
        self._schedule_periodic_reload()

    def _get_db_connection(self):
        if not os.path.exists(BACKEND_DB_PATH):
            logger.error(f"DB not found: {BACKEND_DB_PATH}")
            raise FileNotFoundError(f"DB not found: {BACKEND_DB_PATH}")
        conn = sqlite3.connect(BACKEND_DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn

    def _fetch_sync_tasks_from_db(self) -> List[Dict]:
        tasks = []
        try:
            with self._get_db_connection() as conn:
                cursor = conn.cursor()
                query = """
                SELECT st.id as task_id, st.name as task_name, st.schedule, st.tables,
                       s_conn.id as source_id, s_conn.name as source_name, s_conn.engine as source_engine, 
                       s_conn.host as source_host, s_conn.port as source_port, s_conn.database as source_database, 
                       s_conn.username as source_username, s_conn.encrypted_password as source_encrypted_password, s_conn.ssl_enabled as source_ssl_enabled,
                       t_conn.id as target_id, t_conn.name as target_name, t_conn.engine as target_engine, 
                       t_conn.host as target_host, t_conn.port as target_port, t_conn.database as target_database, 
                       t_conn.username as target_username, t_conn.encrypted_password as target_encrypted_password, t_conn.ssl_enabled as target_ssl_enabled
                FROM sync_tasks st
                JOIN database_connections s_conn ON st.source_connection_id = s_conn.id
                JOIN database_connections t_conn ON st.target_connection_id = t_conn.id
                WHERE st.enabled = 1 AND st.schedule IS NOT NULL AND st.schedule != 'never'; 
                """
                cursor.execute(query)
                rows = cursor.fetchall()
                for row in rows: tasks.append(dict(row))
            logger.info(f"Fetched {len(tasks)} scheduled tasks from DB.")
        except Exception as e: logger.error(f"Error fetching tasks: {e}", exc_info=True)
        return tasks

    def _fetch_single_task_from_db(self, task_id_to_fetch: int) -> Optional[Dict]:
        task = None
        try:
            with self._get_db_connection() as conn:
                cursor = conn.cursor()
                query = """
                SELECT st.id as task_id, st.name as task_name, st.schedule, st.tables,
                       s_conn.id as source_id, s_conn.name as source_name, s_conn.engine as source_engine, 
                       s_conn.host as source_host, s_conn.port as source_port, s_conn.database as source_database, 
                       s_conn.username as source_username, s_conn.encrypted_password as source_encrypted_password, s_conn.ssl_enabled as source_ssl_enabled,
                       t_conn.id as target_id, t_conn.name as target_name, t_conn.engine as target_engine, 
                       t_conn.host as target_host, t_conn.port as target_port, t_conn.database as target_database, 
                       t_conn.username as target_username, t_conn.encrypted_password as target_encrypted_password, t_conn.ssl_enabled as target_ssl_enabled
                FROM sync_tasks st
                JOIN database_connections s_conn ON st.source_connection_id = s_conn.id
                JOIN database_connections t_conn ON st.target_connection_id = t_conn.id
                WHERE st.id = ? AND st.enabled = 1; 
                """
                cursor.execute(query, (task_id_to_fetch,))
                row = cursor.fetchone()
                if row:
                    task = dict(row)
                    logger.info(f"Fetched details for task ID {task_id_to_fetch} for wrapper.")
                else:
                    logger.warning(f"Task ID {task_id_to_fetch} not found or not enabled in DB during fetch for wrapper.")
        except Exception as e:
            logger.error(f"Error fetching single task ID {task_id_to_fetch}: {e}", exc_info=True)
        return task

    def _perform_database_sync_wrapper(self, task_id: int):
        logger.info(f"[WRAPPER - TASK {task_id}] Execution triggered. Fetching latest task details.")
        task_config = self._fetch_single_task_from_db(task_id)

        if not task_config:
            logger.warning(f"[WRAPPER - TASK {task_id}] Task config not found or task disabled. Aborting sync run.")
            return
        
        # Check if task is still meant to be scheduled (e.g. schedule not 'never')
        if task_config.get("schedule", "never").lower() == 'never':
            logger.info(f"[WRAPPER - TASK {task_id}] Task schedule is 'never'. Aborting planned execution.")
            # _reload_config should remove this job if schedule became 'never'
            return

        try:
            sync_payload = {
                'taskId': task_config['task_id'],
                'source': { 
                    'id': task_config['source_id'], 'name': task_config['source_name'], 'engine': task_config['source_engine'], 
                    'host': task_config['source_host'], 'port': task_config['source_port'], 'database': task_config['source_database'], 
                    'username': task_config['source_username'], 'password': task_config['source_encrypted_password'], 
                    'ssl_enabled': task_config['source_ssl_enabled']
                },
                'target': { 
                    'id': task_config['target_id'], 'name': task_config['target_name'], 'engine': task_config['target_engine'], 
                    'host': task_config['target_host'], 'port': task_config['target_port'], 'database': task_config['target_database'], 
                    'username': task_config['target_username'], 'password': task_config['target_encrypted_password'], 
                    'ssl_enabled': task_config['target_ssl_enabled']
                },
                'tables': json.loads(task_config['tables']) if task_config['tables'] else None
            }
            logger.info(f"[WRAPPER - TASK {task_id}] Payload constructed. Calling perform_database_sync.")
            perform_database_sync(sync_payload) # Call the original global sync logic
        except Exception as e_payload:
            logger.error(f"[WRAPPER - TASK {task_id}] Failed to construct payload or call perform_database_sync: {e_payload}", exc_info=True)
            start_time = datetime.now(timezone.utc)
            update_sync_log(task_id, start_time, datetime.now(timezone.utc), "error", f"Wrapper error: {e_payload}", 0)

    def _create_trigger_from_schedule(self, schedule_frequency: str, task_id: int) -> Optional[Union[IntervalTrigger, CronTrigger]]:
        if schedule_frequency == "hourly":
            return IntervalTrigger(hours=1)
        elif schedule_frequency == "daily":
            return CronTrigger(hour=2) # Default daily at 2 AM
        elif schedule_frequency == "weekly":
            return CronTrigger(day_of_week='mon', hour=2) # Default weekly Mon at 2 AM
        else:
            logger.warning(f"Cannot create trigger for unsupported schedule: {schedule_frequency} for task {task_id}")
            return None

    def _schedule_tasks(self, tasks_to_schedule: List[Dict], overwrite: bool = False):
        for task_config in tasks_to_schedule:
            try:
                task_id = task_config['task_id']
                task_name = task_config.get('task_name', f"Task {task_id}")
                schedule_frequency = task_config.get("schedule", "never").lower()
                job_id = f"dbtask_{task_id}"

                if schedule_frequency == 'never':
                    # If task is set to 'never', ensure it's removed if it exists
                    existing_job = scheduler.get_job(job_id)
                    if existing_job:
                        logger.info(f"Task {task_name} ({job_id}) schedule is 'never'. Removing existing job.")
                        scheduler.remove_job(job_id)
                    continue

                new_trigger_obj = self._create_trigger_from_schedule(schedule_frequency, task_id)
                if not new_trigger_obj:
                    continue # Unsupported schedule, already logged

                # Wrapper function for scheduler, captures self and task_id
                # The actual sync execution (perform_database_sync) is called within the wrapper
                job_func_for_scheduler = lambda current_task_id=task_id: threading.Thread(target=self._perform_database_sync_wrapper, args=(current_task_id,)).start()
                
                existing_job = scheduler.get_job(job_id)

                if existing_job:
                    if overwrite: # This branch is primarily for _reload_config
                        logger.info(f"Job {job_id} ({task_name}) exists. Overwrite=True. Checking for trigger changes.")
                        needs_reschedule = False
                        current_job_trigger = existing_job.trigger

                        # Compare new_trigger_obj with current_job_trigger more carefully
                        if type(current_job_trigger) is not type(new_trigger_obj):
                            needs_reschedule = True
                            logger.info(f"Job {job_id} trigger TYPE changed. Old: {type(current_job_trigger)}, New: {type(new_trigger_obj)}")
                        elif isinstance(new_trigger_obj, IntervalTrigger):
                            # For IntervalTrigger, only compare the interval duration itself.
                            # We assume other fields like start_date, end_date, timezone, jitter are not being managed by this simple schedule string.
                            if current_job_trigger.interval != new_trigger_obj.interval:
                                needs_reschedule = True
                                logger.info(f"Job {job_id} IntervalTrigger DURATION changed. Old: {current_job_trigger.interval}, New: {new_trigger_obj.interval}")
                        elif isinstance(new_trigger_obj, CronTrigger):
                            # For CronTrigger, the default __eq__ compares all relevant fields (day_of_week, hour, minute, etc.)
                            if current_job_trigger != new_trigger_obj: # This relies on CronTrigger.__eq__ being thorough
                                needs_reschedule = True
                                logger.info(f"Job {job_id} CronTrigger fields changed. Old: {current_job_trigger}, New: {new_trigger_obj}")
                        # Add more elif for other trigger types if ever supported
                        
                        if needs_reschedule:
                            logger.info(f"Job {job_id} trigger requires update. Rescheduling. Old: {current_job_trigger}, New: {new_trigger_obj}")
                            try:
                                scheduler.reschedule_job(job_id, trigger=new_trigger_obj)
                                # Note: func is not changed here, wrapper handles payload changes
                                logger.info(f"Job {job_id} rescheduled. Next run: {scheduler.get_job(job_id).next_run_time if scheduler.get_job(job_id) else 'N/A'}")
                            except Exception as e_reschedule:
                                logger.error(f"Error rescheduling job {job_id}: {e_reschedule}. Attempting replace.", exc_info=True)
                                try: # Fallback to replace if reschedule fails (e.g., job disappeared)
                                    scheduler.add_job(job_func_for_scheduler, trigger=new_trigger_obj, id=job_id, replace_existing=True)
                                    logger.info(f"Job {job_id} replaced after reschedule error. Next run: {scheduler.get_job(job_id).next_run_time if scheduler.get_job(job_id) else 'N/A'}")
                                except Exception as e_replace_fallback:
                                    logger.error(f"Error replacing job {job_id} after reschedule error: {e_replace_fallback}", exc_info=True)
                        else:
                            logger.info(f"Job {job_id} trigger is effectively unchanged ({current_job_trigger}). No reschedule needed. Payload changes handled by wrapper at runtime. Next run: {existing_job.next_run_time}")
                            # Ensure the function is up-to-date if it somehow changed, though with lambda capturing task_id, it should be stable.
                            # This modify_job might not be strictly necessary if func definition is stable.
                            # scheduler.modify_job(job_id, func=job_func_for_scheduler)
                    else: # Job exists but overwrite is False (initial setup_jobs call)
                        logger.info(f"Job {job_id} ({task_name}) already exists during initial setup (overwrite=false). Skipping.")
                else: # Job does not exist, add it
                    logger.info(f"Job {job_id} ({task_name}) does not exist. Adding new job for schedule: {schedule_frequency}")
                    try:
                        scheduler.add_job(job_func_for_scheduler, trigger=new_trigger_obj, id=job_id, replace_existing=False)
                        # Simpler log for newly added job, as next_run_time might not be immediately available on the direct return or on the object from add_job itself before scheduler processes it.
                        logger.info(f"Job {job_id} ({task_name}) submitted to scheduler with trigger: {new_trigger_obj}. Next run time will be determined by scheduler.")
                    except Exception as e_add_new:
                        logger.error(f"Error adding new job {job_id}: {e_add_new}", exc_info=True)

            except Exception as e:
                logger.error(f"Error in _schedule_tasks for task_id {task_config.get('task_id')}: {e}", exc_info=True)

    def _reload_config(self):
        logger.info("Reloading sync jobs from database.")
        current_job_ids = {job.id for job in scheduler.get_jobs() if job.id.startswith('dbtask_')}
        tasks_from_db = self._fetch_sync_tasks_from_db()
        db_task_ids_to_schedule = {f"dbtask_{task['task_id']}" for task in tasks_from_db}

        # Remove jobs that are no longer in the DB or are disabled/set to never
        for job_id_to_remove in current_job_ids - db_task_ids_to_schedule:
            try: 
                scheduler.remove_job(job_id_to_remove)
                logger.info(f"Removed stale/disabled job from scheduler: {job_id_to_remove}")
            except Exception as e: 
                logger.warning(f"Error removing job {job_id_to_remove} during reload: {e}")
        
        # Add/Update jobs from DB. Overwrite=True will now use reschedule_job if trigger changed.
        self._schedule_tasks(tasks_from_db, overwrite=True)
        logger.info("Sync jobs reload complete.")

    def _schedule_periodic_reload(self):
        job_id = 'reload_db_jobs'
        # Remove existing job first to ensure only one instance if this method is called multiple times (e.g. during init issues)
        if scheduler.get_job(job_id): 
            try: scheduler.remove_job(job_id)
            except Exception: pass # Ignore if already gone
        scheduler.add_job(self._reload_config, 'interval', minutes=5, id=job_id)
        logger.info(f"Scheduled periodic reload of sync jobs every 5 minutes.")

    def setup_jobs(self):
        logger.info("Initial setup of scheduled jobs from database...")
        db_tasks = self._fetch_sync_tasks_from_db()
        if not db_tasks: 
            logger.info("No initial tasks to schedule from DB.")
            return
        self._schedule_tasks(db_tasks, overwrite=False)

# --- DB Log/Update Functions (Global, as they use their own connections) ---
def update_sync_log(task_id: int, start_time: datetime, end_time: datetime, status: str, message: str = "", rows_synced: int = 0):
    try:
        with sqlite3.connect(BACKEND_DB_PATH) as conn:
            conn.execute("INSERT INTO sync_logs (task_id, start_time, end_time, status, message, rows_synced) VALUES (?,?,?,?,?,?)",(task_id, start_time.isoformat(), end_time.isoformat(), status, message, rows_synced))
            conn.commit()
        logger.info(f"Logged sync: Task {task_id}, Status {status}")
    except Exception as e: logger.error(f"Log update error task {task_id}: {e}")

def update_last_sync_time(task_id: int, sync_time: datetime):
    try:
        with sqlite3.connect(BACKEND_DB_PATH) as conn:
            conn.execute("UPDATE sync_tasks SET last_sync = ?, updated_at = ? WHERE id = ?", (sync_time.isoformat(), datetime.now(timezone.utc).isoformat(), task_id))
            conn.commit()
        logger.info(f"Updated last_sync for task {task_id}")
    except Exception as e: logger.error(f"Last_sync update error task {task_id}: {e}")

# --- Main Sync Execution Logic --- (Remains mostly the same)
def perform_database_sync(task_payload: Dict):
    # ... (logic from previous version: get details, decrypt, call sync_postgresql_to_postgresql, log) ...
    # Ensure it uses the task_payload directly and calls the global update_sync_log and update_last_sync_time
    task_id = task_payload['taskId']
    source_conn_payload = task_payload['source']
    target_conn_payload = task_payload['target']
    options = {"tables_only": task_payload.get('tables')}
    logger.info(f"[TASK {task_id}] perform_database_sync called.")

    source_password_to_use = source_conn_payload.get('password')
    dec_src_pass = decrypt_password(source_password_to_use) if source_password_to_use and ':' in source_password_to_use else source_password_to_use
    if source_password_to_use and ':' in source_password_to_use and dec_src_pass is None:
        logger.error(f"[TASK {task_id}] Failed to decrypt source password. Aborting."); update_sync_log(task_id, datetime.now(timezone.utc), datetime.now(timezone.utc), "error", "Decrypt source pass failed",0); return
    source_conn_payload['password'] = dec_src_pass
    
    target_password_to_use = target_conn_payload.get('password')
    dec_tgt_pass = decrypt_password(target_password_to_use) if target_password_to_use and ':' in target_password_to_use else target_password_to_use
    if target_password_to_use and ':' in target_password_to_use and dec_tgt_pass is None:
        logger.error(f"[TASK {task_id}] Failed to decrypt target password. Aborting."); update_sync_log(task_id, datetime.now(timezone.utc), datetime.now(timezone.utc), "error", "Decrypt target pass failed",0); return
    target_conn_payload['password'] = dec_tgt_pass
    
    source_engine = source_conn_payload.get("engine", "").lower()
    target_engine = target_conn_payload.get("engine", "").lower()
    start_time = datetime.now(timezone.utc)
    status = "error"; message = ""; rows_synced = 0
    try:
        if source_engine == "postgresql" and target_engine == "postgresql":
            status, message, rows_synced = sync_postgresql_to_postgresql(task_id, source_conn_payload, target_conn_payload, options)
        else: message = f"Unsupported sync: {source_engine} to {target_engine}"; raise NotImplementedError(message)
        if status == "success": update_last_sync_time(task_id, start_time); logger.info(f"[TASK {task_id}] Sync success.")
        else: logger.error(f"[TASK {task_id}] Sync failed. Status: {status}, Msg: {message}")
    except Exception as e: message = str(e); logger.error(f"[TASK {task_id}] Sync exception: {e}", exc_info=True); status = "error"
    finally: update_sync_log(task_id, start_time, datetime.now(timezone.utc), status, message, rows_synced)


# --- Specific Sync Implementations (e.g., sync_postgresql_to_postgresql) ---
# This function definition should be identical to the one you confirmed was working for manual syncs.
# It uses the already decrypted passwords from the 'source' and 'target' dicts in task_payload.
def sync_postgresql_to_postgresql(task_id: int, source: Dict, target: Dict, options: Dict) -> Tuple[str, str, int]:
    # ... (Paste the full working version of this function here, ensuring it uses plaintext passwords from source['password'] and target['password']) ...
    # The following is a truncated placeholder to keep the edit focused on structure.
    logger.info(f"[TASK {task_id}] Placeholder for sync_postgresql_to_postgresql. Actual implementation needed.")
    # Simulate work
    # time.sleep(10)
    # Simulate success for testing scheduling
    # return "success", "PostgreSQL sync completed (simulated).", 0

    logger.info(f"[TASK {task_id}] Performing PostgreSQL to PostgreSQL sync (using pg_restore)...")
    tgt_admin_user = os.getenv('DEFAULT_PG_ADMIN_USER', 'postgres') 
    tgt_admin_pass = os.getenv('DEFAULT_PG_ADMIN_PASSWORD', '')
    tgt_user = target['username']; tgt_pass = target.get('password', '') 
    tgt_host = target['host']; tgt_port = str(target['port']); tgt_db_name = target['database']
    dump_file = f"/tmp/pg_dump_task_{task_id}_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}.dump"
    rows_synced = 0
    pg_dump_cmd_base = ['pg_dump', '--host', source['host'], '--port', str(source['port']), '--username', source['username'], '--dbname', source['database'], '--format=custom', '--file', dump_file, '--no-owner', '--no-acl', '--no-comments']
    pg_dump_cmd_base.extend(['--exclude-schema=_timescaledb_internal', '--exclude-schema=_timescaledb_catalog', '--exclude-schema=_timescaledb_config', '--exclude-schema=timescaledb_information'])
    pg_dump_cmd_schema_other_data = list(pg_dump_cmd_base) + ['--exclude-table-data=public.sensor_readings']
    psql_admin_maintenance_cmd_base = ['psql', '--host', tgt_host, '--port', tgt_port, '--username', tgt_admin_user, '--dbname', 'postgres', '-qtAX']
    psql_admin_target_db_cmd_base = ['psql', '--host', tgt_host, '--port', tgt_port, '--username', tgt_admin_user, '--dbname', tgt_db_name, '-qtAX']
    psql_user_cmd_base_for_target_db = ['psql', '--host', tgt_host, '--port', tgt_port, '--username', tgt_user, '--dbname', tgt_db_name, '-qtAX']
    source_env = os.environ.copy(); source_env['PGPASSWORD'] = source.get('password', '')
    target_admin_env = os.environ.copy(); target_admin_env['PGPASSWORD'] = tgt_admin_pass
    target_user_env = os.environ.copy(); target_user_env['PGPASSWORD'] = tgt_pass
    try:
        subprocess.run(psql_admin_maintenance_cmd_base + ['-c', f'DROP DATABASE IF EXISTS "{tgt_db_name}" WITH (FORCE);'], env=target_admin_env, check=False)
        subprocess.run(psql_admin_maintenance_cmd_base + ['-c', f'CREATE DATABASE "{tgt_db_name}" OWNER "{tgt_user}";'], env=target_admin_env, check=True)
        subprocess.run(psql_user_cmd_base_for_target_db + ['-c', "CREATE EXTENSION IF NOT EXISTS timescaledb SCHEMA public;"], env=target_user_env, check=True)
        subprocess.run(psql_admin_target_db_cmd_base + ['-c', "SELECT timescaledb_pre_restore();SET client_min_messages TO WARNING;"], env=target_admin_env, check=True)
        subprocess.run(pg_dump_cmd_schema_other_data, env=source_env, check=True, capture_output=False)
        pg_restore_cmd = ['pg_restore', '--host', tgt_host, '--port', tgt_port, '--username', tgt_user, '--dbname', tgt_db_name, '--no-owner', '-v', dump_file]
        subprocess.run(pg_restore_cmd, env=target_user_env, check=True, capture_output=False)
        drop_trigger_sql = "DROP TRIGGER IF EXISTS ts_insert_blocker ON public.sensor_readings;"
        subprocess.run(psql_user_cmd_base_for_target_db + ['-c', drop_trigger_sql], env=target_user_env, check=False)
        create_hypertable_sql = "SELECT create_hypertable('public.sensor_readings', 'time', if_not_exists => TRUE, migrate_data => FALSE);"
        ch_res = subprocess.run(psql_user_cmd_base_for_target_db + ['-c', create_hypertable_sql], env=target_user_env, check=True, capture_output=True, text=True)
        if ch_res.returncode != 0: raise Exception(f"create_hypertable failed: {ch_res.stderr}")
        hypertable_to_copy = 'public.sensor_readings'
        csv_path = f"/tmp/{hypertable_to_copy.split('.')[-1]}_data_task_{task_id}.csv"
        subprocess.run(psql_admin_target_db_cmd_base + ['-c', f'ALTER DATABASE "{tgt_db_name}" SET timescaledb.restoring = \'off\';'], env=target_admin_env, check=True)
        try:
            psql_source_cmd_base = ['psql', '--host', source['host'], '--port', str(source['port']), '--username', source['username'], '--dbname', source['database'], '-qtAX']
            copy_to_sql = f"\\COPY (SELECT * FROM {hypertable_to_copy}) TO '{csv_path}' WITH CSV HEADER"
            subprocess.run(psql_source_cmd_base + ['-c', copy_to_sql], env=source_env, check=True)
            if os.path.exists(csv_path):
                copy_from_sql = f"\\COPY {hypertable_to_copy} FROM '{csv_path}' WITH CSV HEADER"
                subprocess.run(psql_user_cmd_base_for_target_db + ['-c', copy_from_sql], env=target_user_env, check=True)
        finally:
            subprocess.run(psql_admin_target_db_cmd_base + ['-c', f'ALTER DATABASE "{tgt_db_name}" SET timescaledb.restoring = \'on\';'], env=target_admin_env, check=True)
            if os.path.exists(csv_path): os.remove(csv_path)
        subprocess.run(psql_admin_target_db_cmd_base + ['-c', "SELECT timescaledb_post_restore();"], env=target_admin_env, check=True)
        return "success", "PostgreSQL sync completed.", rows_synced
    except subprocess.CalledProcessError as e: return "error", f"Sync CMD failed: {e.stderr}", 0
    except Exception as e: return "error", str(e), 0
    finally:
        if os.path.exists(dump_file): logger.info(f"Kept dump: {dump_file}")

# --- Flask API Endpoints ---
@app.route('/trigger_sync', methods=['POST'])
def trigger_sync_endpoint():
    # ... (this endpoint remains largely the same, calls perform_database_sync with payload from Node.js) ...
    if not request.is_json: return jsonify({"error": "Request must be JSON"}), 400
    data = request.get_json()
    task_id = data.get('taskId')
    if not task_id or not data.get('source') or not data.get('target'):
        return jsonify({"error": "Missing taskId, source, or target"}), 400
    logger.info(f"Received sync trigger request for Task ID: {task_id}")
    try:
        threading.Thread(target=perform_database_sync, args=(data,), daemon=True).start()
        return jsonify({"message": f"Sync task {task_id} started."}), 202
    except Exception as e: return jsonify({"error": f"Failed to start sync: {e}"}), 500

@app.route('/api/system/performance-history', methods=['GET'])
def get_performance_history_endpoint():
    # ... (this endpoint remains the same) ...
    metric = request.args.get('metric'); limit = request.args.get('limit',default=MAX_HISTORY,type=int)
    return jsonify({'success':True,'metric':metric,'history':metrics_history[metric][-limit:]}) if metric in metrics_history else (jsonify({'success':False,'message':f'Invalid metric. Avail: {list(metrics_history.keys())}'}),400)

@app.route('/api/system/info', methods=['GET'])
def get_system_info_endpoint():
    try:
        cpu_usage = psutil.cpu_percent(interval=0.1) # Percentage
        
        memory_info = psutil.virtual_memory()
        memory_usage_percent = memory_info.percent
        memory_used_gb = round(memory_info.used / (1024**3), 1)
        memory_total_gb = round(memory_info.total / (1024**3), 1)
        
        disk_info = psutil.disk_usage('/') # For root disk. Change path if needed.
        disk_usage_percent = disk_info.percent
        disk_used_gb = round(disk_info.used / (1024**3), 1)
        disk_total_gb = round(disk_info.total / (1024**3), 1)
        
        swap_info = psutil.swap_memory()
        swap_usage_percent = swap_info.percent
        swap_used_gb = round(swap_info.used / (1024**3), 1)
        swap_total_gb = round(swap_info.total / (1024**3), 1)
        
        boot_time_timestamp = psutil.boot_time()
        current_time_timestamp = time.time()
        uptime_seconds = current_time_timestamp - boot_time_timestamp
        
        days = int(uptime_seconds // (24 * 3600))
        hours = int((uptime_seconds % (24 * 3600)) // 3600)
        minutes = int((uptime_seconds % 3600) // 60)
        uptime_str = f"{days} days, {hours} hours, {minutes} minutes"
        
        current_time_iso = datetime.now(timezone.utc).isoformat()

        system_info = {
            "cpuUsage": round(cpu_usage, 1),
            "memoryUsagePercent": round(memory_usage_percent, 1),
            "memoryUsed": f"{memory_used_gb} GB",
            "memoryTotal": f"{memory_total_gb} GB",
            "diskUsagePercent": round(disk_usage_percent, 1),
            "diskUsed": f"{disk_used_gb} GB",
            "diskTotal": f"{disk_total_gb} GB",
            "swapUsagePercent": round(swap_usage_percent, 1),
            "swapUsed": f"{swap_used_gb} GB",
            "swapTotal": f"{swap_total_gb} GB",
            "uptime": uptime_str,
            "rawUptimeSeconds": int(uptime_seconds), # Frontend also has a rawUptimeSeconds
            "currentTime": current_time_iso
        }
        return jsonify(system_info), 200
        
    except Exception as e:
        logger.error(f"Error fetching system info: {e}", exc_info=True)
        return jsonify({"error": "Failed to fetch system information", "details": str(e)}), 500

# --- Application Initialization for Gunicorn ---
if not scheduler.get_job('metric_collector'): # Ensure job isn't added multiple times by Gunicorn workers
    scheduler.add_job(collect_metrics, 'interval', minutes=1, id='metric_collector')
    logger.info("Scheduled metrics collection.")

# Global instance of DatabaseSync created when module is loaded by Gunicorn worker
sync_manager_instance = None
try:
    sync_manager_instance = DatabaseSync() # This calls setup_jobs() and _schedule_periodic_reload()
    logger.info("DatabaseSync instance created, initial jobs scheduled from DB.")
except Exception as e:
    logger.error(f"CRITICAL: Failed to initialize DatabaseSync or schedule initial jobs: {e}", exc_info=True)

if not scheduler.running:
    try:
        scheduler.start()
        logger.info("APScheduler started by main application module.")
    except Exception as e: 
        logger.error(f"CRITICAL: Failed to start global APScheduler: {e}", exc_info=True)

# Ensure scheduler shuts down gracefully when the app exits (Gunicorn handles worker exit)
atexit.register(lambda: scheduler.shutdown(wait=False) if scheduler.running else None)

# logger.info(f"Flask app '{__name__}' (sync_manager.py) is ready to be served by Gunicorn.")