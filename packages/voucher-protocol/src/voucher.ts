// ============================================================
// StellarMesh — Voucher Protocol
// Canonical serialization, ID generation, validation
// ============================================================
import type { Voucher, VoucherAuthorization } from '@stellar-mesh/shared';
import {
  PROTOCOL_VERSION,
  VOUCHER_ASSET_XLM,
  VoucherError,
  MAX_VOUCHER_EXPIRY_HOURS,
  MIN_VOUCHER_AMOUNT_STROOPS,
} from '@stellar-mesh/shared';

// --------------- Canonical Payload (signing/ID input) ---------------
// Fields in deterministic order, all as strings, no optional fields.
// This exact object shape must produce the same JSON bytes every time.
export interface CanonicalVoucherPayload {
  protocolVersion: number;
  channelId: string;
  payer: string;
  payee: string;
  amount: string;
  asset: string;
  sequence: number;
  issuedAt: string;
  expiresAt: string;
  reference: string; // empty string if none
}

/**
 * Produce canonical JSON bytes from a payload.
 * Fields are sorted alphabetically so the same payload always produces
 * the same bytes regardless of construction order.
 */
export function canonicalBytes(payload: CanonicalVoucherPayload): Uint8Array {
  const keys = Object.keys(payload).sort() as (keyof CanonicalVoucherPayload)[];
  const ordered: Record<string, unknown> = {};
  for (const key of keys) {
    ordered[key] = payload[key];
  }
  const json = JSON.stringify(ordered);
  return new TextEncoder().encode(json);
}

/**
 * Compute a deterministic voucher ID.
 * SHA-256 of canonical bytes, hex-encoded.
 */
export async function computeVoucherId(
  payload: CanonicalVoucherPayload
): Promise<string> {
  const bytes = canonicalBytes(payload);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Encode a voucher for QR / clipboard transfer.
 * Returns a compact Base64URL string.
 */
export function encodeVoucherForTransport(voucher: Voucher): string {
  // Strip local-only fields before encoding
  const payload: Omit<Voucher, 'localStatus' | 'settlementTxHash' | 'settlementLedger' | 'receivedAt'> = {
    protocolVersion: voucher.protocolVersion,
    voucherId: voucher.voucherId,
    channelId: voucher.channelId,
    payer: voucher.payer,
    payee: voucher.payee,
    amount: voucher.amount,
    asset: voucher.asset,
    sequence: voucher.sequence,
    issuedAt: voucher.issuedAt,
    expiresAt: voucher.expiresAt,
    reference: voucher.reference,
    authorization: voucher.authorization,
  };
  const json = JSON.stringify(payload);
  // Base64URL encode (no padding)
  const b64 = btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return `SM1:${b64}`; // SM1 = StellarMesh v1 prefix
}

/**
 * Decode a transport-encoded voucher payload.
 */
export function decodeVoucherFromTransport(encoded: string): Voucher {
  if (!encoded.startsWith('SM1:')) {
    throw new VoucherError('MALFORMED_QR', 'Invalid StellarMesh QR payload: missing SM1 prefix');
  }
  const b64 = encoded.slice(4).replace(/-/g, '+').replace(/_/g, '/');
  let json: string;
  try {
    json = atob(b64);
  } catch {
    throw new VoucherError('MALFORMED_QR', 'Invalid Base64 in QR payload');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new VoucherError('INVALID_PAYLOAD', 'QR payload is not valid JSON');
  }
  return validateVoucherShape(parsed);
}

/**
 * Runtime shape validation of parsed voucher object.
 */
function validateVoucherShape(obj: unknown): Voucher {
  if (typeof obj !== 'object' || obj === null) {
    throw new VoucherError('INVALID_PAYLOAD', 'Voucher payload must be an object');
  }
  const v = obj as Record<string, unknown>;
  const required = [
    'protocolVersion', 'voucherId', 'channelId', 'payer', 'payee',
    'amount', 'asset', 'sequence', 'issuedAt', 'expiresAt', 'authorization',
  ];
  for (const field of required) {
    if (!(field in v)) {
      throw new VoucherError('INVALID_PAYLOAD', `Missing required field: ${field}`);
    }
  }
  if (typeof v['protocolVersion'] !== 'number') {
    throw new VoucherError('INVALID_PAYLOAD', 'protocolVersion must be a number');
  }
  if (v['protocolVersion'] !== PROTOCOL_VERSION) {
    throw new VoucherError('INVALID_PAYLOAD', `Unsupported protocol version: ${String(v['protocolVersion'])}`);
  }
  const auth = v['authorization'];
  if (typeof auth !== 'object' || auth === null) {
    throw new VoucherError('MISSING_AUTHORIZATION', 'Voucher authorization is missing or invalid');
  }
  const authObj = auth as Record<string, unknown>;
  if (!authObj['signerAddress'] || !authObj['signature'] || !authObj['signedPayloadHex']) {
    throw new VoucherError('MISSING_AUTHORIZATION', 'Incomplete authorization object');
  }
  return obj as Voucher;
}

/**
 * Build a canonical payload from a Voucher for signing.
 */
export function buildCanonicalPayload(v: {
  channelId: string;
  payer: string;
  payee: string;
  amount: string;
  asset: string;
  sequence: number;
  issuedAt: string;
  expiresAt: string;
  reference?: string;
}): CanonicalVoucherPayload {
  return {
    protocolVersion: PROTOCOL_VERSION,
    channelId: v.channelId,
    payer: v.payer,
    payee: v.payee,
    amount: v.amount,
    asset: v.asset,
    sequence: v.sequence,
    issuedAt: v.issuedAt,
    expiresAt: v.expiresAt,
    reference: v.reference ?? '',
  };
}

// --------------- Validation ---------------

export interface VoucherValidationResult {
  valid: boolean;
  errors: VoucherError[];
}

export function validateVoucher(
  voucher: Voucher,
  context: {
    expectedPayee: string;
    channelId: string;
    maxAmount: string; // stroops
    knownNonces: Set<number>;
    knownVoucherIds: Set<string>;
  }
): VoucherValidationResult {
  const errors: VoucherError[] = [];

  // Expiry check
  if (new Date(voucher.expiresAt) <= new Date()) {
    errors.push(new VoucherError('VOUCHER_EXPIRED', `Voucher expired at ${voucher.expiresAt}`));
  }

  // Recipient check
  if (voucher.payee !== context.expectedPayee) {
    errors.push(
      new VoucherError(
        'WRONG_RECIPIENT',
        `Voucher payee ${voucher.payee} does not match expected ${context.expectedPayee}`
      )
    );
  }

  // Channel check
  if (voucher.channelId !== context.channelId) {
    errors.push(
      new VoucherError(
        'WRONG_CHANNEL',
        `Voucher channel ${voucher.channelId} does not match expected ${context.channelId}`
      )
    );
  }

  // Amount check
  const amt = BigInt(voucher.amount);
  if (amt < MIN_VOUCHER_AMOUNT_STROOPS) {
    errors.push(new VoucherError('INVALID_AMOUNT', `Amount ${voucher.amount} is below minimum`));
  }
  if (amt > BigInt(context.maxAmount)) {
    errors.push(
      new VoucherError(
        'AMOUNT_EXCEEDS_CHANNEL_LIMIT',
        `Amount ${voucher.amount} exceeds channel limit ${context.maxAmount}`
      )
    );
  }

  // Duplicate voucher ID
  if (context.knownVoucherIds.has(voucher.voucherId)) {
    errors.push(new VoucherError('DUPLICATE_VOUCHER', `Voucher ID ${voucher.voucherId} already seen`));
  }

  // Sequence reuse
  if (context.knownNonces.has(voucher.sequence)) {
    errors.push(new VoucherError('SEQUENCE_REUSE', `Sequence ${voucher.sequence} already used`));
  }

  // Authorization presence
  if (!voucher.authorization?.signature) {
    errors.push(new VoucherError('MISSING_AUTHORIZATION', 'Voucher has no authorization signature'));
  }

  // Payer/payee not same
  if (voucher.payer === voucher.payee) {
    errors.push(new VoucherError('WRONG_RECIPIENT', 'Payer and payee cannot be the same address'));
  }

  // Asset must be XLM for now
  if (voucher.asset !== VOUCHER_ASSET_XLM) {
    errors.push(new VoucherError('INVALID_PAYLOAD', `Unsupported asset: ${voucher.asset}`));
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Reconstruct the hex of canonical bytes for a given voucher (for display/debug).
 */
export function getSignedPayloadHex(payload: CanonicalVoucherPayload): string {
  const bytes = canonicalBytes(payload);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate a random uint32 nonce suitable for sequence numbers.
 */
export function generateSequenceNumber(): number {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0]!;
}

/**
 * Format stroops to XLM display string.
 */
export function stroopsToXlm(stroops: string | bigint): string {
  const n = BigInt(stroops);
  const whole = n / 10_000_000n;
  const frac = n % 10_000_000n;
  const fracStr = frac.toString().padStart(7, '0').replace(/0+$/, '');
  return fracStr.length > 0 ? `${whole}.${fracStr}` : `${whole}`;
}

/**
 * Format XLM amount to stroops bigint.
 */
export function xlmToStroops(xlm: string): bigint {
  const [whole, frac = ''] = xlm.split('.');
  const fracPadded = frac.padEnd(7, '0').slice(0, 7);
  return BigInt(whole ?? '0') * 10_000_000n + BigInt(fracPadded);
}

export type { VoucherAuthorization };
