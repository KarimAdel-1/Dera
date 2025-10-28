# Contract ABIs

This directory contains the ABI file needed for the HCS Event Service.

## Required File

After compiling the contracts, copy this ABI here:

```bash
# From the contracts directory
cp artifacts/contracts/hedera/DeraHCSEventStreamer.sol/DeraHCSEventStreamer.json backend/hcs-event-service/src/abis/
```

## File

- `DeraHCSEventStreamer.json` - Event streamer contract for listening to HCSEventQueued events

## Structure

The ABI file should be a JSON array or compilation artifact:

```json
{
  "abi": [
    {
      "type": "event",
      "name": "HCSEventQueued",
      "inputs": [
        { "name": "topicId", "type": "uint64", "indexed": true },
        { "name": "eventHash", "type": "bytes32", "indexed": true },
        { "name": "eventType", "type": "string" },
        { "name": "eventData", "type": "bytes" }
      ]
    },
    ...
  ]
}
```

The service will automatically extract the ABI array.
