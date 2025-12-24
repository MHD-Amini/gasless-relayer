/**
 * Test Setup File
 * 
 * Configures the test environment for Cloudflare Workers integration tests.
 * Sets up database migrations and initializes test fixtures.
 * 
 * @module tests/setup
 */

import { env } from 'cloudflare:test';

/**
 * Initialize database with schema
 * Called before integration tests run
 */
export async function setupDatabase() {
  const db = env.RELAYER_DB;
  
  // Create tables
  await db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      address TEXT PRIMARY KEY,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      total_transactions INTEGER DEFAULT 0,
      total_gas_spent TEXT DEFAULT '0',
      daily_transactions INTEGER DEFAULT 0,
      daily_reset_at TEXT DEFAULT CURRENT_TIMESTAMP,
      is_whitelisted INTEGER DEFAULT 0,
      is_blocked INTEGER DEFAULT 0,
      tier TEXT DEFAULT 'free'
    );

    -- Transactions table
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
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      submitted_at TEXT,
      confirmed_at TEXT,
      block_number INTEGER,
      FOREIGN KEY (user_address) REFERENCES users(address)
    );

    -- Nonces table
    CREATE TABLE IF NOT EXISTS nonces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_address TEXT NOT NULL,
      chain_id INTEGER NOT NULL,
      nonce INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_address, chain_id, nonce)
    );

    -- Whitelisted contracts table
    CREATE TABLE IF NOT EXISTS whitelisted_contracts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chain_id INTEGER NOT NULL,
      contract_address TEXT NOT NULL,
      name TEXT,
      allowed_functions TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(chain_id, contract_address)
    );

    -- Circuit breaker table
    CREATE TABLE IF NOT EXISTS circuit_breaker (
      id INTEGER PRIMARY KEY DEFAULT 1,
      is_open INTEGER DEFAULT 0,
      failure_count INTEGER DEFAULT 0,
      last_failure_at TEXT,
      opened_at TEXT,
      reason TEXT
    );

    -- Stats table
    CREATE TABLE IF NOT EXISTS stats (
      id INTEGER PRIMARY KEY DEFAULT 1,
      total_transactions INTEGER DEFAULT 0,
      total_users INTEGER DEFAULT 0,
      total_gas_relayed TEXT DEFAULT '0',
      total_gas_saved TEXT DEFAULT '0',
      last_updated TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_address);
    CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
    CREATE INDEX IF NOT EXISTS idx_transactions_chain ON transactions(chain_id);
    CREATE INDEX IF NOT EXISTS idx_nonces_user_chain ON nonces(user_address, chain_id);

    -- Initialize default rows
    INSERT OR IGNORE INTO circuit_breaker (id) VALUES (1);
    INSERT OR IGNORE INTO stats (id) VALUES (1);
  `);
}

/**
 * Reset database to clean state
 * Useful for test isolation
 */
export async function resetDatabase() {
  const db = env.RELAYER_DB;
  
  await db.exec(`
    DELETE FROM transactions;
    DELETE FROM nonces;
    DELETE FROM users;
    DELETE FROM whitelisted_contracts;
    UPDATE circuit_breaker SET is_open = 0, failure_count = 0, 
           last_failure_at = NULL, opened_at = NULL, reason = NULL WHERE id = 1;
    UPDATE stats SET total_transactions = 0, total_users = 0, 
           total_gas_relayed = '0', total_gas_saved = '0' WHERE id = 1;
  `);
}
