"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SampleBrowser } from "@/components/SampleBrowser";
import { FavoriteFolderHeader } from "@/components/FavoriteFolderHeader";

function FavoritosContent() {
  const searchParams = useSearchParams();
  const folderId = searchParams.get("folderId") || undefined;

  return (
    <>
      <FavoriteFolderHeader folderId={folderId} />
      <SampleBrowser
        hideTitle
        preset={{ favorite: true, copyFolder: "likes" }}
        showRatingFilter={true}
      />
    </>
  );
}

export default function FavoritosCollectionPage() {
  return (
    <Suspense fallback={<p className="text-zinc-500">…</p>}>
      <FavoritosContent />
    </Suspense>
  );
}
