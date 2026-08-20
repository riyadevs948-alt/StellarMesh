# StellarMesh

**Pay offline. Settle on Stellar.**

StellarMesh allows users to create cryptographically authorized payment vouchers while temporarily offline, exchange those vouchers device-to-device using QR codes, and settle the authorized payment on the Stellar Testnet when connectivity returns.

---

## 🌐 Live Demo

> Deploy URL will appear here after CI/CD runs.

**Network:** Stellar Testnet  
**MeshRegistry Contract:** *(deployed via CI — see `deployed-contracts.json`)*  
**MeshChannel Contract:** *(deployed via CI — see `deployed-contracts.json`)*

---

## 🏗 Architecture

```
stellar-mesh/
├── apps/
│   └── web/              # React + TypeScript + Vite + Tailwind
├── contracts/
│   ├── mesh-registry/    # Soroban: participant registry, channel policy
│   └── mesh-channel/     # Soroban: channels, voucher settlement, inter-contract calls
├── packages/
│   ├── shared/           # Domain types, typed errors, constants
│   ├── voucher-protocol/ # Voucher encoding, canonical serialization, validation
│   └── stellar-client/   # Freighter integration, RPC client
├── scripts/              # Deployment helpers
├── docs/                 # Architecture, checklist
└── .github/workflows/    # CI + Testnet deploy
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Rust + wasm32 target
- Stellar CLI 27+
- [Freighter Wallet](https://freighter.app) (browser extension, Testnet)

### Install
```bash
npm install
```

### Environment Setup
```bash
cp .env.example apps/web/.env.local
# Fill in your contract IDs after deploying
```

### Run Frontend (dev)
```bash
npm run dev -w apps/web
```

### Run All Tests
```bash
# Frontend tests
npm run test -w apps/web

# Contract tests
cd contracts/mesh-registry && cargo test
cd contracts/mesh-channel && cargo test
```

### Build Contracts
```bash
cd contracts/mesh-registry && stellar contract build
cd contracts/mesh-channel && stellar contract build
```

### Deploy Contracts to Testnet
```bash
# Set your secret key
export STELLAR_SECRET_KEY=S...

# Deploy MeshRegistry first
stellar contract deploy \
  --wasm contracts/mesh-registry/target/wasm32-unknown-unknown/release/mesh_registry.wasm \
  --source <your-key> \
  --network testnet

# Deploy MeshChannel (pass registry ID)
stellar contract deploy \
  --wasm contracts/mesh-channel/target/wasm32-unknown-unknown/release/mesh_channel.wasm \
  --source <your-key> \
  --network testnet
```

---

## 🎭 Demo Script (90 seconds)

### Scene 1 — Connect Wallet
1. Open StellarMesh → click Connect Wallet
2. Freighter opens → approve → wallet shows real XLM balance

### Scene 2 — Create Channel
1. Dashboard → Create Channel
2. Enter Bob's address, set 50 XLM limit, 30 days expiry
3. Review → Create → Freighter signs → real transaction appears

### Scene 3 — Go Offline
1. Settings → toggle **Simulate Offline Mode** ON
2. Banner shows: `● OFFLINE MODE — Payments will settle when connection returns.`

### Scene 4 — Create Offline Voucher
1. Pay → select channel → enter 5 XLM → Generate Offline Voucher
2. QR code appears with full voucher payload

### Scene 5 — Receive Voucher
1. New tab → Receive → Scan QR (or paste payload)
2. Validation result:
   ```
   ● VOUCHER LOCALLY VALIDATED
   5.00 XLM
   Alice → Bob
   ```
3. Click Save for Settlement

### Scene 6 — Reconnect & Settle
1. Settings → toggle offline mode OFF
2. Go to Settlements → voucher shows `PENDING_SETTLEMENT`
3. Settlement engine automatically runs → real tx hash appears

### Scene 7 — Stellar Explorer
Click the tx hash → opens `stellar.expert/explorer/testnet/tx/...` showing the real on-chain settlement.

---

## 🔐 Security Model

| Threat | Protection |
|--------|-----------|
| Replay attack | Soroban nonce tracking + voucher ID dedup |
| Altered amount | Signed canonical payload |
| Wrong recipient | On-chain payee check |
| Expired voucher | On-chain timestamp check |
| Double settlement | Idempotency key + nonce consumed |
| Secret key exposure | Never stored — Freighter signs only |
| Fake confirmation | UI only shows SETTLED after on-chain event |
| Malicious QR | Strict payload validation before any action |

---

## ⚠️ Important: Settlement Honesty

StellarMesh **never** claims an offline payment is settled until the Soroban contract confirms it.

Status lifecycle:
```
OFFLINE_AUTHORIZED → PENDING_SETTLEMENT → SETTLED_ON_STELLAR
                                        ↘ FAILED
                                        ↘ EXPIRED
```

---

## 🔧 GitHub Secrets Required for CI/CD

| Secret | Purpose |
|--------|---------|
| `STELLAR_SECRET_KEY` | Deployer account key |
| `ADMIN_ADDRESS` | Contract admin address |
| `VERCEL_TOKEN` | Vercel deployment (optional) |
| `VERCEL_ORG_ID` | Vercel org (optional) |
| `VERCEL_PROJECT_ID` | Vercel project (optional) |

---

## 📋 Level Compliance

See [`docs/STELLAR_JOURNEY_CHECKLIST.md`](docs/STELLAR_JOURNEY_CHECKLIST.md) for full verification.
