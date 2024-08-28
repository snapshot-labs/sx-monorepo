#!/usr/bin/env bash

set -euo pipefail

NAME_SERVER="ns1.3dns.box"
PRODUCTION_DOMAIN="api.snapshot.box"
APP_DOMAIN_1="sx-api-starknet-mainnet-dfghg.ondigitalocean.app."
APP_DOMAIN_2="sx-api-mainnet-2-fmlg8.ondigitalocean.app."
APP_ID_1="c4eba570-abea-4ab3-8941-d968db6cad36"
APP_ID_2="9282b162-7280-43b9-b429-9f53810003bc"

CURRENT_DOMAIN=$(dig -t CNAME +short "$PRODUCTION_DOMAIN" @"$NAME_SERVER")

CURRENT_STAGING_APP_ID=""
if [ "$CURRENT_DOMAIN" = "$APP_DOMAIN_1" ]; then
  CURRENT_STAGING_APP_ID=$APP_ID_2
elif [ "$CURRENT_DOMAIN" = "$APP_DOMAIN_2" ]; then
  CURRENT_STAGING_APP_ID=$APP_ID_1
else
  echo "Unknown domain: $CURRENT_DOMAIN"
  exit -1
fi

echo "Starting deployment to staging app: $CURRENT_STAGING_APP_ID"

./scripts/deploy-changed.sh apps/api "$CURRENT_STAGING_APP_ID"
