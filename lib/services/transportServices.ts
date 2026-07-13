// lib/services/transportServices.ts

import { apiFetch } from "@/lib/api";

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

export async function listDynamicTransportServices(citySlug: string) {
  const cleanCitySlug = String(citySlug ?? "").trim();
  if (!cleanCitySlug) return [] as DynamicTransportService[];

  const response = await apiFetch<PublicServicesResponse>(
    `/public/services?citySlug=${encodeURIComponent(cleanCitySlug)}`,
    { method: "GET", cache: "no-store", suppressSessionExpiredEvent: true } as any
  );

  return (Array.isArray(response?.items) ? response.items : [])
    .filter((item) => item && item.isActive !== false)
    .slice()
    .sort((a, b) => Number(a.sortOrder ?? 100) - Number(b.sortOrder ?? 100));
}

export async function getDynamicTransportService(citySlug: string, serviceSlug: string) {
  const services = await listDynamicTransportServices(citySlug);
  const slug = String(serviceSlug ?? "").trim().toLowerCase();
  return services.find((service) => String(service.slug ?? "").trim().toLowerCase() === slug) ?? null;
}
