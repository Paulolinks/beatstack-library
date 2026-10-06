const fs = require("fs");
const { execFileSync } = require("child_process");

function psLiteralPath(filePath) {
  return `'${filePath.replace(/'/g, "''")}'`;
}

function appleScriptString(value) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** macOS: coloca o arquivo na área de transferência como no Finder (Cmd+C). */
function copyFileToClipboardMac(filePath) {
  try {
    execFileSync("osascript", ["-e", `set the clipboard to (POSIX file ${appleScriptString(filePath)})`], {
      stdio: "pipe",
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Copia o arquivo de áudio para a área de transferência (formato Windows CF_HDROP — igual Explorer). */
function copyFileToClipboardWin(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return { ok: false, error: "Arquivo não encontrado" };
  }
  if (process.platform === "darwin") {
    return copyFileToClipboardMac(filePath);
  }
  if (process.platform !== "win32") {
    return { ok: false, error: "Cópia de arquivo só suportada no Windows e macOS" };
  }

  try {
    const script = `Set-Clipboard -LiteralPath ${psLiteralPath(filePath)}`;
    execFileSync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
      { stdio: "pipe", windowsHide: true },
    );
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

module.exports = { copyFileToClipboardWin };
