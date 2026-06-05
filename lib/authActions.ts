// lib/authActions.ts
"use client";

import { apiFetch } from "./api";
import { writeCachedMe } from "./authClient";

const BUYER_ROLE_ERROR =
  "Esta cuenta no pertenece a Buyer. Usa la aplicación correspondiente.";

function notifyAuthChanged() {  
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("auth:changed"));
  window.dispatchEvent(new Event("ct-auth-changed"));
  
}

export async function login(emailOrPhone: string, password: string) {
  const body = {
    emailOrPhone: String(emailOrPhone ?? "").trim(),
    password: String(password ?? "").trim(),
  };

  const res = await apiFetch<{
    accessToken?: string;
    user?: any;
  }>("/auth/login", {
    method: "POST",
    json: body,
  });

    // Después de login, pedimos /auth/me para validar rol y cachear userId
  try {
    const me = await apiFetch<any>("/auth/me", { method: "GET" });

    const role = String(me?.user?.role ?? "").toUpperCase();

    if (role !== "BUYER") {
      try {
        await apiFetch("/auth/logout", {
          method: "POST",
          suppressSessionExpiredEvent: true,
        });
      } catch {}

      try {
        localStorage.removeItem("kronix:auth:me:v1");
        localStorage.removeItem("kronix:auth:userId:v1");
      } catch {}

      notifyAuthChanged();
      throw new Error(BUYER_ROLE_ERROR);
    }

    if (me?.user?.sub) writeCachedMe(me);
  } catch (e: any) {
    if (String(e?.message ?? "") === BUYER_ROLE_ERROR) {
      throw e;
    }

    throw new Error("No pudimos validar tu cuenta Buyer.");
  }

  notifyAuthChanged();
  return res;
}

export async function logout() {
  try {
    await apiFetch("/auth/logout", {
      method: "POST",
      suppressSessionExpiredEvent: true,
    });
  } catch {}

  try {
    localStorage.removeItem("kronix:auth:me:v1");
    localStorage.removeItem("kronix:auth:userId:v1");
  } catch {}

  notifyAuthChanged();
}

export async function refresh() {
  const res = await apiFetch("/auth/refresh", { method: "POST" });

  try {
    const me = await apiFetch<any>("/auth/me", { method: "GET" });
    if (me?.user?.sub) writeCachedMe(me);
  } catch {}

  notifyAuthChanged();
  return res;
}