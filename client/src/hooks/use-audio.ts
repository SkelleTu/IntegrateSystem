import { useCallback } from "react";

const sounds = {
  select: "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3",
  click: "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3",
  success: "https://assets.mixkit.co/active_storage/sfx/2567/2567-preview.mp3",
};

export function useAudio() {
  const play = useCallback((type: keyof typeof sounds) => {
    const audio = new Audio(sounds[type]);
    audio.volume = 0.2;
    audio.play().catch(() => {}); // Ignore errors if browser blocks autoplay
  }, []);

  return { play };
}
