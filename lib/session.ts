// lib/session.ts
"use client";

export function getCurrentBuyerId(): string {
  try {
    const raw = localStorage.getItem("kronix:auth:userId:v1");
    const v = String(raw ?? "").trim();
    if (v) return v;

    const raw2 = localStorage.getItem("kronix:buyerId");
    const v2 = String(raw2 ?? "").trim();
    if (v2) return v2;
  } catch {}

  return "";
}