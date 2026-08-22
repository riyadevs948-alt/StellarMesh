// ============================================================
// Veyra — Stellar RPC Client
// ============================================================
import { rpc as SorobanRpc, TransactionBuilder, Networks, Account, Operation, Asset, Memo } from '@stellar/stellar-sdk';
import type { NetworkError } from '@stellar-mesh/shared';
import { NetworkError as NetErr, STELLAR_TESTNET_RPC, STELLAR_TESTNET_PASSPHRASE } from '@stellar-mesh/shared';

const RPC_URL = import.meta.env['VITE_STELLAR_RPC_URL'] ?? STELLAR_TESTNET_RPC;
const HORIZON_URL = import.meta.env['VITE_STELLAR_HORIZON_URL'] ?? 'https://horizon-testnet.stellar.org';
const NETWORK_PASSPHRASE = import.meta.env['VITE_STELLAR_NETWORK_PASSPHRASE'] ?? STELLAR_TESTNET_PASSPHRASE;
const EXPLORER_BASE = import.meta.env['VITE_EXPLORER_BASE_URL'] ?? 'https://stellar.expert/explorer/testnet';

export const rpc = new SorobanRpc.Server(RPC_URL, { allowHttp: false });

export { NETWORK_PASSPHRASE, EXPLORER_BASE, HORIZON_URL };

// ─── Health Check ──────────────────────────────────────────────
export async function checkRpcHealth(): Promise<{
  healthy: boolean;
  latestLedger: number | null;
  latestLedgerTimestamp: string | null;
  latencyMs: number;
}> {
  const start = Date.now();
  try {
    const info = await Promise.race([
      rpc.getLatestLedger(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('RPC timeout')), 8000)
      ),
    ]);
    const latencyMs = Date.now() - start;
    return {
      healthy: true,
      latestLedger: info.sequence,
      latestLedgerTimestamp: new Date(( (info as any).closeTime ?? 0) * 1000).toISOString(),
      latencyMs,
    };
  } catch {
    return {
      healthy: false,
      latestLedger: null,
      latestLedgerTimestamp: null,
      latencyMs: Date.now() - start,
    };
  }
}

import { Horizon } from '@stellar/stellar-sdk';
const horizon = new Horizon.Server(HORIZON_URL);

// ─── Account / Balance ─────────────────────────────────────────
export async function getAccountBalance(address: string): Promise<string> {
  try {
    const account = await horizon.loadAccount(address);
    const xlmBalance = account.balances.find(
      (b: any) => b.asset_type === 'native'
    );
    return xlmBalance?.balance ?? '0';
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('Not Found')) {
      throw new NetErr('RPC_UNAVAILABLE', 'Account not found on Stellar Testnet. Please fund it at Friendbot.');
    }
    throw new NetErr('REQUEST_FAILED', `Failed to fetch balance: ${String(e)}`);
  }
}

// ─── Build Native XLM Payment Transaction ─────────────────────
export async function buildPaymentTransaction(
  sourceAddress: string,
  destinationAddress: string,
  amountXlm: string,
  memo?: string
): Promise<string> {
  const account = await horizon.loadAccount(sourceAddress);
  const sourceAccount = new Account(account.accountId(), account.sequenceNumber());

  const builder = new TransactionBuilder(sourceAccount, {
    fee: '1000000', // 0.1 XLM max fee
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.payment({
        destination: destinationAddress,
        asset: Asset.native(),
        amount: amountXlm,
      })
    )
    .setTimeout(30);

  if (memo) {
    builder.addMemo(Memo.text(memo.slice(0, 28)));
  }

  const tx = builder.build();
  return tx.toXDR();
}

// ─── Submit Signed Transaction ─────────────────────────────────
export async function submitTransaction(signedXdr: string): Promise<{
  txHash: string;
  ledger: number;
}> {
  const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const result = await rpc.sendTransaction(tx);

  if (result.status === 'ERROR') {
    throw new NetErr('REQUEST_FAILED', `Transaction failed: ${result.errorResult?.toString() ?? 'unknown error'}`);
  }

  // Poll for confirmation
  const txHash = result.hash;
  let attempts = 0;
  const maxAttempts = 30;

  while (attempts < maxAttempts) {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const txResult = await rpc.getTransaction(txHash);
      if (txResult.status === 'SUCCESS') {
        return { txHash, ledger: txResult.ledger ?? 0 };
      }
      if (txResult.status === 'FAILED') {
        throw new NetErr('REQUEST_FAILED', `Transaction ${txHash} failed on ledger`);
      }
    } catch (e) {
      if (e instanceof NetErr) throw e;
      // NOT_FOUND is expected while pending
    }
    attempts++;
  }

  throw new NetErr('REQUEST_FAILED', `Transaction ${txHash} confirmation timed out`);
}

// ─── Get Transaction ───────────────────────────────────────────
export async function getTransaction(txHash: string) {
  return rpc.getTransaction(txHash);
}

// ─── Explorer URL ──────────────────────────────────────────────
export function explorerTxUrl(txHash: string): string {
  return `${EXPLORER_BASE}/tx/${txHash}`;
}

export function explorerAccountUrl(address: string): string {
  return `${EXPLORER_BASE}/account/${address}`;
}

// ─── Contract Events ───────────────────────────────────────────
export async function getContractEvents(
  contractId: string,
  startLedger: number,
  limit = 50
): Promise<any[]> {
  try {
    const result = await rpc.getEvents({
      startLedger,
      filters: [
        {
          type: 'contract',
          contractIds: [contractId],
        },
      ],
      limit,
    });
    return result.events;
  } catch {
    return [];
  }
}

// ─── Friendbot ─────────────────────────────────────────────────
export async function fundWithFriendbot(address: string): Promise<void> {
  try {
    const resp = await fetch(
      `https://friendbot.stellar.org?addr=${encodeURIComponent(address)}`
    );
    if (!resp.ok) {
      const text = await resp.text();
      if (text.includes('op_already_exists')) {
        return; // Account is already funded
      }
      throw new Error('Friendbot funding failed');
    }
  } catch (err) {
    // Catch CORS or network errors
    if (err instanceof Error && err.message.includes('Friendbot')) {
      throw err;
    }
    throw new Error('Friendbot funding failed (Network issue)');
  }
}
