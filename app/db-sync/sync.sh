#!/bin/bash
set -e

# Initialize logging
log() {
  local level=$1
  local message=$2
  echo "$(date '+%Y-%m-%d %H:%M:%S') [$level] $message" >> /app/logs/sync.log
  echo "$(date '+%Y-%m-%d %H:%M:%S') [$level] $message"
}

log "INFO" "Starting database sync service"

# Start the sync scheduler
python /app/sync_manager.py 