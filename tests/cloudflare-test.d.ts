/**
 * Type declarations for Cloudflare Workers Test Environment
 * 
 * Provides type definitions for the cloudflare:test module
 * used in integration tests with @cloudflare/vitest-pool-workers.
 */

declare module 'cloudflare:test' {
  import { Env } from '../src/types';
  
  export const env: Env;
  
  export const SELF: {
    fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
  };
  
  export function createExecutionContext(): ExecutionContext;
  export function waitOnExecutionContext(ctx: ExecutionContext): Promise<void>;
}
