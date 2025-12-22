// Database operations for Gasless Relayer
// Handles users, transactions, nonces, and stats

import { Env, User, Transaction, TransactionStatus, Stats, CircuitBreaker } from '../types';

// User operations
export async function getOrCreateUser(db: D1Database, address: string): Promise<User> {
  const normalizedAddress = address.toLowerCase();
  
  // Try to get existing user
  const existing = await db.prepare(
    'SELECT * FROM users WHERE address = ?'
  ).bind(normalizedAddress).first<User>();
  
  if (existing) {
    // Check if daily reset is needed
    const resetAt = new Date(existing.daily_reset_at);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - resetAt.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff >= 1) {
      // Reset daily counter
      await db.prepare(
        'UPDATE users SET daily_transactions = 0, daily_reset_at = CURRENT_TIMESTAMP WHERE address = ?'
      ).bind(normalizedAddress).run();
      
      return { ...existing, daily_transactions: 0 };
    }
    
    return existing;
  }
  
  // Create new user
  await db.prepare(`
    INSERT INTO users (address, created_at, total_transactions, total_gas_spent, daily_transactions)
    VALUES (?, CURRENT_TIMESTAMP, 0, '0', 0)
  `).bind(normalizedAddress).run();
  
  // Update stats
  await db.prepare(
    'UPDATE stats SET total_users = total_users + 1, last_updated = CURRENT_TIMESTAMP WHERE id = 1'
  ).run();
  
  return {
    address: normalizedAddress,
    created_at: new Date().toISOString(),
    total_transactions: 0,
    total_gas_spent: '0',
    daily_transactions: 0,
    daily_reset_at: new Date().toISOString(),
    is_whitelisted: 0,
    is_blocked: 0,
    tier: 'free'
  };
}

export async function incrementUserTransactions(
  db: D1Database, 
  address: string, 
  gasUsed: string
): Promise<void> {
  const normalizedAddress = address.toLowerCase();
  
  await db.prepare(`
    UPDATE users 
    SET total_transactions = total_transactions + 1,
        daily_transactions = daily_transactions + 1,
        total_gas_spent = CAST(CAST(total_gas_spent AS INTEGER) + CAST(? AS INTEGER) AS TEXT)
    WHERE address = ?
  `).bind(gasUsed, normalizedAddress).run();
}

export async function isUserBlocked(db: D1Database, address: string): Promise<boolean> {
  const user = await db.prepare(
    'SELECT is_blocked FROM users WHERE address = ?'
  ).bind(address.toLowerCase()).first<{ is_blocked: number }>();
  
  return user?.is_blocked === 1;
}

export async function checkUserDailyLimit(
  db: D1Database, 
  address: string, 
  dailyLimit: number
): Promise<{ allowed: boolean; remaining: number }> {
  const user = await getOrCreateUser(db, address);
  const remaining = Math.max(0, dailyLimit - user.daily_transactions);
  
  return {
    allowed: user.daily_transactions < dailyLimit || user.is_whitelisted === 1,
    remaining
  };
}

// Nonce operations
export async function getNextNonce(
  db: D1Database, 
  userAddress: string, 
  chainId: number
): Promise<number> {
  const result = await db.prepare(`
    SELECT MAX(nonce) as max_nonce 
    FROM nonces 
    WHERE user_address = ? AND chain_id = ?
  `).bind(userAddress.toLowerCase(), chainId).first<{ max_nonce: number | null }>();
  
  return (result?.max_nonce ?? -1) + 1;
}

export async function isNonceUsed(
  db: D1Database, 
  userAddress: string, 
  chainId: number, 
  nonce: number
): Promise<boolean> {
  const result = await db.prepare(`
    SELECT 1 FROM nonces 
    WHERE user_address = ? AND chain_id = ? AND nonce = ?
  `).bind(userAddress.toLowerCase(), chainId, nonce).first();
  
  return result !== null;
}

export async function markNonceUsed(
  db: D1Database, 
  userAddress: string, 
  chainId: number, 
  nonce: number
): Promise<void> {
  await db.prepare(`
    INSERT INTO nonces (user_address, chain_id, nonce)
    VALUES (?, ?, ?)
  `).bind(userAddress.toLowerCase(), chainId, nonce).run();
}

// Transaction operations
export async function createTransaction(
  db: D1Database,
  tx: Omit<Transaction, 'created_at' | 'submitted_at' | 'confirmed_at'>
): Promise<Transaction> {
  await db.prepare(`
    INSERT INTO transactions (
      id, user_address, relayer_address, chain_id, to_address, data, value,
      gas_limit, gas_price, gas_used, nonce, deadline, signature, tx_hash,
      status, error_message, block_number
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    tx.id,
    tx.user_address.toLowerCase(),
    tx.relayer_address,
    tx.chain_id,
    tx.to_address.toLowerCase(),
    tx.data,
    tx.value,
    tx.gas_limit,
    tx.gas_price,
    tx.gas_used,
    tx.nonce,
    tx.deadline,
    tx.signature,
    tx.tx_hash,
    tx.status,
    tx.error_message,
    tx.block_number
  ).run();
  
  return {
    ...tx,
    created_at: new Date().toISOString(),
    submitted_at: null,
    confirmed_at: null
  };
}

export async function getTransaction(
  db: D1Database, 
  id: string
): Promise<Transaction | null> {
  return await db.prepare(
    'SELECT * FROM transactions WHERE id = ?'
  ).bind(id).first<Transaction>();
}

export async function updateTransactionStatus(
  db: D1Database,
  id: string,
  status: TransactionStatus,
  updates?: Partial<Transaction>
): Promise<void> {
  let sql = 'UPDATE transactions SET status = ?';
  const params: any[] = [status];
  
  if (updates?.tx_hash) {
    sql += ', tx_hash = ?';
    params.push(updates.tx_hash);
  }
  if (updates?.gas_used) {
    sql += ', gas_used = ?';
    params.push(updates.gas_used);
  }
  if (updates?.block_number) {
    sql += ', block_number = ?';
    params.push(updates.block_number);
  }
  if (updates?.error_message) {
    sql += ', error_message = ?';
    params.push(updates.error_message);
  }
  if (status === 'submitted') {
    sql += ', submitted_at = CURRENT_TIMESTAMP';
  }
  if (status === 'confirmed') {
    sql += ', confirmed_at = CURRENT_TIMESTAMP';
  }
  
  sql += ' WHERE id = ?';
  params.push(id);
  
  await db.prepare(sql).bind(...params).run();
}

export async function getUserTransactions(
  db: D1Database,
  userAddress: string,
  limit: number = 50,
  offset: number = 0
): Promise<Transaction[]> {
  const results = await db.prepare(`
    SELECT * FROM transactions 
    WHERE user_address = ? 
    ORDER BY created_at DESC 
    LIMIT ? OFFSET ?
  `).bind(userAddress.toLowerCase(), limit, offset).all<Transaction>();
  
  return results.results || [];
}

export async function getPendingTransactions(
  db: D1Database,
  chainId?: number
): Promise<Transaction[]> {
  let sql = "SELECT * FROM transactions WHERE status IN ('pending', 'queued')";
  const params: any[] = [];
  
  if (chainId) {
    sql += ' AND chain_id = ?';
    params.push(chainId);
  }
  
  sql += ' ORDER BY created_at ASC LIMIT 100';
  
  const results = await db.prepare(sql).bind(...params).all<Transaction>();
  return results.results || [];
}

// Stats operations
export async function getStats(db: D1Database): Promise<Stats> {
  const stats = await db.prepare(
    'SELECT * FROM stats WHERE id = 1'
  ).first<Stats>();
  
  return stats || {
    id: 1,
    total_transactions: 0,
    total_users: 0,
    total_gas_relayed: '0',
    total_gas_saved: '0',
    last_updated: new Date().toISOString()
  };
}

export async function updateStats(
  db: D1Database,
  gasRelayed: string,
  gasSaved: string = '0'
): Promise<void> {
  await db.prepare(`
    UPDATE stats SET 
      total_transactions = total_transactions + 1,
      total_gas_relayed = CAST(CAST(total_gas_relayed AS INTEGER) + CAST(? AS INTEGER) AS TEXT),
      total_gas_saved = CAST(CAST(total_gas_saved AS INTEGER) + CAST(? AS INTEGER) AS TEXT),
      last_updated = CURRENT_TIMESTAMP
    WHERE id = 1
  `).bind(gasRelayed, gasSaved).run();
}

// Circuit breaker operations
export async function getCircuitBreaker(db: D1Database): Promise<CircuitBreaker> {
  return await db.prepare(
    'SELECT * FROM circuit_breaker WHERE id = 1'
  ).first<CircuitBreaker>() || {
    id: 1,
    is_open: 0,
    failure_count: 0,
    last_failure_at: null,
    opened_at: null,
    reason: null
  };
}

export async function recordFailure(
  db: D1Database,
  reason: string,
  threshold: number = 5
): Promise<boolean> {
  // Increment failure count
  await db.prepare(`
    UPDATE circuit_breaker SET 
      failure_count = failure_count + 1,
      last_failure_at = CURRENT_TIMESTAMP,
      reason = ?
    WHERE id = 1
  `).bind(reason).run();
  
  // Check if we should open the circuit
  const cb = await getCircuitBreaker(db);
  if (cb.failure_count >= threshold && cb.is_open === 0) {
    await db.prepare(`
      UPDATE circuit_breaker SET 
        is_open = 1,
        opened_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run();
    return true; // Circuit opened
  }
  
  return false;
}

export async function resetCircuitBreaker(db: D1Database): Promise<void> {
  await db.prepare(`
    UPDATE circuit_breaker SET 
      is_open = 0,
      failure_count = 0,
      last_failure_at = NULL,
      opened_at = NULL,
      reason = NULL
    WHERE id = 1
  `).run();
}

// Whitelist operations
export async function isContractWhitelisted(
  db: D1Database,
  chainId: number,
  contractAddress: string
): Promise<boolean> {
  const result = await db.prepare(`
    SELECT 1 FROM whitelisted_contracts 
    WHERE chain_id = ? AND contract_address = ?
  `).bind(chainId, contractAddress.toLowerCase()).first();
  
  return result !== null;
}

export async function addWhitelistedContract(
  db: D1Database,
  chainId: number,
  contractAddress: string,
  name?: string,
  allowedFunctions?: string[]
): Promise<void> {
  await db.prepare(`
    INSERT OR REPLACE INTO whitelisted_contracts (chain_id, contract_address, name, allowed_functions)
    VALUES (?, ?, ?, ?)
  `).bind(
    chainId, 
    contractAddress.toLowerCase(), 
    name || null, 
    allowedFunctions ? JSON.stringify(allowedFunctions) : null
  ).run();
}

export async function getWhitelistedContracts(
  db: D1Database,
  chainId?: number
): Promise<any[]> {
  let sql = 'SELECT * FROM whitelisted_contracts';
  const params: any[] = [];
  
  if (chainId) {
    sql += ' WHERE chain_id = ?';
    params.push(chainId);
  }
  
  const results = await db.prepare(sql).bind(...params).all();
  return results.results || [];
}

// Recent activity for dashboard
export async function getRecentActivity(
  db: D1Database,
  limit: number = 20
): Promise<Transaction[]> {
  const results = await db.prepare(`
    SELECT * FROM transactions 
    ORDER BY created_at DESC 
    LIMIT ?
  `).bind(limit).all<Transaction>();
  
  return results.results || [];
}

// Analytics queries
export async function getTransactionsByStatus(
  db: D1Database
): Promise<Record<string, number>> {
  const results = await db.prepare(`
    SELECT status, COUNT(*) as count 
    FROM transactions 
    GROUP BY status
  `).all<{ status: string; count: number }>();
  
  const stats: Record<string, number> = {};
  for (const row of results.results || []) {
    stats[row.status] = row.count;
  }
  
  return stats;
}

export async function getTransactionsByChain(
  db: D1Database
): Promise<Record<number, number>> {
  const results = await db.prepare(`
    SELECT chain_id, COUNT(*) as count 
    FROM transactions 
    GROUP BY chain_id
  `).all<{ chain_id: number; count: number }>();
  
  const stats: Record<number, number> = {};
  for (const row of results.results || []) {
    stats[row.chain_id] = row.count;
  }
  
  return stats;
}
