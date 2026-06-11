// lib/authClient.ts
"use client";

import { apiFetch } from "./api";

export type AuthMePayload = {
  user: {
    sub: string;
    role: "BUYER" | "DRIVER" | "STORE" | "ADMIN" | string;
    phone?: string | null;
    email?: string | null;
    storeId?: string | null;
    storeCode?: string | null;
    iat?: number;
    exp?: number;
    isKronixPlusApproved?: boolean;
    kronixPlusStatus?: "NONE" | "PENDING" | "APPROVED" | "REJECTED" | string;
    kronixPlusApprovedAt?: string | null;
  };
};

const LS_ME = "kronix:auth:me:v1";
const LS_USER_ID = "kronix:auth:userId:v1";

export function readCachedUserId(): string {
  try {
    const v = String(localStorage.getItem(LS_USER_ID) ?? "").trim();
    return v;
  } catch {
    return "";
  }
}

export function writeCachedUserId(id: string) {
  try {
    localStorage.setItem(LS_USER_ID, String(id || "").trim());
  } catch {}
}

export function readCachedMe(): AuthMePayload | null {
  try {
    const raw = localStorage.getItem(LS_ME);
    if (!raw) return null;
    return JSON.parse(raw) as AuthMePayload;
  } catch {
    return null;
  }
}

export function writeCachedMe(me: AuthMePayload) {
  try {
    localStorage.setItem(LS_ME, JSON.stringify(me));
    const id = String(me?.user?.sub ?? "").trim();
    if (id) writeCachedUserId(id);
  } catch {}
}

export async function getMe(): Promise<AuthMePayload | null> {
  try {
    const me = await apiFetch<AuthMePayload>("/auth/me", { method: "GET" });
    if (me?.user?.sub) writeCachedMe(me);
    return me;
  } catch {
    return null;
  }
}

export async function ensureUserId(): Promise<string> {
  // 1) cache rápido
  const cached = readCachedUserId();
  if (cached) return cached;

  // 2) pedir al backend por cookie
  const me = await getMe();
  const id = String(me?.user?.sub ?? "").trim();
  return id;
}