// app/pwa-register.tsx
"use client";

import { useEffect } from "react";
import { apiFetch } from "@/lib/api";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

async function registerBuyerPush() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (!("PushManager" in window)) return;
  if (!("Notification" in window)) return;

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    console.warn("[Buyer Push] Falta NEXT_PUBLIC_VAPID_PUBLIC_KEY");
    return;
  }

  const registration = await navigator.serviceWorker.register("/sw.js");

  let permission = Notification.permission;

  if (permission === "default") {
    permission = await Notification.requestPermission();
  }

  if (permission !== "granted") {
    console.warn("[Buyer Push] Permiso no concedido:", permission);
    return;
  }

  const existing = await registration.pushManager.getSubscription();

  const subscription =
    existing ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    }));

  await apiFetch("/push/subscribe", {
    method: "POST",
    json: {
      app: "buyer",
      subscription,
      userAgent: navigator.userAgent,
    },
    suppressSessionExpiredEvent: true,
  });
}

export default function PwaRegister() {
  useEffect(() => {
    registerBuyerPush().catch((err) => {
      console.warn("[Buyer Push] No se pudo registrar:", err);
    });
  }, []);

  return null;
}