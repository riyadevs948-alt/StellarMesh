// ============================================================
// StellarMesh — Receive / Scan Voucher Page
// Matches reference: QR scanner, voucher validation display
// ============================================================
import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, CheckCircle2, XCircle, Save, AlertTriangle } from 'lucide-react';
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

export function ReceivePage() {
  const navigate = useNavigate();
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

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const divId = 'qr-scanner-div';

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

    // Validate
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
        <h1 className="text-2xl font-bold text-text-primary">Scan StellarMesh Voucher</h1>
        <p className="text-text-muted text-sm mt-1">
          Scan a QR code or paste a voucher payload to receive a payment.
        </p>
      </div>

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
