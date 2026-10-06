export function HeroWaveBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <svg
        className="absolute bottom-0 left-0 w-full opacity-[0.12]"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          className="hero-wave-path hero-wave-1"
          d="M0,160 C240,80 480,240 720,160 C960,80 1200,240 1440,160 L1440,320 L0,320 Z"
          fill="url(#waveGrad1)"
        />
        <path
          className="hero-wave-path hero-wave-2"
          d="M0,200 C360,120 720,280 1080,200 C1260,160 1380,220 1440,200 L1440,320 L0,320 Z"
          fill="url(#waveGrad2)"
        />
        <path
          className="hero-wave-path hero-wave-3"
          d="M0,240 C180,180 540,300 900,220 C1170,160 1320,260 1440,240 L1440,320 L0,320 Z"
          fill="url(#waveGrad3)"
        />
        <defs>
          <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <linearGradient id="waveGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="waveGrad3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#c084fc" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.3" />
          </linearGradient>
        </defs>
      </svg>
      {/* Audio-style bar waves across the hero */}
      <div className="absolute inset-x-0 bottom-24 flex items-end justify-center gap-1 opacity-[0.07] sm:bottom-32">
        {Array.from({ length: 80 }).map((_, i) => (
          <div
            key={i}
            className="w-1 rounded-full bg-gradient-to-t from-violet-600 to-indigo-400 animate-wave"
            style={{
              height: `${12 + Math.sin(i * 0.4) * 20 + Math.cos(i * 0.15) * 15}px`,
              animationDelay: `${i * 0.04}s`,
              animationDuration: `${0.8 + (i % 5) * 0.15}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
