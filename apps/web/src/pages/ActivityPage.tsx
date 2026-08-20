import { useAppStore } from '../store/app.store';
import { Activity } from 'lucide-react';
import { VoucherStatusBadge, EmptyState } from '../components/ui';
import { stroopsToXlm } from '@stellar-mesh/voucher-protocol';
import { formatDistanceToNow } from '../lib/utils';
import type { VoucherLifecycleStatus } from '@stellar-mesh/shared';

const LIFECYCLE_TO_DISPLAY: Record<VoucherLifecycleStatus, string> = {
  CREATED_OFFLINE: 'OFFLINE_AUTHORIZED',
  RECEIVED_OFFLINE: 'OFFLINE_AUTHORIZED',
  VALIDATED: 'PENDING_SETTLEMENT',
  PENDING_SETTLEMENT: 'PENDING_SETTLEMENT',
  SIMULATION_FAILED: 'FAILED',
  SUBMISSION_PENDING: 'PENDING_SETTLEMENT',
  SETTLED: 'SETTLED_ON_STELLAR',
  FAILED: 'FAILED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
};

export function ActivityPage() {
  const vouchers = useAppStore((s) =>
    [...s.vouchers].sort(
      (a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
    )
  );

  return (
    <div className="p-6 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Activity</h1>
        <p className="text-text-muted text-sm">All payment events from your channels.</p>
      </div>

      {vouchers.length === 0 ? (
        <EmptyState
          icon={<Activity className="w-6 h-6" />}
          title="No activity yet"
          description="Create a channel and make payments to see activity here."
        />
      ) : (
        <div className="space-y-2">
          {vouchers.map((v) => {
            const displayStatus = (v.localStatus
              ? LIFECYCLE_TO_DISPLAY[v.localStatus]
              : 'PENDING_SETTLEMENT') as any;

            return (
              <div key={v.voucherId} className="card-hover flex items-center gap-4">
                <div className="w-2 h-2 rounded-full bg-accent-blue shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary">
                      {stroopsToXlm(v.amount)} XLM
                    </span>
                    <VoucherStatusBadge status={displayStatus} />
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    {v.payer.slice(0, 8)}... → {v.payee.slice(0, 8)}...
                  </p>
                </div>
                <span className="text-xs text-text-muted shrink-0">
                  {formatDistanceToNow(new Date(v.issuedAt))}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
