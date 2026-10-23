// app/pwa-register.tsx

"use client";

import { useEffect, useRef } from "react";
import { getMe } from "@/lib/authClient";
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

export async function registerBuyerPush(allowGuest=false) {
  if(localStorage.getItem("kronix:buyer:notifications") === "off")return false;
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;
  if (!("PushManager" in window)) return false;
  if (!("Notification" in window)) return false;

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  if (!vapidKey) {
    console.warn("[Buyer Push] Falta NEXT_PUBLIC_VAPID_PUBLIC_KEY");
    return false;
  }

  const me=await getMe();
  if(!me?.user?.sub && !allowGuest)return false;

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  let permission = Notification.permission;

  if (permission === "default") {
    permission = await Notification.requestPermission();
  }

  if (permission !== "granted") {
    console.warn("[Buyer Push] Permiso no concedido:", permission);
    return false;
  }

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
  }

  if(!me?.user?.sub)return true;

  await apiFetch("/push/subscribe", {
    method: "POST",
    json: {
      app: "buyer",
      subscription: subscription.toJSON(),
      userAgent: navigator.userAgent,
    },
    suppressSessionExpiredEvent: true,
    suppressActivityRefresh: true,
  });

  console.log("[Buyer Push] Suscripción registrada correctamente");
  return true;
}

export default function PwaRegister() {
  const registeredRef = useRef(false);
  const triesRef = useRef(0);

  useEffect(() => {
    if(window.location.pathname.startsWith("/r/"))return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tryRegister = async () => {
      if (!alive || registeredRef.current) return;

      triesRef.current += 1;

      try {
        const ok = await registerBuyerPush();

        if (ok) {
          registeredRef.current = true;
          return;
        }
      } catch (err) {
        console.warn("[Buyer Push] No se pudo registrar todavía:", err);
      }

      if (!registeredRef.current && triesRef.current < 12) {
        timer = setTimeout(tryRegister, 5000);
      }
    };

    timer = setTimeout(tryRegister, 1500);

    const onFocus = () => {
      if (!registeredRef.current) {
        tryRegister();
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible" && !registeredRef.current) {
        tryRegister();
      }
    };

    const onAuth=()=>{registeredRef.current=false;triesRef.current=0;void tryRegister();};
    window.addEventListener("auth:changed",onAuth);
    window.addEventListener("buyer:notifications-changed",onAuth);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      window.removeEventListener("auth:changed",onAuth);
      window.removeEventListener("buyer:notifications-changed",onAuth);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}