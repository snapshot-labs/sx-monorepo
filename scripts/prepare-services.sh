#!/usr/bin/env bash

set -euo pipefail

docker-compose -f `dirname "$0"`/docker-compose.yml up -d
