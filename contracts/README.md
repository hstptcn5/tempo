# Tempo Contracts

Smart contracts for the Tempo dApp template.

## Contracts

### BatchTransfer

Batch transfer TIP-20/ERC-20 tokens to multiple recipients in a single transaction.

**Features:**
- `batchTransfer`: Basic batch transfer without memos
- `batchTransferWithMemo`: Batch transfer with TIP-20 memos (bytes32)
- `batchTransferSimple`: Alternative batch approach
- All-or-nothing: If any transfer fails, entire batch reverts

**Usage Flow:**
1. User approves BatchTransfer contract for total amount
2. User calls `batchTransfer()` or `batchTransferWithMemo()`
3. Contract pulls tokens from user and distributes to recipients

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- Private key with Tempo testnet tokens for deployment

## Setup

```bash
cd contracts

# Install Foundry dependencies
forge install

# Build contracts
forge build
```

## Deploy to Tempo Testnet

### Option 1: Using forge script

```bash
# Set your private key (NEVER commit this!)
export PRIVATE_KEY=0x...your_private_key...

# Deploy
forge script script/Deploy.s.sol:DeployBatchTransfer \
    --rpc-url https://rpc.testnet.tempo.xyz \
    --broadcast \
    --legacy
```

### Option 2: Using forge create (simpler)

```bash
# Deploy directly
forge create src/BatchTransfer.sol:BatchTransfer \
    --rpc-url https://rpc.testnet.tempo.xyz \
    --private-key $PRIVATE_KEY \
    --legacy
```

### Option 3: Using cast (if you have bytecode)

```bash
# Get bytecode
forge build
cat out/BatchTransfer.sol/BatchTransfer.json | jq -r '.bytecode.object'

# Deploy with cast
cast send --create <BYTECODE> \
    --rpc-url https://rpc.testnet.tempo.xyz \
    --private-key $PRIVATE_KEY \
    --legacy
```

## After Deployment

1. Copy the deployed contract address
2. Update `apps/dapp-template-evm/src/lib/tempo/batch.ts`:
   ```typescript
   export const BATCH_TRANSFER_ADDRESS = '0x...your_deployed_address...' as Address;
   ```
3. Update `packages/abis/src/addresses.ts` if needed

## Verify Contract (if explorer supports it)

```bash
forge verify-contract <DEPLOYED_ADDRESS> src/BatchTransfer.sol:BatchTransfer \
    --chain-id 42429 \
    --verifier-url https://explore.tempo.xyz/api \
    --watch
```

## Testing Locally

```bash
# Run tests
forge test

# Run tests with verbosity
forge test -vvv

# Gas report
forge test --gas-report
```

## Contract ABI

After building, the ABI is available at:
```
out/BatchTransfer.sol/BatchTransfer.json
```

Extract ABI for frontend:
```bash
cat out/BatchTransfer.sol/BatchTransfer.json | jq '.abi' > BatchTransfer.abi.json
```

## Security Notes

⚠️ **Important:**
- Users must approve the BatchTransfer contract before calling batch functions
- The `batchTransferWithMemo` function transfers tokens TO the contract first, then distributes
- If the token has transfer restrictions (TIP-403), some transfers may fail
- Always test on testnet before mainnet deployment

## Gas Costs

Approximate gas costs (may vary):
- Deployment: ~500,000 gas
- batchTransfer (10 recipients): ~200,000 gas
- batchTransferWithMemo (10 recipients): ~300,000 gas

## License

MIT

