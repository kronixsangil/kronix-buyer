//components\buyer\kronix\kronixRecogerDraft.ts
"use client";

export type KronixPickupDraft = {
  pickupPlaceName: string;
  pickupAddress: string;
  pickupReference: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  pickupUseCurrentLocation?: boolean;

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

  zoneFeeCOP?: number;
  tipCOP?: number;
};

const STORAGE_KEY = "ct_kronix_recoger_draft_v1";

export const EMPTY_KRONIX_RECOGER_DRAFT: KronixPickupDraft = {
  pickupPlaceName: "",
  pickupAddress: "",
  pickupReference: "",
  pickupLat: null,
  pickupLng: null,
  pickupUseCurrentLocation: false,

  dropoffPlaceName: "",
  dropoffAddress: "",
  dropoffReference: "",
  dropoffLat: null,
  dropoffLng: null,

  packageType: "Domicilio Express",
  packageDescription: "",

  senderName: "",
  senderPhone: "",

  receiverName: "",
  receiverPhone: "",

  notes: "",

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

export function loadKronixRecogerDraft(): KronixPickupDraft {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return { ...EMPTY_KRONIX_RECOGER_DRAFT };

    const parsed = JSON.parse(raw) as Partial<KronixPickupDraft> | null;

    return {
      pickupPlaceName: sanitizeText(parsed?.pickupPlaceName),
      pickupAddress: sanitizeText(parsed?.pickupAddress),
      pickupReference: sanitizeText(parsed?.pickupReference),
      pickupLat: sanitizeNumber(parsed?.pickupLat),
      pickupLng: sanitizeNumber(parsed?.pickupLng),
      pickupUseCurrentLocation: Boolean(parsed?.pickupUseCurrentLocation),

      dropoffPlaceName: sanitizeText(parsed?.dropoffPlaceName),
      dropoffAddress: sanitizeText(parsed?.dropoffAddress),
      dropoffReference: sanitizeText(parsed?.dropoffReference),
      dropoffLat: sanitizeNumber(parsed?.dropoffLat),
      dropoffLng: sanitizeNumber(parsed?.dropoffLng),

      packageType: sanitizeText(parsed?.packageType) || "Domicilio Express",
      packageDescription: sanitizeText(parsed?.packageDescription),

      senderName: sanitizeText(parsed?.senderName),
      senderPhone: sanitizeText(parsed?.senderPhone),

      receiverName: sanitizeText(parsed?.receiverName),
      receiverPhone: sanitizeText(parsed?.receiverPhone),

      // La tarea NO se recupera del localStorage. Debe escribirse nueva en cada solicitud.
      notes: "",

      zoneFeeCOP: sanitizeMoney(parsed?.zoneFeeCOP) || 1000,
      tipCOP: sanitizeMoney(parsed?.tipCOP),
    };
  } catch {
    return { ...EMPTY_KRONIX_RECOGER_DRAFT };
  }
}

export function saveKronixRecogerDraft(draft: KronixPickupDraft) {
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

        dropoffPlaceName: sanitizeText(draft.dropoffPlaceName),
        dropoffAddress: sanitizeText(draft.dropoffAddress),
        dropoffReference: sanitizeText(draft.dropoffReference),
        dropoffLat: sanitizeNumber(draft.dropoffLat),
        dropoffLng: sanitizeNumber(draft.dropoffLng),

        packageType: sanitizeText(draft.packageType) || "Domicilio Express",
        packageDescription: sanitizeText(draft.packageDescription),

        senderName: sanitizeText(draft.senderName),
        senderPhone: sanitizeText(draft.senderPhone),

        receiverName: sanitizeText(draft.receiverName),
        receiverPhone: sanitizeText(draft.receiverPhone),

        // La tarea no se guarda para evitar repetir el último mandado.
        notes: "",

        zoneFeeCOP: sanitizeMoney(draft.zoneFeeCOP) || 1000,
        tipCOP: sanitizeMoney(draft.tipCOP),
      })
    );
  } catch {}
}

export function clearKronixRecogerDraft() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function formatPhoneDraft(value: string) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.slice(0, 15);
}
