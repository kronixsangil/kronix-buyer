// lib/notify.ts
"use client";

import { playBuyerSound, type BuyerSoundEvent } from "./sound";

type NotifyBuyerArgs = {
  title: string;
  body: string;
  tag?: string;
  soundEvent?: BuyerSoundEvent;
  system?: boolean;
};

const recent = new Map<string, number>();

function isDuplicate(tag?: string) {
  const key = String(tag ?? "").trim();
  if (!key) return false;

  const now = Date.now();
  const prev = recent.get(key) ?? 0;

  recent.set(key, now);

  for (const [k, t] of recent.entries()) {
    if (now - t > 30_000) recent.delete(k);
  }

  return now - prev < 2500;
}

function isVisible() {
  return typeof document !== "undefined" && document.visibilityState === "visible";
}

export async function ensureBuyerNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";

  if (Notification.permission === "default") {
    return await Notification.requestPermission();
  }

  return Notification.permission;
}

export async function notifyBuyer(args: NotifyBuyerArgs) {
  if (isDuplicate(args.tag)) return;

  if (args.soundEvent) {
    await playBuyerSound(args.soundEvent, {
      volume: isVisible() ? 0.55 : 0.8,
      dedupeKey: args.tag,
    });
  }

  // Las notificaciones reales en background las maneja public/sw.js vía Web Push.
  // Aquí solo mostramos notificación local si la app está visible y se necesita debug/manual.
  if (!args.system) return;
  if (!isVisible()) return;
}