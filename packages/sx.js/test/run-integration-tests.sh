#!/usr/bin/env bash

PIDS=()

function start_node() {
  yarn node:"$1" > /dev/null 2>&1 &
  PIDS+=($!)
  echo "Started $1 with PID $!"
}

function cleanup() {
  echo "Cleaning up..."
  for pid in "${PIDS[@]}"; do
    echo "Killing process $pid"
    kill "$pid" 2>/dev/null || echo "Process $pid already terminated"
  done
}

trap cleanup EXIT

start_node evm
start_node starknet

echo "Running evm tests"
yarn test:integration:evm

echo "Running starknet tests"
yarn test:integration:starknet
