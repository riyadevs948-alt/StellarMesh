import { useNavigate } from 'react-router-dom';
import { Zap, Activity, CheckCircle2, ExternalLink } from 'lucide-react';
import { useAppStore } from '../store/app.store';
import { ChannelStatusBadge, EmptyState } from '../components/ui';
import { stroopsToXlm } from '@stellar-mesh/voucher-protocol';
import { formatDate } from '../lib/utils';

export function ChannelsPage() {
  const navigate = useNavigate();
  const channels = useAppStore((s) => s.channels);
  const explorerUrl = import.meta.env.VITE_EXPLORER_BASE_URL || 'https://stellar.expert/explorer/testnet';

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Payment Channels</h1>
          <p className="text-text-muted text-sm">Manage your active Stellar payment channels.</p>
        </div>
        <button onClick={() => navigate('/channels/create')} className="btn-primary">
          <Zap className="w-4 h-4" /> New Channel
        </button>
      </div>

      {channels.length === 0 ? (
        <EmptyState
          icon={<Zap className="w-6 h-6" />}
          title="No active payment channels"
          description="Create a channel to start making offline payments."
          action={<button onClick={() => navigate('/channels/create')} className="btn-primary">Create Channel</button>}
        />
      ) : (
        <div className="space-y-3">
          {channels.map((c) => (
            <div key={c.id} className="card-hover">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5 text-accent-blue" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium text-text-primary font-mono flex items-center gap-1">
                      <a href={`${explorerUrl}/account/${c.payer}`} target="_blank" rel="noreferrer" className="hover:text-accent-blue transition-colors" title="View Payer on Stellar Expert">
                        {c.payer.slice(0, 8)}...
                      </a>
                      <span>→</span>
                      <a href={`${explorerUrl}/account/${c.payee}`} target="_blank" rel="noreferrer" className="hover:text-accent-blue transition-colors" title="View Payee on Stellar Expert">
                        {c.payee.slice(0, 8)}...
                      </a>
                    </p>
                    <ChannelStatusBadge status={c.status} />
                    {(c.fundingTxHash || c.creationTxHash) && (
                      <a 
                        href={`${explorerUrl}/tx/${c.fundingTxHash || c.creationTxHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-text-muted hover:text-accent-blue transition-colors flex items-center gap-1 text-xs"
                        title="View Transaction on Stellar Explorer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-text-muted">
                    Limit: {stroopsToXlm(c.limitAmount)} XLM · Expires: {formatDate(c.expiresAt)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-text-primary">
                    {stroopsToXlm((BigInt(c.totalDeposited) - BigInt(c.settledAmount)).toString())} XLM
                  </p>
                  <p className="text-xs text-text-muted">available</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
