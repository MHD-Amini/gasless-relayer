// Gasless Transaction Relayer Service
// EIP-2771 Meta-Transaction Infrastructure
// Built with Hono + Cloudflare Workers

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { Env } from './types';
import relayRoutes from './routes/relay';
import adminRoutes from './routes/admin';

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());
app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 86400
}));

// API Routes
app.route('/api/relay', relayRoutes);
app.route('/api/admin', adminRoutes);

// Health endpoint
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: Date.now() });
});

// Dashboard HTML
app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gasless Relayer - EIP-2771 Meta-Transaction Service</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        @keyframes pulse-dot {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .animate-pulse-dot { animation: pulse-dot 2s ease-in-out infinite; }
        .gradient-bg { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .glass { background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); }
        .status-pending { color: #fbbf24; }
        .status-confirmed { color: #34d399; }
        .status-failed { color: #f87171; }
        .status-queued { color: #60a5fa; }
        code { font-family: 'Monaco', 'Menlo', monospace; }
        .tab-active { border-bottom: 2px solid #8b5cf6; color: #8b5cf6; }
    </style>
</head>
<body class="bg-gray-900 text-gray-100 min-h-screen">
    <!-- Header -->
    <header class="gradient-bg py-6 shadow-lg">
        <div class="max-w-7xl mx-auto px-4">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <div class="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                        <i class="fas fa-gas-pump text-2xl text-purple-600"></i>
                    </div>
                    <div>
                        <h1 class="text-2xl font-bold">Gasless Relayer</h1>
                        <p class="text-purple-200 text-sm">EIP-2771 Meta-Transaction Service</p>
                    </div>
                </div>
                <div class="flex items-center space-x-4">
                    <div id="health-indicator" class="flex items-center space-x-2 bg-white/10 px-4 py-2 rounded-lg">
                        <span class="w-3 h-3 bg-green-400 rounded-full animate-pulse-dot"></span>
                        <span class="text-sm">System Healthy</span>
                    </div>
                    <button onclick="connectWallet()" id="wallet-btn" class="bg-white text-purple-600 px-4 py-2 rounded-lg font-semibold hover:bg-purple-50 transition">
                        <i class="fas fa-wallet mr-2"></i>Connect Wallet
                    </button>
                </div>
            </div>
        </div>
    </header>

    <!-- Navigation Tabs -->
    <nav class="bg-gray-800 border-b border-gray-700">
        <div class="max-w-7xl mx-auto px-4">
            <div class="flex space-x-8">
                <button onclick="showTab('dashboard')" id="tab-dashboard" class="py-4 px-2 text-sm font-medium tab-active">
                    <i class="fas fa-chart-line mr-2"></i>Dashboard
                </button>
                <button onclick="showTab('submit')" id="tab-submit" class="py-4 px-2 text-sm font-medium text-gray-400 hover:text-white">
                    <i class="fas fa-paper-plane mr-2"></i>Submit Transaction
                </button>
                <button onclick="showTab('history')" id="tab-history" class="py-4 px-2 text-sm font-medium text-gray-400 hover:text-white">
                    <i class="fas fa-history mr-2"></i>History
                </button>
                <button onclick="showTab('docs')" id="tab-docs" class="py-4 px-2 text-sm font-medium text-gray-400 hover:text-white">
                    <i class="fas fa-book mr-2"></i>API Docs
                </button>
                <button onclick="showTab('contracts')" id="tab-contracts" class="py-4 px-2 text-sm font-medium text-gray-400 hover:text-white">
                    <i class="fas fa-file-contract mr-2"></i>Contracts
                </button>
            </div>
        </div>
    </nav>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 py-8">
        <!-- Dashboard Tab -->
        <div id="content-dashboard" class="tab-content">
            <!-- Stats Cards -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-400 text-sm">Total Transactions</p>
                            <p id="stat-total" class="text-3xl font-bold mt-1">-</p>
                        </div>
                        <div class="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                            <i class="fas fa-exchange-alt text-purple-400 text-xl"></i>
                        </div>
                    </div>
                </div>
                <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-400 text-sm">Active Users</p>
                            <p id="stat-users" class="text-3xl font-bold mt-1">-</p>
                        </div>
                        <div class="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                            <i class="fas fa-users text-blue-400 text-xl"></i>
                        </div>
                    </div>
                </div>
                <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-400 text-sm">Gas Relayed</p>
                            <p id="stat-gas" class="text-3xl font-bold mt-1">-</p>
                        </div>
                        <div class="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                            <i class="fas fa-gas-pump text-green-400 text-xl"></i>
                        </div>
                    </div>
                </div>
                <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-400 text-sm">Circuit Breaker</p>
                            <p id="stat-circuit" class="text-xl font-bold mt-1 text-green-400">Closed</p>
                        </div>
                        <div class="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                            <i class="fas fa-shield-alt text-yellow-400 text-xl"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Charts and Activity -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <!-- Chain Distribution -->
                <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 class="text-lg font-semibold mb-4">
                        <i class="fas fa-link mr-2 text-purple-400"></i>Chain Distribution
                    </h3>
                    <canvas id="chainChart" height="200"></canvas>
                </div>

                <!-- Status Distribution -->
                <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 class="text-lg font-semibold mb-4">
                        <i class="fas fa-chart-pie mr-2 text-purple-400"></i>Transaction Status
                    </h3>
                    <canvas id="statusChart" height="200"></canvas>
                </div>
            </div>

            <!-- Recent Activity -->
            <div class="mt-8 bg-gray-800 rounded-xl border border-gray-700">
                <div class="p-6 border-b border-gray-700">
                    <h3 class="text-lg font-semibold">
                        <i class="fas fa-stream mr-2 text-purple-400"></i>Recent Activity
                    </h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-900">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">ID</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">User</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Chain</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">To</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Time</th>
                            </tr>
                        </thead>
                        <tbody id="activity-table" class="divide-y divide-gray-700">
                            <tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Submit Transaction Tab -->
        <div id="content-submit" class="tab-content hidden">
            <div class="max-w-2xl mx-auto">
                <div class="bg-gray-800 rounded-xl border border-gray-700 p-8">
                    <h2 class="text-2xl font-bold mb-6">
                        <i class="fas fa-paper-plane mr-3 text-purple-400"></i>Submit Meta-Transaction
                    </h2>
                    
                    <div class="space-y-6">
                        <!-- Chain Selection -->
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Chain</label>
                            <select id="chain-select" class="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                                <option value="11155111">Sepolia Testnet</option>
                                <option value="80002">Polygon Amoy Testnet</option>
                                <option value="421614">Arbitrum Sepolia Testnet</option>
                            </select>
                        </div>

                        <!-- To Address -->
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">To Address</label>
                            <input type="text" id="to-address" placeholder="0x..." 
                                class="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                        </div>

                        <!-- Data -->
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Data (hex)</label>
                            <textarea id="tx-data" rows="3" placeholder="0x..."
                                class="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"></textarea>
                        </div>

                        <!-- Gas Limit -->
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Gas Limit</label>
                            <input type="number" id="gas-limit" value="100000"
                                class="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                        </div>

                        <!-- Deadline -->
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Deadline (minutes from now)</label>
                            <input type="number" id="deadline-minutes" value="30"
                                class="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                        </div>

                        <!-- User Info -->
                        <div class="bg-gray-900 rounded-lg p-4">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-gray-400">Your Address:</span>
                                <span id="user-address" class="font-mono text-sm">Not connected</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-gray-400">Current Nonce:</span>
                                <span id="user-nonce" class="font-mono">-</span>
                            </div>
                        </div>

                        <!-- Actions -->
                        <div class="flex space-x-4">
                            <button onclick="simulateTransaction()" class="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold transition">
                                <i class="fas fa-flask mr-2"></i>Simulate
                            </button>
                            <button onclick="submitTransaction()" class="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold transition">
                                <i class="fas fa-paper-plane mr-2"></i>Submit
                            </button>
                        </div>

                        <!-- Result -->
                        <div id="submit-result" class="hidden bg-gray-900 rounded-lg p-4">
                            <pre class="text-sm overflow-x-auto"></pre>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- History Tab -->
        <div id="content-history" class="tab-content hidden">
            <div class="bg-gray-800 rounded-xl border border-gray-700">
                <div class="p-6 border-b border-gray-700 flex items-center justify-between">
                    <h3 class="text-lg font-semibold">
                        <i class="fas fa-history mr-2 text-purple-400"></i>Transaction History
                    </h3>
                    <button onclick="loadHistory()" class="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm">
                        <i class="fas fa-sync mr-2"></i>Refresh
                    </button>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-900">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">ID</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Chain</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">To</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Gas Used</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Tx Hash</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Time</th>
                            </tr>
                        </thead>
                        <tbody id="history-table" class="divide-y divide-gray-700">
                            <tr><td colspan="7" class="px-6 py-4 text-center text-gray-500">Connect wallet to view history</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- API Docs Tab -->
        <div id="content-docs" class="tab-content hidden">
            <div class="space-y-8">
                <div class="bg-gray-800 rounded-xl border border-gray-700 p-8">
                    <h2 class="text-2xl font-bold mb-6">
                        <i class="fas fa-book mr-3 text-purple-400"></i>API Documentation
                    </h2>
                    
                    <div class="space-y-8">
                        <!-- Submit Endpoint -->
                        <div class="border border-gray-700 rounded-lg overflow-hidden">
                            <div class="bg-gray-900 px-4 py-3 flex items-center space-x-3">
                                <span class="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">POST</span>
                                <code class="text-purple-400">/api/relay/submit</code>
                            </div>
                            <div class="p-4">
                                <p class="text-gray-300 mb-4">Submit a signed meta-transaction for relay.</p>
                                <h4 class="font-semibold mb-2">Request Body:</h4>
                                <pre class="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm"><code>{
  "chainId": 11155111,
  "request": {
    "from": "0xUserAddress...",
    "to": "0xContractAddress...",
    "value": "0",
    "gas": "100000",
    "nonce": "0",
    "deadline": "1735000000",
    "data": "0xFunctionData..."
  },
  "signature": "0x..."
}</code></pre>
                            </div>
                        </div>

                        <!-- Status Endpoint -->
                        <div class="border border-gray-700 rounded-lg overflow-hidden">
                            <div class="bg-gray-900 px-4 py-3 flex items-center space-x-3">
                                <span class="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded">GET</span>
                                <code class="text-purple-400">/api/relay/status/:id</code>
                            </div>
                            <div class="p-4">
                                <p class="text-gray-300">Get the status of a submitted transaction.</p>
                            </div>
                        </div>

                        <!-- Nonce Endpoint -->
                        <div class="border border-gray-700 rounded-lg overflow-hidden">
                            <div class="bg-gray-900 px-4 py-3 flex items-center space-x-3">
                                <span class="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded">GET</span>
                                <code class="text-purple-400">/api/relay/nonce/:address/:chainId</code>
                            </div>
                            <div class="p-4">
                                <p class="text-gray-300">Get the next available nonce for a user on a specific chain.</p>
                            </div>
                        </div>

                        <!-- Chains Endpoint -->
                        <div class="border border-gray-700 rounded-lg overflow-hidden">
                            <div class="bg-gray-900 px-4 py-3 flex items-center space-x-3">
                                <span class="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded">GET</span>
                                <code class="text-purple-400">/api/relay/chains</code>
                            </div>
                            <div class="p-4">
                                <p class="text-gray-300">Get list of supported chains and their configurations.</p>
                            </div>
                        </div>

                        <!-- Typed Data Endpoint -->
                        <div class="border border-gray-700 rounded-lg overflow-hidden">
                            <div class="bg-gray-900 px-4 py-3 flex items-center space-x-3">
                                <span class="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">POST</span>
                                <code class="text-purple-400">/api/relay/typed-data</code>
                            </div>
                            <div class="p-4">
                                <p class="text-gray-300">Generate EIP-712 typed data structure for signing.</p>
                            </div>
                        </div>

                        <!-- Admin Stats Endpoint -->
                        <div class="border border-gray-700 rounded-lg overflow-hidden">
                            <div class="bg-gray-900 px-4 py-3 flex items-center space-x-3">
                                <span class="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded">GET</span>
                                <code class="text-purple-400">/api/admin/stats</code>
                            </div>
                            <div class="p-4">
                                <p class="text-gray-300">Get overall relayer statistics and metrics.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- EIP-2771 Flow -->
                <div class="bg-gray-800 rounded-xl border border-gray-700 p-8">
                    <h3 class="text-xl font-bold mb-6">
                        <i class="fas fa-project-diagram mr-3 text-purple-400"></i>EIP-2771 Flow
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div class="text-center">
                            <div class="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                <i class="fas fa-user text-2xl text-purple-400"></i>
                            </div>
                            <h4 class="font-semibold mb-1">1. User Signs</h4>
                            <p class="text-sm text-gray-400">Signs EIP-712 message off-chain</p>
                        </div>
                        <div class="text-center">
                            <div class="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                <i class="fas fa-server text-2xl text-blue-400"></i>
                            </div>
                            <h4 class="font-semibold mb-1">2. Relayer Receives</h4>
                            <p class="text-sm text-gray-400">Validates & submits on-chain</p>
                        </div>
                        <div class="text-center">
                            <div class="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                <i class="fas fa-check-double text-2xl text-green-400"></i>
                            </div>
                            <h4 class="font-semibold mb-1">3. Forwarder Verifies</h4>
                            <p class="text-sm text-gray-400">Checks signature & nonce</p>
                        </div>
                        <div class="text-center">
                            <div class="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                <i class="fas fa-cog text-2xl text-yellow-400"></i>
                            </div>
                            <h4 class="font-semibold mb-1">4. Contract Executes</h4>
                            <p class="text-sm text-gray-400">Runs with original sender</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Smart Contracts Tab -->
        <div id="content-contracts" class="tab-content hidden">
            <div class="space-y-8">
                <!-- Forwarder Contract -->
                <div class="bg-gray-800 rounded-xl border border-gray-700 p-8">
                    <h2 class="text-2xl font-bold mb-6">
                        <i class="fas fa-file-contract mr-3 text-purple-400"></i>Trusted Forwarder Contract
                    </h2>
                    <p class="text-gray-300 mb-4">
                        The Trusted Forwarder contract verifies signatures and forwards calls to recipient contracts.
                        It follows the EIP-2771 standard for meta-transactions.
                    </p>
                    <pre class="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm"><code class="language-solidity">// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/metatx/MinimalForwarder.sol";

contract GaslessForwarder is MinimalForwarder {
    constructor() MinimalForwarder() {}
}</code></pre>
                </div>

                <!-- Recipient Contract -->
                <div class="bg-gray-800 rounded-xl border border-gray-700 p-8">
                    <h2 class="text-xl font-bold mb-6">
                        <i class="fas fa-cube mr-3 text-purple-400"></i>ERC2771 Recipient Contract
                    </h2>
                    <p class="text-gray-300 mb-4">
                        Your dApp contracts should inherit from ERC2771Context to recognize the trusted forwarder
                        and extract the original sender address.
                    </p>
                    <pre class="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm"><code class="language-solidity">// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/metatx/ERC2771Context.sol";

contract MyGaslessApp is ERC2771Context {
    mapping(address => uint256) public balances;
    
    event Transfer(address indexed from, address indexed to, uint256 amount);
    
    constructor(address trustedForwarder) 
        ERC2771Context(trustedForwarder) 
    {}
    
    function transfer(address to, uint256 amount) external {
        // _msgSender() returns the ORIGINAL user, not the relayer!
        address sender = _msgSender();
        require(balances[sender] >= amount, "Insufficient balance");
        
        balances[sender] -= amount;
        balances[to] += amount;
        
        emit Transfer(sender, to, amount);
    }
    
    function mint(uint256 amount) external {
        balances[_msgSender()] += amount;
    }
}</code></pre>
                </div>

                <!-- Deployment Guide -->
                <div class="bg-gray-800 rounded-xl border border-gray-700 p-8">
                    <h2 class="text-xl font-bold mb-6">
                        <i class="fas fa-rocket mr-3 text-purple-400"></i>Deployment Guide
                    </h2>
                    <ol class="list-decimal list-inside space-y-3 text-gray-300">
                        <li>Deploy the GaslessForwarder contract to your target chain</li>
                        <li>Copy the forwarder address</li>
                        <li>Deploy your ERC2771Context contract with the forwarder address</li>
                        <li>Update the CHAIN_CONFIGS in the relayer with your forwarder address</li>
                        <li>Add your recipient contract to the whitelist (optional but recommended)</li>
                    </ol>
                    <div class="mt-6 bg-gray-900 rounded-lg p-4">
                        <h4 class="font-semibold mb-2">Quick Deploy with Hardhat:</h4>
                        <pre class="text-sm overflow-x-auto"><code>npx hardhat run scripts/deploy.js --network sepolia</code></pre>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <!-- Footer -->
    <footer class="bg-gray-800 border-t border-gray-700 py-6 mt-12">
        <div class="max-w-7xl mx-auto px-4">
            <div class="flex items-center justify-between">
                <p class="text-gray-400 text-sm">
                    <i class="fas fa-code mr-2"></i>
                    Gasless Relayer - EIP-2771 Meta-Transaction Service
                </p>
                <div class="flex items-center space-x-4 text-gray-400 text-sm">
                    <span><i class="fas fa-shield-alt mr-1"></i> Secure</span>
                    <span><i class="fas fa-bolt mr-1"></i> Fast</span>
                    <span><i class="fas fa-link mr-1"></i> Multi-Chain</span>
                </div>
            </div>
        </div>
    </footer>

    <script>
        // Global state
        let userAddress = null;
        let chainChart = null;
        let statusChart = null;

        // Chain configs
        const CHAINS = {
            11155111: { name: 'Sepolia', explorer: 'https://sepolia.etherscan.io' },
            80002: { name: 'Polygon Amoy', explorer: 'https://www.oklink.com/amoy' },
            421614: { name: 'Arbitrum Sepolia', explorer: 'https://sepolia.arbiscan.io' }
        };

        // Tab navigation
        function showTab(tabName) {
            // Hide all content
            document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
            // Remove active from all tabs
            document.querySelectorAll('[id^="tab-"]').forEach(el => {
                el.classList.remove('tab-active');
                el.classList.add('text-gray-400');
            });
            // Show selected content
            document.getElementById('content-' + tabName).classList.remove('hidden');
            // Activate selected tab
            const tab = document.getElementById('tab-' + tabName);
            tab.classList.add('tab-active');
            tab.classList.remove('text-gray-400');
        }

        // Connect wallet
        async function connectWallet() {
            if (typeof window.ethereum === 'undefined') {
                alert('Please install MetaMask or another Web3 wallet!');
                return;
            }

            try {
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                userAddress = accounts[0];
                
                // Update UI
                document.getElementById('wallet-btn').innerHTML = 
                    '<i class="fas fa-check-circle mr-2"></i>' + 
                    userAddress.slice(0, 6) + '...' + userAddress.slice(-4);
                document.getElementById('wallet-btn').classList.remove('bg-white', 'text-purple-600');
                document.getElementById('wallet-btn').classList.add('bg-green-500', 'text-white');
                
                document.getElementById('user-address').textContent = userAddress;
                
                // Load nonce
                await loadUserNonce();
                
                // Load history
                await loadHistory();
                
            } catch (error) {
                console.error('Wallet connection failed:', error);
                alert('Failed to connect wallet: ' + error.message);
            }
        }

        // Load user nonce
        async function loadUserNonce() {
            if (!userAddress) return;
            
            const chainId = document.getElementById('chain-select').value;
            try {
                const response = await fetch('/api/relay/nonce/' + userAddress + '/' + chainId);
                const data = await response.json();
                if (data.success) {
                    document.getElementById('user-nonce').textContent = data.data.nonce;
                }
            } catch (error) {
                console.error('Failed to load nonce:', error);
            }
        }

        // Load stats
        async function loadStats() {
            try {
                const response = await fetch('/api/admin/stats');
                const data = await response.json();
                
                if (data.success) {
                    const stats = data.data;
                    document.getElementById('stat-total').textContent = stats.overview.totalTransactions.toLocaleString();
                    document.getElementById('stat-users').textContent = stats.overview.totalUsers.toLocaleString();
                    document.getElementById('stat-gas').textContent = formatGas(stats.overview.totalGasRelayed);
                    
                    // Circuit breaker
                    const circuitEl = document.getElementById('stat-circuit');
                    if (stats.circuitBreaker.isOpen) {
                        circuitEl.textContent = 'OPEN';
                        circuitEl.classList.remove('text-green-400');
                        circuitEl.classList.add('text-red-400');
                    } else {
                        circuitEl.textContent = 'Closed';
                        circuitEl.classList.remove('text-red-400');
                        circuitEl.classList.add('text-green-400');
                    }
                    
                    // Update charts
                    updateCharts(stats);
                }
            } catch (error) {
                console.error('Failed to load stats:', error);
            }
        }

        // Update charts
        function updateCharts(stats) {
            // Chain distribution chart
            const chainLabels = Object.keys(stats.byChain);
            const chainData = Object.values(stats.byChain);
            
            if (chainChart) {
                chainChart.data.labels = chainLabels;
                chainChart.data.datasets[0].data = chainData;
                chainChart.update();
            } else {
                const ctx1 = document.getElementById('chainChart').getContext('2d');
                chainChart = new Chart(ctx1, {
                    type: 'bar',
                    data: {
                        labels: chainLabels.length ? chainLabels : ['No data'],
                        datasets: [{
                            label: 'Transactions',
                            data: chainData.length ? chainData : [0],
                            backgroundColor: ['#8b5cf6', '#3b82f6', '#10b981'],
                            borderRadius: 8
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' } },
                            x: { grid: { display: false } }
                        }
                    }
                });
            }

            // Status distribution chart
            const statusLabels = Object.keys(stats.byStatus);
            const statusData = Object.values(stats.byStatus);
            
            if (statusChart) {
                statusChart.data.labels = statusLabels;
                statusChart.data.datasets[0].data = statusData;
                statusChart.update();
            } else {
                const ctx2 = document.getElementById('statusChart').getContext('2d');
                statusChart = new Chart(ctx2, {
                    type: 'doughnut',
                    data: {
                        labels: statusLabels.length ? statusLabels : ['No data'],
                        datasets: [{
                            data: statusData.length ? statusData : [1],
                            backgroundColor: ['#fbbf24', '#34d399', '#f87171', '#60a5fa', '#a78bfa'],
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { position: 'right', labels: { color: '#9ca3af' } }
                        }
                    }
                });
            }
        }

        // Load recent activity
        async function loadActivity() {
            try {
                const response = await fetch('/api/admin/activity?limit=10');
                const data = await response.json();
                
                if (data.success && data.data.activity.length > 0) {
                    const tbody = document.getElementById('activity-table');
                    tbody.innerHTML = data.data.activity.map(tx => {
                        const chain = CHAINS[tx.chainId] || { name: 'Unknown', explorer: '#' };
                        return \`
                            <tr class="hover:bg-gray-700/50">
                                <td class="px-6 py-4 font-mono text-sm text-purple-400">\${tx.id.slice(0, 12)}...</td>
                                <td class="px-6 py-4 font-mono text-sm">\${tx.user}</td>
                                <td class="px-6 py-4">\${chain.name}</td>
                                <td class="px-6 py-4 font-mono text-sm">\${tx.to}</td>
                                <td class="px-6 py-4">
                                    <span class="status-\${tx.status} font-semibold capitalize">\${tx.status}</span>
                                </td>
                                <td class="px-6 py-4 text-sm text-gray-400">\${formatTime(tx.createdAt)}</td>
                            </tr>
                        \`;
                    }).join('');
                } else {
                    document.getElementById('activity-table').innerHTML = 
                        '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">No transactions yet</td></tr>';
                }
            } catch (error) {
                console.error('Failed to load activity:', error);
            }
        }

        // Load user history
        async function loadHistory() {
            if (!userAddress) {
                document.getElementById('history-table').innerHTML = 
                    '<tr><td colspan="7" class="px-6 py-4 text-center text-gray-500">Connect wallet to view history</td></tr>';
                return;
            }
            
            try {
                const response = await fetch('/api/relay/history/' + userAddress);
                const data = await response.json();
                
                if (data.success && data.data.transactions.length > 0) {
                    const tbody = document.getElementById('history-table');
                    tbody.innerHTML = data.data.transactions.map(tx => {
                        const chain = CHAINS[tx.chain_id] || { name: 'Unknown', explorer: '#' };
                        const txLink = tx.tx_hash ? 
                            \`<a href="\${chain.explorer}/tx/\${tx.tx_hash}" target="_blank" class="text-purple-400 hover:underline">\${tx.tx_hash.slice(0, 10)}...</a>\` : 
                            '-';
                        return \`
                            <tr class="hover:bg-gray-700/50">
                                <td class="px-6 py-4 font-mono text-sm text-purple-400">\${tx.id.slice(0, 12)}...</td>
                                <td class="px-6 py-4">\${chain.name}</td>
                                <td class="px-6 py-4 font-mono text-sm">\${tx.to_address.slice(0, 8)}...</td>
                                <td class="px-6 py-4">\${tx.gas_used || '-'}</td>
                                <td class="px-6 py-4">
                                    <span class="status-\${tx.status} font-semibold capitalize">\${tx.status}</span>
                                </td>
                                <td class="px-6 py-4">\${txLink}</td>
                                <td class="px-6 py-4 text-sm text-gray-400">\${formatTime(tx.created_at)}</td>
                            </tr>
                        \`;
                    }).join('');
                } else {
                    document.getElementById('history-table').innerHTML = 
                        '<tr><td colspan="7" class="px-6 py-4 text-center text-gray-500">No transactions found</td></tr>';
                }
            } catch (error) {
                console.error('Failed to load history:', error);
            }
        }

        // Simulate transaction
        async function simulateTransaction() {
            if (!userAddress) {
                alert('Please connect your wallet first');
                return;
            }
            
            const chainId = parseInt(document.getElementById('chain-select').value);
            const toAddress = document.getElementById('to-address').value;
            const data = document.getElementById('tx-data').value || '0x';
            const gasLimit = document.getElementById('gas-limit').value;
            const deadlineMinutes = parseInt(document.getElementById('deadline-minutes').value);
            
            if (!toAddress) {
                alert('Please enter a target address');
                return;
            }
            
            const deadline = Math.floor(Date.now() / 1000) + (deadlineMinutes * 60);
            const nonce = document.getElementById('user-nonce').textContent;
            
            const request = {
                from: userAddress,
                to: toAddress,
                value: '0',
                gas: gasLimit,
                nonce: nonce,
                deadline: deadline.toString(),
                data: data
            };
            
            try {
                const response = await fetch('/api/relay/simulate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chainId, request, signature: '0x' + '00'.repeat(65) })
                });
                
                const result = await response.json();
                showResult(result);
            } catch (error) {
                showResult({ success: false, error: error.message });
            }
        }

        // Submit transaction
        async function submitTransaction() {
            if (!userAddress) {
                alert('Please connect your wallet first');
                return;
            }
            
            if (typeof window.ethereum === 'undefined') {
                alert('MetaMask is required for signing');
                return;
            }
            
            const chainId = parseInt(document.getElementById('chain-select').value);
            const toAddress = document.getElementById('to-address').value;
            const data = document.getElementById('tx-data').value || '0x';
            const gasLimit = document.getElementById('gas-limit').value;
            const deadlineMinutes = parseInt(document.getElementById('deadline-minutes').value);
            
            if (!toAddress) {
                alert('Please enter a target address');
                return;
            }
            
            const deadline = Math.floor(Date.now() / 1000) + (deadlineMinutes * 60);
            const nonce = document.getElementById('user-nonce').textContent;
            
            const request = {
                from: userAddress,
                to: toAddress,
                value: '0',
                gas: gasLimit,
                nonce: nonce,
                deadline: deadline.toString(),
                data: data
            };
            
            try {
                // Get typed data from server
                const typedDataResponse = await fetch('/api/relay/typed-data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chainId, request })
                });
                const typedDataResult = await typedDataResponse.json();
                
                if (!typedDataResult.success) {
                    showResult(typedDataResult);
                    return;
                }
                
                const typedData = typedDataResult.data.typedData;
                
                // Sign with MetaMask
                const signature = await window.ethereum.request({
                    method: 'eth_signTypedData_v4',
                    params: [userAddress, JSON.stringify(typedData)]
                });
                
                // Submit to relayer
                const submitResponse = await fetch('/api/relay/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chainId, request, signature })
                });
                
                const result = await submitResponse.json();
                showResult(result);
                
                // Reload data
                await loadUserNonce();
                await loadActivity();
                
            } catch (error) {
                if (error.code === 4001) {
                    showResult({ success: false, error: 'User rejected the signature request' });
                } else {
                    showResult({ success: false, error: error.message });
                }
            }
        }

        // Show result
        function showResult(result) {
            const resultEl = document.getElementById('submit-result');
            resultEl.classList.remove('hidden');
            resultEl.querySelector('pre').textContent = JSON.stringify(result, null, 2);
            
            if (result.success) {
                resultEl.classList.remove('bg-red-900/30');
                resultEl.classList.add('bg-green-900/30');
            } else {
                resultEl.classList.remove('bg-green-900/30');
                resultEl.classList.add('bg-red-900/30');
            }
        }

        // Utility functions
        function formatGas(gas) {
            const num = parseInt(gas) || 0;
            if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
            if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
            return num.toString();
        }

        function formatTime(timestamp) {
            const date = new Date(timestamp);
            return date.toLocaleString();
        }

        // Chain selection change
        document.getElementById('chain-select').addEventListener('change', loadUserNonce);

        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            loadStats();
            loadActivity();
            
            // Auto-refresh every 30 seconds
            setInterval(() => {
                loadStats();
                loadActivity();
            }, 30000);
        });

        // Check if already connected
        if (typeof window.ethereum !== 'undefined') {
            window.ethereum.request({ method: 'eth_accounts' }).then(accounts => {
                if (accounts.length > 0) {
                    userAddress = accounts[0];
                    document.getElementById('wallet-btn').innerHTML = 
                        '<i class="fas fa-check-circle mr-2"></i>' + 
                        userAddress.slice(0, 6) + '...' + userAddress.slice(-4);
                    document.getElementById('wallet-btn').classList.remove('bg-white', 'text-purple-600');
                    document.getElementById('wallet-btn').classList.add('bg-green-500', 'text-white');
                    document.getElementById('user-address').textContent = userAddress;
                    loadUserNonce();
                }
            });
        }
    </script>
</body>
</html>`);
});

export default app;
