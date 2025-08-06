#!/usr/bin/env bash

set -euo pipefail

APP_ID_1="a2730f1c-94cc-414f-a68c-179a3adee405"
APP_ID_2="9282b162-7280-43b9-b429-9f53810003bc"

APP_ID=$(curl -s https://api.snapshot.box/deployment | jq '.index|tonumber')

CURRENT_STAGING_APP_ID=""
if [ "$APP_ID" = "1" ]; then
  CURRENT_STAGING_APP_ID=$APP_ID_2
elif [ "$APP_ID" = "2" ]; then
  CURRENT_STAGING_APP_ID=$APP_ID_1
else
  echo "Unknown app: $APP_ID"
  exit -1
fi

echo "Starting deployment to staging app: $CURRENT_STAGING_APP_ID"

./scripts/deploy-changed.sh apps/api "$CURRENT_STAGING_APP_ID"
