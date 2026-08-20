/// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// ============================================================
// StellarMesh Frontend Tests
// ============================================================

// ─── Test 1: Voucher Protocol — encode/decode round-trip ────
describe('Voucher Protocol', () => {
  it('encodes and decodes a voucher correctly', async () => {
    const { encodeVoucherForTransport, decodeVoucherFromTransport } = await import('@stellar-mesh/voucher-protocol');
    const { PROTOCOL_VERSION, VOUCHER_ASSET_XLM } = await import('@stellar-mesh/shared');

    const mockVoucher = {
      protocolVersion: PROTOCOL_VERSION,
      voucherId: 'abc123',
      channelId: 'channel-1',
      payer: 'GABC123',
      payee: 'GDEF456',
      amount: '50000000',
      asset: VOUCHER_ASSET_XLM,
      sequence: 42,
      issuedAt: '2024-01-01T00:00:00.000Z',
      expiresAt: '2024-01-02T00:00:00.000Z',
      reference: 'test',
      authorization: {
        signerAddress: 'GABC123',
        signature: 'sig-abc',
        signedPayloadHex: 'deadbeef',
      },
    };

    const encoded = encodeVoucherForTransport(mockVoucher as any);
    expect(encoded).toMatch(/^SM1:/);

    const decoded = decodeVoucherFromTransport(encoded);
    expect(decoded.voucherId).toBe(mockVoucher.voucherId);
    expect(decoded.amount).toBe(mockVoucher.amount);
    expect(decoded.payer).toBe(mockVoucher.payer);
    expect(decoded.payee).toBe(mockVoucher.payee);
    expect(decoded.channelId).toBe(mockVoucher.channelId);
  });

  it('throws on malformed QR payload', async () => {
    const { decodeVoucherFromTransport } = await import('@stellar-mesh/voucher-protocol');
    expect(() => decodeVoucherFromTransport('INVALID_PREFIX:xyz')).toThrow();
    expect(() => decodeVoucherFromTransport('SM1:not-valid-base64!!!')).toThrow();
  });

  it('converts XLM to stroops correctly', async () => {
    const { xlmToStroops, stroopsToXlm } = await import('@stellar-mesh/voucher-protocol');
    expect(xlmToStroops('1').toString()).toBe('10000000');
    expect(xlmToStroops('100').toString()).toBe('1000000000');
    expect(xlmToStroops('0.5').toString()).toBe('5000000');
    expect(stroopsToXlm('10000000')).toBe('1');
    expect(stroopsToXlm('50000000')).toBe('5');
  });
});

// ─── Test 2: Voucher Validation ───────────────────────────────
describe('Voucher Validation', () => {
  it('passes valid voucher', async () => {
    const { validateVoucher } = await import('@stellar-mesh/voucher-protocol');
    const { PROTOCOL_VERSION, VOUCHER_ASSET_XLM } = await import('@stellar-mesh/shared');

    const futureDate = new Date(Date.now() + 86_400_000).toISOString();
    const voucher = {
      protocolVersion: PROTOCOL_VERSION,
      voucherId: 'v1',
      channelId: 'ch1',
      payer: 'GAAA',
      payee: 'GBBB',
      amount: '10000000',
      asset: VOUCHER_ASSET_XLM,
      sequence: 1,
      issuedAt: new Date().toISOString(),
      expiresAt: futureDate,
      authorization: { signerAddress: 'GAAA', signature: 'sig', signedPayloadHex: 'ff' },
    };

    const result = validateVoucher(voucher as any, {
      expectedPayee: 'GBBB',
      channelId: 'ch1',
      maxAmount: '100000000',
      knownNonces: new Set(),
      knownVoucherIds: new Set(),
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects expired voucher', async () => {
    const { validateVoucher } = await import('@stellar-mesh/voucher-protocol');
    const { PROTOCOL_VERSION, VOUCHER_ASSET_XLM } = await import('@stellar-mesh/shared');

    const pastDate = new Date(Date.now() - 1000).toISOString();
    const voucher = {
      protocolVersion: PROTOCOL_VERSION,
      voucherId: 'v2',
      channelId: 'ch1',
      payer: 'GAAA',
      payee: 'GBBB',
      amount: '10000000',
      asset: VOUCHER_ASSET_XLM,
      sequence: 2,
      issuedAt: new Date().toISOString(),
      expiresAt: pastDate,
      authorization: { signerAddress: 'GAAA', signature: 'sig', signedPayloadHex: 'ff' },
    };

    const result = validateVoucher(voucher as any, {
      expectedPayee: 'GBBB',
      channelId: 'ch1',
      maxAmount: '100000000',
      knownNonces: new Set(),
      knownVoucherIds: new Set(),
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'VOUCHER_EXPIRED')).toBe(true);
  });

  it('rejects wrong recipient', async () => {
    const { validateVoucher } = await import('@stellar-mesh/voucher-protocol');
    const { PROTOCOL_VERSION, VOUCHER_ASSET_XLM } = await import('@stellar-mesh/shared');

    const futureDate = new Date(Date.now() + 86_400_000).toISOString();
    const voucher = {
      protocolVersion: PROTOCOL_VERSION,
      voucherId: 'v3',
      channelId: 'ch1',
      payer: 'GAAA',
      payee: 'GCCC', // wrong
      amount: '10000000',
      asset: VOUCHER_ASSET_XLM,
      sequence: 3,
      issuedAt: new Date().toISOString(),
      expiresAt: futureDate,
      authorization: { signerAddress: 'GAAA', signature: 'sig', signedPayloadHex: 'ff' },
    };

    const result = validateVoucher(voucher as any, {
      expectedPayee: 'GBBB',
      channelId: 'ch1',
      maxAmount: '100000000',
      knownNonces: new Set(),
      knownVoucherIds: new Set(),
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'WRONG_RECIPIENT')).toBe(true);
  });

  it('rejects duplicate voucher ID', async () => {
    const { validateVoucher } = await import('@stellar-mesh/voucher-protocol');
    const { PROTOCOL_VERSION, VOUCHER_ASSET_XLM } = await import('@stellar-mesh/shared');

    const futureDate = new Date(Date.now() + 86_400_000).toISOString();
    const voucher = {
      protocolVersion: PROTOCOL_VERSION,
      voucherId: 'duplicate-id',
      channelId: 'ch1',
      payer: 'GAAA',
      payee: 'GBBB',
      amount: '10000000',
      asset: VOUCHER_ASSET_XLM,
      sequence: 99,
      issuedAt: new Date().toISOString(),
      expiresAt: futureDate,
      authorization: { signerAddress: 'GAAA', signature: 'sig', signedPayloadHex: 'ff' },
    };

    const result = validateVoucher(voucher as any, {
      expectedPayee: 'GBBB',
      channelId: 'ch1',
      maxAmount: '100000000',
      knownNonces: new Set(),
      knownVoucherIds: new Set(['duplicate-id']),
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'DUPLICATE_VOUCHER')).toBe(true);
  });

  it('rejects amount exceeding channel limit', async () => {
    const { validateVoucher } = await import('@stellar-mesh/voucher-protocol');
    const { PROTOCOL_VERSION, VOUCHER_ASSET_XLM } = await import('@stellar-mesh/shared');

    const futureDate = new Date(Date.now() + 86_400_000).toISOString();
    const voucher = {
      protocolVersion: PROTOCOL_VERSION,
      voucherId: 'v-big',
      channelId: 'ch1',
      payer: 'GAAA',
      payee: 'GBBB',
      amount: '10000000000', // 1000 XLM
      asset: VOUCHER_ASSET_XLM,
      sequence: 5,
      issuedAt: new Date().toISOString(),
      expiresAt: futureDate,
      authorization: { signerAddress: 'GAAA', signature: 'sig', signedPayloadHex: 'ff' },
    };

    const result = validateVoucher(voucher as any, {
      expectedPayee: 'GBBB',
      channelId: 'ch1',
      maxAmount: '100000000', // 10 XLM limit
      knownNonces: new Set(),
      knownVoucherIds: new Set(),
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'AMOUNT_EXCEEDS_CHANNEL_LIMIT')).toBe(true);
  });
});

// ─── Test 3: Network State and Utils ─────────────────────────
describe('Utilities', () => {
  it('formats distance correctly', async () => {
    const { formatDistanceToNow } = await import('../lib/utils');
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const result = formatDistanceToNow(fiveMinAgo);
    expect(result).toMatch(/\d+m ago/);
  });

  it('shortens addresses', async () => {
    const { shortenAddress } = await import('../lib/utils');
    const addr = 'GABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF';
    const short = shortenAddress(addr, 4);
    expect(short).toMatch(/^GABC\.\.\./);
    expect(short.length).toBeLessThan(addr.length);
  });

  it('generates unique IDs', async () => {
    const { generateId } = await import('../lib/utils');
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
    expect(id1.length).toBeGreaterThan(5);
  });
});
