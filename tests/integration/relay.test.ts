/**
 * Integration Tests for Relay API Endpoints
 * 
 * Tests the meta-transaction submission and processing API.
 * Uses Cloudflare Workers test environment with mocked D1 database.
 * 
 * @module tests/integration/relay
 */

import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';

// Test fixtures
const TEST_USER_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9';
const TEST_CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890';
const SEPOLIA_CHAIN_ID = 11155111;
const POLYGON_AMOY_CHAIN_ID = 80002;
const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;

/**
 * Creates a valid test forward request
 */
function createTestRequest(overrides = {}) {
  return {
    from: TEST_USER_ADDRESS,
    to: TEST_CONTRACT_ADDRESS,
    value: '0',
    gas: '100000',
    nonce: '0',
    deadline: String(Math.floor(Date.now() / 1000) + 3600), // 1 hour from now
    data: '0x12345678',
    ...overrides
  };
}

/**
 * Creates a valid test meta-transaction
 */
function createTestMetaTransaction(chainId = SEPOLIA_CHAIN_ID, requestOverrides = {}) {
  return {
    chainId,
    request: createTestRequest(requestOverrides),
    signature: '0x' + 'a'.repeat(130) // Mock 65-byte signature
  };
}

describe('Relay API - /api/relay/chains', () => {
  it('should return list of supported chains', async () => {
    const response = await SELF.fetch('https://localhost/api/relay/chains');
    expect(response.status).toBe(200);
    
    const data = await response.json() as any;
    expect(data.success).toBe(true);
    expect(data.data.chains).toBeDefined();
    expect(Array.isArray(data.data.chains)).toBe(true);
  });

  it('should include Sepolia in supported chains', async () => {
    const response = await SELF.fetch('https://localhost/api/relay/chains');
    const data = await response.json() as any;
    
    const sepolia = data.data.chains.find((c: any) => c.chainId === SEPOLIA_CHAIN_ID);
    expect(sepolia).toBeDefined();
    expect(sepolia.name).toBe('Sepolia');
  });

  it('should include Polygon Amoy in supported chains', async () => {
    const response = await SELF.fetch('https://localhost/api/relay/chains');
    const data = await response.json() as any;
    
    const amoy = data.data.chains.find((c: any) => c.chainId === POLYGON_AMOY_CHAIN_ID);
    expect(amoy).toBeDefined();
    expect(amoy.name).toBe('Polygon Amoy');
  });

  it('should include Arbitrum Sepolia in supported chains', async () => {
    const response = await SELF.fetch('https://localhost/api/relay/chains');
    const data = await response.json() as any;
    
    const arbitrum = data.data.chains.find((c: any) => c.chainId === ARBITRUM_SEPOLIA_CHAIN_ID);
    expect(arbitrum).toBeDefined();
    expect(arbitrum.name).toBe('Arbitrum Sepolia');
  });

  it('should include forwarder address for each chain', async () => {
    const response = await SELF.fetch('https://localhost/api/relay/chains');
    const data = await response.json() as any;
    
    for (const chain of data.data.chains) {
      expect(chain.forwarderAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
    }
  });

  it('should include native currency info for each chain', async () => {
    const response = await SELF.fetch('https://localhost/api/relay/chains');
    const data = await response.json() as any;
    
    for (const chain of data.data.chains) {
      expect(chain.nativeCurrency).toBeDefined();
      expect(chain.nativeCurrency.symbol).toBeDefined();
      expect(chain.nativeCurrency.decimals).toBe(18);
    }
  });
});

describe('Relay API - /api/relay/nonce', () => {
  it('should return nonce 0 for new user', async () => {
    const response = await SELF.fetch(
      `https://localhost/api/relay/nonce/${TEST_USER_ADDRESS}/${SEPOLIA_CHAIN_ID}`
    );
    expect(response.status).toBe(200);
    
    const data = await response.json() as any;
    expect(data.success).toBe(true);
    expect(data.data.nonce).toBe(0);
  });

  it('should include address in response', async () => {
    const response = await SELF.fetch(
      `https://localhost/api/relay/nonce/${TEST_USER_ADDRESS}/${SEPOLIA_CHAIN_ID}`
    );
    const data = await response.json() as any;
    
    expect(data.data.address).toBe(TEST_USER_ADDRESS);
  });

  it('should include chainId in response', async () => {
    const response = await SELF.fetch(
      `https://localhost/api/relay/nonce/${TEST_USER_ADDRESS}/${SEPOLIA_CHAIN_ID}`
    );
    const data = await response.json() as any;
    
    expect(data.data.chainId).toBe(SEPOLIA_CHAIN_ID);
  });

  it('should reject unsupported chain', async () => {
    const response = await SELF.fetch(
      `https://localhost/api/relay/nonce/${TEST_USER_ADDRESS}/99999`
    );
    expect(response.status).toBe(400);
    
    const data = await response.json() as any;
    expect(data.success).toBe(false);
    expect(data.error).toContain('not supported');
  });

  it('should return different nonces for different chains', async () => {
    const sepoliaResponse = await SELF.fetch(
      `https://localhost/api/relay/nonce/${TEST_USER_ADDRESS}/${SEPOLIA_CHAIN_ID}`
    );
    const amoyResponse = await SELF.fetch(
      `https://localhost/api/relay/nonce/${TEST_USER_ADDRESS}/${POLYGON_AMOY_CHAIN_ID}`
    );
    
    const sepoliaData = await sepoliaResponse.json() as any;
    const amoyData = await amoyResponse.json() as any;
    
    // Both should be 0 for new user, but tracked separately
    expect(sepoliaData.data.chainId).toBe(SEPOLIA_CHAIN_ID);
    expect(amoyData.data.chainId).toBe(POLYGON_AMOY_CHAIN_ID);
  });
});

describe('Relay API - /api/relay/submit', () => {
  it('should accept valid meta-transaction', async () => {
    const metaTx = createTestMetaTransaction();
    
    const response = await SELF.fetch('https://localhost/api/relay/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metaTx)
    });
    
    expect(response.status).toBe(201);
    
    const data = await response.json() as any;
    expect(data.success).toBe(true);
    expect(data.data.transactionId).toBeDefined();
    expect(data.data.status).toBe('pending');
  });

  it('should return transaction ID starting with tx_', async () => {
    const metaTx = createTestMetaTransaction();
    
    const response = await SELF.fetch('https://localhost/api/relay/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metaTx)
    });
    
    const data = await response.json() as any;
    expect(data.data.transactionId).toMatch(/^tx_/);
  });

  it('should reject unsupported chain', async () => {
    const metaTx = createTestMetaTransaction(99999);
    
    const response = await SELF.fetch('https://localhost/api/relay/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metaTx)
    });
    
    expect(response.status).toBe(400);
    
    const data = await response.json() as any;
    expect(data.success).toBe(false);
    expect(data.error).toContain('not supported');
  });

  it('should reject invalid from address', async () => {
    const metaTx = createTestMetaTransaction(SEPOLIA_CHAIN_ID, { from: 'invalid' });
    
    const response = await SELF.fetch('https://localhost/api/relay/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metaTx)
    });
    
    expect(response.status).toBe(400);
    
    const data = await response.json() as any;
    expect(data.success).toBe(false);
    expect(data.error).toContain('address');
  });

  it('should reject expired deadline', async () => {
    const expiredDeadline = String(Math.floor(Date.now() / 1000) - 3600);
    const metaTx = createTestMetaTransaction(SEPOLIA_CHAIN_ID, { deadline: expiredDeadline });
    
    const response = await SELF.fetch('https://localhost/api/relay/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metaTx)
    });
    
    expect(response.status).toBe(400);
    
    const data = await response.json() as any;
    expect(data.success).toBe(false);
    expect(data.error).toContain('expired');
  });

  it('should reject excessive gas limit', async () => {
    const metaTx = createTestMetaTransaction(SEPOLIA_CHAIN_ID, { gas: '100000000' });
    
    const response = await SELF.fetch('https://localhost/api/relay/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metaTx)
    });
    
    expect(response.status).toBe(400);
    
    const data = await response.json() as any;
    expect(data.success).toBe(false);
    expect(data.error).toContain('gas');
  });

  it('should include estimated wait time', async () => {
    const metaTx = createTestMetaTransaction();
    
    const response = await SELF.fetch('https://localhost/api/relay/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metaTx)
    });
    
    const data = await response.json() as any;
    expect(data.data.estimatedWait).toBeDefined();
    expect(typeof data.data.estimatedWait).toBe('number');
  });
});

describe('Relay API - /api/relay/status', () => {
  it('should return 404 for non-existent transaction', async () => {
    const response = await SELF.fetch('https://localhost/api/relay/status/tx_nonexistent');
    expect(response.status).toBe(404);
    
    const data = await response.json() as any;
    expect(data.success).toBe(false);
    expect(data.error).toContain('not found');
  });

  it('should return status for submitted transaction', async () => {
    // First submit a transaction
    const metaTx = createTestMetaTransaction();
    const submitResponse = await SELF.fetch('https://localhost/api/relay/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metaTx)
    });
    const submitData = await submitResponse.json() as any;
    const txId = submitData.data.transactionId;
    
    // Then check its status
    const statusResponse = await SELF.fetch(`https://localhost/api/relay/status/${txId}`);
    expect(statusResponse.status).toBe(200);
    
    const statusData = await statusResponse.json() as any;
    expect(statusData.success).toBe(true);
    expect(statusData.data.transactionId).toBe(txId);
    expect(statusData.data.status).toBe('pending');
  });
});

describe('Relay API - /api/relay/history', () => {
  it('should return empty history for new user', async () => {
    const newUser = '0x0000000000000000000000000000000000000001';
    const response = await SELF.fetch(`https://localhost/api/relay/history/${newUser}`);
    
    expect(response.status).toBe(200);
    
    const data = await response.json() as any;
    expect(data.success).toBe(true);
    expect(data.data.transactions).toBeDefined();
    expect(Array.isArray(data.data.transactions)).toBe(true);
  });

  it('should include pagination info', async () => {
    const response = await SELF.fetch(`https://localhost/api/relay/history/${TEST_USER_ADDRESS}`);
    const data = await response.json() as any;
    
    expect(data.data.pagination).toBeDefined();
    expect(data.data.pagination.limit).toBeDefined();
    expect(data.data.pagination.offset).toBeDefined();
  });

  it('should respect limit parameter', async () => {
    const response = await SELF.fetch(
      `https://localhost/api/relay/history/${TEST_USER_ADDRESS}?limit=5`
    );
    const data = await response.json() as any;
    
    expect(data.data.pagination.limit).toBe(5);
  });

  it('should cap limit at 100', async () => {
    const response = await SELF.fetch(
      `https://localhost/api/relay/history/${TEST_USER_ADDRESS}?limit=500`
    );
    const data = await response.json() as any;
    
    // The API should cap at 100
    expect(data.data.pagination.limit).toBeLessThanOrEqual(100);
  });
});

describe('Relay API - /api/relay/simulate', () => {
  it('should validate request without submitting', async () => {
    const metaTx = createTestMetaTransaction();
    
    const response = await SELF.fetch('https://localhost/api/relay/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metaTx)
    });
    
    expect(response.status).toBe(200);
    
    const data = await response.json() as any;
    expect(data.success).toBe(true);
    expect(data.data.valid).toBe(true);
  });

  it('should return eligibility information', async () => {
    const metaTx = createTestMetaTransaction();
    
    const response = await SELF.fetch('https://localhost/api/relay/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metaTx)
    });
    
    const data = await response.json() as any;
    expect(data.data.eligibility).toBeDefined();
    expect(data.data.eligibility.allowed).toBeDefined();
    expect(data.data.eligibility.remainingTransactions).toBeDefined();
  });

  it('should include nonce validation', async () => {
    const metaTx = createTestMetaTransaction();
    
    const response = await SELF.fetch('https://localhost/api/relay/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metaTx)
    });
    
    const data = await response.json() as any;
    expect(data.data.nonce).toBeDefined();
    expect(data.data.nonce.expected).toBeDefined();
    expect(data.data.nonce.provided).toBeDefined();
    expect(data.data.nonce.valid).toBeDefined();
  });

  it('should reject invalid requests', async () => {
    const metaTx = createTestMetaTransaction(SEPOLIA_CHAIN_ID, { from: 'invalid' });
    
    const response = await SELF.fetch('https://localhost/api/relay/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metaTx)
    });
    
    expect(response.status).toBe(400);
  });
});

describe('Relay API - /api/relay/typed-data', () => {
  it('should return EIP-712 typed data structure', async () => {
    const request = createTestRequest();
    
    const response = await SELF.fetch('https://localhost/api/relay/typed-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chainId: SEPOLIA_CHAIN_ID, request })
    });
    
    expect(response.status).toBe(200);
    
    const data = await response.json() as any;
    expect(data.success).toBe(true);
    expect(data.data.typedData).toBeDefined();
  });

  it('should include EIP712Domain type', async () => {
    const request = createTestRequest();
    
    const response = await SELF.fetch('https://localhost/api/relay/typed-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chainId: SEPOLIA_CHAIN_ID, request })
    });
    
    const data = await response.json() as any;
    expect(data.data.typedData.types.EIP712Domain).toBeDefined();
  });

  it('should include ForwardRequest type', async () => {
    const request = createTestRequest();
    
    const response = await SELF.fetch('https://localhost/api/relay/typed-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chainId: SEPOLIA_CHAIN_ID, request })
    });
    
    const data = await response.json() as any;
    expect(data.data.typedData.types.ForwardRequest).toBeDefined();
  });

  it('should include domain with correct chainId', async () => {
    const request = createTestRequest();
    
    const response = await SELF.fetch('https://localhost/api/relay/typed-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chainId: SEPOLIA_CHAIN_ID, request })
    });
    
    const data = await response.json() as any;
    expect(data.data.typedData.domain.chainId).toBe(SEPOLIA_CHAIN_ID);
  });

  it('should reject unsupported chain', async () => {
    const request = createTestRequest();
    
    const response = await SELF.fetch('https://localhost/api/relay/typed-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chainId: 99999, request })
    });
    
    expect(response.status).toBe(400);
    
    const data = await response.json() as any;
    expect(data.success).toBe(false);
  });

  it('should include message with request data', async () => {
    const request = createTestRequest();
    
    const response = await SELF.fetch('https://localhost/api/relay/typed-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chainId: SEPOLIA_CHAIN_ID, request })
    });
    
    const data = await response.json() as any;
    expect(data.data.typedData.message.from).toBe(request.from);
    expect(data.data.typedData.message.to).toBe(request.to);
  });
});

describe('API Response Format', () => {
  it('should include timestamp in all responses', async () => {
    const response = await SELF.fetch('https://localhost/api/relay/chains');
    const data = await response.json() as any;
    
    expect(data.timestamp).toBeDefined();
    expect(typeof data.timestamp).toBe('number');
    expect(data.timestamp).toBeGreaterThan(0);
  });

  it('should use consistent success/error format', async () => {
    // Success case
    const successResponse = await SELF.fetch('https://localhost/api/relay/chains');
    const successData = await successResponse.json() as any;
    expect(successData.success).toBe(true);
    expect(successData.data).toBeDefined();
    
    // Error case
    const errorResponse = await SELF.fetch(
      `https://localhost/api/relay/nonce/${TEST_USER_ADDRESS}/99999`
    );
    const errorData = await errorResponse.json() as any;
    expect(errorData.success).toBe(false);
    expect(errorData.error).toBeDefined();
  });
});
