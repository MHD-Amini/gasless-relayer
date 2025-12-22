// Relayer API Routes
// Handles meta-transaction submission and processing

import { Hono } from 'hono';
import { 
  Env, 
  MetaTransaction, 
  ForwardRequest, 
  ApiResponse, 
  SubmitResponse,
  StatusResponse,
  CHAIN_CONFIGS,
  FORWARDER_DOMAIN
} from '../types';
import {
  validateRequest,
  generateTransactionId,
  computeDomainSeparator,
  computeForwardRequestHash,
  hashTypedData
} from '../lib/crypto';
import {
  getOrCreateUser,
  checkUserDailyLimit,
  isUserBlocked,
  getNextNonce,
  isNonceUsed,
  markNonceUsed,
  createTransaction,
  getTransaction,
  updateTransactionStatus,
  getUserTransactions,
  getCircuitBreaker,
  recordFailure,
  updateStats,
  incrementUserTransactions,
  isContractWhitelisted
} from '../lib/database';

const relay = new Hono<{ Bindings: Env }>();

// Submit meta-transaction
relay.post('/submit', async (c) => {
  const startTime = Date.now();
  
  try {
    const body = await c.req.json<MetaTransaction>();
    const { chainId, request, signature } = body;
    
    // Validate chain
    if (!CHAIN_CONFIGS[chainId]) {
      return c.json<ApiResponse>({
        success: false,
        error: `Chain ${chainId} is not supported. Supported chains: ${Object.keys(CHAIN_CONFIGS).join(', ')}`,
        timestamp: Date.now()
      }, 400);
    }
    
    // Check circuit breaker
    const circuitBreaker = await getCircuitBreaker(c.env.RELAYER_DB);
    if (circuitBreaker.is_open === 1) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Relayer service is temporarily paused. Please try again later.',
        timestamp: Date.now()
      }, 503);
    }
    
    // Validate request parameters
    const validation = validateRequest(request, chainId);
    if (!validation.valid) {
      return c.json<ApiResponse>({
        success: false,
        error: validation.error,
        timestamp: Date.now()
      }, 400);
    }
    
    // Check if user is blocked
    if (await isUserBlocked(c.env.RELAYER_DB, request.from)) {
      return c.json<ApiResponse>({
        success: false,
        error: 'User is blocked from using the relayer',
        timestamp: Date.now()
      }, 403);
    }
    
    // Check daily limit
    const dailyLimit = parseInt(c.env.DAILY_USER_LIMIT || '10');
    const limitCheck = await checkUserDailyLimit(c.env.RELAYER_DB, request.from, dailyLimit);
    if (!limitCheck.allowed) {
      return c.json<ApiResponse>({
        success: false,
        error: `Daily transaction limit exceeded. Limit: ${dailyLimit}, Remaining: ${limitCheck.remaining}`,
        timestamp: Date.now()
      }, 429);
    }
    
    // Check gas limit
    const maxGasLimit = parseInt(c.env.MAX_GAS_LIMIT || '500000');
    const requestGas = parseInt(request.gas);
    if (requestGas > maxGasLimit) {
      return c.json<ApiResponse>({
        success: false,
        error: `Gas limit ${requestGas} exceeds maximum allowed ${maxGasLimit}`,
        timestamp: Date.now()
      }, 400);
    }
    
    // Verify nonce
    const requestNonce = parseInt(request.nonce);
    if (await isNonceUsed(c.env.RELAYER_DB, request.from, chainId, requestNonce)) {
      return c.json<ApiResponse>({
        success: false,
        error: `Nonce ${requestNonce} has already been used`,
        timestamp: Date.now()
      }, 400);
    }
    
    // Verify signature (compute hash for logging)
    const forwarderAddress = CHAIN_CONFIGS[chainId].forwarderAddress;
    const domainSeparator = computeDomainSeparator(
      FORWARDER_DOMAIN.name,
      FORWARDER_DOMAIN.version,
      chainId,
      forwarderAddress
    );
    const structHash = computeForwardRequestHash(request);
    const messageHash = hashTypedData(domainSeparator, structHash);
    
    // For demo purposes, we skip actual signature verification
    // In production, implement proper ECDSA recovery
    console.log('Message hash:', messageHash);
    console.log('Signature:', signature);
    
    // Create transaction record
    const transactionId = generateTransactionId();
    const transaction = await createTransaction(c.env.RELAYER_DB, {
      id: transactionId,
      user_address: request.from,
      relayer_address: null,
      chain_id: chainId,
      to_address: request.to,
      data: request.data,
      value: request.value,
      gas_limit: request.gas,
      gas_price: null,
      gas_used: null,
      nonce: requestNonce,
      deadline: parseInt(request.deadline),
      signature: signature,
      tx_hash: null,
      status: 'pending',
      error_message: null,
      block_number: null
    });
    
    // Mark nonce as used
    await markNonceUsed(c.env.RELAYER_DB, request.from, chainId, requestNonce);
    
    // Update user stats
    await getOrCreateUser(c.env.RELAYER_DB, request.from);
    
    // In a real implementation, we would:
    // 1. Add to processing queue
    // 2. Submit to blockchain via relayer wallet
    // 3. Monitor for confirmation
    
    // For demo, simulate processing
    const processingTime = Date.now() - startTime;
    
    return c.json<ApiResponse<SubmitResponse>>({
      success: true,
      data: {
        transactionId,
        status: 'pending',
        estimatedWait: 15 // seconds
      },
      timestamp: Date.now()
    }, 201);
    
  } catch (error) {
    console.error('Submit error:', error);
    
    // Record failure for circuit breaker
    await recordFailure(c.env.RELAYER_DB, error instanceof Error ? error.message : 'Unknown error');
    
    return c.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      timestamp: Date.now()
    }, 500);
  }
});

// Get transaction status
relay.get('/status/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const transaction = await getTransaction(c.env.RELAYER_DB, id);
    
    if (!transaction) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Transaction not found',
        timestamp: Date.now()
      }, 404);
    }
    
    return c.json<ApiResponse<StatusResponse>>({
      success: true,
      data: {
        transactionId: transaction.id,
        status: transaction.status as any,
        txHash: transaction.tx_hash || undefined,
        blockNumber: transaction.block_number || undefined,
        gasUsed: transaction.gas_used || undefined,
        error: transaction.error_message || undefined
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

// Get user's nonce
relay.get('/nonce/:address/:chainId', async (c) => {
  try {
    const address = c.req.param('address');
    const chainId = parseInt(c.req.param('chainId'));
    
    if (!CHAIN_CONFIGS[chainId]) {
      return c.json<ApiResponse>({
        success: false,
        error: `Chain ${chainId} is not supported`,
        timestamp: Date.now()
      }, 400);
    }
    
    const nonce = await getNextNonce(c.env.RELAYER_DB, address, chainId);
    
    return c.json<ApiResponse>({
      success: true,
      data: { 
        address,
        chainId,
        nonce 
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

// Get user's transaction history
relay.get('/history/:address', async (c) => {
  try {
    const address = c.req.param('address');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');
    
    const transactions = await getUserTransactions(
      c.env.RELAYER_DB, 
      address, 
      Math.min(limit, 100), 
      offset
    );
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        transactions,
        pagination: {
          limit,
          offset,
          hasMore: transactions.length === limit
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

// Get supported chains
relay.get('/chains', (c) => {
  const chains = Object.values(CHAIN_CONFIGS).map(config => ({
    chainId: config.chainId,
    name: config.name,
    forwarderAddress: config.forwarderAddress,
    explorerUrl: config.explorerUrl,
    nativeCurrency: config.nativeCurrency
  }));
  
  return c.json<ApiResponse>({
    success: true,
    data: { chains },
    timestamp: Date.now()
  });
});

// Simulate transaction (dry run)
relay.post('/simulate', async (c) => {
  try {
    const body = await c.req.json<MetaTransaction>();
    const { chainId, request, signature } = body;
    
    // Validate request
    const validation = validateRequest(request, chainId);
    if (!validation.valid) {
      return c.json<ApiResponse>({
        success: false,
        error: validation.error,
        timestamp: Date.now()
      }, 400);
    }
    
    // Check user eligibility
    const dailyLimit = parseInt(c.env.DAILY_USER_LIMIT || '10');
    const limitCheck = await checkUserDailyLimit(c.env.RELAYER_DB, request.from, dailyLimit);
    
    // Check nonce
    const expectedNonce = await getNextNonce(c.env.RELAYER_DB, request.from, chainId);
    const requestNonce = parseInt(request.nonce);
    
    return c.json<ApiResponse>({
      success: true,
      data: {
        valid: validation.valid,
        eligibility: {
          allowed: limitCheck.allowed,
          remainingTransactions: limitCheck.remaining,
          dailyLimit
        },
        nonce: {
          expected: expectedNonce,
          provided: requestNonce,
          valid: requestNonce >= expectedNonce
        },
        gasEstimate: {
          gasLimit: request.gas,
          estimatedCost: 'Simulated' // Would calculate actual cost
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

// Get EIP-712 typed data for signing
relay.post('/typed-data', async (c) => {
  try {
    const body = await c.req.json<{ chainId: number; request: ForwardRequest }>();
    const { chainId, request } = body;
    
    if (!CHAIN_CONFIGS[chainId]) {
      return c.json<ApiResponse>({
        success: false,
        error: `Chain ${chainId} is not supported`,
        timestamp: Date.now()
      }, 400);
    }
    
    const config = CHAIN_CONFIGS[chainId];
    
    const typedData = {
      types: {
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'chainId', type: 'uint256' },
          { name: 'verifyingContract', type: 'address' }
        ],
        ForwardRequest: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'gas', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
          { name: 'data', type: 'bytes' }
        ]
      },
      primaryType: 'ForwardRequest',
      domain: {
        name: FORWARDER_DOMAIN.name,
        version: FORWARDER_DOMAIN.version,
        chainId: chainId,
        verifyingContract: config.forwarderAddress
      },
      message: request
    };
    
    return c.json<ApiResponse>({
      success: true,
      data: { typedData },
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

export default relay;
