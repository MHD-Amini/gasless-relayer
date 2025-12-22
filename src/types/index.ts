// Gasless Transaction Relayer Types
// EIP-2771 Meta-Transaction Infrastructure

export interface Env {
  RELAYER_DB: D1Database;
  SUPPORTED_CHAINS: string;
  MAX_GAS_LIMIT: string;
  DAILY_USER_LIMIT: string;
  RELAYER_PRIVATE_KEY?: string;
}

// EIP-712 Domain Separator
export interface EIP712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}

// Forward Request structure (EIP-2771)
export interface ForwardRequest {
  from: string;       // User's address
  to: string;         // Target contract address
  value: string;      // ETH value (usually "0")
  gas: string;        // Gas limit
  nonce: string;      // User's nonce for replay protection
  deadline: string;   // Unix timestamp deadline
  data: string;       // Encoded function call
}

// Meta-Transaction submission
export interface MetaTransaction {
  chainId: number;
  request: ForwardRequest;
  signature: string;
}

// Transaction status
export type TransactionStatus = 
  | 'pending'
  | 'queued'
  | 'submitted'
  | 'confirmed'
  | 'failed'
  | 'expired';

// Database models
export interface User {
  address: string;
  created_at: string;
  total_transactions: number;
  total_gas_spent: string;
  daily_transactions: number;
  daily_reset_at: string;
  is_whitelisted: number;
  is_blocked: number;
  tier: string;
}

export interface Transaction {
  id: string;
  user_address: string;
  relayer_address: string | null;
  chain_id: number;
  to_address: string;
  data: string;
  value: string;
  gas_limit: string | null;
  gas_price: string | null;
  gas_used: string | null;
  nonce: number;
  deadline: number | null;
  signature: string;
  tx_hash: string | null;
  status: TransactionStatus;
  error_message: string | null;
  created_at: string;
  submitted_at: string | null;
  confirmed_at: string | null;
  block_number: number | null;
}

export interface WhitelistedContract {
  id: number;
  chain_id: number;
  contract_address: string;
  name: string | null;
  allowed_functions: string | null;
  created_at: string;
}

export interface CircuitBreaker {
  id: number;
  is_open: number;
  failure_count: number;
  last_failure_at: string | null;
  opened_at: string | null;
  reason: string | null;
}

export interface Stats {
  id: number;
  total_transactions: number;
  total_users: number;
  total_gas_relayed: string;
  total_gas_saved: string;
  last_updated: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface SubmitResponse {
  transactionId: string;
  status: TransactionStatus;
  estimatedWait: number;
}

export interface StatusResponse {
  transactionId: string;
  status: TransactionStatus;
  txHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  error?: string;
}

// Chain configuration
export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  forwarderAddress: string;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

// Supported chains
export const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  // Sepolia Testnet
  11155111: {
    chainId: 11155111,
    name: 'Sepolia',
    rpcUrl: 'https://sepolia.drpc.org',
    forwarderAddress: '0x0000000000000000000000000000000000000000', // Deploy and update
    explorerUrl: 'https://sepolia.etherscan.io',
    nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 }
  },
  // Polygon Amoy Testnet
  80002: {
    chainId: 80002,
    name: 'Polygon Amoy',
    rpcUrl: 'https://polygon-amoy.drpc.org',
    forwarderAddress: '0x0000000000000000000000000000000000000000',
    explorerUrl: 'https://www.oklink.com/amoy',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 }
  },
  // Arbitrum Sepolia Testnet
  421614: {
    chainId: 421614,
    name: 'Arbitrum Sepolia',
    rpcUrl: 'https://arbitrum-sepolia.drpc.org',
    forwarderAddress: '0x0000000000000000000000000000000000000000',
    explorerUrl: 'https://sepolia.arbiscan.io',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }
  }
};

// EIP-712 Type definitions for meta-transactions
export const EIP712_TYPES = {
  ForwardRequest: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'gas', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
    { name: 'data', type: 'bytes' }
  ]
};

export const FORWARDER_DOMAIN = {
  name: 'GaslessForwarder',
  version: '1'
};
