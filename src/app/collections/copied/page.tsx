"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { SampleBrowser } from "@/components/SampleBrowser";
import { PresetFolderList, type PackAssetItem } from "@/components/PresetFolderList";

function CopiedContent() {
  const [assets, setAssets] = useState<PackAssetItem[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadAssets = useCallback(async () => {
    const res = await fetch("/api/assets?downloaded=true");
    const data = (await res.json()) as { assets: PackAssetItem[] };
    setAssets(data.assets ?? []);
  }, []);

  useEffect(() => {
    void loadAssets();
  }, [loadAssets, refreshKey]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Copiados</h1>

      {assets.length > 0 && (
        <PresetFolderList
          assets={assets}
          showPack
          onCopied={() => setRefreshKey((k) => k + 1)}
        />
      )}

      <h2 className="mb-4 text-lg font-semibold">Samples</h2>
      <SampleBrowser
        title=""
        preset={{ downloaded: true, copyFolder: "copied" }}
        showRatingFilter
        hideTitle
      />
    </div>
  );
}

export default function CopiedCollectionPage() {
  return (
    <Suspense fallback={<p className="text-zinc-500">Carregando...</p>}>
      <CopiedContent />
    </Suspense>
  );
}
