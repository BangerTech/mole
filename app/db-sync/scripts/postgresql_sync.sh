#!/bin/bash
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