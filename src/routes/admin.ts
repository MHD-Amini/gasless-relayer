// Admin API Routes
// Dashboard, stats, and administrative functions

import { Hono } from 'hono';
import { Env, ApiResponse, CHAIN_CONFIGS } from '../types';
import {
  getStats,
  getRecentActivity,
  getCircuitBreaker,
  resetCircuitBreaker,
  getTransactionsByStatus,
  getTransactionsByChain,
  addWhitelistedContract,
  getWhitelistedContracts,
  getPendingTransactions
} from '../lib/database';

const admin = new Hono<{ Bindings: Env }>();

// Get overall stats
admin.get('/stats', async (c) => {
  try {
    const stats = await getStats(c.env.RELAYER_DB);
    const byStatus = await getTransactionsByStatus(c.env.RELAYER_DB);
    const byChain = await getTransactionsByChain(c.env.RELAYER_DB);
    const circuitBreaker = await getCircuitBreaker(c.env.RELAYER_DB);
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        overview: {
          totalTransactions: stats.total_transactions,
          totalUsers: stats.total_users,
          totalGasRelayed: stats.total_gas_relayed,
          totalGasSaved: stats.total_gas_saved,
          lastUpdated: stats.last_updated
        },
        byStatus,
        byChain: Object.fromEntries(
          Object.entries(byChain).map(([chainId, count]) => [
            CHAIN_CONFIGS[parseInt(chainId)]?.name || chainId,
            count
          ])
        ),
        circuitBreaker: {
          isOpen: circuitBreaker.is_open === 1,
          failureCount: circuitBreaker.failure_count,
          lastFailure: circuitBreaker.last_failure_at,
          reason: circuitBreaker.reason
        }
      },
      timestamp: Date.now()
    });
    
  } catch (error) {
    return c.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      timestamp: Date.now()
    }, 500);
  }
});

// Get recent activity
admin.get('/activity', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '20');
    const transactions = await getRecentActivity(c.env.RELAYER_DB, Math.min(limit, 100));
    
    // Format for display
    const activity = transactions.map(tx => ({
      id: tx.id,
      user: `${tx.user_address.slice(0, 6)}...${tx.user_address.slice(-4)}`,
      userFull: tx.user_address,
      chain: CHAIN_CONFIGS[tx.chain_id]?.name || `Chain ${tx.chain_id}`,
      chainId: tx.chain_id,
      to: `${tx.to_address.slice(0, 6)}...${tx.to_address.slice(-4)}`,
      toFull: tx.to_address,
      status: tx.status,
      txHash: tx.tx_hash,
      gasUsed: tx.gas_used,
      createdAt: tx.created_at,
      confirmedAt: tx.confirmed_at
    }));
    
    return c.json<ApiResponse>({
      success: true,
      data: { activity },
      timestamp: Date.now()
    });
    
  } catch (error) {
    return c.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      timestamp: Date.now()
    }, 500);
  }
});

// Get pending transactions
admin.get('/pending', async (c) => {
  try {
    const chainId = c.req.query('chainId') ? parseInt(c.req.query('chainId')!) : undefined;
    const transactions = await getPendingTransactions(c.env.RELAYER_DB, chainId);
    
    return c.json<ApiResponse>({
      success: true,
      data: { 
        pending: transactions,
        count: transactions.length
      },
      timestamp: Date.now()
    });
    
  } catch (error) {
    return c.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      timestamp: Date.now()
    }, 500);
  }
});

// Circuit breaker management
admin.post('/circuit-breaker/reset', async (c) => {
  try {
    await resetCircuitBreaker(c.env.RELAYER_DB);
    
    return c.json<ApiResponse>({
      success: true,
      data: { message: 'Circuit breaker has been reset' },
      timestamp: Date.now()
    });
    
  } catch (error) {
    return c.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      timestamp: Date.now()
    }, 500);
  }
});

admin.get('/circuit-breaker', async (c) => {
  try {
    const cb = await getCircuitBreaker(c.env.RELAYER_DB);
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        isOpen: cb.is_open === 1,
        failureCount: cb.failure_count,
        lastFailure: cb.last_failure_at,
        openedAt: cb.opened_at,
        reason: cb.reason
      },
      timestamp: Date.now()
    });
    
  } catch (error) {
    return c.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      timestamp: Date.now()
    }, 500);
  }
});

// Whitelist management
admin.get('/whitelist', async (c) => {
  try {
    const chainId = c.req.query('chainId') ? parseInt(c.req.query('chainId')!) : undefined;
    const contracts = await getWhitelistedContracts(c.env.RELAYER_DB, chainId);
    
    return c.json<ApiResponse>({
      success: true,
      data: { contracts },
      timestamp: Date.now()
    });
    
  } catch (error) {
    return c.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      timestamp: Date.now()
    }, 500);
  }
});

admin.post('/whitelist', async (c) => {
  try {
    const body = await c.req.json<{
      chainId: number;
      contractAddress: string;
      name?: string;
      allowedFunctions?: string[];
    }>();
    
    if (!CHAIN_CONFIGS[body.chainId]) {
      return c.json<ApiResponse>({
        success: false,
        error: `Chain ${body.chainId} is not supported`,
        timestamp: Date.now()
      }, 400);
    }
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(body.contractAddress)) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Invalid contract address',
        timestamp: Date.now()
      }, 400);
    }
    
    await addWhitelistedContract(
      c.env.RELAYER_DB,
      body.chainId,
      body.contractAddress,
      body.name,
      body.allowedFunctions
    );
    
    return c.json<ApiResponse>({
      success: true,
      data: { message: 'Contract added to whitelist' },
      timestamp: Date.now()
    }, 201);
    
  } catch (error) {
    return c.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      timestamp: Date.now()
    }, 500);
  }
});

// Health check
admin.get('/health', async (c) => {
  try {
    // Test database connection
    await c.env.RELAYER_DB.prepare('SELECT 1').first();
    
    const cb = await getCircuitBreaker(c.env.RELAYER_DB);
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        status: cb.is_open === 1 ? 'degraded' : 'healthy',
        database: 'connected',
        circuitBreaker: cb.is_open === 1 ? 'open' : 'closed',
        timestamp: Date.now()
      },
      timestamp: Date.now()
    });
    
  } catch (error) {
    return c.json<ApiResponse>({
      success: false,
      data: {
        status: 'unhealthy',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      timestamp: Date.now()
    }, 503);
  }
});

// System info
admin.get('/info', (c) => {
  return c.json<ApiResponse>({
    success: true,
    data: {
      name: 'Gasless Transaction Relayer',
      version: '1.0.0',
      description: 'EIP-2771 compliant meta-transaction relayer service',
      supportedChains: Object.values(CHAIN_CONFIGS).map(config => ({
        chainId: config.chainId,
        name: config.name
      })),
      features: [
        'EIP-2771 Meta-Transactions',
        'Signature Verification',
        'Nonce Management (Replay Protection)',
        'Rate Limiting',
        'Circuit Breaker',
        'Contract Whitelisting',
        'Transaction Batching',
        'Multi-Chain Support'
      ],
      limits: {
        maxGasLimit: 500000,
        dailyUserLimit: 10,
        supportedChains: Object.keys(CHAIN_CONFIGS).length
      }
    },
    timestamp: Date.now()
  });
});

export default admin;
