// ============================================================
// Veyra — Settlement Engine
// Background service that drains the offline settlement queue
// when internet connectivity is detected.
// ============================================================
import { VoucherRepo, SettlementAttemptRepo } from './db';
import { buildPaymentTransaction, submitTransaction } from './stellar';
import { signTransactionWithFreighter } from '@stellar-mesh/stellar-client';
import { useAppStore } from '../store/app.store';
import type { Voucher, SettlementAttempt, SettlementStatus } from '@stellar-mesh/shared';
import { stroopsToXlm } from '@stellar-mesh/voucher-protocol';
import { generateId } from './utils';
import toast from 'react-hot-toast';

let engineRunning = false;
let engineInterval: number | null = null;

const ENGINE_INTERVAL_MS = 10_000; // check every 10s

// ─── Start the settlement engine ──────────────────────────────
export function startSettlementEngine() {
  if (engineRunning) return;
  engineRunning = true;
  console.info('[SettlementEngine] Started');

  engineInterval = window.setInterval(async () => {
    const store = useAppStore.getState();
    if (store.state !== 'ONLINE') return;
    if (store.isSimulatingOffline) return;
    if (!store.session) return;

    await drainQueue(store.session.address, store.session.networkPassphrase);
  }, ENGINE_INTERVAL_MS);
}

// ─── Stop the engine ──────────────────────────────────────────
export function stopSettlementEngine() {
  if (engineInterval !== null) {
    clearInterval(engineInterval);
    engineInterval = null;
  }
  engineRunning = false;
  console.info('[SettlementEngine] Stopped');
}

// ─── Core drain function ──────────────────────────────────────
async function drainQueue(signerAddress: string, networkPassphrase: string) {
  let pending: Voucher[];
  try {
    pending = await VoucherRepo.getPendingSettlement();
  } catch {
    return;
  }

  if (pending.length === 0) return;

  console.info(`[SettlementEngine] Processing ${pending.length} pending voucher(s)`);

  for (const voucher of pending) {
    await settleVoucher(voucher, signerAddress, networkPassphrase);
  }
}

// ─── Settle a single voucher ──────────────────────────────────
async function settleVoucher(
  voucher: Voucher,
  signerAddress: string,
  networkPassphrase: string
) {
  const store = useAppStore.getState();
  const attemptId = generateId();

  const attempt: SettlementAttempt = {
    id: attemptId,
    voucherId: voucher.voucherId,
    channelId: voucher.channelId,
    status: 'VALIDATING',
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    retryCount: 0,
    maxRetries: 3,
  };

  await SettlementAttemptRepo.save(attempt);
  toast.loading(`Settling voucher ${voucher.voucherId.slice(0, 8)}...`, { id: voucher.voucherId });

  const updateAttempt = async (status: SettlementStatus, errorMessage?: string) => {
    const updated: SettlementAttempt = {
      ...attempt,
      status,
      errorMessage,
      completedAt: ['SETTLED', 'FAILED', 'PERMANENTLY_FAILED'].includes(status)
        ? new Date().toISOString()
        : undefined,
    };
    await SettlementAttemptRepo.save(updated);
  };

  try {
    // Step 1: Validate locally
    await updateAttempt('VALIDATING');

    const expiresAt = new Date(voucher.expiresAt).getTime();
    if (Date.now() > expiresAt) {
      await VoucherRepo.updateStatus(voucher.voucherId, 'EXPIRED');
      store.upsertVoucher({ ...voucher, localStatus: 'EXPIRED' });
      await updateAttempt('FAILED', 'Voucher expired before settlement');
      toast.error(`Voucher ${voucher.voucherId.slice(0, 8)}... expired`, { id: voucher.voucherId });
      return;
    }

    // The contract requires the PAYEE to be the settler.
    // If the current wallet is the payer (not the payee), we cannot auto-settle.
    // Only the payee can call settle_voucher on the contract.
    if (signerAddress !== voucher.payee && signerAddress !== voucher.payer) {
      await updateAttempt('FAILED', 'Wallet is neither payer nor payee');
      toast.error('Cannot settle: wallet not associated with this voucher', { id: voucher.voucherId });
      await VoucherRepo.updateStatus(voucher.voucherId, 'FAILED');
      store.upsertVoucher({ ...voucher, localStatus: 'FAILED' });
      return;
    }

    // Step 2: Build transaction
    await updateAttempt('SIMULATING');
    await VoucherRepo.updateStatus(voucher.voucherId, 'SUBMISSION_PENDING');
    store.upsertVoucher({ ...voucher, localStatus: 'SUBMISSION_PENDING' });

    const xlmAmount = stroopsToXlm(voucher.amount);
    
    // Instantiate the Soroban contract client
    const { Client: MeshChannelClient } = await import('mesh_channel');
    const client = new MeshChannelClient({
      networkPassphrase,
      contractId: import.meta.env.VITE_MESH_CHANNEL_CONTRACT_ID,
      rpcUrl: 'https://soroban-testnet.stellar.org',
      publicKey: signerAddress,
    });

    const signatureBuffer = Buffer.from(voucher.authorization!.signature, 'hex');

    // channelId stored in the voucher is a hex string — convert to raw bytes for the contract
    const channelIdHex = voucher.channelId.replace(/[^0-9a-fA-F]/g, '');
    const channelIdBytes = Buffer.from(channelIdHex.length === 64 ? channelIdHex : voucher.channelId, 'hex');

    // signed_payload is the hex-encoded canonical JSON — pass raw bytes
    const signedPayloadBytes = Buffer.from(voucher.authorization!.signedPayloadHex, 'hex');

    // voucher_id is a hex hash — pass as raw bytes
    const voucherIdBytes = Buffer.from(voucher.voucherId.replace(/[^0-9a-fA-F]/g, ''), 'hex');

    // Build the Soroban transaction
    const tx = await client.settle_voucher({
      settler: signerAddress,
      voucher: {
        channel_id: channelIdBytes,
        payer: voucher.payer,
        payee: voucher.payee,
        amount: BigInt(voucher.amount),
        sequence: BigInt(voucher.sequence),
        expires_at: BigInt(Math.floor(new Date(voucher.expiresAt).getTime() / 1000)),
        voucher_id: voucherIdBytes,
        signed_payload: signedPayloadBytes,
        signature: signatureBuffer,
      }
    });

      // Step 3: Sign & Submit
      await updateAttempt('AWAITING_SIGNATURE');
      const { result, sendTransactionResponse } = await tx.signAndSend({
        signTransaction: async (txXDR) => {
          const signed = await signTransactionWithFreighter(txXDR, signerAddress, networkPassphrase);
          return { signedTxXdr: signed, signerAddress };
        }
      });
      
      if (sendTransactionResponse?.status === 'ERROR') {
          throw new Error('Settlement contract invocation failed');
      }
      
      const txHash = sendTransactionResponse?.hash || tx.built?.hash().toString('hex') || '';
      const ledger = sendTransactionResponse?.latestLedger || 0;

    // Step 5: Confirmed
    await updateAttempt('SETTLED');
    await VoucherRepo.markSettled(voucher.voucherId, txHash, ledger);

    store.upsertVoucher({
      ...voucher,
      localStatus: 'SETTLED',
      settlementTxHash: txHash,
      settlementLedger: ledger,
    });

    toast.success(
      `✓ Settled! ${xlmAmount} XLM on ledger #${ledger}`,
      { id: voucher.voucherId, duration: 8000 }
    );
  } catch (e) {
    const rawMsg = e instanceof Error ? e.message : String(e);
    // Extract meaningful Soroban error code if present (e.g. "Error(Contract, #15)" = VoucherInvalidSignature)
    const contractErrorMap: Record<string, string> = {
      '#3': 'Unauthorized (wallet is not the payee)',
      '#4': 'Channel not found on chain',
      '#6': 'Channel is not active',
      '#7': 'Channel has expired',
      '#8': 'Insufficient channel balance',
      '#9': 'Voucher has expired',
      '#10': 'Voucher already settled',
      '#12': 'Wrong recipient address',
      '#13': 'Voucher/channel mismatch',
      '#14': 'Sequence number already used',
      '#15': 'Invalid signature — session key mismatch',
      '#20': 'Amount exceeds channel limit',
    };
    let errorMessage = rawMsg;
    for (const [code, label] of Object.entries(contractErrorMap)) {
      if (rawMsg.includes(code)) { errorMessage = label; break; }
    }
    console.error(`[SettlementEngine] Failed to settle voucher ${voucher.voucherId}:`, e);

    const permanent = rawMsg.includes('WRONG_') || rawMsg.includes('expired') ||
      rawMsg.includes('#9') || rawMsg.includes('#10') || rawMsg.includes('#12') ||
      rawMsg.includes('#13') || rawMsg.includes('#14') || rawMsg.includes('#15');
    await updateAttempt(permanent ? 'PERMANENTLY_FAILED' : 'FAILED', errorMessage);

    await VoucherRepo.updateStatus(voucher.voucherId, 'FAILED');
    store.upsertVoucher({ ...voucher, localStatus: 'FAILED' });

    toast.error(
      `Settlement failed: ${errorMessage.slice(0, 80)}`,
      { id: voucher.voucherId }
    );
  }
}

// ─── Manual trigger (single voucher) ─────────────────────────
export async function triggerSettlement(voucherId: string): Promise<void> {
  const store = useAppStore.getState();
  if (!store.session) throw new Error('No wallet connected');
  if (store.state !== 'ONLINE') throw new Error('Not online');

  const voucher = await VoucherRepo.get(voucherId);
  if (!voucher) throw new Error('Voucher not found');

  await VoucherRepo.updateStatus(voucherId, 'PENDING_SETTLEMENT');
  store.upsertVoucher({ ...voucher, localStatus: 'PENDING_SETTLEMENT' });

  await settleVoucher(
    voucher,
    store.session.address,
    store.session.networkPassphrase
  );
}
