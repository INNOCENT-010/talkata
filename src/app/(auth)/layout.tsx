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

      {/* Right panel — video */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-[#0a0a0f]">
        {/* Fullscreen video */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          src="/brand-video.mp4"
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/50" />
        {/* Gradient from bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-80 bg-gradient-to-t from-black/80 to-transparent" />
        {/* Text at bottom-left like Claude */}
        <div className="absolute bottom-12 left-10 right-10">
          <p className="text-white text-3xl font-bold leading-snug mb-3">
            Your voice.<br/>Your style.
          </p>
          <p className="text-white/50 text-sm max-w-xs">
            Turn any text into natural sounding audio. No limits. No compromise.
          </p>
        </div>
      </div>
    </div>
  )
}