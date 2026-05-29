//components\buyer\legal\buyerLegal.ts
import { apiFetch } from "@/lib/api";

export const BUYER_TERMS_FALLBACK_VERSION = "buyer-terms-v1-2026-05-21";
export const BUYER_PRIVACY_FALLBACK_VERSION = "buyer-privacy-v1-2026-05-21";

export const BUYER_TERMS_VERSION = BUYER_TERMS_FALLBACK_VERSION;
export const BUYER_PRIVACY_VERSION = BUYER_PRIVACY_FALLBACK_VERSION;

export const BUYER_TERMS_LOCAL_KEY = "kronix_buyer_terms_acceptance";

export type BuyerLegalDocument = {
  id: string;
  documentType: "BUYER_TERMS" | "BUYER_PRIVACY";
  version: string;
  title: string;
  description?: string | null;
  content?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export async function getCurrentBuyerLegalDocument(
  documentType: "BUYER_TERMS" | "BUYER_PRIVACY"
) {
  const res = await apiFetch<{
    ok: boolean;
    documentType: string;
    document: BuyerLegalDocument | null;
  }>(`/legal/documents/current/${documentType}`, {
    method: "GET",
    cache: "no-store",
  });

  return res.document;
}

export async function getCurrentBuyerTermsVersion() {
  const doc = await getCurrentBuyerLegalDocument("BUYER_TERMS");
  return doc?.version || BUYER_TERMS_FALLBACK_VERSION;
}

export function saveBuyerTermsLocal(version: string) {
  try {
    localStorage.setItem(
      BUYER_TERMS_LOCAL_KEY,
      JSON.stringify({
        version,
        acceptedAt: new Date().toISOString(),
      })
    );
  } catch {}
}

export function hasBuyerTermsLocal(version: string) {
  try {
    const raw = localStorage.getItem(BUYER_TERMS_LOCAL_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.version === version;
  } catch {
    return false;
  }
}

export async function checkBuyerTermsStatus() {
  const version = await getCurrentBuyerTermsVersion();

  if (hasBuyerTermsLocal(version)) {
    return true;
  }

  const res = await apiFetch<{ ok: boolean; accepted: boolean }>(
    `/legal/status?documentType=BUYER_TERMS&version=${encodeURIComponent(
      version
    )}`,
    { method: "GET", cache: "no-store" }
  );

  if (res?.accepted) saveBuyerTermsLocal(version);

  return !!res?.accepted;
}

export async function acceptBuyerTermsBackend(version?: string) {
  const finalVersion = version || (await getCurrentBuyerTermsVersion());

  await apiFetch("/legal/accept", {
    method: "POST",
    json: {
      documentType: "BUYER_TERMS",
      version: finalVersion,
      source: "BUYER_APP",
    },
  });

  saveBuyerTermsLocal(finalVersion);
}