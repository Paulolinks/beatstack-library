export {};

declare global {
  interface Window {
    beatstack?: {
      isDesktop?: boolean;
      copyFile?: (filePath: string) => Promise<{ ok: boolean; error?: string }>;
      copyText?: (text: string) => Promise<{ ok: boolean; error?: string }>;
      openPath?: (targetPath: string) => Promise<{ ok: boolean; error?: string }>;
      saveSampleLocal?: (payload: {
        folder: "downloads" | "likes" | "copied";
        packSlug: string;
        fileName: string;
        buffer: ArrayBuffer;
      }) => Promise<{ ok: boolean; path?: string; clipboardOk?: boolean; error?: string }>;
      saveSampleToFavorite?: (payload: {
        packSlug: string;
        fileName: string;
        buffer: ArrayBuffer;
        folderSlug?: string | null;
      }) => Promise<{ ok: boolean; path?: string; clipboardOk?: boolean; error?: string }>;
      removeSampleFromFavorite?: (payload: {
        packSlug: string;
        fileName: string;
        folderSlug?: string | null;
      }) => Promise<{ ok: boolean; error?: string }>;
      favoriteFolders?: {
        list: () => Promise<{
          folders: Array<{
            id: string;
            name: string;
            slug: string;
            isDefault: boolean;
            diskPath?: string;
          }>;
          activeFavoriteFolderId: string | null;
        }>;
        create: (name: string) => Promise<{ ok: boolean; error?: string; status?: number }>;
        setActive: (folderId: string | null) => Promise<{ ok: boolean; error?: string }>;
        delete: (folderId: string) => Promise<{ ok: boolean; error?: string }>;
        addSample: (payload: {
          sampleId: string;
          folderId?: string | null;
          packSlug: string;
          fileName: string;
        }) => Promise<{ ok: boolean; error?: string; folderId?: string }>;
        removeSample: (payload: {
          sampleId?: string;
          folderId?: string | null;
          packSlug: string;
          fileName: string;
        }) => Promise<{ ok: boolean; error?: string }>;
        listSampleIds: (folderId?: string | null) => Promise<string[]>;
      };
      legal?: {
        getStatus: () => Promise<{
          accepted: boolean;
          needsReaccept: boolean;
          record: {
            termsVersion: string;
            privacyVersion: string;
            acceptedAt: string;
            appVersion?: string;
            os?: string;
            source?: string;
          } | null;
        }>;
        accept: (record: {
          termsVersion: string;
          privacyVersion: string;
          acceptedAt: string;
          appVersion?: string;
          os?: string;
          source?: string;
        }) => Promise<{ ok: boolean; record: unknown }>;
      };
      selectDirectory?: (opts?: {
        title?: string;
        defaultPath?: string;
      }) => Promise<{ ok: boolean; path?: string; canceled?: boolean; error?: string }>;
      storage?: {
        get: () => Promise<{
          ok: boolean;
          storageRoot?: string;
          defaultRoot?: string;
          configPath?: string;
          error?: string;
        }>;
        set: (storageRoot: string) => Promise<{
          ok: boolean;
          storageRoot?: string;
          error?: string;
        }>;
      };
    };
  }
}
