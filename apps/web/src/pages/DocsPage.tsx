export function DocsPage() {
  const steps = [
    { title: 'Create', desc: 'Alice connects Freighter and creates a payment channel on Stellar.' },
    { title: 'Authorize', desc: 'Alice creates a signed offline voucher within channel limits.' },
    { title: 'Exchange', desc: 'Alice shares the voucher via QR code or clipboard.' },
    { title: 'Reconnect', desc: 'Bob or Alice reconnects to the internet.' },
    { title: 'Settle', desc: 'StellarMesh submits the voucher to Soroban — Bob receives XLM.' },
  ];

  return (
    <div className="p-6 max-w-2xl animate-fade-in">
      <h1 className="text-2xl font-bold mb-2">How StellarMesh Works</h1>
      <p className="text-text-muted text-sm mb-8">Pay offline. Settle on Stellar.</p>

      <div className="space-y-4">
        {steps.map(({ title, desc }, i) => (
          <div key={title} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-accent-blue flex items-center justify-center text-white text-sm font-bold shrink-0">
                {i + 1}
              </div>
              {i < steps.length - 1 && <div className="w-0.5 flex-1 bg-border-subtle mt-2" />}
            </div>
            <div className="pb-6">
              <h3 className="text-base font-semibold text-text-primary mb-1">{title}</h3>
              <p className="text-sm text-text-muted">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card mt-4 border-accent-yellow/20 bg-accent-yellow/5">
        <h3 className="text-sm font-semibold text-accent-yellow mb-2">Important: Honesty About Settlement</h3>
        <p className="text-xs text-text-muted">
          StellarMesh never claims an offline payment is settled on Stellar until it actually is.
          Vouchers are clearly marked OFFLINE_AUTHORIZED until the Soroban contract confirms the transaction.
          Only then does the status update to SETTLED_ON_STELLAR with a real transaction hash.
        </p>
      </div>
    </div>
  );
}
