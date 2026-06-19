"use client";

import { SampleRow, type SampleListItem } from "./SampleRow";
import type { CopyFolder } from "@/lib/download-sample-client";

export function SampleTable({
  samples,
  onMetaChange,
  onTagClick,
  copyFolder = "downloads",
}: {
  samples: SampleListItem[];
  onMetaChange?: () => void;
  onTagClick?: (tag: string) => void;
  copyFolder?: CopyFolder;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-white/10 bg-[#101014]">
      <table className="w-full min-w-[900px] table-fixed border-collapse">
        <colgroup>
          <col className="w-12" />
          <col className="w-10" />
          <col className="w-[28%]" />
          <col className="w-[22%]" />
          <col className="w-14" />
          <col className="w-[72px]" />
          <col className="w-12" />
          <col className="w-[145px]" />
        </colgroup>
        <thead>
          <tr className="border-b border-white/10 bg-[#0d0d12] text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            <th className="px-2 py-2 text-left font-medium">Pack</th>
            <th className="px-1 py-2" />
            <th className="px-2 py-2 text-left font-medium">Filename</th>
            <th className="px-2 py-2 text-center font-medium">Waveform</th>
            <th className="px-2 py-2 text-right font-medium">Time</th>
            <th className="px-2 py-2 text-right font-medium">Key</th>
            <th className="px-2 py-2 text-right font-medium">BPM</th>
            <th className="px-2 py-2" />
          </tr>
        </thead>
        <tbody>
          {samples.length === 0 ? (
            <tr>
              <td colSpan={8} className="p-8 text-center text-sm text-zinc-500">
                Nenhum sample
              </td>
            </tr>
          ) : (
            samples.map((sample) => (
              <SampleRow
                key={sample.id}
                sample={sample}
                onMetaChange={onMetaChange}
                onTagClick={onTagClick}
                copyFolder={copyFolder}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
