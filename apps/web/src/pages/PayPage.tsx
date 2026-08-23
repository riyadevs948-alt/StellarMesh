// ============================================================
// Veyra — Create Offline Payment Page
// Matches reference: channel selector, amount, recipient, QR display
// ============================================================
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, QrCode, Copy, Share2, AlertTriangle, Download, Link } from 'lucide-react';
import QRCode from 'qrcode';
import { useAppStore, useIsOffline, useWallet, useChannels } from '../store/app.store';
import { VoucherRepo } from '../lib/db';
import { Spinner, ErrorBanner } from '../components/ui';
import {
  buildCanonicalPayload, computeVoucherId, encodeVoucherForTransport,
  generateSequenceNumber, xlmToStroops, stroopsToXlm,
} from '@stellar-mesh/voucher-protocol';
import {
  PROTOCOL_VERSION, VOUCHER_ASSET_XLM,
  type Voucher, type VoucherAuthorization,
} from '@stellar-mesh/shared';
import { signTransactionWithFreighter } from '@stellar-mesh/stellar-client';
import { Keypair } from '@stellar/stellar-sdk';
import toast from 'react-hot-toast';

export function PayPage() {
  const navigate = useNavigate();
  const wallet = useWallet();
  const channels = useChannels();
  const isOffline = useIsOffline();
  const upsertVoucher = useAppStore((s) => s.upsertVoucher);

  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [expiryHours, setExpiryHours] = useState('24');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedVoucher, setGeneratedVoucher] = useState<Voucher | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [encodedPayload, setEncodedPayload] = useState<string | null>(null);

  const activeChannels = channels.filter((c) => c.status === 'ACTIVE');
  const selectedChannel = activeChannels.find((c) => c.id === selectedChannelId);

  const available = selectedChannel
    ? stroopsToXlm(
        (BigInt(selectedChannel.totalDeposited) - BigInt(selectedChannel.settledAmount)).toString()
      )
    : null;

  const handleGenerate = useCallback(async () => {
    setError(null);
    if (!wallet) { setError('No wallet connected'); return; }
    if (!selectedChannelId) { setError('Select a payment channel'); return; }
    if (!amount || parseFloat(amount) <= 0) { setError('Enter a valid amount'); return; }
    if (!selectedChannel) { setError('Channel not found'); return; }

    const amountStroops = xlmToStroops(amount).toString();
    const available = BigInt(selectedChannel.totalDeposited) - BigInt(selectedChannel.settledAmount);
    if (BigInt(amountStroops) > available) {
      setError(`Amount exceeds available channel balance (${stroopsToXlm(available.toString())} XLM)`);
      return;
    }

    setGenerating(true);
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + parseInt(expiryHours) * 3600_000);
      const sequence = generateSequenceNumber();

      const canonicalPayload = buildCanonicalPayload({
        channelId: selectedChannel.contractChannelId,
        payer: wallet.address,
        payee: selectedChannel.payee,
        amount: amountStroops,
        asset: VOUCHER_ASSET_XLM,
        sequence,
        issuedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        reference: reference || undefined,
      });

      const voucherId = await computeVoucherId(canonicalPayload);

      // In offline mode, we create a local authorization using a hash-based approach
      // NOTE: We cannot call Freighter signing while fully offline.
      // We use the wallet address as signer and note it in the authorization.
      // When online, real Soroban auth will be produced during settlement.
      const signedPayloadHex = Array.from(new TextEncoder().encode(JSON.stringify(canonicalPayload)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const secret = localStorage.getItem(`session_key_${wallet.address}`);
      if (!secret) {
        throw new Error("No session key found. Please create a new payment channel to initialize your session keys.");
      }
      const sessionKey = Keypair.fromSecret(secret);
      const signatureBuffer = sessionKey.sign(Buffer.from(signedPayloadHex, 'hex'));

      const authorization: VoucherAuthorization = {
        signerAddress: wallet.address,
        signature: signatureBuffer.toString('hex'),
        signedPayloadHex,
      };

      const voucher: Voucher = {
        protocolVersion: PROTOCOL_VERSION,
        voucherId,
        channelId: selectedChannel.contractChannelId,
        payer: wallet.address,
        payee: selectedChannel.payee,
        amount: amountStroops,
        asset: VOUCHER_ASSET_XLM,
        sequence,
        issuedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        reference: reference || undefined,
        authorization,
        localStatus: 'CREATED_OFFLINE',
      };

      // Encode for QR
      const encoded = encodeVoucherForTransport(voucher);
      setEncodedPayload(encoded);

      // Generate QR
      const dataUrl = await QRCode.toDataURL(encoded, {
        width: 200,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      });
      setQrDataUrl(dataUrl);

      // Persist
      await VoucherRepo.save(voucher);
      upsertVoucher(voucher);
      setGeneratedVoucher(voucher);

      toast.success('Offline voucher created');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create voucher');
    } finally {
      setGenerating(false);
    }
  }, [wallet, selectedChannelId, amount, reference, expiryHours, selectedChannel, upsertVoucher]);

  const handleCopy = () => {
    if (encodedPayload) {
      navigator.clipboard.writeText(encodedPayload);
      toast.success('Payload copied to clipboard');
    }
  };

  const handleDownloadQR = () => {
    if (qrDataUrl) {
      const a = document.createElement('a');
      a.href = qrDataUrl;
      a.download = `voucher-${generatedVoucher?.sequence?.toString(16) || 'qr'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('QR Code downloaded');
    }
  };

  const getDeepLink = () => {
    if (!encodedPayload) return '';
    const base = window.location.origin;
    return `${base}/receive?payload=${encodeURIComponent(encodedPayload)}`;
  };

  const handleCopyLink = () => {
    const link = getDeepLink();
    navigator.clipboard.writeText(link);
    toast.success('Payment link copied! Send it to the recipient.');
  };

  const handleShareWhatsApp = () => {
    if (!encodedPayload || !generatedVoucher) return;
    const xlm = stroopsToXlm(generatedVoucher.amount);
    const link = getDeepLink();
    const msg = encodeURIComponent(
      `💸 You have a Veyra payment incoming!\n\n` +
      `Amount: ${xlm} XLM\n` +
      `From: ${generatedVoucher.payer.slice(0, 8)}...\n` +
      `${generatedVoucher.reference ? `Memo: ${generatedVoucher.reference}\n` : ''}` +
      `\n👉 Click to receive:\n${link}`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const handleShareTelegram = () => {
    if (!encodedPayload || !generatedVoucher) return;
    const xlm = stroopsToXlm(generatedVoucher.amount);
    const link = getDeepLink();
    const text = encodeURIComponent(
      `💸 Veyra Payment: ${xlm} XLM\n` +
      `${generatedVoucher.reference ? `Memo: ${generatedVoucher.reference}\n` : ''}` +
      `Click to receive 👇`
    );
    window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${text}`, '_blank');
  };

  if (!wallet) {
    return (
      <div className="p-6">
        <ErrorBanner message="Connect your wallet first to create offline payments." />
      </div>
    );
  }

  return (
    <div className="p-6 animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Create Offline Payment</h1>
        <p className="text-text-muted text-sm mt-1">
          Generate a secure voucher to authorize a payment while disconnected from the mesh.
        </p>
      </div>

      {/* Warning when offline */}
      {isOffline && (
        <div className="mb-5 flex items-start gap-3 p-4 bg-accent-yellow/10 border border-accent-yellow/20 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-accent-yellow shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-accent-yellow">No internet connection</p>
            <p className="text-xs text-text-muted mt-0.5">
              Payments created now are authorized but will settle on Stellar when you reconnect.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: form */}
        <div className="space-y-4">
          {/* Channel selector */}
          <div>
            <label className="label">Active Payment Channel</label>
            <select
              value={selectedChannelId}
              onChange={(e) => setSelectedChannelId(e.target.value)}
              className="input"
            >
              <option value="">Select a channel...</option>
              {activeChannels.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.payer.slice(0, 4)}... ↔ {c.payee.slice(0, 4)}...
                  {' '}(Rem:{' '}
                  {stroopsToXlm(
                    (BigInt(c.totalDeposited) - BigInt(c.settledAmount)).toString()
                  )}{' '}XLM)
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="label">Amount (XLM)</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">XLM</span>
            </div>
            {available && (
              <p className="text-xs text-text-muted mt-1">
                Available: <span className="text-text-secondary">{available} XLM</span>
              </p>
            )}
          </div>

          {/* Recipient (auto from channel) */}
          <div>
            <label className="label">Recipient (Alias or Address)</label>
            <input
              type="text"
              value={selectedChannel?.payee ?? ''}
              readOnly
              className="input opacity-60 cursor-not-allowed"
              placeholder="Select a channel above"
            />
          </div>

          {/* Reference */}
          <div>
            <label className="label">Reference / Memo (Optional)</label>
            <input
              type="text"
              placeholder="e.g., Coffee"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              maxLength={28}
              className="input"
            />
          </div>

          {/* Expiry */}
          <div>
            <label className="label">Voucher Expires In</label>
            <select
              value={expiryHours}
              onChange={(e) => setExpiryHours(e.target.value)}
              className="input"
            >
              <option value="1">1 hour</option>
              <option value="6">6 hours</option>
              <option value="24">24 hours</option>
              <option value="48">48 hours</option>
              <option value="72">72 hours</option>
            </select>
          </div>

          {error && <ErrorBanner message={error} />}

          <button
            onClick={handleGenerate}
            disabled={generating || !selectedChannelId || !amount}
            className="btn-primary w-full py-3 text-base"
          >
            {generating ? (
              <><Spinner className="w-4 h-4" /> Generating...</>
            ) : (
              <><Lock className="w-4 h-4" /> Generate Offline Voucher</>
            )}
          </button>
        </div>

        {/* Right: QR display */}
        <div className="card flex flex-col items-center">
          <div className="flex items-center gap-2 mb-4 self-start">
            <QrCode className="w-4 h-4 text-text-muted" />
            <h3 className="text-sm font-semibold text-text-secondary">Signed Voucher Payload</h3>
          </div>

          {qrDataUrl ? (
            <>
              <div className="qr-container mb-4 rounded-xl overflow-hidden shadow-lg">
                <img src={qrDataUrl} alt="Voucher QR Code" className="w-48 h-48" />
              </div>

              <div className="w-full space-y-2 text-xs text-text-muted">
                <div className="flex justify-between">
                  <span>Voucher Sequence:</span>
                  <span className="font-mono text-text-primary">
                    #{generatedVoucher?.sequence?.toString(16).slice(-4).toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Expires in:</span>
                  <span className="text-text-primary">{expiryHours}h</span>
                </div>
              </div>

              <div className="w-full mt-4 space-y-2">
                {/* Row 1: copy payload + download QR */}
                <div className="flex gap-2">
                  <button onClick={handleCopy} className="btn-secondary flex-1 text-xs px-2">
                    <Copy className="w-3.5 h-3.5" /> Copy Payload
                  </button>
                  <button onClick={handleDownloadQR} className="btn-secondary flex-1 text-xs px-2">
                    <Download className="w-3.5 h-3.5" /> Save QR
                  </button>
                </div>
                {/* Row 2: share deep link */}
                <div className="pt-2 border-t border-border-subtle">
                  <p className="text-[10px] text-text-muted mb-2 text-center">📤 Send payment link to recipient</p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopyLink}
                      className="btn-secondary flex-1 text-xs px-2"
                      title="Copy a link the payee can click to auto-import this voucher"
                    >
                      <Link className="w-3.5 h-3.5" /> Copy Link
                    </button>
                    <button
                      onClick={handleShareWhatsApp}
                      className="btn-secondary flex-1 text-xs px-2 text-green-600 hover:bg-green-50"
                      title="Share via WhatsApp"
                    >
                      <Share2 className="w-3.5 h-3.5" /> WhatsApp
                    </button>
                    <button
                      onClick={handleShareTelegram}
                      className="btn-secondary flex-1 text-xs px-2 text-blue-500 hover:bg-blue-50"
                      title="Share via Telegram"
                    >
                      <Share2 className="w-3.5 h-3.5" /> Telegram
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-8">
              <div className="w-24 h-24 rounded-xl border-2 border-dashed border-border-medium flex items-center justify-center mb-3">
                <QrCode className="w-10 h-10 text-text-muted opacity-40" />
              </div>
              <p className="text-sm text-text-muted">
                Fill in the form and generate a voucher to see the QR code here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
