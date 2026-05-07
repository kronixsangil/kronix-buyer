// components/buyer/kronix/kronixEnviarDraft.ts
"use client";

export type KronixEnviarDraft = {
  pickupPlaceName: string;
  pickupAddress: string;
  pickupReference: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  pickupUseCurrentLocation?: boolean;
  dropoffUseCurrentLocation?: boolean;

  dropoffPlaceName: string;
  dropoffAddress: string;
  dropoffReference: string;
  dropoffLat?: number | null;
  dropoffLng?: number | null;

  packageType: string;
  packageDescription: string;

  senderName: string;
  senderPhone: string;

  receiverName: string;
  receiverPhone: string;

  notes: string;

  isComplex?: boolean;
  zoneFeeCOP?: number;
  tipCOP?: number;
};

const STORAGE_KEY = "ct_kronix_enviar_draft_v1";

export const EMPTY_KRONIX_ENVIAR_DRAFT: KronixEnviarDraft = {
  pickupPlaceName: "",
  pickupAddress: "",
  pickupReference: "",
  pickupLat: null,
  pickupLng: null,
  pickupUseCurrentLocation: false,
dropoffUseCurrentLocation: false,

  dropoffPlaceName: "",
  dropoffAddress: "",
  dropoffReference: "",
  dropoffLat: null,
  dropoffLng: null,

  packageType: "",
  packageDescription: "",

  senderName: "",
  senderPhone: "",

  receiverName: "",
  receiverPhone: "",

  notes: "",

  isComplex: false,
  zoneFeeCOP: 1000,
  tipCOP: 0,
};

function sanitizeText(value: unknown) {
  return String(value ?? "");
}

function sanitizeNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function sanitizeMoney(value: unknown): number {
  const n = Math.round(Number(value ?? 0));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function loadKronixEnviarDraft(): KronixEnviarDraft {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return { ...EMPTY_KRONIX_ENVIAR_DRAFT };
    }

    const parsed = JSON.parse(raw) as Partial<KronixEnviarDraft> | null;

    return {
      pickupPlaceName: sanitizeText(parsed?.pickupPlaceName),
      pickupAddress: sanitizeText(parsed?.pickupAddress),
      pickupReference: sanitizeText(parsed?.pickupReference),
      pickupLat: sanitizeNumber(parsed?.pickupLat),
      pickupLng: sanitizeNumber(parsed?.pickupLng),
      pickupUseCurrentLocation: Boolean(parsed?.pickupUseCurrentLocation),
dropoffUseCurrentLocation: Boolean(parsed?.dropoffUseCurrentLocation),

      dropoffPlaceName: sanitizeText(parsed?.dropoffPlaceName),
      dropoffAddress: sanitizeText(parsed?.dropoffAddress),
      dropoffReference: sanitizeText(parsed?.dropoffReference),
      dropoffLat: sanitizeNumber(parsed?.dropoffLat),
      dropoffLng: sanitizeNumber(parsed?.dropoffLng),

      packageType: sanitizeText(parsed?.packageType),
      packageDescription: sanitizeText(parsed?.packageDescription),

      senderName: sanitizeText(parsed?.senderName),
      senderPhone: sanitizeText(parsed?.senderPhone),

      receiverName: sanitizeText(parsed?.receiverName),
      receiverPhone: sanitizeText(parsed?.receiverPhone),

      notes: sanitizeText(parsed?.notes),

      isComplex: Boolean(parsed?.isComplex),
      zoneFeeCOP: sanitizeMoney(parsed?.zoneFeeCOP) || 1000,
      tipCOP: sanitizeMoney(parsed?.tipCOP),
    };
  } catch {
    return { ...EMPTY_KRONIX_ENVIAR_DRAFT };
  }
}

export function saveKronixEnviarDraft(draft: KronixEnviarDraft) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        pickupPlaceName: sanitizeText(draft.pickupPlaceName),
        pickupAddress: sanitizeText(draft.pickupAddress),
        pickupReference: sanitizeText(draft.pickupReference),
        pickupLat: sanitizeNumber(draft.pickupLat),
        pickupLng: sanitizeNumber(draft.pickupLng),
        pickupUseCurrentLocation: Boolean(draft.pickupUseCurrentLocation),
dropoffUseCurrentLocation: Boolean(draft.dropoffUseCurrentLocation),

        dropoffPlaceName: sanitizeText(draft.dropoffPlaceName),
        dropoffAddress: sanitizeText(draft.dropoffAddress),
        dropoffReference: sanitizeText(draft.dropoffReference),
        dropoffLat: sanitizeNumber(draft.dropoffLat),
        dropoffLng: sanitizeNumber(draft.dropoffLng),

        packageType: sanitizeText(draft.packageType),
        packageDescription: sanitizeText(draft.packageDescription),

        senderName: sanitizeText(draft.senderName),
        senderPhone: sanitizeText(draft.senderPhone),

        receiverName: sanitizeText(draft.receiverName),
        receiverPhone: sanitizeText(draft.receiverPhone),

        notes: sanitizeText(draft.notes),

        isComplex: Boolean(draft.isComplex),
        zoneFeeCOP: sanitizeMoney(draft.zoneFeeCOP) || 1000,
        tipCOP: sanitizeMoney(draft.tipCOP),
      })
    );
  } catch {}
}

export function clearKronixEnviarDraft() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function formatPhoneDraft(value: string) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.slice(0, 15);
}