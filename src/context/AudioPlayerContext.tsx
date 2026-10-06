"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { SampleListItem } from "@/components/SampleRow";

const VOLUME_STORAGE_KEY = "beatstack-preview-volume";

interface AudioPlayerContextValue {
  currentSample: SampleListItem | null;
  isPlaying: boolean;
  progress: number;
  volume: number;
  muted: boolean;
  play: (sample: SampleListItem) => void;
  toggle: (sample: SampleListItem) => void;
  pause: () => void;
  seek: (ratio: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

function readStoredVolume(): number {
  if (typeof window === "undefined") return 0.8;
  try {
    const raw = window.localStorage.getItem(VOLUME_STORAGE_KEY);
    if (raw == null) return 0.8;
    const value = Number.parseFloat(raw);
    if (!Number.isFinite(value)) return 0.8;
    return Math.min(1, Math.max(0, value));
  } catch {
    return 0.8;
  }
}

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentSample, setCurrentSample] = useState<SampleListItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    const initial = readStoredVolume();
    setVolumeState(initial);
    audio.volume = initial;

    const onTimeUpdate = () => {
      if (audio.duration) {
        setProgress(audio.currentTime / audio.duration);
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.pause();
    };
  }, []);

  const applyOutputVolume = useCallback((nextVolume: number, nextMuted: boolean) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = nextMuted ? 0 : nextVolume;
  }, []);

  const setVolume = useCallback(
    (next: number) => {
      const clamped = Math.min(1, Math.max(0, next));
      setVolumeState(clamped);
      setMuted(false);
      applyOutputVolume(clamped, false);
      try {
        window.localStorage.setItem(VOLUME_STORAGE_KEY, String(clamped));
      } catch {
        /* ignore */
      }
    },
    [applyOutputVolume],
  );

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      applyOutputVolume(volume, next);
      return next;
    });
  }, [applyOutputVolume, volume]);

  const play = useCallback((sample: SampleListItem) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (currentSample?.id !== sample.id) {
      audio.src = sample.audioUrl ?? `/api/audio/${sample.id}`;
      setCurrentSample(sample);
      setProgress(0);
    }

    applyOutputVolume(volume, muted);
    void audio.play();
  }, [applyOutputVolume, currentSample?.id, muted, volume]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const toggle = useCallback(
    (sample: SampleListItem) => {
      if (currentSample?.id === sample.id && isPlaying) {
        pause();
      } else {
        play(sample);
      }
    },
    [currentSample?.id, isPlaying, pause, play],
  );

  const seek = useCallback(
    (ratio: number) => {
      const audio = audioRef.current;
      if (audio?.duration) {
        audio.currentTime = audio.duration * ratio;
        setProgress(ratio);
      }
    },
    [],
  );

  return (
    <AudioPlayerContext.Provider
      value={{
        currentSample,
        isPlaying,
        progress,
        volume,
        muted,
        play,
        toggle,
        pause,
        seek,
        setVolume,
        toggleMute,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) {
    throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
  }
  return ctx;
}
