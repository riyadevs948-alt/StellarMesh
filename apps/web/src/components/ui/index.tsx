// ============================================================
// Veyra — Shared UI Components
// ============================================================
import React from 'react';
import clsx from 'clsx';
import type { VoucherDisplayStatus, ChannelStatus, SettlementStatus } from '@stellar-mesh/shared';

// ─── Status Badges ────────────────────────────────────────────

const VOUCHER_BADGE: Record<VoucherDisplayStatus, string> = {
  OFFLINE_AUTHORIZED: 'badge-offline',
  PENDING_SETTLEMENT: 'badge-pending',
  SETTLED_ON_STELLAR: 'badge-settled',
  FAILED: 'badge-failed',
  EXPIRED: 'badge-expired',
  CANCELLED: 'badge-cancelled',
};

const VOUCHER_LABELS: Record<VoucherDisplayStatus, string> = {
  OFFLINE_AUTHORIZED: 'Authorized',
  PENDING_SETTLEMENT: 'Pending Settlement',
  SETTLED_ON_STELLAR: 'Settled',
  FAILED: 'Failed',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
};

export function VoucherStatusBadge({ status }: { status: VoucherDisplayStatus }) {
  return (
    <span className={clsx('badge', VOUCHER_BADGE[status])}>
      {VOUCHER_LABELS[status]}
    </span>
  );
}

const SETTLEMENT_BADGE: Record<string, string> = {
  PENDING: 'badge-offline',
  VALIDATING: 'badge-pending',
  SIMULATING: 'badge-pending',
  AWAITING_SIGNATURE: 'badge-offline',
  SUBMITTING: 'badge-pending',
  CONFIRMING: 'badge-pending',
  SETTLED: 'badge-settled',
  FAILED: 'badge-failed',
  PERMANENTLY_FAILED: 'badge-failed',
};

export function SettlementStatusBadge({ status }: { status: SettlementStatus }) {
  return (
    <span className={clsx('badge', SETTLEMENT_BADGE[status] ?? 'badge-offline')}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

const CHANNEL_BADGE: Record<ChannelStatus, string> = {
  CREATING: 'badge-offline',
  FUNDING: 'badge-pending',
  ACTIVE: 'badge-settled',
  DRAINING: 'badge-pending',
  CLOSING: 'badge-offline',
  CLOSED: 'badge-expired',
  CANCELLED: 'badge-cancelled',
  EXPIRED: 'badge-expired',
  ERROR: 'badge-failed',
};

export function ChannelStatusBadge({ status }: { status: ChannelStatus }) {
  return (
    <span className={clsx('badge', CHANNEL_BADGE[status] ?? 'badge-offline')}>
      {status}
    </span>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        'skeleton h-4 rounded',
        className
      )}
      style={{
        background: 'linear-gradient(90deg, #1a1a24 25%, #1e1e28 50%, #1a1a24 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
      }}
    />
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card space-y-3">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={i === 0 ? 'w-1/2 h-5' : 'w-full'} />
      ))}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      <div className="w-14 h-14 rounded-2xl bg-bg-tertiary border border-border-subtle flex items-center justify-center mb-4 text-text-muted">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-text-primary mb-1">{title}</h3>
      <p className="text-sm text-text-muted max-w-xs">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ─── Loading Spinner ──────────────────────────────────────────

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={clsx('animate-spin', className ?? 'w-5 h-5 text-accent-blue')}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Copy Button ──────────────────────────────────────────────

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button onClick={handleCopy} className="btn-ghost py-1 px-2 text-xs gap-1.5">
      {copied ? <Check className="w-3.5 h-3.5 text-accent-green" /> : <Copy className="w-3.5 h-3.5" />}
      {label ?? (copied ? 'Copied!' : 'Copy')}
    </button>
  );
}

// ─── Step Indicator ───────────────────────────────────────────

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => (
        <React.Fragment key={step}>
          <div className="flex flex-col items-center">
            <div
              className={clsx(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                i < currentStep
                  ? 'bg-accent-blue text-white'
                  : i === currentStep
                  ? 'bg-accent-blue text-white ring-2 ring-accent-blue/30'
                  : 'bg-bg-tertiary text-text-muted border border-border-subtle'
              )}
            >
              {i < currentStep ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
          </div>
          {i < steps.length - 1 && (
            <div
              className={clsx(
                'flex-1 h-0.5 mx-1 rounded transition-all',
                i < currentStep ? 'bg-accent-blue' : 'bg-border-subtle'
              )}
              style={{ minWidth: '2rem' }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Error Banner ─────────────────────────────────────────────

export function ErrorBanner({ message, className, onRetry }: { message: string; className?: string; onRetry?: () => void }) {
  return (
    <div className={`p-4 rounded-xl border border-accent-red/20 bg-accent-red/5 flex items-start gap-3 text-sm ${className || ''}`}>
      <div className="w-5 h-5 rounded-full bg-accent-red/20 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-accent-red text-xs font-bold">!</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-accent-red">{message}</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="btn-ghost text-xs text-accent-red shrink-0">
          Retry
        </button>
      )}
    </div>
  );
}

// ─── Transaction Hash Display ─────────────────────────────────

import { ExternalLink } from 'lucide-react';
import { explorerTxUrl } from '../../lib/stellar';

export function TxHashDisplay({ txHash }: { txHash: string }) {
  const short = `${txHash.slice(0, 8)}...${txHash.slice(-8)}`;
  return (
    <div className="flex items-center gap-2 font-mono text-xs text-accent-blue">
      <span>{short}</span>
      <CopyButton value={txHash} />
      <a
        href={explorerTxUrl(txHash)}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-ghost py-1 px-1.5 text-xs"
        aria-label="View on Explorer"
      >
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}
