-- Gasless Transaction Relayer Database Schema
-- EIP-2771 Meta-Transaction Infrastructure

-- Table: Users and their usage tracking
CREATE TABLE IF NOT EXISTS users (
  address TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  total_transactions INTEGER DEFAULT 0,
  total_gas_spent TEXT DEFAULT '0',
  daily_transactions INTEGER DEFAULT 0,
  daily_reset_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_whitelisted INTEGER DEFAULT 0,
  is_blocked INTEGER DEFAULT 0,
  tier TEXT DEFAULT 'free'
);

-- Table: Nonce tracking for replay protection
CREATE TABLE IF NOT EXISTS nonces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_address TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  nonce INTEGER NOT NULL,
  used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_address, chain_id, nonce)
);

-- Table: Transaction history
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_address TEXT NOT NULL,
  relayer_address TEXT,
  chain_id INTEGER NOT NULL,
  to_address TEXT NOT NULL,
  data TEXT NOT NULL,
  value TEXT DEFAULT '0',
  gas_limit TEXT,
  gas_price TEXT,
  gas_used TEXT,
  nonce INTEGER NOT NULL,
  deadline INTEGER,
  signature TEXT NOT NULL,
  tx_hash TEXT,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  submitted_at DATETIME,
  confirmed_at DATETIME,
  block_number INTEGER
);

-- Table: Whitelisted contracts
CREATE TABLE IF NOT EXISTS whitelisted_contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chain_id INTEGER NOT NULL,
  contract_address TEXT NOT NULL,
  name TEXT,
  allowed_functions TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(chain_id, contract_address)
);

-- Table: Relayer wallets
CREATE TABLE IF NOT EXISTS relayers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  address TEXT UNIQUE NOT NULL,
  chain_id INTEGER NOT NULL,
  balance TEXT DEFAULT '0',
  total_transactions INTEGER DEFAULT 0,
  total_gas_spent TEXT DEFAULT '0',
  is_active INTEGER DEFAULT 1,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table: Transaction batches for gas optimization
CREATE TABLE IF NOT EXISTS batches (
  id TEXT PRIMARY KEY,
  chain_id INTEGER NOT NULL,
  transaction_ids TEXT NOT NULL,
  batch_tx_hash TEXT,
  status TEXT DEFAULT 'pending',
  total_gas_saved TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  submitted_at DATETIME
);

-- Table: Circuit breaker state
CREATE TABLE IF NOT EXISTS circuit_breaker (
  id INTEGER PRIMARY KEY DEFAULT 1,
  is_open INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  last_failure_at DATETIME,
  opened_at DATETIME,
  reason TEXT
);

-- Table: Stats and metrics
CREATE TABLE IF NOT EXISTS stats (
  id INTEGER PRIMARY KEY DEFAULT 1,
  total_transactions INTEGER DEFAULT 0,
  total_users INTEGER DEFAULT 0,
  total_gas_relayed TEXT DEFAULT '0',
  total_gas_saved TEXT DEFAULT '0',
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_address);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_chain ON transactions(chain_id);
CREATE INDEX IF NOT EXISTS idx_nonces_user_chain ON nonces(user_address, chain_id);
CREATE INDEX IF NOT EXISTS idx_users_daily ON users(daily_reset_at);

-- Initialize circuit breaker and stats
INSERT OR IGNORE INTO circuit_breaker (id) VALUES (1);
INSERT OR IGNORE INTO stats (id) VALUES (1);
