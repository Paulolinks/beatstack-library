export interface FolderFileEntry {
  file: File;
  path: string;
}

export async function readDirectoryEntry(
  entry: FileSystemDirectoryEntry,
  basePath: string,
  out: FolderFileEntry[],
): Promise<void> {
  const reader = entry.createReader();
  const readBatch = (): Promise<FileSystemEntry[]> =>
    new Promise((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });

  let entries = await readBatch();
  while (entries.length > 0) {
    for (const child of entries) {
      const childPath = basePath ? `${basePath}/${child.name}` : child.name;
      if (child.isFile) {
        const file = await new Promise<File>((resolve, reject) => {
          (child as FileSystemFileEntry).file(resolve, reject);
        });
        out.push({ file, path: childPath });
      } else if (child.isDirectory) {
        await readDirectoryEntry(child as FileSystemDirectoryEntry, childPath, out);
      }
    }
    entries = await readBatch();
  }
}

export async function collectFilesFromDataTransfer(
  dataTransfer: DataTransfer,
): Promise<FolderFileEntry[]> {
  const out: FolderFileEntry[] = [];
  const items = dataTransfer.items;

  if (items && items.length > 0) {
    for (const item of items) {
      if (item.kind !== "file") continue;
      const entry = item.webkitGetAsEntry?.();
      if (!entry) {
        const file = item.getAsFile();
        if (file) out.push({ file, path: file.name });
        continue;
      }
      if (entry.isFile) {
        const file = await new Promise<File>((resolve, reject) => {
          (entry as FileSystemFileEntry).file(resolve, reject);
        });
        out.push({ file, path: file.name });
      } else if (entry.isDirectory) {
        await readDirectoryEntry(entry as FileSystemDirectoryEntry, entry.name, out);
      }
    }
    return out;
  }

  for (const file of dataTransfer.files) {
    out.push({
      file,
      path: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
    });
  }
  return out;
}

export function isSupportedArchiveFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".zip") ||
    name.endsWith(".rar") ||
    file.type === "application/zip" ||
    file.type === "application/x-zip-compressed" ||
    file.type === "application/vnd.rar" ||
    file.type === "application/x-rar-compressed"
  );
}

export function countAudioInFolder(entries: FolderFileEntry[]): number {
  const audioExt = [".wav", ".aiff", ".aif", ".flac", ".mp3", ".ogg"];
  return entries.filter((e) =>
    audioExt.some((ext) => e.path.toLowerCase().endsWith(ext)),
  ).length;
}
