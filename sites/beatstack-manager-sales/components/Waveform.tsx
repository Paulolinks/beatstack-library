export function Waveform({ className }: { className?: string }) {
  const bars = [3, 5, 8, 12, 16, 20, 16, 12, 8, 5, 3, 6, 10, 14, 18, 14, 10, 6, 4, 7, 11, 15, 11, 7];

  return (
    <div
      className={`flex items-end justify-center gap-[3px] ${className ?? ""}`}
      aria-hidden
    >
      {bars.map((h, i) => (
        <div
          key={i}
          className="w-1 rounded-full bg-gradient-to-t from-sky-500/40 to-violet-400/80 animate-wave"
          style={{
            height: `${h * 3}px`,
            animationDelay: `${i * 0.05}s`,
          }}
        />
      ))}
    </div>
  );
}
