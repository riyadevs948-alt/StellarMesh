// ============================================================
// Veyra — Receive / Scan Voucher Page
// Option 1: Auto-import from ?payload= deep link
// Option 2: Poll Stellar Horizon for incoming channels
// ============================================================
import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { QrCode, CheckCircle2, XCircle, Save, AlertTriangle, RefreshCw, Zap, ExternalLink } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  decodeVoucherFromTransport, validateVoucher, stroopsToXlm,
} from '@stellar-mesh/voucher-protocol';
import { VoucherRepo } from '../lib/db';
import { useAppStore, useWallet } from '../store/app.store';
import { Spinner, ErrorBanner } from '../components/ui';
import type { Voucher } from '@stellar-mesh/shared';
import toast from 'react-hot-toast';
import { formatDateFull } from '../lib/utils';

const HORIZON_URL = import.meta.env.VITE_STELLAR_HORIZON_URL ?? 'https://horizon-testnet.stellar.org';
const CHANNEL_CONTRACT = import.meta.env.VITE_MESH_CHANNEL_CONTRACT_ID ?? '';
const EXPLORER_BASE = import.meta.env.VITE_EXPLORER_BASE_URL ?? 'https://stellar.expert/explorer/testnet';

interface IncomingChannel {
  payer: string;
  channelId: string;
  txHash: string;
  createdAt: string;
  limitAmount: string;
}

export function ReceivePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const wallet = useWallet();
  const upsertVoucher = useAppStore((s) => s.upsertVoucher);
  const channels = useAppStore((s) => s.channels);

  const [scanning, setScanning] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [scannedVoucher, setScannedVoucher] = useState<Voucher | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Option 1: Deep link auto-import state
  const [deepLinkProcessed, setDeepLinkProcessed] = useState(false);

  // Option 2: Stellar polling state
  const [incomingChannels, setIncomingChannels] = useState<IncomingChannel[]>([]);
  const [polling, setPolling] = useState(false);
  const [lastPolled, setLastPolled] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const divId = 'qr-scanner-div';

  // ─── OPTION 1: Auto-import from ?payload= deep link ───────────────────────
  useEffect(() => {
    const payloadParam = searchParams.get('payload');
    if (payloadParam && !deepLinkProcessed) {
      setDeepLinkProcessed(true);
      const decoded = decodeURIComponent(payloadParam);
      toast.success('Payment link detected! Importing voucher...');
      handleDecode(decoded);
    }
  }, [searchParams]);

  // ─── OPTION 2: Poll Stellar Horizon for channels where user is payee ───────
  const pollIncomingChannels = useCallback(async () => {
    if (!wallet?.address || !CHANNEL_CONTRACT) return;
    setPolling(true);
    try {
      // Query Horizon for operations on the MeshChannel contract that involve our address
      const url = `${HORIZON_URL}/accounts/${wallet.address}/operations?limit=50&order=desc&include_failed=false`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Horizon fetch failed');
      const data = await res.json();

      // Also query the contract operations to find create_channel calls where payee = our address
      const contractOpsUrl = `${HORIZON_URL}/accounts/${CHANNEL_CONTRACT}/operations?limit=100&order=desc&include_failed=false`;
      const contractRes = await fetch(contractOpsUrl);
      const contractData = contractRes.ok ? await contractRes.json() : { _embedded: { records: [] } };

      // Parse contract operations to find channels where we are the payee
      const found: IncomingChannel[] = [];
      const records: any[] = contractData._embedded?.records ?? [];

      for (const op of records) {
        if (op.type === 'invoke_host_function') {
          // Look for create_channel invocations where the payee matches our address
          const fnArgs: string = JSON.stringify(op.parameters ?? op.function ?? '');
          if (fnArgs.includes(wallet.address) && op.source_account !== wallet.address) {
            // This is a channel created BY someone else where our address appears (likely as payee)
            const existing = channels.find(
              (c) => c.payer === op.source_account
            );
            if (!existing) {
              found.push({
                payer: op.source_account,
                channelId: op.id,
                txHash: op.transaction_hash,
                createdAt: op.created_at,
                limitAmount: '0',
              });
            }
          }
        }
      }

      setIncomingChannels(found);
      setLastPolled(new Date().toLocaleTimeString());
    } catch (e) {
      // Silently fail - polling is best-effort
    } finally {
      setPolling(false);
    }
  }, [wallet?.address, channels]);

  // Auto-poll on mount and every 30 seconds
  useEffect(() => {
    void pollIncomingChannels();
    const interval = setInterval(() => void pollIncomingChannels(), 30_000);
    return () => clearInterval(interval);
  }, [pollIncomingChannels]);

  // ─── Scanner helpers ───────────────────────────────────────────────────────
  const startScanner = useCallback(async () => {
    setError(null);
    try {
      const scanner = new Html5Qrcode(divId);
      scannerRef.current = scanner;
      setScanning(true);
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          void handleDecode(decodedText);
          void scanner.stop();
          setScanning(false);
        },
        undefined
      );
    } catch (e) {
      setScanning(false);
      setError('Camera access denied or unavailable. Paste the voucher payload below.');
    }
  }, []);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => {
    return () => { void stopScanner(); };
  }, []);

  const handleDecode = useCallback((text: string) => {
    setError(null);
    let voucher: Voucher;
    try {
      voucher = decodeVoucherFromTransport(text.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to decode voucher payload');
      setIsValid(false);
      return;
    }

    const channel = channels.find((c) => c.contractChannelId === voucher.channelId);
    const result = validateVoucher(voucher, {
      expectedPayee: wallet?.address ?? voucher.payee,
      channelId: voucher.channelId,
      maxAmount: channel?.totalDeposited ?? '999999999999999',
      knownNonces: new Set(),
      knownVoucherIds: new Set(),
    });

    setScannedVoucher(voucher);
    setIsValid(result.valid);
    setValidationErrors(result.errors.map((e) => e.message));
  }, [channels, wallet]);

  const handleManualPaste = () => {
    if (manualInput.trim()) {
      handleDecode(manualInput.trim());
    }
  };

  const handleSave = async () => {
    if (!scannedVoucher) return;
    setSaving(true);
    try {
      const toSave: Voucher = {
        ...scannedVoucher,
        localStatus: 'PENDING_SETTLEMENT',
        receivedAt: new Date().toISOString(),
      };
      await VoucherRepo.save(toSave);
      upsertVoucher(toSave);
      setSaved(true);
      toast.success('Voucher saved for settlement');
    } catch (e) {
      toast.error('Failed to save voucher');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 animate-fade-in max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Scan Veyra Voucher</h1>
        <p className="text-text-muted text-sm mt-1">
          Scan a QR code, paste a voucher payload, or click a shared payment link to receive a payment.
        </p>
      </div>

      {/* ── OPTION 2: Incoming Channels from Stellar Network ── */}
      {wallet && (
        <div className="card mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent-yellow" />
              <h3 className="text-sm font-semibold text-text-secondary">Incoming Payment Channels</h3>
              <span className="text-[10px] text-text-muted bg-surface-elevated px-2 py-0.5 rounded-full">
                Auto-refreshes every 30s
              </span>
            </div>
            <button
              onClick={() => void pollIncomingChannels()}
              disabled={polling}
              className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
              title="Refresh incoming channels from Stellar"
            >
              <RefreshCw className={`w-3 h-3 ${polling ? 'animate-spin' : ''}`} />
              {polling ? 'Checking...' : 'Refresh'}
            </button>
          </div>

          {lastPolled && (
            <p className="text-[10px] text-text-muted mb-2">Last checked: {lastPolled}</p>
          )}

          {incomingChannels.length > 0 ? (
            <div className="space-y-2">
              {incomingChannels.map((ch) => (
                <div key={ch.channelId} className="flex items-center justify-between p-3 bg-accent-green/5 border border-accent-green/20 rounded-xl">
                  <div>
                    <p className="text-xs font-semibold text-text-primary">
                      💸 Channel from <span className="font-mono">{ch.payer.slice(0, 8)}...</span>
                    </p>
                    <p className="text-[10px] text-text-muted mt-0.5">
                      Created {new Date(ch.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <a
                    href={`${EXPLORER_BASE}/tx/${ch.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary text-xs px-2 py-1 flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" /> View
                  </a>
                </div>
              ))}
              <p className="text-xs text-text-muted mt-2 text-center">
                Ask the sender to share a voucher QR or payment link with you to receive funds.
              </p>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-xs text-text-muted">
                {polling
                  ? 'Checking Stellar network...'
                  : 'No new incoming channels detected on the Stellar network.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── OPTION 1: Deep link banner ── */}
      {deepLinkProcessed && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-accent-blue/10 border border-accent-blue/20 rounded-xl">
          <CheckCircle2 className="w-4 h-4 text-accent-blue shrink-0" />
          <p className="text-xs text-text-secondary">
            Payment link detected — voucher imported automatically below.
          </p>
        </div>
      )}

      {/* Scanner area */}
      <div className="card mb-5">
        <div
          id={divId}
          className={`w-full rounded-xl overflow-hidden bg-black ${scanning ? 'min-h-72' : 'hidden'}`}
        />

        {!scanning && !scannedVoucher && (
          <div className="flex flex-col items-center py-12 gap-4">
            <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-border-medium flex items-center justify-center">
              <QrCode className="w-12 h-12 text-text-muted" />
            </div>
            <button onClick={startScanner} className="btn-primary px-6">
              <QrCode className="w-4 h-4" /> Scan QR Code
            </button>
          </div>
        )}

        {scanning && (
          <div className="mt-3 flex justify-center">
            <button onClick={stopScanner} className="btn-secondary text-sm">
              Stop Scanner
            </button>
          </div>
        )}
      </div>

      {/* Manual paste fallback */}
      {!scannedVoucher && (
        <div className="card mb-5">
          <label className="label">Or paste voucher payload</label>
          <textarea
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="SM1:eyJ..."
            rows={3}
            className="input font-mono text-xs resize-none"
          />
          <button
            onClick={handleManualPaste}
            disabled={!manualInput.trim()}
            className="btn-secondary mt-3 w-full"
          >
            Import Payload
          </button>
        </div>
      )}

      {error && <ErrorBanner message={error} className="mb-5" />}

      {/* Validation result */}
      {scannedVoucher && (
        <div className={`card mb-5 animate-slide-up border ${isValid ? 'border-accent-green/30' : 'border-accent-red/30'}`}>
          {/* Status badge */}
          <div className="flex items-center gap-2 mb-4">
            <span className={`badge ${isValid ? 'badge-settled' : 'badge-failed'} text-xs`}>
              {isValid ? '● VOUCHER LOCALLY VALIDATED' : '✕ VALIDATION FAILED'}
            </span>
          </div>

          {!isValid && validationErrors.length > 0 && (
            <div className="mb-4 space-y-1">
              {validationErrors.map((err) => (
                <div key={err} className="flex items-center gap-2 text-xs text-accent-red">
                  <XCircle className="w-3.5 h-3.5 shrink-0" />
                  {err}
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <p className="label">Receiving From</p>
              <p className="text-lg font-semibold text-text-primary font-mono">
                {scannedVoucher.payer.slice(0, 12)}...
              </p>
            </div>
            <div>
              <p className="label">Amount</p>
              <p className="text-2xl font-bold text-text-primary">
                {stroopsToXlm(scannedVoucher.amount)} XLM
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border-subtle text-xs">
              <div>
                <p className="label">Voucher ID</p>
                <p className="font-mono text-text-secondary">{scannedVoucher.voucherId.slice(0, 12)}...</p>
              </div>
              <div>
                <p className="label">Expires</p>
                <p className="text-text-secondary">{formatDateFull(scannedVoucher.expiresAt)}</p>
              </div>
              {scannedVoucher.reference && (
                <div className="col-span-2">
                  <p className="label">Reference</p>
                  <p className="text-text-secondary">{scannedVoucher.reference}</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border-subtle">
            {isValid ? (
              <>
                <p className="text-xs text-text-muted mb-3 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-accent-yellow" />
                  Stored in Offline Queue for later settlement.
                </p>
                {saved ? (
                  <div className="flex items-center gap-2 justify-center py-3 text-accent-green">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-medium">Saved for Settlement</span>
                  </div>
                ) : (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary w-full py-3"
                  >
                    {saving ? <Spinner className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    Save for Settlement
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={() => { setScannedVoucher(null); setIsValid(null); setValidationErrors([]); setManualInput(''); }}
                className="btn-secondary w-full"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
