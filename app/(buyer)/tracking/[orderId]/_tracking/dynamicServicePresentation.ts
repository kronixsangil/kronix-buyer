// app/(buyer)/tracking/[orderId]/_tracking/dynamicServicePresentation.ts

import type { Order } from "@/components/buyer/OrdersStorage";
import type { ApiTrackingSnapshot } from "./types";

type AnyRecord = Record<string, any>;

export type DynamicServicePresentation = {
  isStore: boolean;
  isDynamicService: boolean;
  isKronixShipping: boolean;
  serviceKey: string;
  serviceName: string;
  shortName: string;
  workerLabel: string;
  workerPluralLabel: string;
  primaryColor: string;
  accentColor: string;
  requestSchema: AnyRecord;
  trackingSchema: AnyRecord;
  serviceSnapshot: AnyRecord | null;
};

function asRecord(value: unknown): AnyRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as AnyRecord)
    : null;
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = clean(value);
    if (text) return text;
  }
  return "";
}

export function resolveDynamicServicePresentation(
  order: Order | null,
  tracking: ApiTrackingSnapshot | null
): DynamicServicePresentation {
  const snapshot =
    asRecord((tracking as any)?.serviceSnapshot) ??
    asRecord((order as any)?.serviceSnapshot);

  const definition =
    asRecord(snapshot?.definition) ??
    asRecord(snapshot?.serviceDefinition) ??
    snapshot;

  const orderType = firstText(
    (tracking as any)?.orderType,
    (order as any)?.orderType
  ).toUpperCase();

  const serviceKey = firstText(
    definition?.serviceKey,
    snapshot?.serviceKey,
    (tracking as any)?.serviceKey,
    (order as any)?.serviceKey,
    (tracking as any)?.serviceType,
    (order as any)?.serviceType
  ).toUpperCase();

  const isStore = orderType === "STORE" || serviceKey === "STORE";
  const isKronixShipping =
    serviceKey === "PACKAGE" ||
    serviceKey === "SEND_PACKAGE" ||
    Boolean((tracking as any)?.storeGeneratedShipping);

  const serviceName = isStore
    ? "Tienda en Línea"
    : isKronixShipping
      ? "KroniX Envíos"
      : firstText(
          definition?.name,
          snapshot?.name,
          (tracking as any)?.serviceName,
          (order as any)?.serviceName,
          "Servicio"
        );

  const shortName = firstText(
    definition?.shortName,
    snapshot?.shortName,
    serviceName
  );

  const workerLabel = firstText(
    definition?.workerLabel,
    snapshot?.workerLabel,
    (tracking as any)?.workerLabel,
    (tracking as any)?.cancellationPolicy?.workerLabel,
    (order as any)?.workerLabel,
    "trabajador"
  );

  const workerPluralLabel = firstText(
    definition?.workerPluralLabel,
    snapshot?.workerPluralLabel,
    (tracking as any)?.workerPluralLabel,
    `${workerLabel}s`
  );

  const requestSchema =
    asRecord(definition?.requestSchema) ??
    asRecord(snapshot?.requestSchema) ??
    {};

  const trackingSchema =
    asRecord(definition?.trackingSchema) ??
    asRecord(snapshot?.trackingSchema) ??
    {};

  return {
    isStore,
    isDynamicService: !isStore,
    isKronixShipping,
    serviceKey,
    serviceName,
    shortName,
    workerLabel,
    workerPluralLabel,
    primaryColor: firstText(
      definition?.primaryColor,
      snapshot?.primaryColor,
      "#0F766E"
    ),
    accentColor: firstText(
      definition?.accentColor,
      snapshot?.accentColor,
      "#ECFDF5"
    ),
    requestSchema,
    trackingSchema,
    serviceSnapshot: snapshot,
  };
}

export function getTrackingCopy(
  presentation: DynamicServicePresentation,
  key: string,
  fallback: string
) {
  return firstText(presentation.trackingSchema?.[key], fallback);
}

export function getTrackingFlowSteps(
  presentation: DynamicServicePresentation
): Array<{ key: string; label: string; hint: string }> {
  const configured = presentation.trackingSchema?.flowSteps;

  if (Array.isArray(configured)) {
    const valid = configured
      .map((step: any) => ({
        key: clean(step?.key).toUpperCase(),
        label: clean(step?.label),
        hint: clean(step?.hint),
      }))
      .filter((step) => step.key && step.label);

    if (valid.length) return valid;
  }

  return [
    {
      key: "WAITING_CONFIRMATION",
      label: "Solicitud recibida",
      hint: `Estamos registrando tu solicitud de ${presentation.serviceName}.`,
    },
    {
      key: "STORE_CONFIRMED",
      label: "Servicio confirmado",
      hint: `Buscaremos un ${presentation.workerLabel} disponible.`,
    },
    {
      key: "PAID",
      label: `Buscando ${presentation.workerLabel}`,
      hint: `Tu solicitud está disponible para ${presentation.workerPluralLabel} autorizados.`,
    },
    {
      key: "PREPARING",
      label: `${presentation.workerLabel} asignado`,
      hint: `El ${presentation.workerLabel} se dirige al punto indicado.`,
    },
    {
      key: "EN_ROUTE",
      label: "Servicio en curso",
      hint: "Tu servicio se encuentra en proceso.",
    },
    {
      key: "DELIVERED",
      label: "Finalizado",
      hint: "Tu servicio fue completado.",
    },
  ];
}
