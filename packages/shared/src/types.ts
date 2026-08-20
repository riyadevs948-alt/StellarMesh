// ============================================================
// StellarMesh — Shared Domain Types
// ============================================================

// --------------- Network State ---------------
export type NetworkState =
  | 'ONLINE'
  | 'OFFLINE'
  | 'RECONNECTING'
  | 'SYNCING'
  | 'DEGRADED';

// --------------- Voucher Status ---------------
export type VoucherLifecycleStatus =
  | 'CREATED_OFFLINE'
  | 'RECEIVED_OFFLINE'
  | 'VALIDATED'
  | 'PENDING_SETTLEMENT'
  | 'SIMULATION_FAILED'
  | 'SUBMISSION_PENDING'
  | 'SETTLED'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED';

// UI-facing status (simplified)
export type VoucherDisplayStatus =
  | 'OFFLINE_AUTHORIZED'
  | 'PENDING_SETTLEMENT'
  | 'SETTLED_ON_STELLAR'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED';

// --------------- Channel Status ---------------
export type ChannelStatus =
  | 'CREATING'
  | 'FUNDING'
  | 'ACTIVE'
  | 'DRAINING'
  | 'CLOSING'
  | 'CLOSED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'ERROR';

// --------------- Settlement Status ---------------
export type SettlementStatus =
  | 'PENDING'
  | 'VALIDATING'
  | 'SIMULATING'
  | 'AWAITING_SIGNATURE'
  | 'SUBMITTING'
  | 'CONFIRMING'
  | 'SETTLED'
  | 'FAILED'
  | 'PERMANENTLY_FAILED';

// --------------- Wallet ---------------
export interface WalletSession {
  id: string;
  address: string;
  network: string;
  networkPassphrase: string;
  connectedAt: string; // ISO
  lastActive: string; // ISO
}

// --------------- Participant ---------------
export interface Participant {
  address: string;
  label?: string | undefined;
  registeredAt?: string | undefined;
  active: boolean;
}

// --------------- Channel ---------------
export interface Channel {
  id: string; // channel_id from contract
  payer: string;
  payee: string;
  limitAmount: string; // in stroops as string
  availableBalance: string; // in stroops
  totalDeposited: string; // in stroops
  settledAmount: string; // in stroops
  expiresAt: string; // ISO
  createdAt: string; // ISO
  updatedAt: string; // ISO
  status: ChannelStatus;
  contractChannelId: string; // on-chain id (bytes32 hex)
  fundingTxHash?: string | undefined;
  creationTxHash?: string | undefined;
  closedTxHash?: string | undefined;
}

// --------------- Voucher ---------------
export interface Voucher {
  // Protocol
  protocolVersion: number;
  voucherId: string; // deterministic hash
  channelId: string; // on-chain channel ID
  // Parties
  payer: string;
  payee: string;
  // Value
  amount: string; // in stroops as string
  asset: string; // "XLM" or asset contract id
  // Sequencing
  sequence: number;
  // Timing
  issuedAt: string; // ISO
  expiresAt: string; // ISO
  // Optional metadata
  reference?: string | undefined;
  // Authorization
  authorization: VoucherAuthorization;
  // Local state (not part of canonical payload)
  localStatus?: VoucherLifecycleStatus | undefined;
  settlementTxHash?: string | undefined;
  settlementLedger?: number | undefined;
  receivedAt?: string | undefined;
}

export interface VoucherAuthorization {
  // The payer's Stellar account signature over the canonical voucher bytes
  // This uses Freighter's signTransaction/signMessage mechanism
  signerAddress: string;
  // Signature bytes as hex string
  signature: string;
  // The exact canonical bytes that were signed (hex-encoded, for verification)
  signedPayloadHex: string;
}

// --------------- Settlement Attempt ---------------
export interface SettlementAttempt {
  id: string;
  voucherId: string;
  channelId: string;
  status: SettlementStatus;
  startedAt: string;
  updatedAt: string;
  completedAt?: string | undefined;
  txHash?: string | undefined;
  ledger?: number | undefined;
  errorCode?: string | undefined;
  errorMessage?: string | undefined;
  simulationResult?: string | undefined;
  retryCount: number;
  maxRetries: number;
}

// --------------- Contract Events ---------------
export type ContractEventType =
  | 'channel_created'
  | 'channel_funded'
  | 'voucher_settled'
  | 'voucher_rejected'
  | 'channel_cancelled'
  | 'channel_expired'
  | 'withdrawal_completed'
  | 'participant_registered'
  | 'policy_updated';

export interface ContractEvent {
  id: string;
  contractId: string;
  eventType: ContractEventType;
  ledger: number;
  ledgerTimestamp: string; // ISO
  txHash: string;
  topics: string[];
  data: string; // JSON-encoded event data
  ingestedAt: string; // ISO
}

// --------------- Network Snapshot ---------------
export interface NetworkSnapshot {
  id: string;
  capturedAt: string;
  browserOnline: boolean;
  rpcHealthy: boolean;
  latestLedger?: number | undefined;
  latestLedgerTimestamp?: string | undefined;
  rpcLatencyMs?: number | undefined;
  networkState: NetworkState;
}

// --------------- API Response shapes ---------------
export interface ApiResponse<T> {
  success: boolean;
  data?: T | undefined;
  error?: ApiError | undefined;
  timestamp: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown | undefined;
}

// --------------- Protocol Constants ---------------
export const PROTOCOL_VERSION = 1;
export const VOUCHER_ASSET_XLM = 'XLM';
export const MIN_VOUCHER_AMOUNT_STROOPS = BigInt(1_000_000); // 0.1 XLM
export const MAX_VOUCHER_EXPIRY_HOURS = 72;
export const DEFAULT_CHANNEL_EXPIRY_DAYS = 30;
export const SETTLEMENT_MAX_RETRIES = 3;
export const RPC_HEALTH_CHECK_INTERVAL_MS = 15_000;
export const STELLAR_TESTNET_RPC = 'https://soroban-testnet.stellar.org';
export const STELLAR_TESTNET_PASSPHRASE = 'Test SDF Network ; September 2015';
export const STELLAR_EXPLORER_BASE = 'https://stellar.expert/explorer/testnet';
