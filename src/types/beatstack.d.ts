export {};

declare global {
  interface Window {
    beatstack?: {
      isDesktop?: boolean;
      copyFile?: (filePath: string) => Promise<{ ok: boolean; error?: string }>;
      copyText?: (text: string) => Promise<{ ok: boolean; error?: string }>;
      saveSampleLocal?: (payload: {
        folder: "downloads" | "likes" | "copied";
        packSlug: string;
        fileName: string;
        buffer: ArrayBuffer;
      }) => Promise<{ ok: boolean; path?: string; clipboardOk?: boolean; error?: string }>;
    };
  }
}
