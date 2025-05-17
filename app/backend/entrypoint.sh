#!/bin/sh
set -e # Exit immediately if a command exits with a non-zero status

DATA_DIR="/app/data" # This is the path INSIDE the container
AVATARS_DIR="${DATA_DIR}/avatars"
DB_FILE="${DATA_DIR}/mole.db" # Path to the SQLite DB file

# Ensure the main data directory and the avatars subdirectory exist.
echo "Ensuring directory structure exists: ${AVATARS_DIR}"
mkdir -p "${AVATARS_DIR}"

# Attempt to change ownership of the entire data directory recursively.
# This assumes the entrypoint script is run as root initially.
# We'll chown to UID 1000 and GID 1000 (common for 'node' user).
echo "Attempting to set ownership for ${DATA_DIR} to 1000:1000..."
if chown -R 1000:1000 "${DATA_DIR}"; then
    echo "Ownership of ${DATA_DIR} set to 1000:1000."
else
    echo "Warning: Failed to change ownership of ${DATA_DIR} with 1000:1000."
    echo "Current owner/group of ${DATA_DIR}:"
    ls -ld "${DATA_DIR}"
    echo "This might be okay if permissions are already correct or if the process runs as the current owner."
    echo "Ensure the user running the Node.js process (specified in 'exec gosu' below) has write access."
fi

# Check if the database file exists. If not, the application should create it.
# We just ensure the directory permissions are okay.
if [ ! -f "${DB_FILE}" ]; then
    echo "Database file ${DB_FILE} does not exist. Application should create it."
fi

echo "Permissions and directory structure checked for ${DATA_DIR}."

# Execute the main command (passed as arguments to this script, e.g., "npm", "start")
# as user 1000 (UID) and group 1000 (GID).
# 'gosu' is a lightweight tool to drop privileges.
echo "Executing command as user node:node : $@"
exec su-exec node:node "$@" 