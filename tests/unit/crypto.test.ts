/**
 * Unit Tests for Cryptographic Functions
 * 
 * Tests EIP-712 signature utilities, Keccak-256 hashing,
 * and meta-transaction helper functions.
 * 
 * @module tests/unit/crypto
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  keccak256Pure,
  hexToBytes,
  stringToBytes,
  concatBytes,
  encodeUint256,
  encodeAddress,
  computeDomainSeparator,
  computeForwardRequestHash,
  hashTypedData,
  validateRequest,
  generateTransactionId
} from '../../src/lib/crypto';
import { ForwardRequest, CHAIN_CONFIGS, FORWARDER_DOMAIN } from '../../src/types';

describe('Keccak-256 Hashing', () => {
  describe('keccak256Pure', () => {
    it('should hash empty input correctly', () => {
      const hash = keccak256Pure(new Uint8Array(0));
      // Known keccak256 hash of empty input
      expect(hash).toBe('0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470');
    });

    it('should hash "hello" correctly', () => {
      const hash = keccak256Pure(stringToBytes('hello'));
      // Known keccak256 hash of "hello"
      expect(hash).toBe('0x1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8');
    });

    it('should produce consistent results for same input', () => {
      const input = stringToBytes('test input');
      const hash1 = keccak256Pure(input);
      const hash2 = keccak256Pure(input);
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = keccak256Pure(stringToBytes('input1'));
      const hash2 = keccak256Pure(stringToBytes('input2'));
      expect(hash1).not.toBe(hash2);
    });

    it('should return 66-character hex string (with 0x prefix)', () => {
      const hash = keccak256Pure(stringToBytes('any input'));
      expect(hash).toMatch(/^0x[a-f0-9]{64}$/);
    });
  });
});

describe('Byte Conversion Utilities', () => {
  describe('hexToBytes', () => {
    it('should convert hex string with 0x prefix', () => {
      const bytes = hexToBytes('0x0102030405');
      expect(Array.from(bytes)).toEqual([1, 2, 3, 4, 5]);
    });

    it('should convert hex string without 0x prefix', () => {
      const bytes = hexToBytes('deadbeef');
      expect(Array.from(bytes)).toEqual([0xde, 0xad, 0xbe, 0xef]);
    });

    it('should handle empty string', () => {
      const bytes = hexToBytes('0x');
      expect(bytes.length).toBe(0);
    });

    it('should correctly convert Ethereum address', () => {
      const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9';
      const bytes = hexToBytes(address);
      expect(bytes.length).toBe(20);
    });
  });

  describe('stringToBytes', () => {
    it('should convert ASCII string to bytes', () => {
      const bytes = stringToBytes('ABC');
      expect(Array.from(bytes)).toEqual([65, 66, 67]);
    });

    it('should handle UTF-8 encoding', () => {
      const bytes = stringToBytes('€'); // Euro sign is 3 bytes in UTF-8
      expect(bytes.length).toBe(3);
    });

    it('should handle empty string', () => {
      const bytes = stringToBytes('');
      expect(bytes.length).toBe(0);
    });
  });

  describe('concatBytes', () => {
    it('should concatenate multiple byte arrays', () => {
      const a = new Uint8Array([1, 2]);
      const b = new Uint8Array([3, 4]);
      const c = new Uint8Array([5]);
      const result = concatBytes(a, b, c);
      expect(Array.from(result)).toEqual([1, 2, 3, 4, 5]);
    });

    it('should handle empty arrays', () => {
      const a = new Uint8Array([1, 2]);
      const empty = new Uint8Array(0);
      const result = concatBytes(a, empty);
      expect(Array.from(result)).toEqual([1, 2]);
    });

    it('should return empty array when all inputs empty', () => {
      const result = concatBytes(new Uint8Array(0), new Uint8Array(0));
      expect(result.length).toBe(0);
    });
  });
});

describe('ABI Encoding', () => {
  describe('encodeUint256', () => {
    it('should encode zero as 32 zero bytes', () => {
      const encoded = encodeUint256(0);
      expect(encoded.length).toBe(32);
      expect(encoded.every(b => b === 0)).toBe(true);
    });

    it('should encode small number correctly', () => {
      const encoded = encodeUint256(255);
      expect(encoded.length).toBe(32);
      expect(encoded[31]).toBe(255);
      expect(encoded.slice(0, 31).every(b => b === 0)).toBe(true);
    });

    it('should encode string number', () => {
      const encoded = encodeUint256('12345');
      expect(encoded.length).toBe(32);
      // 12345 = 0x3039
      expect(encoded[30]).toBe(0x30);
      expect(encoded[31]).toBe(0x39);
    });

    it('should encode BigInt', () => {
      const encoded = encodeUint256(BigInt('1000000000000000000')); // 1 ETH in wei
      expect(encoded.length).toBe(32);
    });

    it('should encode large chain ID correctly', () => {
      const encoded = encodeUint256(11155111); // Sepolia chain ID
      expect(encoded.length).toBe(32);
    });
  });

  describe('encodeAddress', () => {
    it('should encode address as 32 bytes with left padding', () => {
      const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9';
      const encoded = encodeAddress(address);
      expect(encoded.length).toBe(32);
      // First 12 bytes should be zeros
      expect(encoded.slice(0, 12).every(b => b === 0)).toBe(true);
    });

    it('should place address bytes in last 20 positions', () => {
      const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9';
      const encoded = encodeAddress(address);
      const addressBytes = hexToBytes(address);
      expect(Array.from(encoded.slice(12))).toEqual(Array.from(addressBytes));
    });
  });
});

describe('EIP-712 Domain Separator', () => {
  describe('computeDomainSeparator', () => {
    it('should compute domain separator for Sepolia', () => {
      const domainSeparator = computeDomainSeparator(
        'GaslessForwarder',
        '1',
        11155111,
        '0x0000000000000000000000000000000000000001'
      );
      expect(domainSeparator).toMatch(/^0x[a-f0-9]{64}$/);
    });

    it('should produce different separators for different chains', () => {
      const sepolia = computeDomainSeparator(
        'GaslessForwarder',
        '1',
        11155111,
        '0x0000000000000000000000000000000000000001'
      );
      const amoy = computeDomainSeparator(
        'GaslessForwarder',
        '1',
        80002,
        '0x0000000000000000000000000000000000000001'
      );
      expect(sepolia).not.toBe(amoy);
    });

    it('should produce different separators for different contracts', () => {
      const contract1 = computeDomainSeparator(
        'GaslessForwarder',
        '1',
        11155111,
        '0x0000000000000000000000000000000000000001'
      );
      const contract2 = computeDomainSeparator(
        'GaslessForwarder',
        '1',
        11155111,
        '0x0000000000000000000000000000000000000002'
      );
      expect(contract1).not.toBe(contract2);
    });

    it('should produce consistent results', () => {
      const hash1 = computeDomainSeparator('Test', '1', 1, '0x' + '0'.repeat(40));
      const hash2 = computeDomainSeparator('Test', '1', 1, '0x' + '0'.repeat(40));
      expect(hash1).toBe(hash2);
    });
  });
});

describe('Forward Request Hashing', () => {
  const mockRequest: ForwardRequest = {
    from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9',
    to: '0x1234567890123456789012345678901234567890',
    value: '0',
    gas: '100000',
    nonce: '0',
    deadline: '1735689600', // Future timestamp
    data: '0x12345678'
  };

  describe('computeForwardRequestHash', () => {
    it('should compute hash for valid request', () => {
      const hash = computeForwardRequestHash(mockRequest);
      expect(hash).toMatch(/^0x[a-f0-9]{64}$/);
    });

    it('should produce different hashes for different from addresses', () => {
      const request1 = { ...mockRequest };
      const request2 = { 
        ...mockRequest, 
        from: '0x0000000000000000000000000000000000000001' 
      };
      const hash1 = computeForwardRequestHash(request1);
      const hash2 = computeForwardRequestHash(request2);
      expect(hash1).not.toBe(hash2);
    });

    it('should produce different hashes for different nonces', () => {
      const request1 = { ...mockRequest, nonce: '0' };
      const request2 = { ...mockRequest, nonce: '1' };
      const hash1 = computeForwardRequestHash(request1);
      const hash2 = computeForwardRequestHash(request2);
      expect(hash1).not.toBe(hash2);
    });

    it('should produce different hashes for different data', () => {
      const request1 = { ...mockRequest, data: '0x12345678' };
      const request2 = { ...mockRequest, data: '0x87654321' };
      const hash1 = computeForwardRequestHash(request1);
      const hash2 = computeForwardRequestHash(request2);
      expect(hash1).not.toBe(hash2);
    });
  });
});

describe('Typed Data Hashing', () => {
  describe('hashTypedData', () => {
    it('should combine domain separator and struct hash with EIP-712 prefix', () => {
      const domainSeparator = '0x' + 'a'.repeat(64);
      const structHash = '0x' + 'b'.repeat(64);
      const result = hashTypedData(domainSeparator, structHash);
      expect(result).toMatch(/^0x[a-f0-9]{64}$/);
    });

    it('should produce different hashes for different inputs', () => {
      const domain1 = '0x' + 'a'.repeat(64);
      const domain2 = '0x' + 'b'.repeat(64);
      const struct = '0x' + 'c'.repeat(64);
      
      const hash1 = hashTypedData(domain1, struct);
      const hash2 = hashTypedData(domain2, struct);
      expect(hash1).not.toBe(hash2);
    });
  });
});

describe('Request Validation', () => {
  const validRequest: ForwardRequest = {
    from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9',
    to: '0x1234567890123456789012345678901234567890',
    value: '0',
    gas: '100000',
    nonce: '0',
    deadline: String(Math.floor(Date.now() / 1000) + 3600), // 1 hour from now
    data: '0x12345678'
  };

  describe('validateRequest', () => {
    it('should accept valid request for supported chain', () => {
      const result = validateRequest(validRequest, 11155111); // Sepolia
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject unsupported chain', () => {
      const result = validateRequest(validRequest, 99999);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not supported');
    });

    it('should reject invalid from address', () => {
      const request = { ...validRequest, from: 'invalid' };
      const result = validateRequest(request, 11155111);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('from address');
    });

    it('should reject from address with wrong length', () => {
      const request = { ...validRequest, from: '0x1234' };
      const result = validateRequest(request, 11155111);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('from address');
    });

    it('should reject invalid to address', () => {
      const request = { ...validRequest, to: '0xnotvalid' };
      const result = validateRequest(request, 11155111);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('to address');
    });

    it('should reject expired deadline', () => {
      const request = { 
        ...validRequest, 
        deadline: String(Math.floor(Date.now() / 1000) - 3600) // 1 hour ago
      };
      const result = validateRequest(request, 11155111);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should reject zero gas limit', () => {
      const request = { ...validRequest, gas: '0' };
      const result = validateRequest(request, 11155111);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('gas limit');
    });

    it('should reject excessive gas limit', () => {
      const request = { ...validRequest, gas: '100000000' };
      const result = validateRequest(request, 11155111);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('gas limit');
    });

    it('should reject invalid data format', () => {
      const request = { ...validRequest, data: 'not-hex' };
      const result = validateRequest(request, 11155111);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('data format');
    });

    it('should accept empty data (0x)', () => {
      const request = { ...validRequest, data: '0x' };
      const result = validateRequest(request, 11155111);
      expect(result.valid).toBe(true);
    });

    it('should validate all supported chains', () => {
      const supportedChains = [11155111, 80002, 421614]; // Sepolia, Amoy, Arbitrum Sepolia
      for (const chainId of supportedChains) {
        const result = validateRequest(validRequest, chainId);
        expect(result.valid).toBe(true);
      }
    });
  });
});

describe('Transaction ID Generation', () => {
  describe('generateTransactionId', () => {
    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateTransactionId());
      }
      expect(ids.size).toBe(100);
    });

    it('should start with tx_ prefix', () => {
      const id = generateTransactionId();
      expect(id.startsWith('tx_')).toBe(true);
    });

    it('should contain timestamp and random components', () => {
      const id = generateTransactionId();
      const parts = id.split('_');
      expect(parts.length).toBe(3);
      expect(parts[0]).toBe('tx');
    });

    it('should be valid alphanumeric with underscores', () => {
      const id = generateTransactionId();
      expect(id).toMatch(/^tx_[a-z0-9]+_[a-z0-9]+$/);
    });
  });
});

describe('Type Constants', () => {
  describe('CHAIN_CONFIGS', () => {
    it('should contain Sepolia testnet', () => {
      expect(CHAIN_CONFIGS[11155111]).toBeDefined();
      expect(CHAIN_CONFIGS[11155111].name).toBe('Sepolia');
    });

    it('should contain Polygon Amoy testnet', () => {
      expect(CHAIN_CONFIGS[80002]).toBeDefined();
      expect(CHAIN_CONFIGS[80002].name).toBe('Polygon Amoy');
    });

    it('should contain Arbitrum Sepolia testnet', () => {
      expect(CHAIN_CONFIGS[421614]).toBeDefined();
      expect(CHAIN_CONFIGS[421614].name).toBe('Arbitrum Sepolia');
    });

    it('should have valid RPC URLs for all chains', () => {
      for (const config of Object.values(CHAIN_CONFIGS)) {
        expect(config.rpcUrl).toMatch(/^https?:\/\//);
      }
    });

    it('should have explorer URLs for all chains', () => {
      for (const config of Object.values(CHAIN_CONFIGS)) {
        expect(config.explorerUrl).toMatch(/^https?:\/\//);
      }
    });
  });

  describe('FORWARDER_DOMAIN', () => {
    it('should have correct name', () => {
      expect(FORWARDER_DOMAIN.name).toBe('GaslessForwarder');
    });

    it('should have version 1', () => {
      expect(FORWARDER_DOMAIN.version).toBe('1');
    });
  });
});
