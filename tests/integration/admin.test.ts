/**
 * Integration Tests for Admin API Endpoints
 * 
 * Tests the administrative dashboard, stats, and management API.
 * Uses Cloudflare Workers test environment with mocked D1 database.
 * 
 * @module tests/integration/admin
 */

import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';

// Test fixtures
const TEST_CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890';
const SEPOLIA_CHAIN_ID = 11155111;

describe('Admin API - /api/admin/health', () => {
  it('should return health status', async () => {
    const response = await SELF.fetch('https://localhost/api/admin/health');
    expect(response.status).toBe(200);
    
    const data = await response.json() as any;
    expect(data.success).toBe(true);
    expect(data.data.status).toBeDefined();
  });

  it('should include database status', async () => {
    const response = await SELF.fetch('https://localhost/api/admin/health');
    const data = await response.json() as any;
    
    expect(data.data.database).toBeDefined();
  });

  it('should include circuit breaker status', async () => {
    const response = await SELF.fetch('https://localhost/api/admin/health');
    const data = await response.json() as any;
    
    expect(data.data.circuitBreaker).toBeDefined();
    expect(['open', 'closed']).toContain(data.data.circuitBreaker);
  });

  it('should include timestamp', async () => {
    const response = await SELF.fetch('https://localhost/api/admin/health');
    const data = await response.json() as any;
    
    expect(data.data.timestamp).toBeDefined();
    expect(typeof data.data.timestamp).toBe('number');
  });
});

describe('Admin API - /api/admin/info', () => {
  it('should return service information', async () => {
    const response = await SELF.fetch('https://localhost/api/admin/info');
    expect(response.status).toBe(200);
    
    const data = await response.json() as any;
    expect(data.success).toBe(true);
    expect(data.data.name).toBe('Gasless Transaction Relayer');
  });

  it('should include version', async () => {
    const response = await SELF.fetch('https://localhost/api/admin/info');
    const data = await response.json() as any;
    
    expect(data.data.version).toBeDefined();
    expect(data.data.version).toBe('1.0.0');
  });

  it('should list supported chains', async () => {
    const response = await SELF.fetch('https://localhost/api/admin/info');
    const data = await response.json() as any;
    
    expect(data.data.supportedChains).toBeDefined();
    expect(Array.isArray(data.data.supportedChains)).toBe(true);
    expect(data.data.supportedChains.length).toBeGreaterThan(0);
  });

  it('should list features', async () => {
    const response = await SELF.fetch('https://localhost/api/admin/info');
    const data = await response.json() as any;
    
    expect(data.data.features).toBeDefined();
    expect(Array.isArray(data.data.features)).toBe(true);
    expect(data.data.features).toContain('EIP-2771 Meta-Transactions');
  });

  it('should include limits configuration', async () => {
    const response = await SELF.fetch('https://localhost/api/admin/info');
    const data = await response.json() as any;
    
    expect(data.data.limits).toBeDefined();
    expect(data.data.limits.maxGasLimit).toBeDefined();
    expect(data.data.limits.dailyUserLimit).toBeDefined();
  });
});

describe('Admin API - /api/admin/stats', () => {
  it('should return overview statistics', async () => {
    const response = await SELF.fetch('https://localhost/api/admin/stats');
    expect(response.status).toBe(200);
    
    const data = await response.json() as any;
    expect(data.success).toBe(true);
    expect(data.data.overview).toBeDefined();
  });

  it('should include total transactions count', async () => {
    const response = await SELF.fetch('https://localhost/api/admin/stats');
    const data = await response.json() as any;
    
    expect(data.data.overview.totalTransactions).toBeDefined();
    expect(typeof data.data.overview.totalTransactions).toBe('number');
  });

  it('should include total users count', async () => {
    const response = await SELF.fetch('https://localhost/api/admin/stats');
    const data = await response.json() as any;
    
    expect(data.data.overview.totalUsers).toBeDefined();
    expect(typeof data.data.overview.totalUsers).toBe('number');
  });

  it('should include gas statistics', async () => {
    const response = await SELF.fetch('https://localhost/api/admin/stats');
    const data = await response.json() as any;
    
    expect(data.data.overview.totalGasRelayed).toBeDefined();
    expect(data.data.overview.totalGasSaved).toBeDefined();
  });

  it('should include statistics by status', async () => {
    const response = await SELF.fetch('https://localhost/api/admin/stats');
    const data = await response.json() as any;
    
    expect(data.data.byStatus).toBeDefined();
  });

  it('should include statistics by chain', async () => {
    const response = await SELF.fetch('https://localhost/api/admin/stats');
    const data = await response.json() as any;
    
    expect(data.data.byChain).toBeDefined();
  });

  it('should include circuit breaker status', async () => {
    const response = await SELF.fetch('https://localhost/api/admin/stats');
    const data = await response.json() as any;
    
    expect(data.data.circuitBreaker).toBeDefined();
    expect(data.data.circuitBreaker.isOpen).toBeDefined();
    expect(data.data.circuitBreaker.failureCount).toBeDefined();
  });
});

describe('Admin API - /api/admin/activity', () => {
  it('should return recent activity', async () => {
    const response = await SELF.fetch('https://localhost/api/admin/activity');
    expect(response.status).toBe(200);
    
    const data = await response.json() as any;
    expect(data.success).toBe(true);
    expect(data.data.activity).toBeDefined();
    expect(Array.isArray(data.data.activity)).toBe(true);
  });

  it('should respect limit parameter', async () => {
    const response = await SELF.fetch('https://localhost/api/admin/activity?limit=5');
    const data = await response.json() as any;
    
    expect(data.data.activity.length).toBeLessThanOrEqual(5);
  });

  it('should cap limit at 100', async () => {
    const response = await SELF.fetch('https://localhost/api/admin/activity?limit=500');
    const data = await response.json() as any;
    
    // Activity array should be capped at 100 max
    expect(data.data.activity.length).toBeLessThanOrEqual(100);
  });

  it('should include formatted addresses', async () => {
    // First submit a transaction to have some activity
    const metaTx = {
      chainId: SEPOLIA_CHAIN_ID,
      request: {
        from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9',
        to: TEST_CONTRACT_ADDRESS,
        value: '0',
        gas: '100000',
        nonce: '100', // Use different nonce to avoid conflicts
        deadline: String(Math.floor(Date.now() / 1000) + 3600),
        data: '0x12345678'
      },
      signature: '0x' + 'a'.repeat(130)
    };
    
    await SELF.fetch('https://localhost/api/relay/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metaTx)
    });
    
    const response = await SELF.fetch('https://localhost/api/admin/activity');
    const data = await response.json() as any;
    
    if (data.data.activity.length > 0) {
      const activity = data.data.activity[0];
      expect(activity.user).toBeDefined();
      expect(activity.userFull).toBeDefined();
      expect(activity.chain).toBeDefined();
      expect(activity.status).toBeDefined();
    }
  });
});

describe('Admin API - /api/admin/pending', () => {
  it('should return pending transactions', async () => {
    const response = await SELF.fetch('https://localhost/api/admin/pending');
    expect(response.status).toBe(200);
    
    const data = await response.json() as any;
    expect(data.success).toBe(true);
    expect(data.data.pending).toBeDefined();
    expect(Array.isArray(data.data.pending)).toBe(true);
  });

  it('should include count', async () => {
    const response = await SELF.fetch('https://localhost/api/admin/pending');
    const data = await response.json() as any;
    
    expect(data.data.count).toBeDefined();
    expect(typeof data.data.count).toBe('number');
  });

  it('should filter by chainId if provided', async () => {
    const response = await SELF.fetch(
      `https://localhost/api/admin/pending?chainId=${SEPOLIA_CHAIN_ID}`
    );
    const data = await response.json() as any;
    
    expect(data.success).toBe(true);
    // All pending transactions should be for the specified chain
    for (const tx of data.data.pending) {
      expect(tx.chain_id).toBe(SEPOLIA_CHAIN_ID);
    }
  });
});

describe('Admin API - /api/admin/circuit-breaker', () => {
  it('should return circuit breaker status', async () => {
    const response = await SELF.fetch('https://localhost/api/admin/circuit-breaker');
    expect(response.status).toBe(200);
    
    const data = await response.json() as any;
    expect(data.success).toBe(true);
    expect(data.data.isOpen).toBeDefined();
  });

  it('should include failure count', async () => {
    const response = await SELF.fetch('https://localhost/api/admin/circuit-breaker');
    const data = await response.json() as any;
    
    expect(data.data.failureCount).toBeDefined();
    expect(typeof data.data.failureCount).toBe('number');
  });

  it('should be closed by default', async () => {
    const response = await SELF.fetch('https://localhost/api/admin/circuit-breaker');
    const data = await response.json() as any;
    
    expect(data.data.isOpen).toBe(false);
  });
});

describe('Admin API - /api/admin/circuit-breaker/reset', () => {
  it('should reset circuit breaker', async () => {
    const response = await SELF.fetch('https://localhost/api/admin/circuit-breaker/reset', {
      method: 'POST'
    });
    expect(response.status).toBe(200);
    
    const data = await response.json() as any;
    expect(data.success).toBe(true);
    expect(data.data.message).toContain('reset');
  });

  it('should clear failure count after reset', async () => {
    // Reset the circuit breaker
    await SELF.fetch('https://localhost/api/admin/circuit-breaker/reset', {
      method: 'POST'
    });
    
    // Check status
    const response = await SELF.fetch('https://localhost/api/admin/circuit-breaker');
    const data = await response.json() as any;
    
    expect(data.data.failureCount).toBe(0);
    expect(data.data.isOpen).toBe(false);
  });
});

describe('Admin API - /api/admin/whitelist', () => {
  it('should return whitelisted contracts', async () => {
    const response = await SELF.fetch('https://localhost/api/admin/whitelist');
    expect(response.status).toBe(200);
    
    const data = await response.json() as any;
    expect(data.success).toBe(true);
    expect(data.data.contracts).toBeDefined();
    expect(Array.isArray(data.data.contracts)).toBe(true);
  });

  it('should filter by chainId if provided', async () => {
    const response = await SELF.fetch(
      `https://localhost/api/admin/whitelist?chainId=${SEPOLIA_CHAIN_ID}`
    );
    const data = await response.json() as any;
    
    expect(data.success).toBe(true);
  });

  it('should add contract to whitelist', async () => {
    const newContract = {
      chainId: SEPOLIA_CHAIN_ID,
      contractAddress: TEST_CONTRACT_ADDRESS,
      name: 'Test Contract'
    };
    
    const response = await SELF.fetch('https://localhost/api/admin/whitelist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newContract)
    });
    
    expect(response.status).toBe(201);
    
    const data = await response.json() as any;
    expect(data.success).toBe(true);
  });

  it('should reject invalid contract address', async () => {
    const invalidContract = {
      chainId: SEPOLIA_CHAIN_ID,
      contractAddress: 'invalid-address',
      name: 'Test Contract'
    };
    
    const response = await SELF.fetch('https://localhost/api/admin/whitelist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidContract)
    });
    
    expect(response.status).toBe(400);
    
    const data = await response.json() as any;
    expect(data.success).toBe(false);
    expect(data.error).toContain('address');
  });

  it('should reject unsupported chain', async () => {
    const invalidChain = {
      chainId: 99999,
      contractAddress: TEST_CONTRACT_ADDRESS,
      name: 'Test Contract'
    };
    
    const response = await SELF.fetch('https://localhost/api/admin/whitelist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidChain)
    });
    
    expect(response.status).toBe(400);
    
    const data = await response.json() as any;
    expect(data.success).toBe(false);
    expect(data.error).toContain('not supported');
  });

  it('should accept allowed functions array', async () => {
    const contractWithFunctions = {
      chainId: SEPOLIA_CHAIN_ID,
      contractAddress: '0x0000000000000000000000000000000000000002',
      name: 'Function Restricted Contract',
      allowedFunctions: ['transfer(address,uint256)', 'approve(address,uint256)']
    };
    
    const response = await SELF.fetch('https://localhost/api/admin/whitelist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contractWithFunctions)
    });
    
    expect(response.status).toBe(201);
  });
});

describe('Admin API - Error Handling', () => {
  it('should return proper error format for 404', async () => {
    const response = await SELF.fetch('https://localhost/api/admin/nonexistent');
    expect(response.status).toBe(404);
  });

  it('should return proper error format for bad JSON', async () => {
    const response = await SELF.fetch('https://localhost/api/admin/whitelist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json'
    });
    
    expect(response.status).toBe(400);
  });

  it('should include timestamp in error responses', async () => {
    const response = await SELF.fetch('https://localhost/api/admin/whitelist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chainId: 99999, contractAddress: 'invalid' })
    });
    
    const data = await response.json() as any;
    expect(data.timestamp).toBeDefined();
  });
});

describe('Admin API - Security', () => {
  it('should not expose internal errors', async () => {
    // Send malformed data that might cause internal errors
    const response = await SELF.fetch('https://localhost/api/admin/whitelist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    const data = await response.json() as any;
    // Should not contain stack traces or internal details
    if (data.error) {
      expect(data.error).not.toContain('at ');
      expect(data.error).not.toContain('node_modules');
    }
  });
});
