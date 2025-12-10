export const multicall3Abi = [
    {
        type: 'function',
        name: 'aggregate',
        inputs: [
            {
                name: 'calls',
                type: 'tuple[]',
                components: [
                    { name: 'target', type: 'address' },
                    { name: 'callData', type: 'bytes' },
                ],
            },
        ],
        outputs: [
            { name: 'blockNumber', type: 'uint256' },
            { name: 'returnData', type: 'bytes[]' },
        ],
        stateMutability: 'payable',
    },
    {
        type: 'function',
        name: 'aggregate3',
        inputs: [
            {
                name: 'calls',
                type: 'tuple[]',
                components: [
                    { name: 'target', type: 'address' },
                    { name: 'allowFailure', type: 'bool' },
                    { name: 'callData', type: 'bytes' },
                ],
            },
        ],
        outputs: [
            {
                name: 'returnData',
                type: 'tuple[]',
                components: [
                    { name: 'success', type: 'bool' },
                    { name: 'returnData', type: 'bytes' },
                ],
            },
        ],
        stateMutability: 'payable',
    },
    {
        type: 'function',
        name: 'aggregate3Value',
        inputs: [
            {
                name: 'calls',
                type: 'tuple[]',
                components: [
                    { name: 'target', type: 'address' },
                    { name: 'allowFailure', type: 'bool' },
                    { name: 'value', type: 'uint256' },
                    { name: 'callData', type: 'bytes' },
                ],
            },
        ],
        outputs: [
            {
                name: 'returnData',
                type: 'tuple[]',
                components: [
                    { name: 'success', type: 'bool' },
                    { name: 'returnData', type: 'bytes' },
                ],
            },
        ],
        stateMutability: 'payable',
    },
    {
        type: 'function',
        name: 'blockAndAggregate',
        inputs: [
            {
                name: 'calls',
                type: 'tuple[]',
                components: [
                    { name: 'target', type: 'address' },
                    { name: 'callData', type: 'bytes' },
                ],
            },
        ],
        outputs: [
            { name: 'blockNumber', type: 'uint256' },
            { name: 'blockHash', type: 'bytes32' },
            {
                name: 'returnData',
                type: 'tuple[]',
                components: [
                    { name: 'success', type: 'bool' },
                    { name: 'returnData', type: 'bytes' },
                ],
            },
        ],
        stateMutability: 'payable',
    },
    {
        type: 'function',
        name: 'getBlockHash',
        inputs: [{ name: 'blockNumber', type: 'uint256' }],
        outputs: [{ name: 'blockHash', type: 'bytes32' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'getBlockNumber',
        inputs: [],
        outputs: [{ name: 'blockNumber', type: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'getCurrentBlockCoinbase',
        inputs: [],
        outputs: [{ name: 'coinbase', type: 'address' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'getCurrentBlockDifficulty',
        inputs: [],
        outputs: [{ name: 'difficulty', type: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'getCurrentBlockGasLimit',
        inputs: [],
        outputs: [{ name: 'gaslimit', type: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'getCurrentBlockTimestamp',
        inputs: [],
        outputs: [{ name: 'timestamp', type: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'getEthBalance',
        inputs: [{ name: 'addr', type: 'address' }],
        outputs: [{ name: 'balance', type: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'getLastBlockHash',
        inputs: [],
        outputs: [{ name: 'blockHash', type: 'bytes32' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'tryAggregate',
        inputs: [
            { name: 'requireSuccess', type: 'bool' },
            {
                name: 'calls',
                type: 'tuple[]',
                components: [
                    { name: 'target', type: 'address' },
                    { name: 'callData', type: 'bytes' },
                ],
            },
        ],
        outputs: [
            {
                name: 'returnData',
                type: 'tuple[]',
                components: [
                    { name: 'success', type: 'bool' },
                    { name: 'returnData', type: 'bytes' },
                ],
            },
        ],
        stateMutability: 'payable',
    },
    {
        type: 'function',
        name: 'tryBlockAndAggregate',
        inputs: [
            { name: 'requireSuccess', type: 'bool' },
            {
                name: 'calls',
                type: 'tuple[]',
                components: [
                    { name: 'target', type: 'address' },
                    { name: 'callData', type: 'bytes' },
                ],
            },
        ],
        outputs: [
            { name: 'blockNumber', type: 'uint256' },
            { name: 'blockHash', type: 'bytes32' },
            {
                name: 'returnData',
                type: 'tuple[]',
                components: [
                    { name: 'success', type: 'bool' },
                    { name: 'returnData', type: 'bytes' },
                ],
            },
        ],
        stateMutability: 'payable',
    },
] as const;

// Multicall3 is deployed at the same address on all chains
export const MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11' as const;

export type Multicall3Abi = typeof multicall3Abi;
