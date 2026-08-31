// app/(buyer)/orders/page.tsx
"use client";

import Link from "next/link";
import { applyDriverSyncEvents, loadOrders, type Order } from "@/components/buyer/OrdersStorage";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { getCurrentBuyerId } from "@/lib/session";
import { apiFetch } from "@/lib/api";
import {
  getCachedBuyerOrders,
  primeBuyerTracking,
  revalidateBuyerOrders,
} from "@/lib/cache/buyerExperienceCache";
import {
  fetchOrderFromApi,
  fetchTrackingSnapshot,
} from "@/app/(buyer)/tracking/[orderId]/_tracking/api";
import AuthRequiredModal from "@/components/buyer/AuthRequiredModal";
import { useAuth } from "@/components/buyer/useAuth";

function formatCOP(v: number) {
  return v.toLocaleString("es-CO", { style: "currency", currency: "COP" });
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleString("es-CO");
}

type ApiOrderFlowStatus =
  | "WAITING_CONFIRMATION"
  | "STORE_CONFIRMED"
  | "PAYMENT_PENDING"
  | "PAID"
  | "ASSIGNED"
  | "PREPARING" 
  | "EN_ROUTE"
  | "DELIVERED"
  | "CANCELLED"
  | "PAYMENT_FAILED";

type ApiOrderType = "STORE" | "COURIER";
type ApiServiceSnapshot = Record<string, any> | null;
type ApiServiceType = string | null;

function isServiceOrder(serviceType?: string | null, orderType?: string | null) {
  const st = String(serviceType ?? "").toUpperCase();
  const ot = String(orderType ?? "").toUpperCase();

  return ot !== "STORE" && st !== "STORE";
}

function flowChipFromFlowStatus(
  flow?: ApiOrderFlowStatus | null,
  serviceType?: string | null,
  orderType?: string | null
) {
  const f = String(flow ?? "");
  const service = isServiceOrder(serviceType, orderType);

  if (f === "DELIVERED") return { text: "FINALIZADO", tone: "bg-green-50 text-green-700 ring-green-200" };
  if (f === "EN_ROUTE") return { text: "EN CAMINO", tone: "bg-blue-50 text-blue-800 ring-blue-200" };
  if (f === "PREPARING") return { text: "BUSCANDO", tone: "bg-amber-50 text-amber-800 ring-amber-200" };
  if (f === "CANCELLED") return { text: "CANCELADO", tone: "bg-gray-50 text-gray-700 ring-gray-200" };

  if (service) {
    if (f === "WAITING_CONFIRMATION")
  return {
    text: "SOLICITADO",
    tone: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  };

if (f === "STORE_CONFIRMED")
  return {
    text: "BUSCANDO",
    tone: "bg-amber-50 text-amber-800 ring-amber-200",
  };

if (f === "PAID")
  return {
    text: "BUSCANDO",
    tone: "bg-amber-50 text-amber-800 ring-amber-200",
  };

if (f === "ASSIGNED")
  return {
    text: "ASIGNADO",
    tone: "bg-blue-50 text-blue-700 ring-blue-200",
  };

if (f === "PAYMENT_PENDING")
  return {
    text: "CONFIRMADO",
    tone: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  };
  }

  if (f === "WAITING_CONFIRMATION") return { text: "ESPERANDO CONF.", tone: "bg-amber-50 text-amber-800 ring-amber-200" };
  if (f === "STORE_CONFIRMED") return { text: "CONFIRMADO", tone: "bg-green-50 text-green-700 ring-green-200" };
  if (f === "PAYMENT_PENDING") return { text: "PAGO EN PROCESO", tone: "bg-amber-50 text-amber-800 ring-amber-200" };
  if (f === "PAID") return { text: "PAGO APROBADO", tone: "bg-green-50 text-green-700 ring-green-200" };
  if (f === "PAYMENT_FAILED") return { text: "PAGO FALLIDO", tone: "bg-red-50 text-red-700 ring-red-200" };

  return { text: "EN PROCESO", tone: "bg-gray-50 text-gray-700 ring-gray-200" };
}

function getSnapshotDefinition(snapshot?: ApiServiceSnapshot) {
  if (!snapshot || typeof snapshot !== "object") return null;
  const definition = (snapshot as any).definition;
  return definition && typeof definition === "object" ? definition : snapshot;
}

function humanizeServiceKey(value?: string | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  return raw
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getServiceLabel(
  serviceType?: string | null,
  orderType?: string | null,
  serviceSnapshot?: ApiServiceSnapshot,
  serviceKey?: string | null
) {
  const ot = String(orderType ?? "").trim().toUpperCase();
  const st = String(serviceType ?? "").trim().toUpperCase();
  const sk = String(serviceKey ?? "").trim().toUpperCase();

  if (ot === "STORE" || st === "STORE") return "Tienda en Línea";

  // En Servicios Dinámicos la fotografía inmutable es la primera fuente.
  const definition = getSnapshotDefinition(serviceSnapshot);
  const dynamicName =
    String(definition?.shortName ?? "").trim() ||
    String(definition?.name ?? "").trim() ||
    String((serviceSnapshot as any)?.shortName ?? "").trim() ||
    String((serviceSnapshot as any)?.name ?? "").trim();

  if (dynamicName) return dynamicName;

  // Compatibilidad si una respuesta antigua todavía no incluye snapshot.
  if (sk === "PACKAGE" || st === "PACKAGE") return "KroniX Envíos";
  if (sk === "DELIVERY" || st === "DELIVERY") return "Domicilio";
  if (sk === "TAXI" || st === "TAXI") return "Taxi";
  if (sk === "MOTORCARGO" || st === "MOTORCARGO") return "Motocarga";

  return humanizeServiceKey(serviceKey) || "Servicio KroniX";
}

function hexToRgba(hex: string, alpha: number) {
  const value = String(hex ?? "").trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) {
    return `rgba(100, 116, 139, ${alpha})`;
  }

  const clean = value.slice(1);
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function serviceStyle(
  serviceType?: string | null,
  orderType?: string | null,
  serviceSnapshot?: ApiServiceSnapshot
): CSSProperties {
  const ot = String(orderType ?? "").trim().toUpperCase();
  const st = String(serviceType ?? "").trim().toUpperCase();

  if (ot === "STORE" || st === "STORE") {
    return {
      backgroundColor: "#EFF6FF",
      color: "#1D4ED8",
      boxShadow: "inset 0 0 0 1px #BFDBFE",
    };
  }

  const definition = getSnapshotDefinition(serviceSnapshot);
  const primary = String(definition?.primaryColor ?? "#64748B");
  const accent = String(definition?.accentColor ?? "#F8FAFC");

  return {
    backgroundColor: accent,
    color: primary,
    boxShadow: `inset 0 0 0 1px ${hexToRgba(primary, 0.24)}`,
  };
}

function OrdersSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="mt-3 space-y-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="h-4 w-40 rounded bg-gray-100 animate-pulse" />
            <div className="h-4 w-24 rounded bg-gray-100 animate-pulse" />
          </div>
          <div className="mt-2.5 h-3 w-56 rounded bg-gray-100 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function EmptyOrders({ onGoHome }: { onGoHome: () => void }) {
  return (
    <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-extrabold text-gray-900">📦 Aún no tienes pedidos</div>
      <div className="mt-1 text-xs text-gray-600">
        Cuando hagas tu primer pedido, lo verás aquí con su estado.
      </div>

      <button
        type="button"
        onClick={onGoHome}
        className="mt-3 rounded-xl bg-green-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-green-700"
      >
        Ir a Inicio
      </button>
    </div>
  );
}

type BackendOrderLite = {
  id: string;
  orderType: ApiOrderType;
  serviceType: ApiServiceType;
  serviceKey?: string | null;
  serviceSnapshot?: ApiServiceSnapshot;
  flowStatus: ApiOrderFlowStatus;
  createdAt: string;
  status?: string | null;
  totalCOP: number;
  citySlug?: string | null;
  cityLabel?: string | null;
};


function normalizeBackendOrders(data: unknown): BackendOrderLite[] {
  const list = Array.isArray(data) ? data : [];

  return list
    .filter((x) => x?.id)
    .map((x) => ({
      id: String(x.id),
      orderType: String(x.orderType ?? "STORE") as ApiOrderType,
      serviceType: x?.serviceType
        ? (String(x.serviceType) as ApiServiceType)
        : null,
      serviceKey: x?.serviceKey ? String(x.serviceKey) : null,
      serviceSnapshot:
        x?.serviceSnapshot && typeof x.serviceSnapshot === "object"
          ? x.serviceSnapshot
          : null,
      flowStatus: String(
        x.flowStatus ?? "WAITING_CONFIRMATION"
      ) as ApiOrderFlowStatus,
      status: x?.status ? String(x.status) : null,
      createdAt: String(x.createdAt ?? new Date().toISOString()),
      totalCOP: typeof x.totalCOP === "number" ? x.totalCOP : 0,
      citySlug: x?.city?.slug ? String(x.city.slug) : null,
      cityLabel:
        x?.city?.name && x?.city?.department
          ? `${String(x.city.name)}, ${String(x.city.department)}`
          : null,
    }));
}

export default function OrdersPage() {
  const router = useRouter();
  const { isLoading: authLoading, isAuthed } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [backendOrders, setBackendOrders] = useState<BackendOrderLite[]>([]);
  const [fallbackOrders, setFallbackOrders] = useState<Order[]>([]);
  const [usingFallback, setUsingFallback] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    applyDriverSyncEvents();
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthed) {
      setShowAuthModal(true);
    }
  }, [authLoading, isAuthed]);

  useEffect(() => {
    let alive = true;

    async function loadPrimaryFromBackend() {
      const customerId = getCurrentBuyerId();
      const local = loadOrders();
      const cached = getCachedBuyerOrders(customerId);

      setFallbackOrders(local);
      setUsingFallback(false);
      setIsLoading(!cached);

      if (cached) {
        setBackendOrders(cached.value as BackendOrderLite[]);
      }

      try {
        const result = await revalidateBuyerOrders(customerId, async () => {
          const data = await apiFetch<Array<any>>(
            `/orders?customerId=${encodeURIComponent(customerId)}`,
            { method: "GET", cache: "no-store" } as any
          );
          return normalizeBackendOrders(data);
        });

        if (!alive) return;

        if (result.changed || !cached) {
          setBackendOrders(result.value as BackendOrderLite[]);
        }

        setUsingFallback(false);
        setIsLoading(false);
      } catch {
        if (!alive) return;

        if (cached) {
          setBackendOrders(cached.value as BackendOrderLite[]);
          setUsingFallback(false);
        } else {
          setBackendOrders([]);
          setUsingFallback(true);
        }

        setIsLoading(false);
      }
    }

    void loadPrimaryFromBackend();

    return () => {
      alive = false;
    };
  }, []);

  const warmTracking = (orderId: string) => {
    router.prefetch(`/tracking/${orderId}`);

    void primeBuyerTracking(orderId, async () => {
      const [order, tracking] = await Promise.all([
        fetchOrderFromApi(orderId),
        fetchTrackingSnapshot(orderId),
      ]);

      return { order, tracking };
    }).catch(() => null);
  };

  const viewList = useMemo(() => {
    if (usingFallback) {
      return fallbackOrders.map((o) => ({
        id: o.id,
        createdAtMs: o.createdAt,
        totalCOP: o.total ?? 0,
        flowStatus: (o.flowStatus as any) ?? null,
        citySlug: o.citySlug ?? null,
        cityLabel: o.cityLabel ?? null,
        orderType: (o as any).orderType ?? "STORE",
        serviceType: (o as any).serviceType ?? null,
        serviceKey: (o as any).serviceKey ?? null,
        serviceSnapshot: (o as any).serviceSnapshot ?? null,
        status: (o as any).status ?? null,
      }));
    }

    return backendOrders.map((b) => ({
      id: b.id,
      createdAtMs: Number.isFinite(Date.parse(b.createdAt)) ? Date.parse(b.createdAt) : Date.now(),
      totalCOP: typeof b.totalCOP === "number" ? b.totalCOP : 0,
      flowStatus: b.flowStatus,
      citySlug: b.citySlug ?? null,
      cityLabel: b.cityLabel ?? null,
      orderType: b.orderType ?? "STORE",
      serviceType: b.serviceType ?? null,
      serviceKey: b.serviceKey ?? null,
      serviceSnapshot: b.serviceSnapshot ?? null,
      status: b.status ?? null,
    }));
  }, [usingFallback, backendOrders, fallbackOrders]);

  if (!authLoading && !isAuthed) {
    return (
      <div className="px-4 pb-6 pt-3">
        <div className="text-lg font-extrabold text-gray-900">Historial de pedidos</div>

        <AuthRequiredModal
          open={showAuthModal}
          onConfirm={() => router.replace(`/login?next=${encodeURIComponent("/orders")}`)}
        />
      </div>
    );
  }

  return (
    <div className="px-4 pb-6 pt-3">
      <div className="text-lg font-extrabold text-gray-900">Historial de pedidos</div>

      {!isLoading && usingFallback ? (
        <div className="mt-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          No pudimos conectar con el servidor. Mostrando pedidos guardados en este dispositivo.
        </div>
      ) : null}

      {isLoading ? (
        <OrdersSkeletonList count={3} />
      ) : viewList.length === 0 ? (
        <EmptyOrders onGoHome={() => router.push("/")} />
      ) : (
        <div className="mt-3 space-y-2.5">
          {viewList.map((o) => {
            const chipStatus =
  String(o.status ?? "").toUpperCase() === "ASSIGNED"
    ? "ASSIGNED"
    : o.flowStatus;

const chip = flowChipFromFlowStatus(
  chipStatus as any,
  o.serviceType,
  o.orderType
);
            const svc = getServiceLabel(
              o.serviceType,
              o.orderType,
              o.serviceSnapshot,
              o.serviceKey
            );
            const svcStyle = serviceStyle(
              o.serviceType,
              o.orderType,
              o.serviceSnapshot
            );

            return (
              <Link
                key={o.id}
                href={`/tracking/${o.id}`}
                onMouseEnter={() => warmTracking(o.id)}
                onFocus={() => warmTracking(o.id)}
                onTouchStart={() => warmTracking(o.id)}
                className="block rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:bg-gray-50"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-gray-900">Pedido #{o.id}</div>
                  </div>

                  <div
                    className={[
                      "shrink-0 rounded-full px-3 py-1 text-[11px] font-extrabold ring-1",
                      chip.tone,
                    ].join(" ")}
                  >
                    {chip.text}
                  </div>
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                  <span>{formatDate(o.createdAtMs)}</span>
                  <span>•</span>
                  <span>Total: {formatCOP(o.totalCOP)}</span>
                </div>

                <div className="mt-2.5 flex flex-wrap gap-2">
                  <span
                    className={[
                      "inline-flex rounded-full px-3 py-1 text-[11px] font-extrabold ring-1",
                    ].join(" ")}
                    style={svcStyle}
                  >
                    Servicio: {svc}
                  </span>

                  {o.cityLabel ? (
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-extrabold text-slate-700 ring-1 ring-slate-200">
                      {o.cityLabel}
                    </span>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
