// lib/notify.ts
"use client";

import { playBuyerSound, type BuyerSoundEvent } from "./sound";

type NotifyBuyerArgs = {
  title: string;
  body: string;
  tag?: string; // para evitar duplicados
  soundEvent?: BuyerSoundEvent;

  /**
   * ✅ Si true: intenta notificación del sistema.
   * Si false: solo sonido.
   */
  system?: boolean;
};

/**
 * ✅ Estrategia igual a Driver/Store:
 * - Sonido SIEMPRE (si el browser lo permite).
 * - Notificación del sistema SOLO si:
 *   - hay permiso, y
 *   - la pestaña está en background (o el user lo permite),
 *   para evitar spam cuando está viendo el tracking.
 */

function isBrowser() {
  return typeof window !== "undefined";
}

function isBackground() {
  if (!isBrowser()) return true;
  return document.visibilityState !== "visible";
}

function supportsNotifications() {
  return isBrowser() && "Notification" in window;
}

export async function ensureBuyerNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!supportsNotifications()) return "unsupported";

  try {
    if (Notification.permission === "default") {
      const res = await Notification.requestPermission();
      return res;
    }
    return Notification.permission;
  } catch {
    return Notification.permission;
  }
}

function safeSystemNotify(args: NotifyBuyerArgs) {
  if (!supportsNotifications()) return;
  if (Notification.permission !== "granted") return;

  try {
    // Notificación nativa del navegador
    new Notification(args.title, {
      body: args.body,
      tag: args.tag,
      silent: true, // 👈 sonido lo manejamos nosotros con playBuyerSound
    });
  } catch {
    // Safari/iOS puede fallar en algunos contextos
  }
}

export async function notifyBuyer(args: NotifyBuyerArgs) {
  // 1) Sonido (si hay evento)
  if (args.soundEvent) {
    // volumen un poco más alto si está en background
    const vol = isBackground() ? 0.32 : 0.22;
    await playBuyerSound(args.soundEvent, { volume: vol });
  }

  // 2) Notificación del sistema (opcional)
  const wantsSystem = args.system ?? true;
  if (!wantsSystem) return;

  // ✅ Solo mostramos si está en background (igual enfoque Driver/Store “no molestar”)
  if (!isBackground()) return;

  // si no hay permiso, pedimos (una sola vez normalmente, pero aquí es tolerante)
  const perm = await ensureBuyerNotificationPermission();
  if (perm !== "granted") return;

  safeSystemNotify(args);
}