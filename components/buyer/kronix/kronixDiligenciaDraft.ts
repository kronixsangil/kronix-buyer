//components\buyer\kronix\kronixDiligenciaDraft.ts
"use client";

export type KronixDomicilioStop = {
  placeName: string;
  address: string;
  reference: string;
  contactName: string;
  contactPhone: string;
  instructions: string;
  lat?: number | null;
  lng?: number | null;
  useCurrentLocation?: boolean;
};

export type KronixDiligenciaDraft = {
  pickupPlaceName: string;
  pickupAddress: string;
  pickupReference: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  pickupUseCurrentLocation?: boolean;

  dropoffPlaceName: string;
  dropoffAddress: string;
  dropoffReference: string;

  stops: KronixDomicilioStop[];
  stopCount: number;

  needsReturn: boolean;
  returnRequired?: boolean;
  returnAddress: string;
  returnReference: string;

  packageType: string;
  packageDescription: string;

  senderName: string;
  senderPhone: string;

  receiverName: string;
  receiverPhone: string;

  notes: string;
  isComplex?: boolean;
  tipCOP?: number;
};

const STORAGE_KEY = "ct_kronix_domicilios_draft_v1";
const OLD_STORAGE_KEY = "ct_kronix_diligencia_draft_v1";

export const EMPTY_STOP: KronixDomicilioStop = {
  placeName: "",
  address: "",
  reference: "",
  contactName: "",
  contactPhone: "",
  instructions: "",
  lat: null,
  lng: null,
};

export const EMPTY_KRONIX_DILIGENCIA_DRAFT: KronixDiligenciaDraft = {
  pickupPlaceName: "",
  pickupAddress: "",
  pickupReference: "",
  pickupLat: null,
  pickupLng: null,

  dropoffPlaceName: "",
  dropoffAddress: "",
  dropoffReference: "",

  stopCount: 1,
  stops: [{ ...EMPTY_STOP }],

  needsReturn: false,
  returnRequired: false,
  returnAddress: "",
  returnReference: "",

  packageType: "Domicilio local",
  packageDescription: "",

  senderName: "",
  senderPhone: "",

  receiverName: "",
  receiverPhone: "",

  notes: "",
  isComplex: false,
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

function sanitizeStop(value: Partial<KronixDomicilioStop> | null | undefined): KronixDomicilioStop {
  return {
    placeName: sanitizeText(value?.placeName),
    address: sanitizeText(value?.address),
    reference: sanitizeText(value?.reference),
    contactName: sanitizeText(value?.contactName),
    contactPhone: sanitizeText(value?.contactPhone),
    instructions: sanitizeText(value?.instructions),
    lat: sanitizeNumber(value?.lat),
    lng: sanitizeNumber(value?.lng),
  };
}

function normalizeStopCount(value: unknown): 1 | 2 | 3 {
  const n = Number(value);
  if (n === 2) return 2;
  if (n === 3) return 3;
  return 1;
}

function normalizeStops(rawStops: unknown, stopCount: 1 | 2 | 3) {
  const source = Array.isArray(rawStops) ? rawStops : [];
  const next: KronixDomicilioStop[] = [];

  for (let i = 0; i < stopCount; i += 1) {
    next.push(sanitizeStop(source[i] as Partial<KronixDomicilioStop> | undefined));
  }

  return next.length ? next : [{ ...EMPTY_STOP }];
}

function migrateOldDraft(parsed: any): KronixDiligenciaDraft {
  const stop: KronixDomicilioStop = {
    placeName: sanitizeText(parsed?.dropoffPlaceName),
    address: sanitizeText(parsed?.dropoffAddress),
    reference: sanitizeText(parsed?.dropoffReference),
    contactName: sanitizeText(parsed?.receiverName),
    contactPhone: sanitizeText(parsed?.receiverPhone),
    instructions: "",
    lat: null,
    lng: null,
  };

  return {
    pickupPlaceName: sanitizeText(parsed?.pickupPlaceName),
    pickupAddress: sanitizeText(parsed?.pickupAddress),
    pickupReference: sanitizeText(parsed?.pickupReference),
    pickupLat: null,
    pickupLng: null,

    dropoffPlaceName: sanitizeText(parsed?.dropoffPlaceName),
    dropoffAddress: sanitizeText(parsed?.dropoffAddress),
    dropoffReference: sanitizeText(parsed?.dropoffReference),

    stopCount: 1,
    stops: [stop],

    needsReturn: false,
    returnRequired: false,
    returnAddress: "",
    returnReference: "",

    packageType: "Domicilio local",
    packageDescription: sanitizeText(parsed?.packageDescription),

    senderName: sanitizeText(parsed?.senderName),
    senderPhone: sanitizeText(parsed?.senderPhone),

    receiverName: sanitizeText(parsed?.receiverName),
    receiverPhone: sanitizeText(parsed?.receiverPhone),

    notes: sanitizeText(parsed?.notes),
    isComplex: false,
    tipCOP: 0,
  };
}

export function loadKronixDiligenciaDraft(): KronixDiligenciaDraft {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (raw) {
      const parsed = JSON.parse(raw) as Partial<KronixDiligenciaDraft> | null;
      const stopCount = normalizeStopCount(parsed?.stopCount);

      const returnRequired = Boolean((parsed as any)?.returnRequired ?? parsed?.needsReturn);

      return {
        pickupPlaceName: sanitizeText(parsed?.pickupPlaceName),
        pickupAddress: sanitizeText(parsed?.pickupAddress),
        pickupReference: sanitizeText(parsed?.pickupReference),
        pickupLat: sanitizeNumber(parsed?.pickupLat),
        pickupLng: sanitizeNumber(parsed?.pickupLng),

        dropoffPlaceName: sanitizeText(parsed?.dropoffPlaceName),
        dropoffAddress: sanitizeText(parsed?.dropoffAddress),
        dropoffReference: sanitizeText(parsed?.dropoffReference),

        stopCount,
        stops: normalizeStops(parsed?.stops, stopCount),

        needsReturn: returnRequired,
        returnRequired,
        returnAddress: sanitizeText(parsed?.returnAddress),
        returnReference: sanitizeText(parsed?.returnReference),

        packageType: sanitizeText(parsed?.packageType) || "Domicilio local",
        packageDescription: sanitizeText(parsed?.packageDescription),

        senderName: sanitizeText(parsed?.senderName),
        senderPhone: sanitizeText(parsed?.senderPhone),

        receiverName: sanitizeText(parsed?.receiverName),
        receiverPhone: sanitizeText(parsed?.receiverPhone),

        notes: sanitizeText(parsed?.notes),
        isComplex: Boolean((parsed as any)?.isComplex),
        tipCOP: sanitizeMoney((parsed as any)?.tipCOP),
      };
    }

    const oldRaw = localStorage.getItem(OLD_STORAGE_KEY);
    if (oldRaw) {
      const migrated = migrateOldDraft(JSON.parse(oldRaw));
      saveKronixDiligenciaDraft(migrated);
      return migrated;
    }

    return { ...EMPTY_KRONIX_DILIGENCIA_DRAFT, stops: [{ ...EMPTY_STOP }] };
  } catch {
    return { ...EMPTY_KRONIX_DILIGENCIA_DRAFT, stops: [{ ...EMPTY_STOP }] };
  }
}

export function saveKronixDiligenciaDraft(draft: KronixDiligenciaDraft) {
  try {
    const stopCount = normalizeStopCount(draft.stopCount);
    const stops = normalizeStops(draft.stops, stopCount);
    const returnRequired = Boolean((draft as any).returnRequired ?? draft.needsReturn);

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        pickupPlaceName: sanitizeText(draft.pickupPlaceName),
        pickupAddress: sanitizeText(draft.pickupAddress),
        pickupReference: sanitizeText(draft.pickupReference),
        pickupLat: sanitizeNumber(draft.pickupLat),
        pickupLng: sanitizeNumber(draft.pickupLng),

        dropoffPlaceName: sanitizeText(draft.dropoffPlaceName),
        dropoffAddress: sanitizeText(draft.dropoffAddress),
        dropoffReference: sanitizeText(draft.dropoffReference),

        stopCount,
        stops,

        needsReturn: returnRequired,
        returnRequired,
        returnAddress: sanitizeText(draft.returnAddress),
        returnReference: sanitizeText(draft.returnReference),

        packageType: sanitizeText(draft.packageType) || "Domicilio local",
        packageDescription: sanitizeText(draft.packageDescription),

        senderName: sanitizeText(draft.senderName),
        senderPhone: sanitizeText(draft.senderPhone),

        receiverName: sanitizeText(draft.receiverName),
        receiverPhone: sanitizeText(draft.receiverPhone),

        notes: sanitizeText(draft.notes),
        isComplex: Boolean((draft as any).isComplex),
        tipCOP: sanitizeMoney((draft as any).tipCOP),
      })
    );
  } catch {}
}

export function clearKronixDiligenciaDraft() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(OLD_STORAGE_KEY);
  } catch {}
}

export function formatPhoneDraft(value: string) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.slice(0, 15);
}

export function getNormalizedDomicilioStops(draft: KronixDiligenciaDraft) {
  const stopCount = normalizeStopCount(draft.stopCount);
  return normalizeStops(draft.stops, stopCount);
}