#!/usr/bin/env bash
set -e

INFURA_PROJECT_ID="46a5dd9727bf48d4a132672d3f376146"
METAMASK_VERSION="12.23.0"
ROOT=$(pwd)

mkdir -p .browser

if [ ! -d ".browser/metamask-extension" ]; then
    echo "Preparing Playwright environment for MetaMask extension..."
    echo "This script will build Metamask from source to disable some security features."

    read -er -p "This might take a while, do you want to continue? (y/n): " CONTINUE
    if [[ "$CONTINUE" != "y" && "$CONTINUE" != "Y" ]]; then
        echo "Aborting script."
        exit 0
    fi

    echo "Cloning MetaMask extension..."

    git clone --depth 1 --branch v${METAMASK_VERSION} https://github.com/MetaMask/metamask-extension.git .browser/metamask-extension
fi

if [ ! -d ".browser/metamask-extension/dist" ]; then
    echo "Building MetaMask extension..."

    echo "To avoid Agent and tests from having to input a password every time, we will use auto unlock."
    echo "Provide a password that you will later use to restore the test wallet."
    read -er -p "Enter password for MetaMask wallet: " WALLET_PASSWORD

    cd "$ROOT/.browser/metamask-extension"

    cp .metamaskrc{.dist,}

    corepack enable

    # This will fail with error about auto scripts
    yarn install || true

    yarn allow-scripts auto

    INFURA_PROJECT_ID=$INFURA_PROJECT_ID PASSWORD=$WALLET_PASSWORD yarn dist --apply-lavamoat false
fi

echo "MetaMask extension prepared successfully in .browser directory"

echo "Before Agents can use your MetaMask wallet, you need to restore it."
echo "You can do this by running the following command:"
