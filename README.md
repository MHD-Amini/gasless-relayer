# Gasless Transaction Relayer

<div align="center">

![EIP-2771](https://img.shields.io/badge/EIP--2771-Compliant-blue?style=for-the-badge)
![Hono](https://img.shields.io/badge/Hono-4.x-orange?style=for-the-badge&logo=hono)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-Tested-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**A production-ready EIP-2771 Meta-Transaction Relayer Service**

Enable gasless transactions for your dApp users. Built with Hono and deployed on Cloudflare's edge network for ultra-low latency worldwide.


</div>

---

## Overview

The Gasless Transaction Relayer allows users to interact with blockchain applications without holding native tokens for gas fees. Users sign EIP-712 typed messages off-chain, and the relayer submits transactions on their behalf, paying the gas costs.

### Key Benefits

- **Better UX**: Users don't need to manage gas tokens
- **Lower Barrier**: Onboard Web2 users without cryptocurrency prerequisites  
- **Flexible Costs**: Sponsors can absorb or offset transaction costs
- **Multi-Chain**: Single relayer supports multiple EVM networks

---

## Features

### Core Functionality
| Feature | Description |
|---------|-------------|
| **EIP-2771 Compliant** | Full implementation of the meta-transaction standard |
| **EIP-712 Signing** | Structured data signing for secure, human-readable transactions |
| **Multi-Chain Support** | Sepolia, Polygon Amoy, Arbitrum Sepolia testnets |
| **Nonce Management** | Per-user, per-chain replay attack protection |

### Security Features
| Feature | Description |
|---------|-------------|
| **Rate Limiting** | Configurable daily transaction limits per user |
| **Circuit Breaker** | Automatic service pause on repeated failures |
| **Contract Whitelisting** | Restrict relaying to approved contracts only |
| **Gas Limits** | Configurable maximum gas per transaction |
| **User Blocking** | Block malicious addresses |
| **Deadline Enforcement** | Transactions expire after specified time |

### Monitoring & Analytics
| Feature | Description |
|---------|-------------|
| **Real-time Dashboard** | Interactive web UI for monitoring all metrics |
| **Transaction History** | Full audit trail with status tracking |
| **Statistics** | Gas relayed, user counts, success rates |
| **Health Checks** | Service status and database connectivity |

---

## Architecture

```
                                 GASLESS TRANSACTION FLOW
                                 
    ┌──────────────┐         ┌────────────────┐         ┌────────────────────┐
    │              │         │                │         │                    │
    │    User      │────────▶│    Relayer     │────────▶│  Trusted Forwarder │
    │  (Browser)   │ EIP-712 │    (API)       │  Submit │    (Contract)      │
    │              │  Sign   │                │ On-chain│                    │
    └──────────────┘         └────────────────┘         └─────────┬──────────┘
                                     │                            │
                                     │                            │ Verify &
                                     │                            │ Forward
                                     ▼                            ▼
                            ┌────────────────┐         ┌────────────────────┐
                            │                │         │                    │
                            │   Cloudflare   │         │ Recipient Contract │
                            │   D1 Database  │         │   (Your dApp)      │
                            │                │         │                    │
                            └────────────────┘         └────────────────────┘
```

### Component Overview

| Component | Technology | Purpose |
|-----------|------------|---------|
| **API Server** | Hono + Cloudflare Workers | Request handling, validation, submission |
| **Database** | Cloudflare D1 (SQLite) | Transaction history, user data, nonces |
| **Smart Contracts** | Solidity + OpenZeppelin | Signature verification, call forwarding |
| **Dashboard** | Vanilla JS + TailwindCSS | Real-time monitoring and interaction |

---

## Tech Stack

<table>
<tr>
<td align="center" width="150">
<img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/typescript/typescript-original.svg" width="50" height="50" alt="TypeScript"/>
<br>TypeScript
</td>
<td align="center" width="150">
<img src="https://hono.dev/images/logo-small.png" width="50" height="50" alt="Hono"/>
<br>Hono
</td>
<td align="center" width="150">
<img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/cloudflare/cloudflare-original.svg" width="50" height="50" alt="Cloudflare"/>
<br>Cloudflare
</td>
<td align="center" width="150">
<img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/solidity/solidity-original.svg" width="50" height="50" alt="Solidity"/>
<br>Solidity
</td>
</tr>
</table>

- **Runtime**: Cloudflare Workers (Edge computing)
- **Framework**: Hono v4.x (Ultrafast web framework)
- **Database**: Cloudflare D1 (Distributed SQLite)
- **Language**: TypeScript 5.x (Type-safe development)
- **Smart Contracts**: Solidity 0.8.20 + OpenZeppelin
- **Styling**: TailwindCSS (Utility-first CSS)
- **Charts**: Chart.js (Data visualization)

---

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or pnpm
- Cloudflare account (free tier works)
- MetaMask or Web3 wallet (for testing)

### Installation

```bash
# Clone the repository
git clone https://github.com/MHD-Amini/gasless-relayer.git
cd gasless-relayer

# Install dependencies
npm install

# Run database migrations
npm run db:migrate:local

# Build the project
npm run build

# Start development server
npm run dev:sandbox
```

### Access the Dashboard

Open `http://localhost:3000` in your browser.

---

## API Endpoints

### Relay Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/relay/submit` | Submit a signed meta-transaction |
| `GET` | `/api/relay/status/:id` | Get transaction status by ID |
| `GET` | `/api/relay/nonce/:address/:chainId` | Get user's next nonce |
| `GET` | `/api/relay/history/:address` | Get user's transaction history |
| `GET` | `/api/relay/chains` | Get supported chains configuration |
| `POST` | `/api/relay/simulate` | Dry-run a transaction |
| `POST` | `/api/relay/typed-data` | Get EIP-712 typed data for signing |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/stats` | Overall statistics and metrics |
| `GET` | `/api/admin/activity` | Recent transaction activity |
| `GET` | `/api/admin/health` | Service health check |
| `GET` | `/api/admin/info` | Service information |
| `GET` | `/api/admin/circuit-breaker` | Circuit breaker status |
| `POST` | `/api/admin/circuit-breaker/reset` | Reset circuit breaker |
| `GET` | `/api/admin/whitelist` | Get whitelisted contracts |
| `POST` | `/api/admin/whitelist` | Add contract to whitelist |

---

## Usage Example

### JavaScript/TypeScript Client

```typescript
// 1. Get user's current nonce
const nonceResponse = await fetch(
  `${RELAYER_URL}/api/relay/nonce/${userAddress}/${chainId}`
);
const { data: { nonce } } = await nonceResponse.json();

// 2. Create the forward request
const request = {
  from: userAddress,
  to: contractAddress,
  value: "0",
  gas: "100000",
  nonce: nonce.toString(),
  deadline: (Math.floor(Date.now() / 1000) + 3600).toString(),
  data: encodedFunctionCall
};

// 3. Get EIP-712 typed data structure
const typedDataResponse = await fetch(`${RELAYER_URL}/api/relay/typed-data`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ chainId, request })
});
const { data: { typedData } } = await typedDataResponse.json();

// 4. Sign with user's wallet (MetaMask)
const signature = await window.ethereum.request({
  method: 'eth_signTypedData_v4',
  params: [userAddress, JSON.stringify(typedData)]
});

// 5. Submit to relayer
const submitResponse = await fetch(`${RELAYER_URL}/api/relay/submit`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ chainId, request, signature })
});

const { data: { transactionId, status } } = await submitResponse.json();
console.log(`Transaction ${transactionId} is ${status}`);
```

---

## Project Structure

```
gasless-relayer/
├── src/
│   ├── index.tsx              # Main Hono app + Dashboard HTML
│   ├── routes/
│   │   ├── relay.ts           # Relay API endpoints
│   │   └── admin.ts           # Admin API endpoints
│   ├── lib/
│   │   ├── crypto.ts          # EIP-712 signature utilities
│   │   └── database.ts        # D1 database operations
│   └── types/
│       └── index.ts           # TypeScript types & chain configs
├── contracts/
│   ├── GaslessForwarder.sol   # Trusted Forwarder contract
│   └── GaslessRecipient.sol   # Example ERC2771 recipient
├── migrations/
│   └── 0001_initial_schema.sql
├── public/
│   └── static/
│       └── style.css          # Additional styles
├── wrangler.jsonc             # Cloudflare configuration
├── ecosystem.config.cjs       # PM2 configuration
├── vite.config.ts             # Vite build configuration
├── tsconfig.json              # TypeScript configuration
└── package.json               # Dependencies and scripts
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SUPPORTED_CHAINS` | `"11155111,80002,421614"` | Comma-separated supported chain IDs |
| `MAX_GAS_LIMIT` | `"500000"` | Maximum gas per transaction |
| `DAILY_USER_LIMIT` | `"10"` | Max transactions per user per day |
| `RELAYER_PRIVATE_KEY` | - | Private key for on-chain submission |

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

---

## Smart Contracts

### Deploying the Forwarder

```bash
# Using Hardhat
npx hardhat run scripts/deploy-forwarder.js --network sepolia
```

### Integrating with Your dApp

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/metatx/ERC2771Context.sol";

contract MyGaslessApp is ERC2771Context {
    constructor(address trustedForwarder) 
        ERC2771Context(trustedForwarder) 
    {}
    
    function myFunction() external {
        // _msgSender() returns the ORIGINAL user, not the relayer!
        address user = _msgSender();
        // Your logic here...
    }
}
```

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `users` | User accounts, limits, and tiers |
| `transactions` | Full transaction history |
| `nonces` | Per-user, per-chain nonce tracking |
| `whitelisted_contracts` | Approved contracts for relaying |
| `circuit_breaker` | Service health state |
| `stats` | Aggregate metrics |
| `relayers` | Relayer wallet tracking |
| `batches` | Transaction batch information |

---

## Deployment

### Deploy to Cloudflare Pages

```bash
# 1. Setup Cloudflare API key
# Configure in your Cloudflare dashboard

# 2. Create D1 database
npx wrangler d1 create gasless-relayer-db
# Update wrangler.jsonc with the database_id

# 3. Run production migrations
npm run db:migrate:prod

# 4. Deploy
npm run deploy

# 5. Set secrets
npx wrangler secret put RELAYER_PRIVATE_KEY
```

---

## Security Considerations

1. **Private Key Management**: Store relayer private keys using Cloudflare Secrets
2. **Rate Limiting**: Adjust daily limits based on your gas budget
3. **Contract Whitelisting**: Only relay to trusted, audited contracts
4. **Monitoring**: Set up alerts for unusual activity patterns
5. **Circuit Breaker**: Automatically pauses on repeated failures to prevent drain

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm run dev:sandbox` | Start with D1 database (local) |
| `npm run db:migrate:local` | Apply migrations locally |
| `npm run db:migrate:prod` | Apply migrations to production |
| `npm run db:reset` | Reset local database |
| `npm run deploy` | Deploy to Cloudflare Pages |
| `npm test` | Run all tests |
| `npm run test:unit` | Run unit tests only |
| `npm run test:integration` | Run integration tests only |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:watch` | Run tests in watch mode |

---

## Testing

This project includes a comprehensive test suite using **Vitest** and **@cloudflare/vitest-pool-workers** for testing in the Cloudflare Workers environment.

### Test Structure

```
tests/
├── unit/
│   ├── crypto.test.ts      # EIP-712 hashing, Keccak-256, validation
│   └── database.test.ts    # Database operations, nonce management
├── integration/
│   ├── relay.test.ts       # Relay API endpoints
│   └── admin.test.ts       # Admin API endpoints
├── setup.ts                # Test environment setup
└── cloudflare-test.d.ts    # Type declarations
```

### Test Categories

#### Unit Tests
- **Cryptographic Functions**: Keccak-256 hashing, EIP-712 domain separator, forward request hashing
- **Validation**: Address validation, gas limit checks, deadline verification
- **Database Operations**: User management, nonce tracking, transaction CRUD, circuit breaker

#### Integration Tests
- **Relay API**: Transaction submission, status checking, nonce retrieval, typed data generation
- **Admin API**: Health checks, statistics, circuit breaker management, whitelist operations

### Running Tests

```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode (development)
npm run test:watch
```

### Test Coverage

The test suite covers:
- ✅ **90+ test cases** across unit and integration tests
- ✅ **EIP-712 signature utilities** (domain separator, struct hashing)
- ✅ **All API endpoints** with success and error scenarios
- ✅ **Database operations** with D1 SQLite
- ✅ **Security features** (rate limiting, circuit breaker, whitelisting)
- ✅ **Multi-chain support** validation

---

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- [OpenZeppelin](https://openzeppelin.com/) for ERC2771Context
- [Cloudflare](https://cloudflare.com/) for Workers platform
- [Hono](https://hono.dev/) for the ultrafast web framework
- [EIP-2771](https://eips.ethereum.org/EIPS/eip-2771) specification authors

---

<div align="center">

**Built with dedication by [MHD Amini](https://github.com/MHD-Amini)**

</div>
