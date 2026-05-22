//components\buyer\legal\buyerLegal.ts
import { apiFetch } from "@/lib/api";

export const BUYER_TERMS_VERSION = "buyer-terms-v1-2026-05-21";
export const BUYER_TERMS_LOCAL_KEY = "kronix_buyer_terms_acceptance";

export function saveBuyerTermsLocal() {
  try {
    localStorage.setItem(
      BUYER_TERMS_LOCAL_KEY,
      JSON.stringify({
        version: BUYER_TERMS_VERSION,
        acceptedAt: new Date().toISOString(),
      })
    );
  } catch {}
}

export function hasBuyerTermsLocal() {
  try {
    const raw = localStorage.getItem(BUYER_TERMS_LOCAL_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.version === BUYER_TERMS_VERSION;
  } catch {
    return false;
  }
}

export async function checkBuyerTermsStatus() {
  const res = await apiFetch<{ ok: boolean; accepted: boolean }>(
    `/legal/status?documentType=BUYER_TERMS&version=${encodeURIComponent(
      BUYER_TERMS_VERSION
    )}`,
    { method: "GET", cache: "no-store" }
  );

  if (res?.accepted) saveBuyerTermsLocal();

  return !!res?.accepted;
}

export async function acceptBuyerTermsBackend() {
  await apiFetch("/legal/accept", {
    method: "POST",
    json: {
      documentType: "BUYER_TERMS",
      version: BUYER_TERMS_VERSION,
      source: "BUYER_APP",
    },
  });

  saveBuyerTermsLocal();
}
