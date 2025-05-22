"use client";
import { useEffect, useRef, useState } from "react";

export default function BackgroundMusic() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(undefined);

  useEffect(() => {
    const audio = new Audio("/assets/background-music.mp3");
    audio.loop = true;
    audio.volume = 0.5;
    audioRef.current = audio;
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play().catch((err) => {
        console.error("Audio play failed:", err);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  return (
    <button
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => setIsPlaying((prev) => !prev)}
      className="fixed bottom-4 right-4 p-2 bg-gray-800 text-white rounded-full shadow-lg"
      aria-label={isPlaying ? "Turn music off" : "Turn music on"}
    >
      {isPlaying ? "🔊" : "🔇"}
    </button>
  );
}
