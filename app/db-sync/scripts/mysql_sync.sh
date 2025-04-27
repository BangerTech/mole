#!/bin/bash
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