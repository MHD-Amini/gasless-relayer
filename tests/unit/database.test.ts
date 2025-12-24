/**
 * Unit Tests for Database Operations
 * 
 * Tests database helper functions for users, transactions,
 * nonces, and circuit breaker management.
 * 
 * @module tests/unit/database
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import {
  getOrCreateUser,
  incrementUserTransactions,
  isUserBlocked,
  checkUserDailyLimit,
  getNextNonce,
  isNonceUsed,
  markNonceUsed,
  createTransaction,
  getTransaction,
  updateTransactionStatus,
  getUserTransactions,
  getStats,
  updateStats,
  getCircuitBreaker,
  recordFailure,
  resetCircuitBreaker,
  isContractWhitelisted,
  addWhitelistedContract,
  getWhitelistedContracts
} from '../../src/lib/database';
import { TransactionStatus } from '../../src/types';

// Test fixtures
const TEST_USER_ADDRESS = '0x742d35cc6634c0532925a3b844bc9e7595f0beb9';
const TEST_CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890';
const SEPOLIA_CHAIN_ID = 11155111;

describe('User Operations', () => {
  describe('getOrCreateUser', () => {
    it('should create new user if not exists', async () => {
      const db = env.RELAYER_DB;
      const user = await getOrCreateUser(db, TEST_USER_ADDRESS);
      
      expect(user).toBeDefined();
      expect(user.address).toBe(TEST_USER_ADDRESS.toLowerCase());
      expect(user.total_transactions).toBe(0);
      expect(user.daily_transactions).toBe(0);
    });

    it('should return existing user', async () => {
      const db = env.RELAYER_DB;
      
      // Create user first
      const user1 = await getOrCreateUser(db, TEST_USER_ADDRESS);
      
      // Get same user again
      const user2 = await getOrCreateUser(db, TEST_USER_ADDRESS);
      
      expect(user2.address).toBe(user1.address);
    });

    it('should normalize address to lowercase', async () => {
      const db = env.RELAYER_DB;
      const mixedCaseAddress = '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12';
      
      const user = await getOrCreateUser(db, mixedCaseAddress);
      
      expect(user.address).toBe(mixedCaseAddress.toLowerCase());
    });

    it('should initialize with default tier', async () => {
      const db = env.RELAYER_DB;
      const user = await getOrCreateUser(db, TEST_USER_ADDRESS);
      
      expect(user.tier).toBe('free');
    });

    it('should not block new users by default', async () => {
      const db = env.RELAYER_DB;
      const user = await getOrCreateUser(db, TEST_USER_ADDRESS);
      
      expect(user.is_blocked).toBe(0);
    });
  });

  describe('incrementUserTransactions', () => {
    it('should increment total transactions', async () => {
      const db = env.RELAYER_DB;
      
      // Create user first
      await getOrCreateUser(db, TEST_USER_ADDRESS);
      
      // Increment transactions
      await incrementUserTransactions(db, TEST_USER_ADDRESS, '21000');
      
      const user = await getOrCreateUser(db, TEST_USER_ADDRESS);
      expect(user.total_transactions).toBe(1);
      expect(user.daily_transactions).toBe(1);
    });

    it('should accumulate gas spent', async () => {
      const db = env.RELAYER_DB;
      
      await getOrCreateUser(db, TEST_USER_ADDRESS);
      
      await incrementUserTransactions(db, TEST_USER_ADDRESS, '21000');
      await incrementUserTransactions(db, TEST_USER_ADDRESS, '50000');
      
      const user = await getOrCreateUser(db, TEST_USER_ADDRESS);
      expect(parseInt(user.total_gas_spent)).toBe(71000);
    });
  });

  describe('isUserBlocked', () => {
    it('should return false for non-blocked user', async () => {
      const db = env.RELAYER_DB;
      await getOrCreateUser(db, TEST_USER_ADDRESS);
      
      const blocked = await isUserBlocked(db, TEST_USER_ADDRESS);
      expect(blocked).toBe(false);
    });

    it('should return false for non-existent user', async () => {
      const db = env.RELAYER_DB;
      const blocked = await isUserBlocked(db, '0x0000000000000000000000000000000000000001');
      expect(blocked).toBe(false);
    });
  });

  describe('checkUserDailyLimit', () => {
    it('should allow transactions under limit', async () => {
      const db = env.RELAYER_DB;
      await getOrCreateUser(db, TEST_USER_ADDRESS);
      
      const result = await checkUserDailyLimit(db, TEST_USER_ADDRESS, 10);
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(10);
    });

    it('should calculate remaining correctly', async () => {
      const db = env.RELAYER_DB;
      await getOrCreateUser(db, TEST_USER_ADDRESS);
      
      // Simulate some transactions
      await incrementUserTransactions(db, TEST_USER_ADDRESS, '21000');
      await incrementUserTransactions(db, TEST_USER_ADDRESS, '21000');
      await incrementUserTransactions(db, TEST_USER_ADDRESS, '21000');
      
      const result = await checkUserDailyLimit(db, TEST_USER_ADDRESS, 10);
      
      expect(result.remaining).toBe(7);
    });
  });
});

describe('Nonce Operations', () => {
  describe('getNextNonce', () => {
    it('should return 0 for new user', async () => {
      const db = env.RELAYER_DB;
      const nonce = await getNextNonce(db, TEST_USER_ADDRESS, SEPOLIA_CHAIN_ID);
      expect(nonce).toBe(0);
    });

    it('should return next nonce after marking used', async () => {
      const db = env.RELAYER_DB;
      
      await markNonceUsed(db, TEST_USER_ADDRESS, SEPOLIA_CHAIN_ID, 0);
      const nonce = await getNextNonce(db, TEST_USER_ADDRESS, SEPOLIA_CHAIN_ID);
      
      expect(nonce).toBe(1);
    });

    it('should track nonces separately per chain', async () => {
      const db = env.RELAYER_DB;
      const POLYGON_CHAIN_ID = 80002;
      
      await markNonceUsed(db, TEST_USER_ADDRESS, SEPOLIA_CHAIN_ID, 0);
      await markNonceUsed(db, TEST_USER_ADDRESS, SEPOLIA_CHAIN_ID, 1);
      
      const sepoliaNonce = await getNextNonce(db, TEST_USER_ADDRESS, SEPOLIA_CHAIN_ID);
      const polygonNonce = await getNextNonce(db, TEST_USER_ADDRESS, POLYGON_CHAIN_ID);
      
      expect(sepoliaNonce).toBe(2);
      expect(polygonNonce).toBe(0);
    });
  });

  describe('isNonceUsed', () => {
    it('should return false for unused nonce', async () => {
      const db = env.RELAYER_DB;
      const used = await isNonceUsed(db, TEST_USER_ADDRESS, SEPOLIA_CHAIN_ID, 0);
      expect(used).toBe(false);
    });

    it('should return true for used nonce', async () => {
      const db = env.RELAYER_DB;
      
      await markNonceUsed(db, TEST_USER_ADDRESS, SEPOLIA_CHAIN_ID, 0);
      const used = await isNonceUsed(db, TEST_USER_ADDRESS, SEPOLIA_CHAIN_ID, 0);
      
      expect(used).toBe(true);
    });
  });

  describe('markNonceUsed', () => {
    it('should mark nonce as used', async () => {
      const db = env.RELAYER_DB;
      
      await markNonceUsed(db, TEST_USER_ADDRESS, SEPOLIA_CHAIN_ID, 5);
      
      const used = await isNonceUsed(db, TEST_USER_ADDRESS, SEPOLIA_CHAIN_ID, 5);
      expect(used).toBe(true);
    });
  });
});

describe('Transaction Operations', () => {
  const testTransaction = {
    id: 'tx_test_123',
    user_address: TEST_USER_ADDRESS,
    relayer_address: null,
    chain_id: SEPOLIA_CHAIN_ID,
    to_address: TEST_CONTRACT_ADDRESS,
    data: '0x12345678',
    value: '0',
    gas_limit: '100000',
    gas_price: null,
    gas_used: null,
    nonce: 0,
    deadline: Math.floor(Date.now() / 1000) + 3600,
    signature: '0x' + 'a'.repeat(130),
    tx_hash: null,
    status: 'pending' as TransactionStatus,
    error_message: null,
    block_number: null
  };

  describe('createTransaction', () => {
    it('should create transaction', async () => {
      const db = env.RELAYER_DB;
      
      const tx = await createTransaction(db, testTransaction);
      
      expect(tx.id).toBe(testTransaction.id);
      expect(tx.status).toBe('pending');
    });

    it('should set created_at timestamp', async () => {
      const db = env.RELAYER_DB;
      
      const tx = await createTransaction(db, {
        ...testTransaction,
        id: 'tx_test_456'
      });
      
      expect(tx.created_at).toBeDefined();
    });
  });

  describe('getTransaction', () => {
    it('should return null for non-existent transaction', async () => {
      const db = env.RELAYER_DB;
      const tx = await getTransaction(db, 'tx_nonexistent');
      expect(tx).toBeNull();
    });

    it('should return existing transaction', async () => {
      const db = env.RELAYER_DB;
      
      await createTransaction(db, testTransaction);
      const tx = await getTransaction(db, testTransaction.id);
      
      expect(tx).not.toBeNull();
      expect(tx?.id).toBe(testTransaction.id);
    });
  });

  describe('updateTransactionStatus', () => {
    it('should update status', async () => {
      const db = env.RELAYER_DB;
      
      await createTransaction(db, {
        ...testTransaction,
        id: 'tx_status_test'
      });
      
      await updateTransactionStatus(db, 'tx_status_test', 'submitted');
      
      const tx = await getTransaction(db, 'tx_status_test');
      expect(tx?.status).toBe('submitted');
    });

    it('should update additional fields', async () => {
      const db = env.RELAYER_DB;
      
      await createTransaction(db, {
        ...testTransaction,
        id: 'tx_update_test'
      });
      
      await updateTransactionStatus(db, 'tx_update_test', 'confirmed', {
        tx_hash: '0x' + 'f'.repeat(64),
        gas_used: '21000',
        block_number: 12345
      });
      
      const tx = await getTransaction(db, 'tx_update_test');
      expect(tx?.tx_hash).toBe('0x' + 'f'.repeat(64));
      expect(tx?.gas_used).toBe('21000');
      expect(tx?.block_number).toBe(12345);
    });
  });

  describe('getUserTransactions', () => {
    it('should return empty array for user with no transactions', async () => {
      const db = env.RELAYER_DB;
      const txs = await getUserTransactions(db, '0x0000000000000000000000000000000000000001');
      expect(txs).toEqual([]);
    });

    it('should respect limit parameter', async () => {
      const db = env.RELAYER_DB;
      
      // Create multiple transactions
      for (let i = 0; i < 10; i++) {
        await createTransaction(db, {
          ...testTransaction,
          id: `tx_limit_test_${i}`,
          nonce: i
        });
      }
      
      const txs = await getUserTransactions(db, TEST_USER_ADDRESS, 5);
      expect(txs.length).toBeLessThanOrEqual(5);
    });
  });
});

describe('Stats Operations', () => {
  describe('getStats', () => {
    it('should return default stats', async () => {
      const db = env.RELAYER_DB;
      const stats = await getStats(db);
      
      expect(stats.total_transactions).toBeDefined();
      expect(stats.total_users).toBeDefined();
      expect(stats.total_gas_relayed).toBeDefined();
    });
  });

  describe('updateStats', () => {
    it('should increment transaction count', async () => {
      const db = env.RELAYER_DB;
      
      const before = await getStats(db);
      await updateStats(db, '21000');
      const after = await getStats(db);
      
      expect(after.total_transactions).toBe(before.total_transactions + 1);
    });

    it('should accumulate gas relayed', async () => {
      const db = env.RELAYER_DB;
      
      await updateStats(db, '21000');
      await updateStats(db, '50000');
      
      const stats = await getStats(db);
      expect(parseInt(stats.total_gas_relayed)).toBeGreaterThanOrEqual(71000);
    });
  });
});

describe('Circuit Breaker Operations', () => {
  describe('getCircuitBreaker', () => {
    it('should return default state (closed)', async () => {
      const db = env.RELAYER_DB;
      const cb = await getCircuitBreaker(db);
      
      expect(cb.is_open).toBe(0);
      expect(cb.failure_count).toBe(0);
    });
  });

  describe('recordFailure', () => {
    it('should increment failure count', async () => {
      const db = env.RELAYER_DB;
      
      await recordFailure(db, 'Test error');
      const cb = await getCircuitBreaker(db);
      
      expect(cb.failure_count).toBeGreaterThan(0);
    });

    it('should record failure reason', async () => {
      const db = env.RELAYER_DB;
      
      await recordFailure(db, 'Specific error message');
      const cb = await getCircuitBreaker(db);
      
      expect(cb.reason).toBe('Specific error message');
    });

    it('should open circuit after threshold', async () => {
      const db = env.RELAYER_DB;
      
      // Reset first
      await resetCircuitBreaker(db);
      
      // Record failures up to threshold
      for (let i = 0; i < 5; i++) {
        await recordFailure(db, 'Error', 5);
      }
      
      const cb = await getCircuitBreaker(db);
      expect(cb.is_open).toBe(1);
    });
  });

  describe('resetCircuitBreaker', () => {
    it('should reset all values', async () => {
      const db = env.RELAYER_DB;
      
      // First trigger some failures
      await recordFailure(db, 'Test error');
      
      // Then reset
      await resetCircuitBreaker(db);
      
      const cb = await getCircuitBreaker(db);
      expect(cb.is_open).toBe(0);
      expect(cb.failure_count).toBe(0);
      expect(cb.reason).toBeNull();
    });
  });
});

describe('Whitelist Operations', () => {
  describe('isContractWhitelisted', () => {
    it('should return false for non-whitelisted contract', async () => {
      const db = env.RELAYER_DB;
      const whitelisted = await isContractWhitelisted(db, SEPOLIA_CHAIN_ID, TEST_CONTRACT_ADDRESS);
      expect(whitelisted).toBe(false);
    });

    it('should return true for whitelisted contract', async () => {
      const db = env.RELAYER_DB;
      
      await addWhitelistedContract(db, SEPOLIA_CHAIN_ID, TEST_CONTRACT_ADDRESS, 'Test Contract');
      const whitelisted = await isContractWhitelisted(db, SEPOLIA_CHAIN_ID, TEST_CONTRACT_ADDRESS);
      
      expect(whitelisted).toBe(true);
    });
  });

  describe('addWhitelistedContract', () => {
    it('should add contract to whitelist', async () => {
      const db = env.RELAYER_DB;
      const address = '0x0000000000000000000000000000000000000002';
      
      await addWhitelistedContract(db, SEPOLIA_CHAIN_ID, address, 'New Contract');
      
      const whitelisted = await isContractWhitelisted(db, SEPOLIA_CHAIN_ID, address);
      expect(whitelisted).toBe(true);
    });

    it('should normalize address to lowercase', async () => {
      const db = env.RELAYER_DB;
      const mixedCase = '0xAbCdEf0000000000000000000000000000000003';
      
      await addWhitelistedContract(db, SEPOLIA_CHAIN_ID, mixedCase, 'Mixed Case');
      
      const whitelisted = await isContractWhitelisted(db, SEPOLIA_CHAIN_ID, mixedCase);
      expect(whitelisted).toBe(true);
    });

    it('should handle allowed functions array', async () => {
      const db = env.RELAYER_DB;
      const address = '0x0000000000000000000000000000000000000004';
      
      await addWhitelistedContract(
        db, 
        SEPOLIA_CHAIN_ID, 
        address, 
        'Function Contract',
        ['transfer(address,uint256)', 'approve(address,uint256)']
      );
      
      const contracts = await getWhitelistedContracts(db, SEPOLIA_CHAIN_ID);
      const contract = contracts.find(c => c.contract_address === address.toLowerCase());
      
      expect(contract).toBeDefined();
    });
  });

  describe('getWhitelistedContracts', () => {
    it('should return empty array when no contracts', async () => {
      const db = env.RELAYER_DB;
      const contracts = await getWhitelistedContracts(db, 99999); // Non-existent chain
      expect(contracts).toEqual([]);
    });

    it('should filter by chainId', async () => {
      const db = env.RELAYER_DB;
      const POLYGON_CHAIN_ID = 80002;
      
      await addWhitelistedContract(db, SEPOLIA_CHAIN_ID, '0x0000000000000000000000000000000000000005', 'Sepolia Contract');
      await addWhitelistedContract(db, POLYGON_CHAIN_ID, '0x0000000000000000000000000000000000000006', 'Polygon Contract');
      
      const sepoliaContracts = await getWhitelistedContracts(db, SEPOLIA_CHAIN_ID);
      
      for (const contract of sepoliaContracts) {
        expect(contract.chain_id).toBe(SEPOLIA_CHAIN_ID);
      }
    });
  });
});
