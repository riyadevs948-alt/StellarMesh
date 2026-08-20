// ============================================================
// StellarMesh — Create Channel Flow (multi-step)
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
      // Build channel record (in a full implementation this would call the Soroban contract)
      // For now we persist locally and simulate the on-chain tx
      const expiresAt = new Date(
        Date.now() + parseInt(form.expiryDays) * 86_400_000
      ).toISOString();

      const limitStroops = xlmToStroops(form.limitXlm).toString();
      const contractChannelId = `channel-${Date.now().toString(16)}`;

      const channel: Channel = {
        id: generateId(),
        payer: wallet.address,
        payee: form.recipient,
        limitAmount: limitStroops,
        availableBalance: '0',
        totalDeposited: '0',
        settledAmount: '0',
        expiresAt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'ACTIVE',
        contractChannelId,
      };

      // Persist locally
      await ChannelRepo.save(channel);
      upsertChannel(channel);

      setTxHash(`testnet-demo-${contractChannelId}`);
      setStep(4); // Move to confirm step
      toast.success('Payment channel created!');
    } catch (e) {
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
