# Contract ABIs

This directory contains the ABI files needed for the liquidation bot to interact with Dera Protocol contracts.

## Required Files

After compiling the contracts, copy these ABIs here:

```bash
# From the contracts directory
cp artifacts/contracts/protocol/pool/Pool.sol/Pool.json backend/liquidation-bot/src/abis/
cp artifacts/contracts/helpers/LiquidationDataProvider.sol/LiquidationDataProvider.json backend/liquidation-bot/src/abis/
cp artifacts/contracts/misc/DeraOracle.sol/DeraOracle.json backend/liquidation-bot/src/abis/
```

## Files

- `Pool.json` - Main pool contract for executing liquidations
- `LiquidationDataProvider.json` - Helper contract for querying liquidatable positions
- `DeraOracle.json` - Price oracle for asset valuations

## Structure

Each ABI file should be a JSON array of function/event signatures:

```json
[
  {
    "type": "function",
    "name": "liquidationCall",
    "inputs": [...],
    "outputs": [...],
    "stateMutability": "nonpayable"
  },
  ...
]
```

Or wrapped in a compilation artifact:

```json
{
  "abi": [...],
  "bytecode": "0x...",
  "contractName": "Pool"
}
```

The bot will handle both formats automatically.
