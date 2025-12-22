# Gasless Transaction Relayer Service

A production-ready **EIP-2771 Meta-Transaction Relayer** built with Hono and Cloudflare Workers. This service enables gasless transactions by allowing users to sign messages off-chain while a relayer pays the gas fees.

## 🌐 Live Demo

**Dashboard**: https://3000-i5jt371jsuqj4ovyh7n6m-cc2fbc16.sandbox.novita.ai

## ✨ Features

### Core Functionality
- **EIP-2771 Compliant**: Full implementation of the meta-transaction standard
- **Multi-Chain Support**: Sepolia, Polygon Amoy, Arbitrum Sepolia testnets
- **Signature Verification**: EIP-712 typed data signing and verification
- **Nonce Management**: Replay attack protection with per-user nonce tracking

### Security Features
- **Rate Limiting**: Daily transaction limits per user (configurable)
- **Circuit Breaker**: Automatic service pause on repeated failures
- **Contract Whitelisting**: Restrict relaying to approved contracts
- **Gas Limits**: Configurable maximum gas per transaction
- **User Blocking**: Block malicious addresses

### Monitoring & Analytics
- **Real-time Dashboard**: Interactive web UI for monitoring
- **Transaction History**: Full audit trail with status tracking
- **Statistics**: Gas relayed, user counts, transaction metrics
- **Health Checks**: Service status and database connectivity

## 🏗️ Architecture

```
┌─────────────┐    ┌──────────────┐    ┌───────────────────┐    ┌──────────────────┐
│    User     │───▶│   Relayer    │───▶│ Trusted Forwarder │───▶│ Recipient Contract│
│ (Signs msg) │    │   (API)      │    │   (Verifies sig)  │    │  (Executes call) │
└─────────────┘    └──────────────┘    └───────────────────┘    └──────────────────┘
       │                  │                      │                        │
       │  EIP-712 Sign    │   Submit on-chain    │    Forward call        │
       │                  │   (pays gas)         │    (original sender)   │
```

## 📡 API Endpoints

### Relay Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/relay/submit` | Submit a signed meta-transaction |
| GET | `/api/relay/status/:id` | Get transaction status |
| GET | `/api/relay/nonce/:address/:chainId` | Get user's next nonce |
| GET | `/api/relay/history/:address` | Get user's transaction history |
| GET | `/api/relay/chains` | Get supported chains |
| POST | `/api/relay/simulate` | Dry-run a transaction |
| POST | `/api/relay/typed-data` | Get EIP-712 typed data structure |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Overall statistics |
| GET | `/api/admin/activity` | Recent transactions |
| GET | `/api/admin/health` | Health check |
| GET | `/api/admin/info` | Service information |
| GET | `/api/admin/circuit-breaker` | Circuit breaker status |
| POST | `/api/admin/circuit-breaker/reset` | Reset circuit breaker |
| GET | `/api/admin/whitelist` | Whitelisted contracts |
| POST | `/api/admin/whitelist` | Add contract to whitelist |

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Database Migrations
```bash
npm run db:migrate:local
```

### 3. Start Development Server
```bash
npm run build
npm run dev:sandbox
```

### 4. Access Dashboard
Open http://localhost:3000 in your browser

## 📝 Usage Example

### JavaScript Client
```javascript
// 1. Get user's nonce
const nonceResponse = await fetch(`/api/relay/nonce/${userAddress}/${chainId}`);
const { data: { nonce } } = await nonceResponse.json();

// 2. Create forward request
const request = {
  from: userAddress,
  to: contractAddress,
  value: "0",
  gas: "100000",
  nonce: nonce.toString(),
  deadline: (Math.floor(Date.now() / 1000) + 3600).toString(),
  data: encodedFunctionCall
};

// 3. Get typed data for signing
const typedDataResponse = await fetch('/api/relay/typed-data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ chainId, request })
});
const { data: { typedData } } = await typedDataResponse.json();

// 4. Sign with wallet (MetaMask)
const signature = await window.ethereum.request({
  method: 'eth_signTypedData_v4',
  params: [userAddress, JSON.stringify(typedData)]
});

// 5. Submit to relayer
const submitResponse = await fetch('/api/relay/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ chainId, request, signature })
});

const { data: { transactionId, status } } = await submitResponse.json();
```

## 📁 Project Structure

```
gasless-relayer/
├── src/
│   ├── index.tsx          # Main Hono app with dashboard HTML
│   ├── routes/
│   │   ├── relay.ts       # Relay API endpoints
│   │   └── admin.ts       # Admin API endpoints
│   ├── lib/
│   │   ├── crypto.ts      # EIP-712 signature verification
│   │   └── database.ts    # D1 database operations
│   └── types/
│       └── index.ts       # TypeScript types & chain configs
├── contracts/
│   ├── GaslessForwarder.sol   # Trusted Forwarder contract
│   └── GaslessRecipient.sol   # Example ERC2771 recipient
├── migrations/
│   └── 0001_initial_schema.sql
├── wrangler.jsonc         # Cloudflare configuration
├── ecosystem.config.cjs   # PM2 configuration
└── package.json
```

## ⚙️ Configuration

### Environment Variables (wrangler.jsonc)

| Variable | Default | Description |
|----------|---------|-------------|
| `SUPPORTED_CHAINS` | "11155111,80002,421614" | Comma-separated chain IDs |
| `MAX_GAS_LIMIT` | "500000" | Maximum gas per transaction |
| `DAILY_USER_LIMIT` | "10" | Max transactions per user per day |

### Adding New Chains

Edit `src/types/index.ts`:
```typescript
export const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  // Add your chain
  12345: {
    chainId: 12345,
    name: 'My Chain',
    rpcUrl: 'https://rpc.mychain.com',
    forwarderAddress: '0x...', // Deploy forwarder first
    explorerUrl: 'https://explorer.mychain.com',
    nativeCurrency: { name: 'Token', symbol: 'TKN', decimals: 18 }
  }
};
```

## 🔐 Smart Contracts

### Deploy Forwarder
```bash
# Using Hardhat
npx hardhat run scripts/deploy-forwarder.js --network sepolia
```

### Deploy Recipient Contract
```solidity
// Inherit from ERC2771Context
contract MyApp is ERC2771Context {
    constructor(address forwarder) ERC2771Context(forwarder) {}
    
    function myFunction() external {
        // _msgSender() returns original user, not relayer!
        address user = _msgSender();
    }
}
```

## 🛠️ Development

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm run dev:sandbox` | Start with D1 database (local) |
| `npm run db:migrate:local` | Apply migrations locally |
| `npm run db:reset` | Reset local database |
| `npm run deploy` | Deploy to Cloudflare Pages |

### Database Schema

- **users**: User accounts and limits
- **transactions**: Transaction history
- **nonces**: Nonce tracking for replay protection
- **whitelisted_contracts**: Approved contracts
- **circuit_breaker**: Service health state
- **stats**: Aggregate statistics

## 🚀 Production Deployment

### 1. Setup Cloudflare API Key
Configure in Cloudflare dashboard

### 2. Create D1 Database
```bash
npx wrangler d1 create gasless-relayer-db
# Update wrangler.jsonc with database_id
```

### 3. Run Remote Migrations
```bash
npm run db:migrate:prod
```

### 4. Deploy
```bash
npm run deploy
```

### 5. Set Secrets
```bash
npx wrangler secret put RELAYER_PRIVATE_KEY
```

## 📊 Monitoring

The dashboard provides:
- **Real-time statistics**: Transactions, users, gas relayed
- **Circuit breaker status**: System health monitoring
- **Recent activity**: Live transaction feed
- **Chain distribution**: Transactions per chain
- **Status breakdown**: Pending, confirmed, failed counts

## 🔒 Security Considerations

1. **Private Key Management**: Store relayer private keys securely (Cloudflare Secrets)
2. **Rate Limiting**: Adjust daily limits based on your budget
3. **Contract Whitelisting**: Only relay to trusted contracts
4. **Monitoring**: Watch for unusual activity patterns
5. **Circuit Breaker**: Automatically pauses on repeated failures

## 📜 License

MIT

## 🙏 Credits

- OpenZeppelin for ERC2771Context
- Cloudflare for Workers platform
- Hono for the lightweight framework
