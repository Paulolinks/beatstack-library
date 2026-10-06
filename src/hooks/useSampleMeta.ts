"use client";

import { useCallback, useEffect, useState } from "react";

export function useSampleMeta(
  sampleId: string,
  initial: { rating: number | null; favorite: boolean } | null,
  onExternalChange?: () => void,
) {
  const [rating, setRating] = useState<number | null>(initial?.rating ?? null);
  const [favorite, setFavorite] = useState(initial?.favorite ?? false);

  useEffect(() => {
    setRating(initial?.rating ?? null);
    setFavorite(initial?.favorite ?? false);
  }, [sampleId, initial?.rating, initial?.favorite]);

  const updateMeta = useCallback(
    async (data: { rating?: number | null; favorite?: boolean }) => {
      if (data.rating !== undefined) setRating(data.rating);
      if (data.favorite !== undefined) setFavorite(data.favorite);

      try {
        const res = await fetch(`/api/samples/${sampleId}/meta`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const json = (await res.json()) as {
          meta?: { rating: number | null; favorite: boolean };
          copiedTo?: string;
          favoriteFolderName?: string;
          error?: string;
        };
        if (!res.ok) {
          if (data.rating !== undefined) setRating(initial?.rating ?? null);
          if (data.favorite !== undefined) setFavorite(initial?.favorite ?? false);
          return { ok: false as const, error: json.error ?? "Falha ao salvar" };
        }
        if (json.meta) {
          if (json.meta.rating !== undefined) setRating(json.meta.rating);
          if (json.meta.favorite !== undefined) setFavorite(json.meta.favorite);
        }
        onExternalChange?.();
        return { ok: true as const, ...json };
      } catch {
        if (data.rating !== undefined) setRating(initial?.rating ?? null);
        if (data.favorite !== undefined) setFavorite(initial?.favorite ?? false);
        return { ok: false as const, error: "Erro de rede" };
      }
    },
    [sampleId, initial, onExternalChange],
  );

  return { rating, favorite, updateMeta };
}
