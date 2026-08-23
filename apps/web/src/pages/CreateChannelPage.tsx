// ============================================================
// Veyra — Create Channel Flow (multi-step)
// Matches reference screenshot 1: step wizard, recipient, limit, expiry
// ============================================================
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Check, ChevronRight } from 'lucide-react';
import { z } from 'zod';
import { useAppStore, useWallet, useIsOffline } from '../store/app.store';
import { ChannelRepo } from '../lib/db';
import { StepIndicator, Spinner, ErrorBanner, TxHashDisplay } from '../components/ui';
import { xlmToStroops, stroopsToXlm } from '@stellar-mesh/voucher-protocol';
import type { Channel } from '@stellar-mesh/shared';
import { generateId, formatDate } from '../lib/utils';
import { rpc, NETWORK_PASSPHRASE } from '../lib/stellar';
import { StrKey, Address, nativeToScVal, xdr, TransactionBuilder, Account, Keypair, Horizon } from '@stellar/stellar-sdk';
import { signTransactionWithFreighter } from '@stellar-mesh/stellar-client';
import { Client as MeshChannelClient } from 'mesh_channel';
import { Client as MeshRegistryClient } from 'mesh_registry';
import toast from 'react-hot-toast';

const STEPS = ['Recipient', 'Limit', 'Expiry', 'Review', 'Confirm'];

const recipientSchema = z.string().min(56).max(56);
const amountSchema = z.string().regex(/^\d+(\.\d+)?$/);

interface FormState {
  recipient: string;
  limitXlm: string;
  expiryDays: string;
}

export function CreateChannelPage() {
  const navigate = useNavigate();
  const wallet = useWallet();
  const isOffline = useIsOffline();
  const upsertChannel = useAppStore((s) => s.upsertChannel);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>({
    recipient: '',
    limitXlm: '',
    expiryDays: '30',
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const update = (key: keyof FormState, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const validate = (): boolean => {
    setError(null);
    if (step === 0) {
      if (!form.recipient || form.recipient.length < 56) {
        setError('Enter a valid Stellar address (starts with G, 56 chars)');
        return false;
      }
      if (wallet && form.recipient === wallet.address) {
        setError('Recipient cannot be your own address');
        return false;
      }
    }
    if (step === 1) {
      if (!form.limitXlm || parseFloat(form.limitXlm) <= 0) {
        setError('Enter a channel limit greater than 0');
        return false;
      }
      if (parseFloat(form.limitXlm) < 1) {
        setError('Minimum channel limit is 1 XLM');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validate()) return;
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    if (!wallet) { setError('No wallet connected'); return; }
    if (isOffline) { setError('Cannot create channel while offline'); return; }

    setSubmitting(true);
    setError(null);

    try {
      // Pre-flight: check account exists and has enough XLM
      try {
        const horizon = new Horizon.Server('https://horizon-testnet.stellar.org');
        const acct = await horizon.loadAccount(wallet.address);
        const xlmBalance = acct.balances.find((b: any) => b.asset_type === 'native')?.balance ?? '0';
        const needed = parseFloat(form.limitXlm) + 1; // 1 XLM reserve
        if (parseFloat(xlmBalance) < needed) {
          throw new Error(`Insufficient balance: you have ${parseFloat(xlmBalance).toFixed(2)} XLM but need at least ${needed.toFixed(2)} XLM (channel limit + 1 XLM reserve).`);
        }
      } catch (e: any) {
        if (e?.message?.includes('Insufficient')) throw e;
        // Account not found = likely not funded
        throw new Error('Account not found on Testnet. Please fund your account via Friendbot first.');
      }

      const expiresAtUnix = Math.floor(Date.now() / 1000) + parseInt(form.expiryDays) * 86400;
      const limitStroops = BigInt(xlmToStroops(form.limitXlm).toString());
      
      const client = new MeshChannelClient({
        networkPassphrase: NETWORK_PASSPHRASE,
        contractId: import.meta.env.VITE_MESH_CHANNEL_CONTRACT_ID,
        rpcUrl: 'https://soroban-testnet.stellar.org',
        publicKey: wallet.address,
      });

      // Generate a session key for offline signing and store it
      const sessionKey = Keypair.random();
      localStorage.setItem(`session_key_${wallet.address}`, sessionKey.secret());
      const payerPubkey = sessionKey.rawPublicKey();

      toast.loading('Simulating channel creation...', { id: 'channel-create' });
      
      const tx = await client.create_channel({
        payer: wallet.address,
        payer_pubkey: Buffer.from(payerPubkey),
        payee: form.recipient,
        limit_amount: limitStroops,
        expires_at: BigInt(expiresAtUnix),
      });

      toast.loading('Please sign in Freighter to create channel...', { id: 'channel-create' });
      
      const { result, sendTransactionResponse } = await tx.signAndSend({
        signTransaction: async (txXDR: string) => {
          const signed = await signTransactionWithFreighter(txXDR, wallet.address, NETWORK_PASSPHRASE);
          return { signedTxXdr: signed, signerAddress: wallet.address };
        }
      });
      
      if (sendTransactionResponse?.status === 'ERROR') {
        let errMsg = 'Contract invocation failed — check your balance and channel limit';
        try {
          const xdrError = sendTransactionResponse.errorResult as any;
          if (xdrError) {
            // xdrError is xdr.TransactionResult — walk the XDR tree for the real code
            const txCode = xdrError.result?.()?.switch?.()?.name ?? '';       // e.g. "txFailed"
            const opResults: any[] = xdrError.result?.()?.results?.() ?? [];
            if (opResults.length > 0) {
              const tr = opResults[0].tr?.();
              const trName = tr?.switch?.()?.name ?? '';                       // e.g. "invokeHostFunction"
              if (trName === 'invokeHostFunction') {
                const ihf = tr.invokeHostFunctionResult?.();
                const ihfCode = ihf?.switch?.()?.name ?? 'unknown';           // e.g. "invokeHostFunctionTrapped"
                // Map raw XDR codes to human-readable messages
                const codeMap: Record<string, string> = {
                  invokeHostFunctionTrapped: 'Contract execution trapped — the contract rejected this call. Check that the channel does not already exist and your limit is valid.',
                  invokeHostFunctionMalformed: 'Malformed contract call — the parameters sent to the contract were invalid.',
                  invokeHostFunctionSuccess: 'Success',
                };
                errMsg = codeMap[ihfCode] ?? ihfCode;
              } else {
                errMsg = trName || txCode || errMsg;
              }
            } else {
              // Top-level tx error codes
              const txCodeMap: Record<string, string> = {
                txInsufficientBalance: 'Insufficient XLM balance — fund your account via Friendbot.',
                txBadSeq: 'Bad sequence number — please refresh and try again.',
                txInsufficientFee: 'Insufficient fee — try again.',
                txFailed: 'Transaction failed — see contract error above.',
              };
              errMsg = txCodeMap[txCode] ?? txCode ?? errMsg;
            }
          }
        } catch { /* keep default message */ }
        throw new Error(errMsg);
      }
      
      const contractChannelId = result ? Buffer.from(result.unwrap()).toString('hex') : (sendTransactionResponse?.hash || tx.built?.hash().toString('hex') || '');
  
      toast.loading('Please sign in Freighter to fund channel...', { id: 'channel-create' });
      const fundTx = await client.fund_channel({
        payer: wallet.address,
        channel_id: Buffer.from(contractChannelId, 'hex'),
        amount: limitStroops
      });
      
      const { sendTransactionResponse: fundRes } = await fundTx.signAndSend({
        signTransaction: async (txXDR: string) => {
          const signed = await signTransactionWithFreighter(txXDR, wallet.address, NETWORK_PASSPHRASE);
          return { signedTxXdr: signed, signerAddress: wallet.address };
        }
      });
      
      if (fundRes?.status === 'ERROR') {
        throw new Error('Channel was created but funding failed. Please try again later.');
      }

      const channel: Channel = {
        id: generateId(),
        payer: wallet.address,
        payee: form.recipient,
        limitAmount: limitStroops.toString(),
        availableBalance: limitStroops.toString(),
        totalDeposited: limitStroops.toString(),
        settledAmount: '0',
        expiresAt: new Date(expiresAtUnix * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'ACTIVE',
        contractChannelId,
      };

      await ChannelRepo.save(channel);
      upsertChannel(channel);

      setTxHash(contractChannelId);
      setStep(4);
      toast.success('Payment channel created on Soroban!', { id: 'channel-create' });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create channel', { id: 'channel-create' });
      setError(e instanceof Error ? e.message : 'Failed to create channel');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 flex items-start justify-center animate-fade-in">
      <div className="w-full max-w-md">
        <div className="card">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-base font-semibold text-text-primary">Create Payment Channel</h2>
              <p className="text-xs text-text-muted uppercase tracking-wider">Offline-Capable Link</p>
            </div>
            <button onClick={() => navigate('/channels')} className="btn-ghost p-2">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Step indicator */}
          <div className="mb-5">
            <StepIndicator steps={STEPS} currentStep={step} />
          </div>

          {/* Step content */}
          <div className="min-h-48">
            {step === 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full bg-accent-blue/10 flex items-center justify-center text-accent-blue text-xs font-bold">i</div>
                  <span className="text-sm font-medium">Recipient Details</span>
                </div>
                <label className="label">Stellar Address or Federation</label>
                <input
                  type="text"
                  placeholder="G... or user*stellar.org"
                  value={form.recipient}
                  onChange={(e) => update('recipient', e.target.value)}
                  className="input"
                  autoFocus
                />
                <div className="mt-3 flex items-start gap-2 p-3 bg-accent-blue/5 border border-accent-blue/20 rounded-lg">
                  <div className="w-4 h-4 rounded-full bg-accent-blue/20 flex items-center justify-center text-accent-blue text-xs mt-0.5">i</div>
                  <p className="text-xs text-text-muted">
                    Channels require a minimum base reserve of 0.5 XLM for the escrow account setup.
                  </p>
                </div>
              </div>
            )}

            {step === 1 && (
              <div>
                <label className="label">Channel Limit (XLM)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="100.00"
                    value={form.limitXlm}
                    onChange={(e) => update('limitXlm', e.target.value)}
                    className="input pr-12"
                    autoFocus
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">XLM</span>
                </div>
                <p className="text-xs text-text-muted mt-2">
                  Maximum total amount that can flow through this channel.
                </p>
              </div>
            )}

            {step === 2 && (
              <div>
                <label className="label">Channel Expiry</label>
                <select
                  value={form.expiryDays}
                  onChange={(e) => update('expiryDays', e.target.value)}
                  className="input"
                >
                  <option value="7">7 days</option>
                  <option value="14">14 days</option>
                  <option value="30">30 days</option>
                  <option value="60">60 days</option>
                  <option value="90">90 days</option>
                </select>
                <p className="text-xs text-text-muted mt-2">
                  After expiry, remaining balance can be withdrawn.
                </p>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium mb-3">Review Channel Details</h3>
                {[
                  { label: 'Recipient', value: `${form.recipient.slice(0, 16)}...` },
                  { label: 'Channel Limit', value: `${form.limitXlm} XLM` },
                  { label: 'Expiry', value: `${form.expiryDays} days` },
                  { label: 'Network', value: wallet?.network ?? 'testnet' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm border-b border-border-subtle pb-2">
                    <span className="text-text-muted">{label}</span>
                    <span className="text-text-primary font-medium">{value}</span>
                  </div>
                ))}
              </div>
            )}

            {step === 4 && txHash && (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-accent-green/10 border border-accent-green/30 flex items-center justify-center mx-auto mb-3">
                  <Check className="w-6 h-6 text-accent-green" />
                </div>
                <h3 className="font-semibold text-text-primary mb-1">Channel Created!</h3>
                <p className="text-sm text-text-muted mb-3">Transaction submitted to Stellar Testnet</p>
                <TxHashDisplay txHash={txHash} />
                <button onClick={() => navigate('/channels')} className="btn-primary w-full mt-4">
                  View Channels
                </button>
              </div>
            )}
          </div>

          {error && <ErrorBanner message={error} className="mt-3" />}

          {/* Actions */}
          {step < 3 && (
            <div className="mt-5 flex justify-end">
              <button onClick={handleNext} className="btn-primary">
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="mt-5 flex gap-2">
              <button onClick={() => setStep(2)} className="btn-secondary flex-1">Back</button>
              <button
                onClick={handleSubmit}
                disabled={submitting || isOffline}
                className="btn-primary flex-1"
              >
                {submitting ? <><Spinner className="w-4 h-4" /> Creating...</> : 'Create Channel'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
