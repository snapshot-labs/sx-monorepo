#!/usr/bin/env bash

set -euo pipefail

PROJECT_PATH=$1
APP_ID=$2

git diff-tree --no-commit-id --name-only HEAD -r | grep ^"$PROJECT_PATH" && doctl apps create-deployment "$APP_ID" || echo "No changes to $PROJECT_PATH"
