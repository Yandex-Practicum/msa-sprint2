#!/usr/bin/env bash
set -e
set -u
set -o pipefail

wait_table() {
  local tbl="$1"
  echo "wait-and-seed: waiting for table '$tbl'..."
  until psql -h monolith-db -U hotelio -d hotelio -tA -c \
    "select 1 from information_schema.tables
      where table_schema='public' and table_name='${tbl}'" | grep -q 1; do
    echo "  ...still waiting ($tbl)"
    sleep 2
  done
}

echo "wait-and-seed: waiting for Postgres..."
until pg_isready -h monolith-db -U hotelio -d hotelio >/dev/null 2>&1; do sleep 1; done

wait_table app_user
psql -h monolith-db -U hotelio -d hotelio -f /seed/seed-users.sql

wait_table hotel
psql -h monolith-db -U hotelio -d hotelio -f /seed/seed-hotels.sql

echo "wait-and-seed: done"
