"use client";

import { SampleRow, type SampleListItem } from "./SampleRow";

export function SampleTable({
  samples,
  onMetaChange,
  showPackCover = true,
}: {
  samples: SampleListItem[];
  onMetaChange?: () => void;
  showPackCover?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-[#101014]">
      <div className="grid grid-cols-[auto_auto_minmax(0,1fr)_minmax(120px,180px)_48px_56px_48px_auto] gap-3 border-b border-white/10 bg-[#0d0d12] px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        {showPackCover && <span>Pack</span>}
        <span />
        <span>Filename</span>
        <span className="hidden sm:block">Waveform</span>
        <span className="text-right">Time</span>
        <span className="text-right">Key</span>
        <span className="text-right">BPM</span>
        <span />
      </div>
      <div>
        {samples.length === 0 ? (
          <p className="p-8 text-center text-sm text-zinc-500">Nenhum sample</p>
        ) : (
          samples.map((sample) => (
            <SampleRow
              key={sample.id}
              sample={sample}
              onMetaChange={onMetaChange}
              showPackCover={showPackCover}
            />
          ))
        )}
      </div>
    </div>
  );
}
