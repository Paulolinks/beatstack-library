/** Caminho com barras invertidas no Windows. */
export function normalizePathForClipboard(filePath: string): string {
  if (typeof navigator !== "undefined" && /win/i.test(navigator.userAgent)) {
    return filePath.replace(/\//g, "\\");
  }
  return filePath;
}

async function copyFileViaDesktopBridge(filePath: string): Promise<boolean> {
  if (typeof window === "undefined" || !window.beatstack?.copyFile) return false;
  try {
    const result = await window.beatstack.copyFile(filePath);
    return result?.ok === true;
  } catch {
    return false;
  }
}

/** Copia o arquivo de áudio para a área de transferência (modo Splice / DAW). */
export async function copyFileToClipboard(filePath: string): Promise<boolean> {
  if (!filePath) return false;
  const normalized = normalizePathForClipboard(filePath);

  if (await copyFileViaDesktopBridge(normalized)) {
    return true;
  }

  return copyTextToClipboard(normalized);
}

/** Copia texto (fallback — caminho do arquivo). */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  const normalized = normalizePathForClipboard(text);

  if (typeof window !== "undefined" && window.beatstack?.copyText) {
    try {
      const result = await window.beatstack.copyText(normalized);
      if (result?.ok) return true;
    } catch {
      /* tenta fallback */
    }
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(normalized);
      return true;
    }
  } catch {
    /* tenta fallback */
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = normalized;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "0";
    textarea.style.width = "1px";
    textarea.style.height = "1px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, normalized.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
