import { useNavigate } from 'react-router-dom';
import { ArrowRight, Zap, WifiOff, QrCode, CheckCircle2 } from 'lucide-react';

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg-primary font-sans relative overflow-hidden">
      {/* Background Video */}
      <video 
        src="/hero-video.mp4" 
        autoPlay 
        loop 
        muted 
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-overlay pointer-events-none z-0"
      />

      {/* Background Decorative Blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-[#a78bfa] rounded-full mix-blend-multiply filter blur-[150px] opacity-40 animate-float pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-[#ff6b6b] rounded-full mix-blend-multiply filter blur-[150px] opacity-30 animate-float-delay pointer-events-none z-0"></div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b-2 border-white/20 backdrop-blur-md">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 rounded-lg overflow-hidden bg-white shadow-sm border border-white/20 flex items-center justify-center">
             <img src="/logo.jpg" alt="Veyra Logo" className="w-full h-full object-cover" />
           </div>
           <span className="text-xl font-black text-[#1a1a2e] tracking-tight">Veyra</span>
        </div>
        <button onClick={() => navigate('/dashboard')} className="btn-clay-white !px-6 !py-2.5">
          Launch App <ArrowRight className="w-4 h-4" />
        </button>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center py-32 px-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 backdrop-blur-sm shadow-clay-sm border border-white/80 text-[#1a1a2e] text-xs font-bold mb-8 uppercase tracking-widest">
          <span className="w-2 h-2 rounded-full bg-[#36d4a7] animate-pulse shadow-[0_0_8px_#36d4a7]" />
          Powered by Stellar Soroban
        </div>
        
        <h1 className="text-7xl md:text-8xl font-black mb-6 leading-[1.1] tracking-tighter text-[#1a1a2e]">
          PAY OFFLINE.<br />
          <span className="text-gradient-red">SETTLE ON STELLAR.</span>
        </h1>
        
        <p className="text-[#4a4a6a] font-medium text-xl md:text-2xl max-w-2xl mb-12">
          Temporary connectivity shouldn't stop people from exchanging value. 
          Veyra brings offline payments to the Stellar network.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 mb-16">
          <button onClick={() => navigate('/dashboard')} className="btn-clay-red px-10 py-4 text-lg">
            Launch App <ArrowRight className="w-5 h-5 ml-2" />
          </button>
          <button onClick={() => navigate('/docs')} className="btn-clay-white px-10 py-4 text-lg">
            How It Works
          </button>
        </div>
      </section>

      {/* Swiss grid line */}
      <div className="max-w-5xl mx-auto px-8 relative z-10">
         <div className="swiss-grid-line"></div>
      </div>

      {/* Steps */}
      <section className="py-24 px-8 relative z-10">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-6">
          {[
            { icon: Zap, label: 'Create', desc: 'Fund a payment channel on Stellar', color: 'blue' },
            { icon: WifiOff, label: 'Authorize', desc: 'Create signed voucher while offline', color: 'red' },
            { icon: QrCode, label: 'Exchange', desc: 'Share via QR code', color: 'mint' },
            { icon: ArrowRight, label: 'Reconnect', desc: 'Come back online', color: 'yellow' },
            { icon: CheckCircle2, label: 'Settle', desc: 'Soroban confirms on-chain', color: 'blue' },
          ].map(({ icon: Icon, label, desc, color }, index) => {
             const bgMap: any = {
                blue: 'bg-gradient-to-br from-[#6fa3f7] to-[#5b8def] shadow-[0_4px_0_#3a6fd4,0_10px_20px_rgba(91,141,239,0.3)] text-white',
                red: 'bg-gradient-to-br from-[#f05060] to-[#e63946] shadow-[0_4px_0_#c1121f,0_10px_20px_rgba(230,57,70,0.3)] text-white',
                mint: 'bg-gradient-to-br from-[#4de0b5] to-[#36d4a7] shadow-[0_4px_0_#1eb88c,0_10px_20px_rgba(54,212,167,0.3)] text-white',
                yellow: 'bg-gradient-to-br from-[#fde68a] to-[#f59e0b] shadow-[0_4px_0_#d97706,0_10px_20px_rgba(245,158,11,0.3)] text-[#b45309]'
             };
             return (
               <div key={label} className="flex flex-col items-center text-center group cursor-default">
                 <div className={`w-16 h-16 rounded-[20px] flex items-center justify-center mb-6 transform transition-transform group-hover:-translate-y-2 group-hover:scale-105 ${bgMap[color]}`}>
                   <Icon className="w-8 h-8" />
                 </div>
                 <h3 className="font-black text-lg text-[#1a1a2e] mb-2 uppercase tracking-wide">
                   <span className="text-[#8888a8] mr-2">0{index + 1}</span>
                   {label}
                 </h3>
                 <p className="text-sm font-medium text-[#4a4a6a]">{desc}</p>
               </div>
             );
          })}
        </div>
      </section>
    </div>
  );
}
