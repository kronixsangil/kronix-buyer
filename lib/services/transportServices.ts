// lib/services/transportServices.ts

import { apiFetch } from "@/lib/api";
import { createTwoLevelCatalogCache } from "@/lib/cache/twoLevelCatalogCache";

export type DynamicServiceRequestSchema = {
  routeMode?: "POINT_ONLY" | "ORIGIN_DESTINATION" | "MULTI_STOP" | string;
  packageType?: string | null;
  allowSavedAddress?: boolean;
  allowCurrentLocation?: boolean;
  origin?: {
    enabled?: boolean;
    required?: boolean;
    title?: string;
    addressLabel?: string;
    placeNameLabel?: string;
    referenceLabel?: string;
  };
  destination?: {
    enabled?: boolean;
    required?: boolean;
    title?: string;
    addressLabel?: string;
    placeNameLabel?: string;
    referenceLabel?: string;
  };
  contact?: { enabled?: boolean; required?: boolean };
  note?: {
    enabled?: boolean;
    required?: boolean;
    label?: string;
    placeholder?: string;
    defaultValue?: string;
  };
  submit?: { buttonText?: string; creatingText?: string };
  paymentMode?: "DIRECT_TO_WORKER" | "PLATFORM" | string;
};

export type DynamicTransportService = {
  id: string;
  serviceKey: string;
  slug: string;
  name: string;
  shortName: string;
  description?: string | null;
  workerTypeKey: string;
  workerLabel: string;
  workerPluralLabel: string;
  icon?: string | null;
  assetSlug?: string | null;
  buyerPath?: string | null;
  cardImageLeft?: string | null;
  cardImageRight?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  requestSchema: DynamicServiceRequestSchema;
  workerFlowSchema?: Record<string, unknown> | null;
  trackingSchema?: Record<string, unknown> | null;
  status?: string | null;
  version?: number | null;
  workerCommissionCOP?: number | null;
  isActive?: boolean;
  sortOrder?: number;
  cityOverrides?: Record<string, unknown> | null;
};

type PublicServicesResponse = {
  ok: true;
  city: {
    id: string;
    slug: string;
    name: string;
    department?: string | null;
    country?: string | null;
  };
  items: DynamicTransportService[];
};

export function dynamicServiceHref(service: Pick<DynamicTransportService, "slug">) {
  return `/kronix/${encodeURIComponent(String(service.slug ?? "").trim())}`;
}

function normalizeCitySlug(citySlug: string) {
  return String(citySlug ?? "").trim().toLowerCase();
}

function normalizeServiceSlug(serviceSlug: string) {
  return String(serviceSlug ?? "").trim().toLowerCase();
}

function normalizeDynamicServices(items: DynamicTransportService[]) {
  return (Array.isArray(items) ? items : [])
    .filter((item) => item && item.isActive !== false)
    .slice()
    .sort((a, b) => {
      const orderDifference = Number(a.sortOrder ?? 100) - Number(b.sortOrder ?? 100);
      if (orderDifference !== 0) return orderDifference;
      return String(a.name ?? "").localeCompare(String(b.name ?? ""), "es");
    });
}

const dynamicServicesCache = createTwoLevelCatalogCache<DynamicTransportService[]>({
  namespace: "kronix:catalog:dynamic-services",
  version: 1,
  normalize: normalizeDynamicServices,
});

async function fetchDynamicTransportServices(citySlug: string) {
  const response = await apiFetch<PublicServicesResponse>(
    `/public/services?citySlug=${encodeURIComponent(citySlug)}`,
    { method: "GET", cache: "no-store", suppressSessionExpiredEvent: true } as any
  );
  return normalizeDynamicServices(response?.items ?? []);
}

export function getCachedDynamicTransportServices(citySlug: string) {
  const cleanCitySlug = normalizeCitySlug(citySlug);
  if (!cleanCitySlug) return null;
  return dynamicServicesCache.read(cleanCitySlug);
}

export async function listDynamicTransportServices(citySlug: string) {
  const cleanCitySlug = normalizeCitySlug(citySlug);
  if (!cleanCitySlug) return [] as DynamicTransportService[];
  return dynamicServicesCache.getOrLoad(cleanCitySlug, () => fetchDynamicTransportServices(cleanCitySlug));
}

export async function revalidateDynamicTransportServices(citySlug: string) {
  const cleanCitySlug = normalizeCitySlug(citySlug);
  if (!cleanCitySlug) {
    return { value: [] as DynamicTransportService[], signature: "[]", changed: false, hadCachedValue: false };
  }
  return dynamicServicesCache.refresh(cleanCitySlug, () => fetchDynamicTransportServices(cleanCitySlug));
}

export function invalidateDynamicTransportServices(citySlug: string) {
  const cleanCitySlug = normalizeCitySlug(citySlug);
  if (!cleanCitySlug) return;
  dynamicServicesCache.invalidate(cleanCitySlug);
}

export async function getDynamicTransportService(citySlug: string, serviceSlug: string) {
  const cleanServiceSlug = normalizeServiceSlug(serviceSlug);
  if (!cleanServiceSlug) return null;
  const services = await listDynamicTransportServices(citySlug);
  return services.find((service) => normalizeServiceSlug(service.slug) === cleanServiceSlug) ?? null;
}
