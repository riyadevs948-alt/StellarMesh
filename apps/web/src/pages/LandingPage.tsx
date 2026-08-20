import { useNavigate } from 'react-router-dom';
import { ArrowRight, Zap, WifiOff, QrCode, CheckCircle2 } from 'lucide-react';

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary font-sans">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-border-subtle">
        <span className="text-xl font-bold">Stellar<span className="text-accent-blue">Mesh</span></span>
        <button onClick={() => navigate('/')} className="btn-primary">
          Launch App <ArrowRight className="w-4 h-4" />
        </button>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center py-24 px-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-blue/10 border border-accent-blue/20 text-accent-blue text-xs font-medium mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
          Stellar Testnet · Production Architecture
        </div>
        <h1 className="text-6xl font-black mb-4 leading-tight">
          PAY OFFLINE.<br />
          <span className="text-gradient">SETTLE ON STELLAR.</span>
        </h1>
        <p className="text-text-muted text-xl max-w-xl mb-10">
          Temporary connectivity shouldn't stop people from exchanging value.
        </p>
        <div className="flex gap-3">
          <button onClick={() => navigate('/')} className="btn-primary px-8 py-3 text-base">
            Launch App <ArrowRight className="w-5 h-5" />
          </button>
          <button onClick={() => navigate('/docs')} className="btn-secondary px-8 py-3 text-base">
            How It Works
          </button>
        </div>
      </section>

      {/* Steps */}
      <section className="py-16 px-8 border-t border-border-subtle">
        <div className="max-w-4xl mx-auto grid grid-cols-5 gap-4 text-center">
          {[
            { icon: Zap, label: 'Create', desc: 'Fund a payment channel on Stellar' },
            { icon: WifiOff, label: 'Authorize', desc: 'Create signed voucher while offline' },
            { icon: QrCode, label: 'Exchange', desc: 'Share via QR code' },
            { icon: ArrowRight, label: 'Reconnect', desc: 'Come back online' },
            { icon: CheckCircle2, label: 'Settle', desc: 'Soroban confirms on-chain' },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-bg-card border border-border-subtle flex items-center justify-center mb-3">
                <Icon className="w-6 h-6 text-accent-blue" />
              </div>
              <p className="font-semibold text-sm">{label}</p>
              <p className="text-xs text-text-muted mt-1">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
