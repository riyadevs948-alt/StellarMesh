// ============================================================
// StellarMesh — Typed Error Hierarchy
// ============================================================

export class StellarMeshError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'StellarMeshError';
    this.code = code;
    this.details = details;
  }
}

// --------------- Wallet Errors ---------------
export class WalletError extends StellarMeshError {
  constructor(code: WalletErrorCode, message: string, details?: unknown) {
    super(code, message, details);
    this.name = 'WalletError';
  }
}

export type WalletErrorCode =
  | 'WALLET_NOT_INSTALLED'
  | 'WALLET_NOT_CONNECTED'
  | 'WALLET_REJECTED'
  | 'WALLET_DISCONNECTED'
  | 'WRONG_NETWORK'
  | 'INVALID_ADDRESS'
  | 'INSUFFICIENT_XLM'
  | 'SIGNING_FAILED'
  | 'WALLET_SPOOFED';

// --------------- Voucher Errors ---------------
export class VoucherError extends StellarMeshError {
  constructor(code: VoucherErrorCode, message: string, details?: unknown) {
    super(code, message, details);
    this.name = 'VoucherError';
  }
}

export type VoucherErrorCode =
  | 'INVALID_AMOUNT'
  | 'AMOUNT_EXCEEDS_CHANNEL_LIMIT'
  | 'VOUCHER_EXPIRED'
  | 'WRONG_RECIPIENT'
  | 'WRONG_PAYER'
  | 'WRONG_CHANNEL'
  | 'INVALID_SIGNATURE'
  | 'DUPLICATE_VOUCHER'
  | 'SEQUENCE_REUSE'
  | 'MALFORMED_QR'
  | 'INVALID_PAYLOAD'
  | 'MISSING_AUTHORIZATION'
  | 'CHANNEL_NOT_ACTIVE'
  | 'CHANNEL_INSUFFICIENT_BALANCE';

// --------------- Settlement Errors ---------------
export class SettlementError extends StellarMeshError {
  constructor(code: SettlementErrorCode, message: string, details?: unknown) {
    super(code, message, details);
    this.name = 'SettlementError';
  }
}

export type SettlementErrorCode =
  | 'SIMULATION_FAILED'
  | 'SUBMISSION_FAILED'
  | 'CONFIRMATION_TIMEOUT'
  | 'ALREADY_SETTLED'
  | 'REPLAY_DETECTED'
  | 'IDEMPOTENCY_VIOLATION';

// --------------- Contract Errors ---------------
export class ContractError extends StellarMeshError {
  constructor(code: ContractErrorCode, message: string, details?: unknown) {
    super(code, message, details);
    this.name = 'ContractError';
  }
}

export type ContractErrorCode =
  | 'CONTRACT_NOT_FOUND'
  | 'CONTRACT_INVOKE_FAILED'
  | 'CONTRACT_STATE_ERROR'
  | 'CHANNEL_NOT_FOUND'
  | 'PARTICIPANT_NOT_REGISTERED'
  | 'UNAUTHORIZED';

// --------------- Network/RPC Errors ---------------
export class NetworkError extends StellarMeshError {
  constructor(code: NetworkErrorCode, message: string, details?: unknown) {
    super(code, message, details);
    this.name = 'NetworkError';
  }
}

export type NetworkErrorCode =
  | 'RPC_UNAVAILABLE'
  | 'RPC_TIMEOUT'
  | 'NETWORK_OFFLINE'
  | 'LEDGER_STALE'
  | 'REQUEST_FAILED';

// --------------- Utility ---------------
export function isWalletError(e: unknown): e is WalletError {
  return e instanceof WalletError;
}
export function isVoucherError(e: unknown): e is VoucherError {
  return e instanceof VoucherError;
}
export function isSettlementError(e: unknown): e is SettlementError {
  return e instanceof SettlementError;
}
export function isContractError(e: unknown): e is ContractError {
  return e instanceof ContractError;
}
export function isNetworkError(e: unknown): e is NetworkError {
  return e instanceof NetworkError;
}

export function formatErrorForUser(e: unknown): string {
  if (e instanceof StellarMeshError) {
    return e.message;
  }
  if (e instanceof Error) {
    return e.message;
  }
  return 'An unexpected error occurred';
}
