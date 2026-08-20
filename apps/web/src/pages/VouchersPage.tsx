import { useAppStore } from '../store/app.store';
import { FileText, ExternalLink } from 'lucide-react';
import { VoucherStatusBadge, EmptyState, TxHashDisplay } from '../components/ui';
import { stroopsToXlm } from '@stellar-mesh/voucher-protocol';
import { formatDateFull } from '../lib/utils';

export function VouchersPage() {
  const vouchers = useAppStore((s) => s.vouchers);
  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Vouchers</h1>
      {vouchers.length === 0 ? (
        <EmptyState icon={<FileText className="w-6 h-6" />} title="No vouchers" description="Vouchers you create or receive will appear here." />
      ) : (
        <div className="space-y-3">
          {vouchers.map((v) => (
            <div key={v.voucherId} className="card">
              <div className="flex justify-between items-start mb-2">
                <span className="font-mono text-xs text-text-muted">{v.voucherId.slice(0, 16)}...</span>
                <VoucherStatusBadge status={(v.localStatus === 'SETTLED' ? 'SETTLED_ON_STELLAR' : v.localStatus === 'FAILED' ? 'FAILED' : v.localStatus === 'EXPIRED' ? 'EXPIRED' : v.localStatus === 'CANCELLED' ? 'CANCELLED' : v.localStatus === 'PENDING_SETTLEMENT' ? 'PENDING_SETTLEMENT' : 'OFFLINE_AUTHORIZED') as any} />
              </div>
              <p className="text-lg font-bold text-text-primary">{stroopsToXlm(v.amount)} XLM</p>
              <p className="text-xs text-text-muted">{v.payer.slice(0, 12)}... → {v.payee.slice(0, 12)}...</p>
              <p className="text-xs text-text-muted mt-1">{formatDateFull(v.issuedAt)}</p>
              {v.settlementTxHash && <TxHashDisplay txHash={v.settlementTxHash} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useParams } from 'react-router-dom';

export function VoucherDetailPage() {
  const { id } = useParams<{ id: string }>();
  const voucher = useAppStore((s) => s.vouchers.find((v) => v.voucherId === id));
  if (!voucher) return <div className="p-6 text-text-muted">Voucher not found.</div>;
  return (
    <div className="p-6 max-w-xl animate-fade-in">
      <h1 className="text-2xl font-bold mb-6">Voucher Details</h1>
      <div className="card space-y-4">
        <div className="flex justify-between"><span className="label">Voucher ID</span><span className="font-mono text-xs text-text-secondary">{voucher.voucherId.slice(0, 20)}...</span></div>
        <div className="flex justify-between"><span className="label">Amount</span><span className="font-bold">{stroopsToXlm(voucher.amount)} XLM</span></div>
        <div className="flex justify-between"><span className="label">Payer</span><span className="font-mono text-xs">{voucher.payer}</span></div>
        <div className="flex justify-between"><span className="label">Payee</span><span className="font-mono text-xs">{voucher.payee}</span></div>
        <div className="flex justify-between"><span className="label">Issued</span><span className="text-xs">{formatDateFull(voucher.issuedAt)}</span></div>
        <div className="flex justify-between"><span className="label">Expires</span><span className="text-xs">{formatDateFull(voucher.expiresAt)}</span></div>
        {voucher.settlementTxHash && <div><span className="label">Settlement Tx</span><TxHashDisplay txHash={voucher.settlementTxHash} /></div>}
      </div>
    </div>
  );
}
