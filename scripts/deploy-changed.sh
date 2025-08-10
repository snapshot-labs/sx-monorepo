#!/usr/bin/env bash

set -euo pipefail

PROJECT_PATH=$1
APP_ID=$2

COMMIT_ID=$(doctl apps get "$APP_ID" --output json | jq -r '.[0].active_deployment.services[0].source_commit_hash')

git diff --name-only "$COMMIT_ID" -r | grep -l ^"$PROJECT_PATH" && doctl apps create-deployment "$APP_ID" || echo "No changes to $PROJECT_PATH"
