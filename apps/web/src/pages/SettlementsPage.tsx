// ============================================================
// Veyra — Settlement Queue Page
// Matches reference: stats cards, voucher list with status, retry
// ============================================================
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, Clock, AlertTriangle, RefreshCw,
  ExternalLink, ChevronRight, Wifi,
} from 'lucide-react';
import clsx from 'clsx';
import { useAppStore, useIsOffline } from '../store/app.store';
import { VoucherRepo, SettlementAttemptRepo } from '../lib/db';
import { SettlementStatusBadge, Spinner, EmptyState, TxHashDisplay } from '../components/ui';
import { stroopsToXlm } from '@stellar-mesh/voucher-protocol';
import { explorerTxUrl } from '../lib/stellar';
import { formatDistanceToNow, shortenAddress } from '../lib/utils';
import type { Voucher, SettlementAttempt } from '@stellar-mesh/shared';
import toast from 'react-hot-toast';

type FilterTab = 'all' | 'pending' | 'settled' | 'failed';

export function SettlementsPage() {
  const navigate = useNavigate();
  const isOffline = useIsOffline();
  const vouchers = useAppStore((s) => s.vouchers);
  const [attempts, setAttempts] = useState<SettlementAttempt[]>([]);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const [vs, ats] = await Promise.all([
        VoucherRepo.getAll(),
        SettlementAttemptRepo.getAll(),
      ]);
      useAppStore.getState().setVouchers(vs);
      setAttempts(ats);
      setLoading(false);
    })();
  }, []);

  // Stats
  const pendingVouchers = vouchers.filter(
    (v) => v.localStatus === 'PENDING_SETTLEMENT' || v.localStatus === 'SUBMISSION_PENDING'
  );
  const settledToday = vouchers.filter((v) => {
    if (v.localStatus !== 'SETTLED') return false;
    const today = new Date();
    const issuedDate = v.settlementLedger ? new Date(v.issuedAt) : null;
    return issuedDate && issuedDate.toDateString() === today.toDateString();
  });
  const failedVouchers = vouchers.filter((v) => v.localStatus === 'FAILED');

  const pendingAmount = pendingVouchers.reduce((sum, v) => sum + BigInt(v.amount), 0n);
  const settledTodayAmount = settledToday.reduce((sum, v) => sum + BigInt(v.amount), 0n);
  const failedAmount = failedVouchers.reduce((sum, v) => sum + BigInt(v.amount), 0n);

  // Filter vouchers for list
  const filteredVouchers = vouchers.filter((v) => {
    if (filter === 'pending') return v.localStatus === 'PENDING_SETTLEMENT' || v.localStatus === 'SUBMISSION_PENDING';
    if (filter === 'settled') return v.localStatus === 'SETTLED';
    if (filter === 'failed') return v.localStatus === 'FAILED';
    return true;
  });

  const getVoucherAttempt = (voucherId: string) =>
    attempts.filter((a) => a.voucherId === voucherId).sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    )[0];

  const handleRetry = async (voucher: Voucher) => {
    if (isOffline) {
      toast.error('Cannot settle while offline');
      return;
    }
    toast.loading('Retrying settlement...', { id: voucher.voucherId });
    // Settlement engine will pick it up
    await VoucherRepo.updateStatus(voucher.voucherId, 'PENDING_SETTLEMENT');
    useAppStore.getState().upsertVoucher({ ...voucher, localStatus: 'PENDING_SETTLEMENT' });
    toast.success('Voucher re-queued for settlement', { id: voucher.voucherId });
  };

  return (
    <div className="p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Settlement Queue</h1>
          <p className="text-text-muted text-sm">Monitor offline vouchers syncing to the ledger.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
            isOffline
              ? 'bg-accent-yellow/10 text-accent-yellow border border-accent-yellow/20'
              : 'bg-accent-green/10 text-accent-green border border-accent-green/20'
          )}>
            <span className={clsx('w-1.5 h-1.5 rounded-full', isOffline ? 'bg-accent-yellow' : 'bg-accent-green animate-pulse')} />
            {isOffline ? 'MESH SYNC PAUSED' : 'MESH SYNC ACTIVE'}
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="label">Pending Settlement</p>
            <Clock className="w-4 h-4 text-text-muted" />
          </div>
          <p className="text-2xl font-bold text-text-primary">
            {stroopsToXlm(pendingAmount.toString())} <span className="text-base font-normal text-text-muted">XLM</span>
          </p>
          <p className="text-xs text-text-muted mt-1">{pendingVouchers.length} Voucher{pendingVouchers.length !== 1 ? 's' : ''} Simulating</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="label">Settled Today</p>
            <CheckCircle2 className="w-4 h-4 text-accent-green" />
          </div>
          <p className="text-2xl font-bold text-text-primary">
            {stroopsToXlm(settledTodayAmount.toString())} <span className="text-base font-normal text-text-muted">XLM</span>
          </p>
          <p className="text-xs text-accent-green mt-1">{settledToday.length} Voucher{settledToday.length !== 1 ? 's' : ''} Finalized</p>
        </div>

        <div className={clsx('card', failedVouchers.length > 0 && 'border-accent-red/20 bg-accent-red/5')}>
          <div className="flex items-center justify-between mb-2">
            <p className="label">Failed / Requires Action</p>
            <AlertTriangle className={clsx('w-4 h-4', failedVouchers.length > 0 ? 'text-accent-red' : 'text-text-muted')} />
          </div>
          <p className={clsx('text-2xl font-bold', failedVouchers.length > 0 ? 'text-accent-red' : 'text-text-primary')}>
            {stroopsToXlm(failedAmount.toString())} <span className="text-base font-normal text-text-muted">XLM</span>
          </p>
          <p className="text-xs text-accent-red mt-1">{failedVouchers.length} Voucher{failedVouchers.length !== 1 ? 's' : ''} Failed</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 border-b border-border-subtle">
        {(['all', 'pending', 'settled', 'failed'] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={clsx(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize',
              filter === tab
                ? 'border-accent-blue text-accent-blue'
                : 'border-transparent text-text-muted hover:text-text-primary'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Voucher list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-16 animate-pulse bg-bg-tertiary" />
          ))}
        </div>
      ) : filteredVouchers.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="w-6 h-6" />}
          title="No vouchers here"
          description={filter === 'all' ? 'No vouchers yet. Create a payment to get started.' : `No ${filter} vouchers.`}
        />
      ) : (
        <div className="space-y-3">
          {filteredVouchers.map((voucher) => {
            const attempt = getVoucherAttempt(voucher.voucherId);
            const isSettled = voucher.localStatus === 'SETTLED';
            const isFailed = voucher.localStatus === 'FAILED';
            const isPending = voucher.localStatus === 'PENDING_SETTLEMENT' || voucher.localStatus === 'SUBMISSION_PENDING';

            return (
              <div
                key={voucher.voucherId}
                className={clsx(
                  'card flex items-center gap-4 cursor-pointer hover:bg-bg-hover transition-colors',
                  isFailed && 'border-accent-red/20 bg-accent-red/5 hover:bg-accent-red/8'
                )}
                onClick={() => navigate(`/vouchers/${voucher.voucherId}`)}
              >
                {/* Status icon */}
                <div className={clsx(
                  'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                  isSettled ? 'bg-accent-green/10' : isFailed ? 'bg-accent-red/10' : 'bg-accent-blue/10'
                )}>
                  {isSettled ? (
                    <CheckCircle2 className="w-5 h-5 text-accent-green" />
                  ) : isFailed ? (
                    <AlertTriangle className="w-5 h-5 text-accent-red" />
                  ) : (
                    <RefreshCw className="w-5 h-5 text-accent-blue animate-spin" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-text-primary">
                      Voucher #{voucher.sequence.toString(16).toUpperCase().slice(-4)}
                    </span>
                    {attempt?.status && <SettlementStatusBadge status={attempt.status} />}
                  </div>
                  <p className="text-xs text-text-muted">
                    {shortenAddress(voucher.payer)} → {shortenAddress(voucher.payee)}
                  </p>
                  {isFailed && attempt?.errorMessage && (
                    <p className="text-xs text-accent-red mt-0.5">{attempt.errorMessage}</p>
                  )}
                  {isSettled && voucher.settlementTxHash && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-xs text-text-muted font-mono">
                        Tx: {voucher.settlementTxHash.slice(0, 10)}...
                      </span>
                      <a
                        href={explorerTxUrl(voucher.settlementTxHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-accent-blue hover:underline flex items-center gap-0.5"
                      >
                        VIEW ON EXPLORER <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  )}
                  {isPending && (
                    <p className="text-xs text-accent-blue mt-0.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-pulse" />
                      Simulating...
                    </p>
                  )}
                </div>

                {/* Amount + action */}
                <div className="text-right shrink-0">
                  <p className={clsx(
                    'text-base font-bold',
                    isFailed ? 'text-accent-red line-through opacity-70' : 'text-text-primary'
                  )}>
                    {stroopsToXlm(voucher.amount)} <span className="text-xs font-normal">XLM</span>
                  </p>
                  {isFailed && !isOffline && (
                    <button
                      onClick={(e) => { e.stopPropagation(); void handleRetry(voucher); }}
                      className="mt-1 text-xs px-2 py-0.5 border border-accent-red/40 text-accent-red rounded hover:bg-accent-red hover:text-white transition-colors"
                    >
                      RETRY
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
