// lib/sound.ts
"use client";

export type BuyerSoundEvent =
  | "STORE_CONFIRMED"
  | "DRIVER_ASSIGNED"
  | "EN_ROUTE"
  | "DELIVERED"
  | "CANCELLED"
  | "PAYMENT_FAILED";

type SoundOptions = {
  volume?: number; // 0..1
};

let lastPlayAt = 0;
let audio: HTMLAudioElement | null = null;

function getAudio(volume = 1) {
  if (typeof window === "undefined") return null;

  if (!audio) {
    audio = new Audio("/sounds/notify.mp3");
    audio.preload = "auto";
  }

  audio.volume = Math.max(0, Math.min(1, volume));
  return audio;
}

// 🔊 Reproduce sonido único para cualquier evento
export async function playBuyerSound(
  _event: BuyerSoundEvent,
  opts?: SoundOptions
) {
  try {
    const now = Date.now();

    // anti-spam (mínimo 500ms)
    if (now - lastPlayAt < 500) return;
    lastPlayAt = now;

    const volume =
      typeof opts?.volume === "number" ? opts.volume : 1;

    const a = getAudio(volume);
    if (!a) return;

    a.pause();
    a.currentTime = 0;

    await a.play().catch(() => {
      // navegadores pueden bloquear autoplay
    });
  } catch {
    // silencioso
  }
}