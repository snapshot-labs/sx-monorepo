#!/bin/bash
# MySQL first-boot initialiser for the permanent-private-voting stack.
#
# Runs once, only when the data directory is empty (the standard
# docker-entrypoint-initdb.d contract). Creates the two databases the stack
# needs and loads their schemas from the repo's own schema.sql files, which
# are mounted read-only at /schema by docker-compose:
#
#   snapshot_hub        full hub schema (spaces, proposals, votes, te_*, ...)
#   snapshot_sequencer  sequencer message log
#
# Using the repo schema files keeps this in lockstep with the application;
# there is no duplicated DDL to drift.
set -euo pipefail

PWARG=()
if [ -n "${MYSQL_ROOT_PASSWORD:-}" ]; then
  PWARG=(-p"${MYSQL_ROOT_PASSWORD}")
fi

echo "[mysql-init] creating databases"
mysql -uroot "${PWARG[@]}" <<'SQL'
CREATE DATABASE IF NOT EXISTS snapshot_hub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS snapshot_sequencer CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SQL

echo "[mysql-init] loading hub schema into snapshot_hub"
mysql -uroot "${PWARG[@]}" snapshot_hub < /schema/hub-schema.sql

echo "[mysql-init] loading sequencer schema into snapshot_sequencer"
mysql -uroot "${PWARG[@]}" snapshot_sequencer < /schema/sequencer-schema.sql

echo "[mysql-init] done"
