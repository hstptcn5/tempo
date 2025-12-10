# HST Web3 Stack

A production-ready monorepo for rapid Web3 dApp development. Build dApps 50-70% faster with pre-built components, hooks, and templates.

---

## 📋 Template bao gồm những gì?

### 🎯 Packages (có thể tái sử dụng)

| Package | Mô tả |
|---------|-------|
| `@hst/web3-config` | Cấu hình Wagmi, chain definitions (ETH, Polygon, BSC, Arbitrum, Base...), RPC fallbacks |
| `@hst/abis` | ABIs chuẩn (ERC20, ERC721, ERC1155, Multicall3), địa chỉ tokens phổ biến (USDC, USDT, WETH...) |
| `@hst/hooks-web3` | Custom hooks: `useTokenBalance`, `useTokenApproval`, `useContractWrite`, `useWrongNetwork` |
| `@hst/ui-web3` | UI components: `TokenInput`, `AddressDisplay`, `ChainSelector`, `TxToast`, `ConnectButton` |
| `@hst/config` | Shared configs: ESLint, TypeScript, Tailwind |

### 🏗 Apps (template sẵn sàng dùng)

| App | Mô tả |
|-----|-------|
| `dapp-template-evm` | Next.js 15 + wagmi v2 + RainbowKit + Tailwind, bao gồm 3 trang demo |

### 📄 Demo Pages

| Trang | Chức năng |
|-------|-----------|
| `/` | Homepage với wallet connection, hiển thị balance |
| `/read` | Demo đọc thông tin ERC20 token (name, symbol, decimals, totalSupply) |
| `/write` | Demo gửi token với approval flow + transaction toast |
| `/events` | Demo lắng nghe Transfer events real-time |

### 📚 Tài liệu đi kèm

- `docs/HUONG_DAN_SU_DUNG.md` - Hướng dẫn chi tiết tiếng Việt
- `checklists/new-dapp-project.md` - Checklist tạo dApp mới
- `checklists/add-new-contract.md` - Checklist thêm contract

---

## 🚀 Sử dụng template cho dự án mới

### Cách 1: GitHub Template (Khuyến nghị)

Trên GitHub, vào **Settings** → check **"Template repository"**. Sau đó:

```bash
# Trên GitHub UI: Click "Use this template" → Create new repository
# Hoặc dùng GitHub CLI:
gh repo create my-new-dapp --template YOUR_USERNAME/hst-web3-template --clone
cd my-new-dapp
pnpm install
```

### Cách 2: degit (Nhanh, không cần xóa .git)

```bash
# Cài degit (1 lần)
npm install -g degit

# Tạo project mới
degit YOUR_USERNAME/hst-web3-template my-new-dapp
cd my-new-dapp
pnpm install
```

### Cách 3: Clone thủ công

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/hst-web3-template.git my-new-dapp
cd my-new-dapp

# Xóa git history cũ và khởi tạo mới
rm -rf .git
git init
git add .
git commit -m "Initial commit"

# Cài dependencies
pnpm install
```

---

## ⚙️ Cấu hình sau khi tạo project

```bash
# 1. Copy file môi trường
cp apps/dapp-template-evm/.env.example apps/dapp-template-evm/.env.local

# 2. Sửa file .env.local, thêm WalletConnect Project ID
# Lấy tại: https://cloud.walletconnect.com/
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# 3. Chạy dev server
cd apps/dapp-template-evm
pnpm dev
```

---

## 📦 Sử dụng Packages

### `@hst/web3-config`

```tsx
import { createWagmiConfig, chains, getExplorerUrl, getChainById } from '@hst/web3-config';

// Tạo wagmi config
const config = createWagmiConfig({
  appName: 'My dApp',
  projectId: 'your-walletconnect-project-id',
});

// Lấy explorer URL
const txUrl = getExplorerUrl(1, txHash, 'tx'); // Etherscan
```

### `@hst/abis`

```tsx
import { erc20Abi, TOKENS, getToken, getWrappedNative, getStablecoins } from '@hst/abis';

// Lấy token info
const usdc = getToken(1, 'USDC');        // Ethereum USDC
const weth = getWrappedNative(1);         // Ethereum WETH
const stables = getStablecoins(137);      // Polygon stablecoins
```

### `@hst/hooks-web3`

```tsx
import { 
  useTokenBalance, 
  useTokenApproval, 
  useContractWrite,
  formatBalance,
  decodeError 
} from '@hst/hooks-web3';

// Lấy token balance (auto-refresh)
const { balance, formatted, isLoading } = useTokenBalance({ 
  token: USDC_ADDRESS, 
  watch: true 
});

// Check và approve token
const { isApproved, approve, isApproving } = useTokenApproval({ 
  token, 
  spender, 
  amount 
});

// Ghi contract với error handling
const { write, status, txHash, error } = useContractWrite({
  address: contractAddress,
  abi: myAbi,
  functionName: 'transfer',
  onSuccess: () => console.log('Done!'),
  onError: (err) => console.error(decodeError(err)),
});
```

### `@hst/ui-web3`

```tsx
import { 
  TokenInput, 
  AddressDisplay, 
  ChainSelector, 
  TxToast,
  TxToastContainer,
  useTxToast,
  ConnectButton 
} from '@hst/ui-web3';

// Token input với max button
<TokenInput
  value={amount}
  onChange={setAmount}
  token={selectedToken}
  balance={balance}
  showMax
  error={hasError ? 'Insufficient balance' : undefined}
/>

// Hiển thị địa chỉ rút gọn + copy + link explorer
<AddressDisplay address={userAddress} copyable linkToExplorer />

// Dropdown chọn chain + cảnh báo wrong network
<ChainSelector showWrongNetworkWarning />

// Transaction toast
const { toasts, show, update, hide } = useTxToast();
show('tx-id', { status: 'pending', title: 'Sending...', txHash });
<TxToastContainer toasts={toasts} onClose={hide} />
```

---

## 📁 Cấu trúc thư mục

```
hst-web3-template/
├── apps/
│   └── dapp-template-evm/     # Next.js 15 dApp template
│       ├── src/app/           # App Router pages
│       │   ├── page.tsx       # Homepage
│       │   ├── read/          # Read contract demo
│       │   ├── write/         # Write contract demo
│       │   └── events/        # Watch events demo
│       ├── src/lib/           # wagmi config
│       └── src/providers/     # Web3Provider
│
├── packages/
│   ├── ui-web3/               # UI components
│   ├── hooks-web3/            # Custom hooks
│   ├── web3-config/           # Chain configs
│   ├── abis/                  # ABIs + addresses
│   └── config/                # Shared configs
│
├── checklists/                # Setup guides
├── docs/                      # Documentation
└── README.md
```

---

## 🧑‍💻 Development Commands

```bash
# Cài dependencies
pnpm install

# Chạy dev (dapp-template-evm)
cd apps/dapp-template-evm && pnpm dev

# Build tất cả packages
pnpm build

# Type check
pnpm typecheck

# Lint
pnpm lint

# Clean build artifacts
pnpm clean
```

---

## 🔧 Lưu ý kỹ thuật

### Webpack Alias (đã cấu hình sẵn)

Trong `next.config.js`, đã cấu hình alias để tránh lỗi "WagmiProviderNotFoundError" khi dùng `@hst/ui-web3`:

```js
config.resolve.alias = {
  wagmi: path.resolve(__dirname, 'node_modules/wagmi'),
  '@tanstack/react-query': path.resolve(__dirname, 'node_modules/@tanstack/react-query'),
  viem: path.resolve(__dirname, 'node_modules/viem'),
  '@rainbow-me/rainbowkit': path.resolve(__dirname, 'node_modules/@rainbow-me/rainbowkit'),
};
```

### Chains được hỗ trợ

**Mainnet:** Ethereum, Polygon, BSC, Arbitrum, Base, Optimism, Avalanche  
**Testnet:** Sepolia, Polygon Amoy, BSC Testnet

---

## 📝 Checklist tạo dApp mới

1. [ ] Tạo project từ template
2. [ ] Cấu hình `.env.local` với WalletConnect Project ID
3. [ ] Sửa `src/lib/wagmi.ts` để chọn chains cần dùng
4. [ ] Thêm ABIs contract vào `packages/abis` (nếu cần)
5. [ ] Xây dựng UI với components từ `@hst/ui-web3`
6. [ ] Test trên testnet trước khi deploy mainnet

---

## License

MIT
