export const erc721Abi = [
    // Read functions
    {
        type: 'function',
        name: 'name',
        inputs: [],
        outputs: [{ name: '', type: 'string' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'symbol',
        inputs: [],
        outputs: [{ name: '', type: 'string' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'tokenURI',
        inputs: [{ name: 'tokenId', type: 'uint256' }],
        outputs: [{ name: '', type: 'string' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'balanceOf',
        inputs: [{ name: 'owner', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'ownerOf',
        inputs: [{ name: 'tokenId', type: 'uint256' }],
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'getApproved',
        inputs: [{ name: 'tokenId', type: 'uint256' }],
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'isApprovedForAll',
        inputs: [
            { name: 'owner', type: 'address' },
            { name: 'operator', type: 'address' },
        ],
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'totalSupply',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
    },
    // Write functions
    {
        type: 'function',
        name: 'approve',
        inputs: [
            { name: 'to', type: 'address' },
            { name: 'tokenId', type: 'uint256' },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'setApprovalForAll',
        inputs: [
            { name: 'operator', type: 'address' },
            { name: 'approved', type: 'bool' },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'transferFrom',
        inputs: [
            { name: 'from', type: 'address' },
            { name: 'to', type: 'address' },
            { name: 'tokenId', type: 'uint256' },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'safeTransferFrom',
        inputs: [
            { name: 'from', type: 'address' },
            { name: 'to', type: 'address' },
            { name: 'tokenId', type: 'uint256' },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'safeTransferFrom',
        inputs: [
            { name: 'from', type: 'address' },
            { name: 'to', type: 'address' },
            { name: 'tokenId', type: 'uint256' },
            { name: 'data', type: 'bytes' },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    // Events
    {
        type: 'event',
        name: 'Transfer',
        inputs: [
            { name: 'from', type: 'address', indexed: true },
            { name: 'to', type: 'address', indexed: true },
            { name: 'tokenId', type: 'uint256', indexed: true },
        ],
    },
    {
        type: 'event',
        name: 'Approval',
        inputs: [
            { name: 'owner', type: 'address', indexed: true },
            { name: 'approved', type: 'address', indexed: true },
            { name: 'tokenId', type: 'uint256', indexed: true },
        ],
    },
    {
        type: 'event',
        name: 'ApprovalForAll',
        inputs: [
            { name: 'owner', type: 'address', indexed: true },
            { name: 'operator', type: 'address', indexed: true },
            { name: 'approved', type: 'bool', indexed: false },
        ],
    },
] as const;

export type Erc721Abi = typeof erc721Abi;
