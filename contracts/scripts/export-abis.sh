#!/bin/bash

echo "🔧 Exporting Contract ABIs to Backend Services..."

# Compile contracts first
cd "$(dirname "$0")/.."
echo "Compiling contracts..."
npx hardhat compile

if [ $? -ne 0 ]; then
    echo "❌ Compilation failed. Aborting ABI export."
    exit 1
fi

# Define source and target directories
ARTIFACTS_DIR="artifacts/contracts"
BACKEND_DIR="../backend"

# Function to copy ABI
copy_abi() {
    local contract_path=$1
    local contract_name=$2
    local target_dir=$3

    mkdir -p "$target_dir"

    if [ -f "$ARTIFACTS_DIR/$contract_path/$contract_name.json" ]; then
        cp "$ARTIFACTS_DIR/$contract_path/$contract_name.json" "$target_dir/"
        echo "  ✓ Copied $contract_name to $target_dir"
    else
        echo "  ⚠️  $contract_name.json not found at $ARTIFACTS_DIR/$contract_path"
    fi
}

# Export to HCS Event Service
echo ""
echo "📦 HCS Event Service..."
copy_abi "protocol/pool/Pool.sol" "Pool" "$BACKEND_DIR/hcs-event-service/src/abis"
copy_abi "hedera/DeraHCSEventStreamer.sol" "DeraHCSEventStreamer" "$BACKEND_DIR/hcs-event-service/src/abis"

# Export to Liquidation Bot
echo ""
echo "📦 Liquidation Bot..."
copy_abi "protocol/pool/Pool.sol" "Pool" "$BACKEND_DIR/liquidation-bot/src/abis"
copy_abi "helpers/LiquidationDataProvider.sol" "LiquidationDataProvider" "$BACKEND_DIR/liquidation-bot/src/abis"
copy_abi "misc/DeraOracle.sol" "DeraOracle" "$BACKEND_DIR/liquidation-bot/src/abis"

# Export to Node Staking Service
echo ""
echo "📦 Node Staking Service..."
copy_abi "hedera/DeraNodeStaking.sol" "DeraNodeStaking" "$BACKEND_DIR/node-staking-service/src/abis"
copy_abi "protocol/pool/Pool.sol" "Pool" "$BACKEND_DIR/node-staking-service/src/abis"

# Export to Monitoring Service
echo ""
echo "📦 Monitoring Service..."
copy_abi "protocol/pool/Pool.sol" "Pool" "$BACKEND_DIR/monitoring-service/src/abis"
copy_abi "protocol/configuration/PoolConfigurator.sol" "PoolConfigurator" "$BACKEND_DIR/monitoring-service/src/abis"
copy_abi "misc/DeraOracle.sol" "DeraOracle" "$BACKEND_DIR/monitoring-service/src/abis"

echo ""
echo "✅ All ABIs exported successfully!"
echo ""
echo "📋 Summary:"
echo "  - HCS Event Service: 2 ABIs"
echo "  - Liquidation Bot: 3 ABIs"
echo "  - Node Staking Service: 2 ABIs"
echo "  - Monitoring Service: 3 ABIs"
echo ""
echo "💡 Tip: Run this script after every contract compilation to keep ABIs in sync."
