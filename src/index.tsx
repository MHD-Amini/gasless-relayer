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

// Dashboard HTML - Light Theme
app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gasless Relayer - EIP-2771 Meta-Transaction Service</title>
    <meta name="description" content="Production-ready EIP-2771 compliant meta-transaction relayer service. Enable gasless transactions for your dApp users.">
    <meta name="keywords" content="EIP-2771, meta-transactions, gasless, ethereum, web3, blockchain, relayer">
    <meta name="author" content="MHD Amini">
    
    <!-- Open Graph / Social Media -->
    <meta property="og:type" content="website">
    <meta property="og:title" content="Gasless Relayer - EIP-2771 Meta-Transaction Service">
    <meta property="og:description" content="Production-ready meta-transaction relayer for gasless blockchain interactions">
    
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        @keyframes pulse-dot {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
        }
        @keyframes gradient-shift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
        .animate-pulse-dot { animation: pulse-dot 2s ease-in-out infinite; }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .gradient-bg { 
            background: linear-gradient(-45deg, #667eea, #764ba2, #6B8DD6, #8E37D7);
            background-size: 400% 400%;
            animation: gradient-shift 15s ease infinite;
        }
        .glass { 
            background: rgba(255, 255, 255, 0.95); 
            backdrop-filter: blur(20px); 
            border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .glass-card {
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(229, 231, 235, 0.8);
        }
        .status-pending { color: #f59e0b; }
        .status-confirmed { color: #10b981; }
        .status-failed { color: #ef4444; }
        .status-queued { color: #3b82f6; }
        .status-submitted { color: #8b5cf6; }
        code { font-family: 'SF Mono', 'Monaco', 'Menlo', monospace; }
        .tab-active { 
            border-bottom: 3px solid #7c3aed; 
            color: #7c3aed;
            font-weight: 600;
        }
        .card-hover {
            transition: all 0.3s ease;
        }
        .card-hover:hover {
            transform: translateY(-4px);
            box-shadow: 0 20px 40px -15px rgba(124, 58, 237, 0.2);
        }
        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            transition: all 0.3s ease;
        }
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px -5px rgba(124, 58, 237, 0.4);
        }
        .stat-icon {
            background: linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
        }
        /* Custom scrollbar */
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        /* Table styles */
        .table-row-hover:hover { background: rgba(124, 58, 237, 0.04); }
    </style>
</head>
<body class="bg-gradient-to-br from-slate-50 via-white to-purple-50 text-gray-800 min-h-screen">
    <!-- Header -->
    <header class="gradient-bg py-5 shadow-lg sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <div class="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg animate-float">
                        <i class="fas fa-gas-pump text-2xl bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent"></i>
                    </div>
                    <div>
                        <h1 class="text-2xl font-bold text-white tracking-tight">Gasless Relayer</h1>
                        <p class="text-purple-100 text-sm font-medium">EIP-2771 Meta-Transaction Service</p>
                    </div>
                </div>
                <div class="flex items-center space-x-4">
                    <div id="health-indicator" class="hidden sm:flex items-center space-x-2 bg-white/20 px-4 py-2 rounded-lg backdrop-blur-sm">
                        <span class="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse-dot shadow-lg shadow-emerald-400/50"></span>
                        <span class="text-sm text-white font-medium">System Healthy</span>
                    </div>
                    <button onclick="connectWallet()" id="wallet-btn" class="bg-white text-purple-600 px-5 py-2.5 rounded-xl font-semibold hover:bg-purple-50 transition shadow-lg hover:shadow-xl">
                        <i class="fas fa-wallet mr-2"></i><span class="hidden sm:inline">Connect</span> Wallet
                    </button>
                </div>
            </div>
        </div>
    </header>

    <!-- Navigation Tabs -->
    <nav class="bg-white border-b border-gray-100 shadow-sm sticky top-[76px] z-40">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex space-x-1 sm:space-x-6 overflow-x-auto scrollbar-hide">
                <button onclick="showTab('dashboard')" id="tab-dashboard" class="py-4 px-3 text-sm font-medium tab-active whitespace-nowrap transition-all">
                    <i class="fas fa-chart-line mr-2"></i><span class="hidden sm:inline">Dashboard</span>
                </button>
                <button onclick="showTab('submit')" id="tab-submit" class="py-4 px-3 text-sm font-medium text-gray-500 hover:text-purple-600 whitespace-nowrap transition-all">
                    <i class="fas fa-paper-plane mr-2"></i><span class="hidden sm:inline">Submit</span> Tx
                </button>
                <button onclick="showTab('history')" id="tab-history" class="py-4 px-3 text-sm font-medium text-gray-500 hover:text-purple-600 whitespace-nowrap transition-all">
                    <i class="fas fa-history mr-2"></i><span class="hidden sm:inline">History</span>
                </button>
                <button onclick="showTab('docs')" id="tab-docs" class="py-4 px-3 text-sm font-medium text-gray-500 hover:text-purple-600 whitespace-nowrap transition-all">
                    <i class="fas fa-book mr-2"></i><span class="hidden sm:inline">API</span> Docs
                </button>
                <button onclick="showTab('contracts')" id="tab-contracts" class="py-4 px-3 text-sm font-medium text-gray-500 hover:text-purple-600 whitespace-nowrap transition-all">
                    <i class="fas fa-file-contract mr-2"></i><span class="hidden sm:inline">Contracts</span>
                </button>
            </div>
        </div>
    </nav>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Dashboard Tab -->
        <div id="content-dashboard" class="tab-content">
            <!-- Stats Cards -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                <div class="glass-card rounded-2xl p-5 sm:p-6 card-hover">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-500 text-xs sm:text-sm font-medium uppercase tracking-wide">Total Transactions</p>
                            <p id="stat-total" class="text-2xl sm:text-3xl font-bold mt-1 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">-</p>
                        </div>
                        <div class="w-12 h-12 stat-icon rounded-xl flex items-center justify-center">
                            <i class="fas fa-exchange-alt text-purple-500 text-xl"></i>
                        </div>
                    </div>
                </div>
                <div class="glass-card rounded-2xl p-5 sm:p-6 card-hover">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-500 text-xs sm:text-sm font-medium uppercase tracking-wide">Active Users</p>
                            <p id="stat-users" class="text-2xl sm:text-3xl font-bold mt-1 bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">-</p>
                        </div>
                        <div class="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                            <i class="fas fa-users text-blue-500 text-xl"></i>
                        </div>
                    </div>
                </div>
                <div class="glass-card rounded-2xl p-5 sm:p-6 card-hover">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-500 text-xs sm:text-sm font-medium uppercase tracking-wide">Gas Relayed</p>
                            <p id="stat-gas" class="text-2xl sm:text-3xl font-bold mt-1 bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">-</p>
                        </div>
                        <div class="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                            <i class="fas fa-gas-pump text-emerald-500 text-xl"></i>
                        </div>
                    </div>
                </div>
                <div class="glass-card rounded-2xl p-5 sm:p-6 card-hover">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-500 text-xs sm:text-sm font-medium uppercase tracking-wide">Circuit Breaker</p>
                            <p id="stat-circuit" class="text-xl sm:text-2xl font-bold mt-1 text-emerald-500">Closed</p>
                        </div>
                        <div class="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
                            <i class="fas fa-shield-alt text-amber-500 text-xl"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Charts and Activity -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-8">
                <!-- Chain Distribution -->
                <div class="glass-card rounded-2xl p-6 card-hover">
                    <h3 class="text-lg font-semibold mb-4 flex items-center">
                        <i class="fas fa-link mr-2 text-purple-500"></i>Chain Distribution
                    </h3>
                    <div class="h-64">
                        <canvas id="chainChart"></canvas>
                    </div>
                </div>

                <!-- Status Distribution -->
                <div class="glass-card rounded-2xl p-6 card-hover">
                    <h3 class="text-lg font-semibold mb-4 flex items-center">
                        <i class="fas fa-chart-pie mr-2 text-purple-500"></i>Transaction Status
                    </h3>
                    <div class="h-64">
                        <canvas id="statusChart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Recent Activity -->
            <div class="glass-card rounded-2xl overflow-hidden card-hover">
                <div class="p-6 border-b border-gray-100">
                    <h3 class="text-lg font-semibold flex items-center">
                        <i class="fas fa-stream mr-2 text-purple-500"></i>Recent Activity
                    </h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-50/80">
                            <tr>
                                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Chain</th>
                                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">To</th>
                                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                            </tr>
                        </thead>
                        <tbody id="activity-table" class="divide-y divide-gray-100">
                            <tr><td colspan="6" class="px-6 py-8 text-center text-gray-400">
                                <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
                                <p>Loading transactions...</p>
                            </td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Submit Transaction Tab -->
        <div id="content-submit" class="tab-content hidden">
            <div class="max-w-2xl mx-auto">
                <div class="glass-card rounded-2xl p-6 sm:p-8 card-hover">
                    <h2 class="text-2xl font-bold mb-6 flex items-center">
                        <i class="fas fa-paper-plane mr-3 text-purple-500"></i>Submit Meta-Transaction
                    </h2>
                    
                    <div class="space-y-6">
                        <!-- Chain Selection -->
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Network</label>
                            <select id="chain-select" class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition">
                                <option value="11155111">Sepolia Testnet</option>
                                <option value="80002">Polygon Amoy Testnet</option>
                                <option value="421614">Arbitrum Sepolia Testnet</option>
                            </select>
                        </div>

                        <!-- To Address -->
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Target Contract Address</label>
                            <input type="text" id="to-address" placeholder="0x..." 
                                class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition font-mono text-sm">
                        </div>

                        <!-- Data -->
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Calldata (hex)</label>
                            <textarea id="tx-data" rows="3" placeholder="0x..."
                                class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm transition"></textarea>
                        </div>

                        <!-- Gas Limit -->
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Gas Limit</label>
                            <input type="number" id="gas-limit" value="100000"
                                class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition">
                        </div>

                        <!-- Deadline -->
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Deadline (minutes from now)</label>
                            <input type="number" id="deadline-minutes" value="30"
                                class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition">
                        </div>

                        <!-- User Info -->
                        <div class="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100">
                            <div class="flex items-center justify-between mb-3">
                                <span class="text-gray-600 text-sm font-medium">Your Address</span>
                                <span id="user-address" class="font-mono text-sm text-gray-800">Not connected</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-gray-600 text-sm font-medium">Current Nonce</span>
                                <span id="user-nonce" class="font-mono text-sm font-semibold text-purple-600">-</span>
                            </div>
                        </div>

                        <!-- Actions -->
                        <div class="flex flex-col sm:flex-row gap-4">
                            <button onclick="simulateTransaction()" class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3.5 rounded-xl font-semibold transition">
                                <i class="fas fa-flask mr-2"></i>Simulate
                            </button>
                            <button onclick="submitTransaction()" class="flex-1 btn-primary text-white py-3.5 rounded-xl font-semibold">
                                <i class="fas fa-paper-plane mr-2"></i>Submit Transaction
                            </button>
                        </div>

                        <!-- Result -->
                        <div id="submit-result" class="hidden rounded-xl p-4 border">
                            <pre class="text-sm overflow-x-auto whitespace-pre-wrap"></pre>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- History Tab -->
        <div id="content-history" class="tab-content hidden">
            <div class="glass-card rounded-2xl overflow-hidden card-hover">
                <div class="p-6 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <h3 class="text-lg font-semibold flex items-center">
                        <i class="fas fa-history mr-2 text-purple-500"></i>Transaction History
                    </h3>
                    <button onclick="loadHistory()" class="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition">
                        <i class="fas fa-sync mr-2"></i>Refresh
                    </button>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-50/80">
                            <tr>
                                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Chain</th>
                                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">To</th>
                                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Gas Used</th>
                                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tx Hash</th>
                                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                            </tr>
                        </thead>
                        <tbody id="history-table" class="divide-y divide-gray-100">
                            <tr><td colspan="7" class="px-6 py-8 text-center text-gray-400">
                                <i class="fas fa-wallet text-3xl mb-2"></i>
                                <p>Connect wallet to view history</p>
                            </td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- API Docs Tab -->
        <div id="content-docs" class="tab-content hidden">
            <div class="space-y-8">
                <div class="glass-card rounded-2xl p-6 sm:p-8 card-hover">
                    <h2 class="text-2xl font-bold mb-6 flex items-center">
                        <i class="fas fa-book mr-3 text-purple-500"></i>API Documentation
                    </h2>
                    
                    <div class="space-y-6">
                        <!-- Submit Endpoint -->
                        <div class="border border-gray-200 rounded-xl overflow-hidden">
                            <div class="bg-gray-50 px-4 py-3 flex items-center space-x-3">
                                <span class="bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-md">POST</span>
                                <code class="text-purple-600 font-semibold">/api/relay/submit</code>
                            </div>
                            <div class="p-4">
                                <p class="text-gray-600 mb-4">Submit a signed meta-transaction for relay.</p>
                                <h4 class="font-semibold mb-2 text-gray-800">Request Body:</h4>
                                <pre class="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm border border-gray-200"><code class="text-gray-700">{
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
                        <div class="border border-gray-200 rounded-xl overflow-hidden">
                            <div class="bg-gray-50 px-4 py-3 flex items-center space-x-3">
                                <span class="bg-blue-500 text-white text-xs font-bold px-2.5 py-1 rounded-md">GET</span>
                                <code class="text-purple-600 font-semibold">/api/relay/status/:id</code>
                            </div>
                            <div class="p-4">
                                <p class="text-gray-600">Get the status of a submitted transaction.</p>
                            </div>
                        </div>

                        <!-- Nonce Endpoint -->
                        <div class="border border-gray-200 rounded-xl overflow-hidden">
                            <div class="bg-gray-50 px-4 py-3 flex items-center space-x-3">
                                <span class="bg-blue-500 text-white text-xs font-bold px-2.5 py-1 rounded-md">GET</span>
                                <code class="text-purple-600 font-semibold">/api/relay/nonce/:address/:chainId</code>
                            </div>
                            <div class="p-4">
                                <p class="text-gray-600">Get the next available nonce for a user on a specific chain.</p>
                            </div>
                        </div>

                        <!-- Chains Endpoint -->
                        <div class="border border-gray-200 rounded-xl overflow-hidden">
                            <div class="bg-gray-50 px-4 py-3 flex items-center space-x-3">
                                <span class="bg-blue-500 text-white text-xs font-bold px-2.5 py-1 rounded-md">GET</span>
                                <code class="text-purple-600 font-semibold">/api/relay/chains</code>
                            </div>
                            <div class="p-4">
                                <p class="text-gray-600">Get list of supported chains and their configurations.</p>
                            </div>
                        </div>

                        <!-- Typed Data Endpoint -->
                        <div class="border border-gray-200 rounded-xl overflow-hidden">
                            <div class="bg-gray-50 px-4 py-3 flex items-center space-x-3">
                                <span class="bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-md">POST</span>
                                <code class="text-purple-600 font-semibold">/api/relay/typed-data</code>
                            </div>
                            <div class="p-4">
                                <p class="text-gray-600">Generate EIP-712 typed data structure for signing.</p>
                            </div>
                        </div>

                        <!-- Admin Stats Endpoint -->
                        <div class="border border-gray-200 rounded-xl overflow-hidden">
                            <div class="bg-gray-50 px-4 py-3 flex items-center space-x-3">
                                <span class="bg-blue-500 text-white text-xs font-bold px-2.5 py-1 rounded-md">GET</span>
                                <code class="text-purple-600 font-semibold">/api/admin/stats</code>
                            </div>
                            <div class="p-4">
                                <p class="text-gray-600">Get overall relayer statistics and metrics.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- EIP-2771 Flow -->
                <div class="glass-card rounded-2xl p-6 sm:p-8 card-hover">
                    <h3 class="text-xl font-bold mb-6 flex items-center">
                        <i class="fas fa-project-diagram mr-3 text-purple-500"></i>EIP-2771 Flow
                    </h3>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                        <div class="text-center p-4">
                            <div class="w-16 h-16 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                                <i class="fas fa-user text-2xl text-purple-500"></i>
                            </div>
                            <h4 class="font-semibold mb-1 text-gray-800">1. User Signs</h4>
                            <p class="text-xs text-gray-500">Signs EIP-712 message off-chain</p>
                        </div>
                        <div class="text-center p-4">
                            <div class="w-16 h-16 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                                <i class="fas fa-server text-2xl text-blue-500"></i>
                            </div>
                            <h4 class="font-semibold mb-1 text-gray-800">2. Relayer Receives</h4>
                            <p class="text-xs text-gray-500">Validates & submits on-chain</p>
                        </div>
                        <div class="text-center p-4">
                            <div class="w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                                <i class="fas fa-check-double text-2xl text-emerald-500"></i>
                            </div>
                            <h4 class="font-semibold mb-1 text-gray-800">3. Forwarder Verifies</h4>
                            <p class="text-xs text-gray-500">Checks signature & nonce</p>
                        </div>
                        <div class="text-center p-4">
                            <div class="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                                <i class="fas fa-cog text-2xl text-amber-500"></i>
                            </div>
                            <h4 class="font-semibold mb-1 text-gray-800">4. Contract Executes</h4>
                            <p class="text-xs text-gray-500">Runs with original sender</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Smart Contracts Tab -->
        <div id="content-contracts" class="tab-content hidden">
            <div class="space-y-8">
                <!-- Forwarder Contract -->
                <div class="glass-card rounded-2xl p-6 sm:p-8 card-hover">
                    <h2 class="text-2xl font-bold mb-4 flex items-center">
                        <i class="fas fa-file-contract mr-3 text-purple-500"></i>Trusted Forwarder Contract
                    </h2>
                    <p class="text-gray-600 mb-6">
                        The Trusted Forwarder contract verifies signatures and forwards calls to recipient contracts.
                        It follows the EIP-2771 standard for meta-transactions.
                    </p>
                    <pre class="bg-gray-50 p-4 rounded-xl overflow-x-auto text-sm border border-gray-200"><code class="text-gray-700">// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/metatx/MinimalForwarder.sol";

contract GaslessForwarder is MinimalForwarder {
    constructor() MinimalForwarder() {}
}</code></pre>
                </div>

                <!-- Recipient Contract -->
                <div class="glass-card rounded-2xl p-6 sm:p-8 card-hover">
                    <h2 class="text-xl font-bold mb-4 flex items-center">
                        <i class="fas fa-cube mr-3 text-purple-500"></i>ERC2771 Recipient Contract
                    </h2>
                    <p class="text-gray-600 mb-6">
                        Your dApp contracts should inherit from ERC2771Context to recognize the trusted forwarder
                        and extract the original sender address.
                    </p>
                    <pre class="bg-gray-50 p-4 rounded-xl overflow-x-auto text-sm border border-gray-200"><code class="text-gray-700">// SPDX-License-Identifier: MIT
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
                <div class="glass-card rounded-2xl p-6 sm:p-8 card-hover">
                    <h2 class="text-xl font-bold mb-6 flex items-center">
                        <i class="fas fa-rocket mr-3 text-purple-500"></i>Deployment Guide
                    </h2>
                    <ol class="list-decimal list-inside space-y-3 text-gray-600">
                        <li>Deploy the GaslessForwarder contract to your target chain</li>
                        <li>Copy the forwarder address</li>
                        <li>Deploy your ERC2771Context contract with the forwarder address</li>
                        <li>Update the CHAIN_CONFIGS in the relayer with your forwarder address</li>
                        <li>Add your recipient contract to the whitelist (optional but recommended)</li>
                    </ol>
                    <div class="mt-6 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100">
                        <h4 class="font-semibold mb-2 text-gray-800">Quick Deploy with Hardhat:</h4>
                        <pre class="text-sm overflow-x-auto"><code class="text-purple-700">npx hardhat run scripts/deploy.js --network sepolia</code></pre>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <!-- Footer -->
    <footer class="bg-white border-t border-gray-100 py-8 mt-12">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                        <i class="fas fa-gas-pump text-white text-sm"></i>
                    </div>
                    <p class="text-gray-600 text-sm">
                        <span class="font-semibold text-gray-800">Gasless Relayer</span> - EIP-2771 Meta-Transaction Service
                    </p>
                </div>
                <div class="flex items-center space-x-6 text-gray-500 text-sm">
                    <span class="flex items-center"><i class="fas fa-shield-alt mr-1.5 text-emerald-500"></i> Secure</span>
                    <span class="flex items-center"><i class="fas fa-bolt mr-1.5 text-amber-500"></i> Fast</span>
                    <span class="flex items-center"><i class="fas fa-link mr-1.5 text-blue-500"></i> Multi-Chain</span>
                </div>
            </div>
            <div class="mt-6 pt-6 border-t border-gray-100 text-center">
                <p class="text-gray-400 text-xs">
                    Built with <i class="fas fa-heart text-red-400 mx-1"></i> using Hono + Cloudflare Workers
                </p>
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
                el.classList.add('text-gray-500');
            });
            // Show selected content
            document.getElementById('content-' + tabName).classList.remove('hidden');
            // Activate selected tab
            const tab = document.getElementById('tab-' + tabName);
            tab.classList.add('tab-active');
            tab.classList.remove('text-gray-500');
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
                document.getElementById('wallet-btn').classList.add('bg-emerald-500', 'text-white');
                
                document.getElementById('user-address').textContent = userAddress.slice(0, 8) + '...' + userAddress.slice(-6);
                
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
                        circuitEl.classList.remove('text-emerald-500');
                        circuitEl.classList.add('text-red-500');
                    } else {
                        circuitEl.textContent = 'Closed';
                        circuitEl.classList.remove('text-red-500');
                        circuitEl.classList.add('text-emerald-500');
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
            // Chart.js default styling for light theme
            Chart.defaults.color = '#6b7280';
            Chart.defaults.borderColor = '#e5e7eb';
            
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
                            borderRadius: 8,
                            borderSkipped: false
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: { beginAtZero: true, grid: { color: '#f3f4f6' } },
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
                            backgroundColor: ['#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6'],
                            borderWidth: 0,
                            hoverOffset: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { position: 'right', labels: { padding: 20, usePointStyle: true } }
                        },
                        cutout: '60%'
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
                            <tr class="table-row-hover transition-colors">
                                <td class="px-6 py-4 font-mono text-sm text-purple-600">\${tx.id.slice(0, 12)}...</td>
                                <td class="px-6 py-4 font-mono text-sm text-gray-600">\${tx.user}</td>
                                <td class="px-6 py-4">
                                    <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-700">
                                        \${chain.name}
                                    </span>
                                </td>
                                <td class="px-6 py-4 font-mono text-sm text-gray-600">\${tx.to}</td>
                                <td class="px-6 py-4">
                                    <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize status-\${tx.status}">
                                        <span class="w-1.5 h-1.5 rounded-full mr-1.5 bg-current"></span>
                                        \${tx.status}
                                    </span>
                                </td>
                                <td class="px-6 py-4 text-sm text-gray-500">\${formatTime(tx.createdAt)}</td>
                            </tr>
                        \`;
                    }).join('');
                } else {
                    document.getElementById('activity-table').innerHTML = 
                        '<tr><td colspan="6" class="px-6 py-8 text-center text-gray-400"><i class="fas fa-inbox text-3xl mb-2"></i><p>No transactions yet</p></td></tr>';
                }
            } catch (error) {
                console.error('Failed to load activity:', error);
            }
        }

        // Load user history
        async function loadHistory() {
            if (!userAddress) {
                document.getElementById('history-table').innerHTML = 
                    '<tr><td colspan="7" class="px-6 py-8 text-center text-gray-400"><i class="fas fa-wallet text-3xl mb-2"></i><p>Connect wallet to view history</p></td></tr>';
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
                            \`<a href="\${chain.explorer}/tx/\${tx.tx_hash}" target="_blank" class="text-purple-600 hover:text-purple-700 hover:underline font-mono">\${tx.tx_hash.slice(0, 10)}...</a>\` : 
                            '<span class="text-gray-400">-</span>';
                        return \`
                            <tr class="table-row-hover transition-colors">
                                <td class="px-6 py-4 font-mono text-sm text-purple-600">\${tx.id.slice(0, 12)}...</td>
                                <td class="px-6 py-4">
                                    <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-700">
                                        \${chain.name}
                                    </span>
                                </td>
                                <td class="px-6 py-4 font-mono text-sm text-gray-600">\${tx.to_address.slice(0, 8)}...</td>
                                <td class="px-6 py-4 text-gray-600">\${tx.gas_used || '-'}</td>
                                <td class="px-6 py-4">
                                    <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize status-\${tx.status}">
                                        <span class="w-1.5 h-1.5 rounded-full mr-1.5 bg-current"></span>
                                        \${tx.status}
                                    </span>
                                </td>
                                <td class="px-6 py-4">\${txLink}</td>
                                <td class="px-6 py-4 text-sm text-gray-500">\${formatTime(tx.created_at)}</td>
                            </tr>
                        \`;
                    }).join('');
                } else {
                    document.getElementById('history-table').innerHTML = 
                        '<tr><td colspan="7" class="px-6 py-8 text-center text-gray-400"><i class="fas fa-inbox text-3xl mb-2"></i><p>No transactions found</p></td></tr>';
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
                resultEl.classList.remove('bg-red-50', 'border-red-200');
                resultEl.classList.add('bg-emerald-50', 'border-emerald-200');
            } else {
                resultEl.classList.remove('bg-emerald-50', 'border-emerald-200');
                resultEl.classList.add('bg-red-50', 'border-red-200');
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
            if (!timestamp) return '-';
            const date = new Date(timestamp);
            const now = new Date();
            const diff = now - date;
            
            // Less than 1 minute
            if (diff < 60000) return 'Just now';
            // Less than 1 hour
            if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
            // Less than 24 hours
            if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
            // Show date
            return date.toLocaleDateString();
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
                    document.getElementById('wallet-btn').classList.add('bg-emerald-500', 'text-white');
                    document.getElementById('user-address').textContent = userAddress.slice(0, 8) + '...' + userAddress.slice(-6);
                    loadUserNonce();
                }
            });
        }
    </script>
</body>
</html>`);
});

export default app;
