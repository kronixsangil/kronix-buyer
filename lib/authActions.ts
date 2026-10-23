// lib/authActions.ts
"use client";

import { apiFetch } from "./api";
import { writeCachedMe } from "./authClient";
import {
  clearSessionExpiredShown,
  markSessionKnownActive,
  markVoluntaryLogout,
} from "./sessionExpired";

const BUYER_ROLE_ERROR =
  "Esta cuenta no puede usar Buyer. Usa la aplicación correspondiente.";

function notifyAuthChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("auth:changed"));
  window.dispatchEvent(new Event("ct-auth-changed"));
}

function clearBuyerAuthCache() {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem("kronix:auth:me:v1");
    localStorage.removeItem("kronix:auth:userId:v1");
  } catch {}

  try {
    sessionStorage.removeItem("kronix:auth:me:v1");
    sessionStorage.removeItem("kronix:auth:userId:v1");
  } catch {}
}

export async function logout() {
  markVoluntaryLogout();

  // Limpieza local primero: la UI deja de creer que hay sesión aunque el backend tarde.
  clearBuyerAuthCache();
  notifyAuthChanged();

  // Producción: cerrar contra el proxy same-origin para limpiar cookies en buyer.kronix.co.
  try {
    await fetch(`/api/buyer/auth/logout?ts=${Date.now()}`, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "x-ct-app": "buyer",
      },
      body: JSON.stringify({}),
    });
  } catch {
    try {
      await apiFetch("/auth/logout", {
        method: "POST",
        suppressSessionExpiredEvent: true,
        suppressActivityRefresh: true,
      });
    } catch {}
  }

  markVoluntaryLogout();
  clearBuyerAuthCache();
  notifyAuthChanged();

  if (typeof window !== "undefined") {
    window.location.replace("/");
  }

  return { ok: true };
}

export async function refresh() {
  const res = await apiFetch("/auth/refresh", {
    method: "POST",
    suppressSessionExpiredEvent: true,
    suppressActivityRefresh: true,
  });

  try {
    const me = await apiFetch<any>("/auth/me", {
      method: "GET",
      suppressSessionExpiredEvent: true,
      suppressActivityRefresh: true,
    });
    if (me?.user?.sub) {
      writeCachedMe(me);
      markSessionKnownActive();
    }
  } catch {}

  notifyAuthChanged();
  return res;
}
