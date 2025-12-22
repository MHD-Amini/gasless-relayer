// EIP-712 Signature Verification for Meta-Transactions
// Implements EIP-2771 standard for gasless transactions

import { 
  ForwardRequest, 
  EIP712_TYPES, 
  FORWARDER_DOMAIN,
  CHAIN_CONFIGS 
} from '../types';

// Keccak256 hash using Web Crypto API (Cloudflare Workers compatible)
export async function keccak256(data: Uint8Array): Promise<string> {
  // For Cloudflare Workers, we use a pure JS implementation
  return keccak256Pure(data);
}

// Pure JavaScript Keccak-256 implementation
// Based on the Keccak specification
const KECCAK_ROUNDS = 24;
const KECCAK_RC = [
  0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an,
  0x8000000080008000n, 0x000000000000808bn, 0x0000000080000001n,
  0x8000000080008081n, 0x8000000000008009n, 0x000000000000008an,
  0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
  0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n,
  0x8000000000008003n, 0x8000000000008002n, 0x8000000000000080n,
  0x000000000000800an, 0x800000008000000an, 0x8000000080008081n,
  0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n
];

const KECCAK_ROTATIONS = [
  [0, 36, 3, 41, 18],
  [1, 44, 10, 45, 2],
  [62, 6, 43, 15, 61],
  [28, 55, 25, 21, 56],
  [27, 20, 39, 8, 14]
];

function rotl64(x: bigint, n: number): bigint {
  n = n % 64;
  return ((x << BigInt(n)) | (x >> BigInt(64 - n))) & 0xffffffffffffffffn;
}

function keccakF(state: bigint[]): void {
  for (let round = 0; round < KECCAK_ROUNDS; round++) {
    // θ step
    const C: bigint[] = [];
    for (let x = 0; x < 5; x++) {
      C[x] = state[x] ^ state[x + 5] ^ state[x + 10] ^ state[x + 15] ^ state[x + 20];
    }
    const D: bigint[] = [];
    for (let x = 0; x < 5; x++) {
      D[x] = C[(x + 4) % 5] ^ rotl64(C[(x + 1) % 5], 1);
    }
    for (let i = 0; i < 25; i++) {
      state[i] ^= D[i % 5];
    }

    // ρ and π steps
    const B: bigint[] = new Array(25).fill(0n);
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        const i = x + 5 * y;
        const j = y + 5 * ((2 * x + 3 * y) % 5);
        B[j] = rotl64(state[i], KECCAK_ROTATIONS[y][x]);
      }
    }

    // χ step
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        const i = x + 5 * y;
        state[i] = B[i] ^ ((~B[(x + 1) % 5 + 5 * y]) & B[(x + 2) % 5 + 5 * y]);
      }
    }

    // ι step
    state[0] ^= KECCAK_RC[round];
  }
}

export function keccak256Pure(input: Uint8Array): string {
  const rate = 136; // 1088 bits / 8 for keccak-256
  const capacity = 64;
  
  // Padding
  const padded = new Uint8Array(Math.ceil((input.length + 1) / rate) * rate);
  padded.set(input);
  padded[input.length] = 0x01;
  padded[padded.length - 1] |= 0x80;

  // Initialize state
  const state: bigint[] = new Array(25).fill(0n);

  // Absorb
  for (let i = 0; i < padded.length; i += rate) {
    for (let j = 0; j < rate / 8; j++) {
      let lane = 0n;
      for (let k = 0; k < 8; k++) {
        lane |= BigInt(padded[i + j * 8 + k]) << BigInt(k * 8);
      }
      state[j] ^= lane;
    }
    keccakF(state);
  }

  // Squeeze (32 bytes for keccak-256)
  const output = new Uint8Array(32);
  for (let i = 0; i < 4; i++) {
    const lane = state[i];
    for (let j = 0; j < 8; j++) {
      output[i * 8 + j] = Number((lane >> BigInt(j * 8)) & 0xffn);
    }
  }

  return '0x' + Array.from(output).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper to convert hex string to Uint8Array
export function hexToBytes(hex: string): Uint8Array {
  if (hex.startsWith('0x')) hex = hex.slice(2);
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

// Helper to convert string to Uint8Array
export function stringToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

// Helper to concatenate Uint8Arrays
export function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

// Encode uint256 as 32 bytes
export function encodeUint256(value: string | number | bigint): Uint8Array {
  const bn = BigInt(value);
  const bytes = new Uint8Array(32);
  for (let i = 31; i >= 0; i--) {
    bytes[i] = Number(bn >> BigInt((31 - i) * 8) & 0xffn);
  }
  return bytes;
}

// Encode address as 32 bytes (padded)
export function encodeAddress(address: string): Uint8Array {
  const bytes = new Uint8Array(32);
  const addrBytes = hexToBytes(address);
  bytes.set(addrBytes, 12); // Left-pad with zeros
  return bytes;
}

// Hash EIP-712 typed data
export function hashTypedData(
  domainSeparator: string,
  structHash: string
): string {
  const prefix = hexToBytes('0x1901');
  const domain = hexToBytes(domainSeparator);
  const struct = hexToBytes(structHash);
  return keccak256Pure(concatBytes(prefix, domain, struct));
}

// Compute EIP-712 domain separator
export function computeDomainSeparator(
  name: string,
  version: string,
  chainId: number,
  verifyingContract: string
): string {
  const typeHash = keccak256Pure(stringToBytes(
    'EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'
  ));
  
  const nameHash = keccak256Pure(stringToBytes(name));
  const versionHash = keccak256Pure(stringToBytes(version));
  
  const encoded = concatBytes(
    hexToBytes(typeHash),
    hexToBytes(nameHash),
    hexToBytes(versionHash),
    encodeUint256(chainId),
    encodeAddress(verifyingContract)
  );
  
  return keccak256Pure(encoded);
}

// Compute struct hash for ForwardRequest
export function computeForwardRequestHash(request: ForwardRequest): string {
  const typeHash = keccak256Pure(stringToBytes(
    'ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,uint256 deadline,bytes data)'
  ));
  
  const dataHash = keccak256Pure(hexToBytes(request.data));
  
  const encoded = concatBytes(
    hexToBytes(typeHash),
    encodeAddress(request.from),
    encodeAddress(request.to),
    encodeUint256(request.value),
    encodeUint256(request.gas),
    encodeUint256(request.nonce),
    encodeUint256(request.deadline),
    hexToBytes(dataHash)
  );
  
  return keccak256Pure(encoded);
}

// Recover signer address from signature
export function recoverAddress(messageHash: string, signature: string): string {
  // Parse signature
  const sig = hexToBytes(signature);
  if (sig.length !== 65) {
    throw new Error('Invalid signature length');
  }
  
  const r = sig.slice(0, 32);
  const s = sig.slice(32, 64);
  let v = sig[64];
  
  // Handle EIP-155 v values
  if (v < 27) {
    v += 27;
  }
  
  // ECDSA recovery using secp256k1
  // For production, use a proper library. This is a simplified version.
  // In Cloudflare Workers, we'd typically use @noble/secp256k1
  
  // For this demo, we'll implement basic signature verification
  // The actual implementation would use the @noble/secp256k1 library
  
  return ecrecover(hexToBytes(messageHash), v, r, s);
}

// Simplified ECDSA recovery (for demo purposes)
// In production, use @noble/secp256k1 or similar
function ecrecover(msgHash: Uint8Array, v: number, r: Uint8Array, s: Uint8Array): string {
  // This is a placeholder - in production, implement proper ECDSA recovery
  // For now, we'll use a verification approach with Web Crypto API
  
  // Convert r and s to hex for logging
  const rHex = '0x' + Array.from(r).map(b => b.toString(16).padStart(2, '0')).join('');
  const sHex = '0x' + Array.from(s).map(b => b.toString(16).padStart(2, '0')).join('');
  
  console.log('ECDSA Recovery:', { v, rHex, sHex });
  
  // Return a placeholder - in production this would return the actual recovered address
  // This requires implementing secp256k1 point recovery
  return '0x0000000000000000000000000000000000000000';
}

// Verify EIP-712 signature for ForwardRequest
export async function verifyForwardRequestSignature(
  request: ForwardRequest,
  signature: string,
  chainId: number,
  forwarderAddress: string
): Promise<{ valid: boolean; signer: string; error?: string }> {
  try {
    // Compute domain separator
    const domainSeparator = computeDomainSeparator(
      FORWARDER_DOMAIN.name,
      FORWARDER_DOMAIN.version,
      chainId,
      forwarderAddress
    );
    
    // Compute struct hash
    const structHash = computeForwardRequestHash(request);
    
    // Compute final message hash
    const messageHash = hashTypedData(domainSeparator, structHash);
    
    // Recover signer
    const signer = recoverAddress(messageHash, signature);
    
    // Verify signer matches request.from
    const isValid = signer.toLowerCase() === request.from.toLowerCase();
    
    return {
      valid: isValid,
      signer,
      error: isValid ? undefined : 'Signature verification failed: signer mismatch'
    };
  } catch (error) {
    return {
      valid: false,
      signer: '0x0000000000000000000000000000000000000000',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Validate request parameters
export function validateRequest(request: ForwardRequest, chainId: number): { valid: boolean; error?: string } {
  // Check if chain is supported
  if (!CHAIN_CONFIGS[chainId]) {
    return { valid: false, error: `Chain ${chainId} is not supported` };
  }
  
  // Validate addresses
  if (!/^0x[a-fA-F0-9]{40}$/.test(request.from)) {
    return { valid: false, error: 'Invalid from address' };
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(request.to)) {
    return { valid: false, error: 'Invalid to address' };
  }
  
  // Validate deadline
  const deadline = parseInt(request.deadline);
  const now = Math.floor(Date.now() / 1000);
  if (deadline < now) {
    return { valid: false, error: 'Request has expired' };
  }
  
  // Validate gas limit
  const gasLimit = parseInt(request.gas);
  if (gasLimit <= 0 || gasLimit > 10000000) {
    return { valid: false, error: 'Invalid gas limit' };
  }
  
  // Validate data is hex
  if (!/^0x[a-fA-F0-9]*$/.test(request.data)) {
    return { valid: false, error: 'Invalid data format' };
  }
  
  return { valid: true };
}

// Generate unique transaction ID
export function generateTransactionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `tx_${timestamp}_${random}`;
}
