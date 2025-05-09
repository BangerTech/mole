#!/bin/bash
set -e

# Create necessary directories if they don't exist
mkdir -p /app/config /app/logs /app/scripts

# Initialize configuration if not exists
if [ ! -f "/app/config/sync.yml" ]; then
    echo "Creating default configuration..."
    cat > /app/config/sync.yml <<EOL
sync:
  enabled: false
  interval: ${SYNC_INTERVAL:-86400}  # Default: 1 day in seconds
  log_level: ${LOG_LEVEL:-info}
  connections: []
  # Example of a connection configuration:
  # connections:
  #   - name: "MySQL Prod to Dev"
  #     enabled: true
  #     source:
  #       type: mysql
  #       host: prod-mysql.example.com
  #       port: 3306
  #       user: backup_user
  #       password: secure_password
  #       database: app_database
  #     target:
  #       type: mysql
  #       host: dev-mysql.example.com
  #       port: 3306
  #       user: backup_user
  #       password: dev_password
  #       database: app_database
  #     schedule:
  #       frequency: daily  # Options: hourly, daily, weekly, monthly, custom
  #       time: "02:00"     # For daily, weekly, monthly
  #       days: [1, 3, 5]   # For weekly (1=Monday, 7=Sunday)
  #       custom: "0 */6 * * *"  # Custom cron expression
  #     options:
  #       tables_only: ["users", "products"]  # Only sync these tables
  #       tables_exclude: ["logs", "sessions"]  # Exclude these tables
  #       structure_only: false  # Only sync table structure, not data
  #       drop_target_first: false  # Drop target tables before sync
EOL
fi

# Check if the sync service is enabled
# if grep -q "enabled: true" /app/config/sync.yml; then
#     echo "Starting database sync service..."
#     # Start the sync service in the background
#     /app/sync.sh &
# else
#     echo "Database sync service is disabled. Set 'enabled: true' in /app/config/sync.yml to enable it."
# fi

# Start the Flask API server using Gunicorn
echo "Starting Flask API server on port 5000..."
exec gunicorn --bind 0.0.0.0:5000 --preload --workers 1 sync_manager:app 