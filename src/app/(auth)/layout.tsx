export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">
      {/* Left panel — form */}
      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-24 py-12">
        <div className="mb-10">
          <div className="flex items-center gap-2.5 mb-12">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#7C3AED"/>
              <rect x="4" y="14" width="3" height="4" rx="1.5" fill="white"/>
              <rect x="9" y="10" width="3" height="12" rx="1.5" fill="white"/>
              <rect x="14" y="6" width="3" height="20" rx="1.5" fill="white"/>
              <rect x="19" y="10" width="3" height="12" rx="1.5" fill="white"/>
              <rect x="24" y="14" width="3" height="4" rx="1.5" fill="white"/>
            </svg>
            <span className="text-white font-semibold text-lg">Talkata</span>
          </div>
        </div>
        <div className="max-w-sm w-full">
          {children}
        </div>
      </div>

      {/* Right panel — visual */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-[#0f0a1a]">
        {/* Gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-violet-400/10 rounded-full blur-2xl" />

        {/* Waveform visual */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-8">
            <div className="flex items-end gap-1.5 h-32">
              {[40, 65, 90, 55, 110, 75, 95, 50, 120, 70, 85, 45, 100, 60, 80, 55, 95, 70, 40, 65].map((h, i) => (
                <div
                  key={i}
                  className="w-2 bg-violet-500 rounded-full opacity-80"
                  style={{
                    height: `${h}%`,
                    opacity: 0.4 + (i % 3) * 0.2
                  }}
                />
              ))}
            </div>
            <div className="text-center">
              <p className="text-white text-2xl font-bold mb-2">Your voice.</p>
              <p className="text-white text-2xl font-bold mb-2">Your style.</p>
              <p className="text-white/40 text-sm mt-4 max-w-xs text-center">
                Turn any text into natural sounding audio.<br/>
                No limits. No compromise.
              </p>
            </div>

            {/* Floating cards */}
            <div className="flex flex-col gap-3 w-72">
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 bg-violet-600/30 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-violet-400 text-xs">🎙</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium">Chapter 6 — The Arrival</p>
                  <p className="text-white/40 text-xs">42,600 characters · 49 mins</p>
                </div>
                <span className="text-green-400 text-xs">Done</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 bg-violet-600/30 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-violet-400 text-xs">📢</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium">Product launch script</p>
                  <p className="text-white/40 text-xs">2,100 characters · 3 mins</p>
                </div>
                <span className="text-green-400 text-xs">Done</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}