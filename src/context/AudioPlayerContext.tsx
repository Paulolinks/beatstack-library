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

interface AudioPlayerContextValue {
  currentSample: SampleListItem | null;
  isPlaying: boolean;
  progress: number;
  play: (sample: SampleListItem) => void;
  toggle: (sample: SampleListItem) => void;
  pause: () => void;
  seek: (ratio: number) => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentSample, setCurrentSample] = useState<SampleListItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

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

  const play = useCallback((sample: SampleListItem) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (currentSample?.id !== sample.id) {
      audio.src = `/api/audio/${sample.id}`;
      setCurrentSample(sample);
      setProgress(0);
    }

    void audio.play();
  }, [currentSample?.id]);

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
      value={{ currentSample, isPlaying, progress, play, toggle, pause, seek }}
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
