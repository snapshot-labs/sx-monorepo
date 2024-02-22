#!/usr/bin/env bash

set -euo pipefail

echo "Running docker services"

docker-compose -f `dirname "$0"`/docker-compose.yml up -d

VITE_MANA_URL=http://localhost:3001 \
VITE_STARKNET_SEPOLIA_API=http://localhost:3000 \
VITE_EVM_SEPOLIA_API=http://localhost:8000/subgraphs/name/snapshot-labs/sx-subgraph \
NETWORK=SN_SEPOLIA \
NETWORK_NODE_URL=https://starknet-sepolia.infura.io/v3/46a5dd9727bf48d4a132672d3f376146 \
turbo run dev
