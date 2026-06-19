import fs from "fs";

const BARS = 128;

export function extractWaveformPeaks(filePath: string, bars = BARS): number[] {
  const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  if (ext === ".wav") {
    try {
      return extractWavPeaks(filePath, bars);
    } catch {
      return [];
    }
  }
  return [];
}

function extractWavPeaks(filePath: string, bars: number): number[] {
  const buffer = fs.readFileSync(filePath);

  if (buffer.toString("ascii", 0, 4) !== "RIFF") {
    throw new Error("Not a WAV file");
  }

  let offset = 12;
  let audioFormat = 1;
  let numChannels = 1;
  let bitsPerSample = 16;
  let dataOffset = 0;
  let dataSize = 0;

  while (offset < buffer.length - 8) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;

    if (chunkId === "fmt ") {
      audioFormat = buffer.readUInt16LE(chunkStart);
      numChannels = buffer.readUInt16LE(chunkStart + 2);
      bitsPerSample = buffer.readUInt16LE(chunkStart + 14);
    } else if (chunkId === "data") {
      dataOffset = chunkStart;
      dataSize = chunkSize;
      break;
    }

    offset = chunkStart + chunkSize + (chunkSize % 2);
  }

  if (!dataOffset || dataSize === 0) {
    throw new Error("WAV data chunk not found");
  }

  const bytesPerSample = bitsPerSample / 8;
  const frameSize = bytesPerSample * numChannels;
  const totalFrames = Math.floor(dataSize / frameSize);
  const blockSize = Math.max(1, Math.floor(totalFrames / bars));
  const peaks: number[] = [];

  for (let i = 0; i < bars; i++) {
    let peak = 0;
    const startFrame = i * blockSize;
    const endFrame = Math.min(startFrame + blockSize, totalFrames);

    for (let frame = startFrame; frame < endFrame; frame++) {
      const sampleOffset = dataOffset + frame * frameSize;
      if (sampleOffset + bytesPerSample > buffer.length) break;

      let value = 0;
      if (bitsPerSample === 16) {
        value = buffer.readInt16LE(sampleOffset) / 32768;
      } else if (bitsPerSample === 24) {
        const b0 = buffer[sampleOffset];
        const b1 = buffer[sampleOffset + 1];
        const b2 = buffer[sampleOffset + 2];
        let intVal = (b2 << 16) | (b1 << 8) | b0;
        if (intVal & 0x800000) intVal |= ~0xffffff;
        value = intVal / 8388608;
      } else if (bitsPerSample === 32 && audioFormat === 3) {
        value = buffer.readFloatLE(sampleOffset);
      } else if (bitsPerSample === 32) {
        value = buffer.readInt32LE(sampleOffset) / 2147483648;
      } else if (bitsPerSample === 8) {
        value = (buffer[sampleOffset] - 128) / 128;
      }

      peak = Math.max(peak, Math.abs(value));
    }

    peaks.push(peak);
  }

  const maxPeak = Math.max(...peaks, 0.001);
  return peaks.map((p) => p / maxPeak);
}
