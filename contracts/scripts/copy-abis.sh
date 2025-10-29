#!/bin/bash

# Script to copy ABIs from compiled contracts to backend services
# Run this after: npm run compile

set -e

echo "Copying ABIs to backend services..."

# Define source directory (changed from contracts/ to contracts/contracts/)
ARTIFACTS_DIR="./artifacts/contracts/contracts"
BACKEND_DIR="../backend"

# Function to copy ABI
copy_abi() {
  local contract_path=$1
  local contract_name=$2
  local destination=$3

  if [ -f "${ARTIFACTS_DIR}/${contract_path}/${contract_name}.json" ]; then
    mkdir -p "${destination}"
    cp "${ARTIFACTS_DIR}/${contract_path}/${contract_name}.json" "${destination}/"
    echo "✅ Copied ${contract_name}.json to ${destination}"
  else
    echo "⚠️  ${contract_name}.json not found at ${ARTIFACTS_DIR}/${contract_path}"
  fi
}

# HCS Event Service
echo ""
echo "📦 HCS Event Service ABIs..."
copy_abi "hedera/DeraHCSEventStreamer.sol" "DeraHCSEventStreamer" "${BACKEND_DIR}/hcs-event-service/src/abis"
copy_abi "protocol/pool/Pool.sol" "Pool" "${BACKEND_DIR}/hcs-event-service/src/abis"

# Liquidation Bot
echo ""
echo "📦 Liquidation Bot ABIs..."
copy_abi "protocol/pool/Pool.sol" "Pool" "${BACKEND_DIR}/liquidation-bot/src/abis"
copy_abi "protocol/pool/PoolInstance.sol" "PoolInstance" "${BACKEND_DIR}/liquidation-bot/src/abis"
copy_abi "helpers/LiquidationDataProvider.sol" "LiquidationDataProvider" "${BACKEND_DIR}/liquidation-bot/src/abis"
copy_abi "misc/DeraOracle.sol" "DeraOracle" "${BACKEND_DIR}/liquidation-bot/src/abis"

# Monitoring Service
echo ""
echo "📦 Monitoring Service ABIs..."
copy_abi "protocol/pool/Pool.sol" "Pool" "${BACKEND_DIR}/monitoring-service/src/abis"
copy_abi "protocol/pool/PoolInstance.sol" "PoolInstance" "${BACKEND_DIR}/monitoring-service/src/abis"
copy_abi "misc/DeraOracle.sol" "DeraOracle" "${BACKEND_DIR}/monitoring-service/src/abis"

# Node Staking Service
echo ""
echo "📦 Node Staking Service ABIs..."
copy_abi "hedera/DeraNodeStaking.sol" "DeraNodeStaking" "${BACKEND_DIR}/node-staking-service/src/abis"
copy_abi "protocol/pool/Pool.sol" "Pool" "${BACKEND_DIR}/node-staking-service/src/abis"

echo ""
echo "✅ All ABIs copied successfully!"
echo ""
echo "Next steps:"
echo "1. Update backend service configs with deployed contract addresses"
echo "2. Start backend services: cd backend/<service> && npm start"
