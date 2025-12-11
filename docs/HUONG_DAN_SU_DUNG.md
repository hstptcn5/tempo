# 📖 Hướng Dẫn Sử Dụng HST Web3 Stack

## Mục Lục
1. [Giới thiệu](#giới-thiệu)
2. [Cấu trúc dự án](#cấu-trúc-dự-án)
3. [Bắt đầu nhanh](#bắt-đầu-nhanh)
4. [Sử dụng các Packages](#sử-dụng-các-packages)
5. [Tạo dApp mới từ Template](#tạo-dapp-mới-từ-template)
6. [Thêm Contract mới](#thêm-contract-mới)
7. [Các lệnh thường dùng](#các-lệnh-thường-dùng)

---

## Giới thiệu

**HST Web3 Stack** là bộ công cụ giúp bạn xây dựng dApp nhanh hơn 50-70%. Bao gồm:

| Package | Mô tả |
|---------|-------|
| `@hst/config` | Cấu hình ESLint, TypeScript, Tailwind dùng chung |
| `@hst/web3-config` | Cấu hình wagmi, danh sách chains, RPC fallback |
| `@hst/abis` | ABIs chuẩn (ERC20, ERC721, ERC1155) và địa chỉ token phổ biến |
| `@hst/hooks-web3` | Custom hooks: useTokenBalance, useTokenApproval, useContractWrite... |
| `@hst/ui-web3` | UI components: TokenInput, AddressDisplay, ChainSelector... |

---

## Cấu trúc dự án

```
hst-template/
├── apps/
│   └── dapp-template-evm/     # Template dApp chính
│       ├── src/
│       │   ├── app/           # Next.js App Router pages
│       │   ├── lib/           # Cấu hình wagmi
│       │   └── providers/     # Web3Provider
│       └── .env.example       # Mẫu file environment
│
├── packages/
│   ├── config/                # Cấu hình dùng chung
│   ├── web3-config/           # wagmi + chains
│   ├── abis/                  # ABIs + địa chỉ
│   ├── hooks-web3/            # Custom hooks
│   └── ui-web3/               # UI components
│
└── checklists/                # Hướng dẫn từng bước
```

---

## Bắt đầu nhanh

### Bước 1: Cài đặt dependencies
```bash
cd d:\build\hst-template
pnpm install
```

### Bước 2: Lấy WalletConnect Project ID
1. Truy cập: https://cloud.walletconnect.com/
2. Đăng ký/đăng nhập
3. Tạo project mới → Copy Project ID

### Bước 3: Cấu hình environment
```bash
cd apps/dapp-template-evm
copy .env.example .env.local
```

Mở `.env.local` và thêm Project ID:
```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

### Bước 4: Chạy development server
```bash
pnpm dev
```

Mở browser: http://localhost:3000

---

## Sử dụng các Packages

### 1. @hst/abis - ABIs & Địa chỉ

```tsx
import { erc20Abi, TOKENS, getToken, getDexRouter } from '@hst/abis';

// Lấy thông tin token USDC trên Ethereum
const usdc = getToken(1, 'USDC');
// → { address: '0xA0b86...', decimals: 6, symbol: 'USDC' }

// Lấy router Uniswap V3 trên Ethereum
const router = getDexRouter(1, 'UNISWAP_V3');

// Sử dụng ABI trong contract call
const { data } = useReadContract({
  address: usdc.address,
  abi: erc20Abi,
  functionName: 'balanceOf',
  args: [userAddress],
});
```

**Chain IDs phổ biến:**
- Ethereum: 1
- Polygon: 137
- BSC: 56
- Arbitrum: 42161
- Base: 8453

---

### 2. @hst/hooks-web3 - Custom Hooks

#### useTokenBalance - Lấy số dư token
```tsx
import { useTokenBalance, useNativeBalance } from '@hst/hooks-web3';

// Số dư ERC20 token
const { balance, formatted, refetch } = useTokenBalance({
  token: USDC_ADDRESS,
  watch: true,  // Tự động refresh mỗi block
});

// Số dư native token (ETH, MATIC...)
const { balance: ethBalance, formatted: ethFormatted } = useNativeBalance({ 
  watch: true 
});
```

#### useTokenApproval - Xử lý Approve
```tsx
import { useTokenApproval } from '@hst/hooks-web3';

const { isApproved, approve, isApproving, error } = useTokenApproval({
  token: USDC_ADDRESS,
  spender: DEX_ROUTER_ADDRESS,
  amount: parseUnits('100', 6),
});

// Trong component
if (!isApproved) {
  return <button onClick={approve} disabled={isApproving}>
    {isApproving ? 'Đang approve...' : 'Approve USDC'}
  </button>;
}
```

#### useContractWrite - Ghi contract
```tsx
import { useContractWrite } from '@hst/hooks-web3';

const { write, status, txHash, error, isLoading } = useContractWrite({
  address: CONTRACT_ADDRESS,
  abi: myAbi,
  functionName: 'deposit',
  onSubmitted: (hash) => console.log('Tx submitted:', hash),
  onSuccess: () => toast.success('Thành công!'),
  onError: (err) => toast.error(err.message),
});

// Gọi function
await write([amount], { value: ethAmount });
```

#### Utilities - Hàm tiện ích
```tsx
import { formatBalance, formatAddress, parseUserAmount, decodeError } from '@hst/hooks-web3';

// Format số dư
formatBalance(1000000n, 6);  // "1.0" (USDC)

// Rút gọn địa chỉ
formatAddress('0x1234...abcd');  // "0x1234...abcd"

// Parse input từ user
parseUserAmount('1.5', 18);  // 1500000000000000000n

// Decode lỗi blockchain
const { message, isUserRejection } = decodeError(error);
```

---

### 3. @hst/web3-config - Cấu hình Chain

```tsx
import { 
  createWagmiConfig, 
  defaultChains, 
  getExplorerUrl,
  getChainById 
} from '@hst/web3-config';

// Lấy URL explorer
getExplorerUrl(1, 'tx', '0xabc...');
// → 'https://etherscan.io/tx/0xabc...'

getExplorerUrl(137, 'address', '0x123...');
// → 'https://polygonscan.com/address/0x123...'

// Lấy thông tin chain
const chain = getChainById(137);
// → { name: 'Polygon', nativeCurrency: { symbol: 'MATIC', ... }, ... }
```

---

## Tạo dApp mới từ Template

### Bước 1: Copy template
```bash
# Từ thư mục gốc hst-template
xcopy apps\dapp-template-evm apps\my-new-dapp /E /I
```

### Bước 2: Cập nhật package.json
```json
{
  "name": "my-new-dapp",
  ...
}
```

### Bước 3: Cấu hình chains (tùy chọn)
Edit `src/lib/wagmi.ts`:
```tsx
import { chains } from '@hst/web3-config';

export const wagmiConfig = createWagmiConfig({
  appName: 'My New dApp',
  projectId,
  chains: [chains.polygon, chains.arbitrum],  // Chỉ Polygon & Arbitrum
});
```

### Bước 4: Chạy
```bash
cd apps/my-new-dapp
pnpm dev
```

---

## Thêm Contract mới

### Bước 1: Tạo file ABI
```tsx
// packages/abis/src/myContract.ts
export const myContractAbi = [
  {
    type: 'function',
    name: 'stake',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'unstake',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

export type MyContractAbi = typeof myContractAbi;
```

### Bước 2: Thêm địa chỉ contract
```tsx
// packages/abis/src/addresses.ts
export const MY_CONTRACTS = {
  1: '0x...ethereum...',     // Ethereum
  137: '0x...polygon...',    // Polygon
  56: '0x...bsc...',         // BSC
} as const;
```

### Bước 3: Export
```tsx
// packages/abis/src/index.ts
export { myContractAbi, type MyContractAbi } from './myContract';
export { MY_CONTRACTS } from './addresses';
```

### Bước 4: Build lại package
```bash
cd packages/abis
pnpm build
```

### Bước 5: Sử dụng trong dApp
```tsx
import { myContractAbi, MY_CONTRACTS } from '@hst/abis';
import { useContractWrite } from '@hst/hooks-web3';
import { useChainId } from 'wagmi';

function StakeButton({ amount }) {
  const chainId = useChainId();
  const contractAddress = MY_CONTRACTS[chainId];

  const { write, isLoading } = useContractWrite({
    address: contractAddress,
    abi: myContractAbi,
    functionName: 'stake',
    onSuccess: () => alert('Stake thành công!'),
  });

  return (
    <button onClick={() => write([amount])} disabled={isLoading}>
      {isLoading ? 'Đang stake...' : 'Stake'}
    </button>
  );
}
```

---

## Các lệnh thường dùng

| Lệnh | Mô tả |
|------|-------|
| `pnpm install` | Cài đặt dependencies |
| `pnpm dev` | Chạy dev server |
| `pnpm build` | Build production |
| `pnpm typecheck` | Kiểm tra TypeScript |
| `pnpm lint` | Kiểm tra linting |

### Chạy từ thư mục gốc (monorepo root)
```bash
# Chạy dev cho một app cụ thể
pnpm dev --filter dapp-template-evm

# Build tất cả packages
pnpm build

# Build một package cụ thể
pnpm --filter @hst/abis build
```

---

## Troubleshooting

### Lỗi "Module not found"
```bash
# Rebuild tất cả packages
cd d:\build\hst-template
pnpm build
```

### Lỗi "WagmiProvider not found"
- Đảm bảo component có `'use client'` ở đầu file
- Kiểm tra `Web3Provider` đã wrap app trong `layout.tsx`

### Lỗi kết nối wallet
- Kiểm tra `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` trong `.env.local`
- Thử refresh page hoặc clear cache browser

---

## Hỗ trợ

Nếu gặp vấn đề, hãy kiểm tra:
1. Đã chạy `pnpm install` chưa?
2. File `.env.local` đã có WalletConnect Project ID chưa?
3. Đã build các packages chưa (`pnpm build`)?
