// lib/sound.ts
"use client";

export type BuyerSoundEvent =
  | "STORE_CONFIRMED"
  | "DRIVER_ASSIGNED"
  | "EN_ROUTE"
  | "DELIVERED"
  | "CANCELLED"
  | "PAYMENT_FAILED"
  | "DEFAULT";

const soundMap: Record<BuyerSoundEvent, string> = {
  STORE_CONFIRMED: "/sounds/buyer-store-confirmed.mp3",
  DRIVER_ASSIGNED: "/sounds/buyer-driver-assigned.mp3",
  EN_ROUTE: "/sounds/buyer-en-route.mp3",
  DELIVERED: "/sounds/buyer-delivered.mp3",
  CANCELLED: "/sounds/buyer-cancelled.mp3",
  PAYMENT_FAILED: "/sounds/buyer-payment-failed.mp3",
  DEFAULT: "/sounds/buyer-default.mp3",
};

let lastKey = "";
let lastPlayAt = 0;
let audio: HTMLAudioElement | null = null;

export async function playBuyerSound(
  event: BuyerSoundEvent = "DEFAULT",
  opts?: { volume?: number; dedupeKey?: string }
) {
  if (typeof window === "undefined") return;

  const now = Date.now();
  const key = opts?.dedupeKey || event;

  if (key === lastKey && now - lastPlayAt < 1800) return;

  lastKey = key;
  lastPlayAt = now;

  const src = soundMap[event] || soundMap.DEFAULT;

  if (!audio || audio.src !== new URL(src, window.location.origin).href) {
    audio = new Audio(src);
    audio.preload = "auto";
  }

  audio.volume = Math.max(0, Math.min(1, opts?.volume ?? 0.8));
  audio.pause();
  audio.currentTime = 0;

  await audio.play().catch(() => {});
}