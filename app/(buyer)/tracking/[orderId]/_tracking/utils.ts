//app\(buyer)\tracking\[orderId]\_tracking\utils.ts
import { loadOrders, type Order, type PaymentMethod, type StoreState } from "@/components/buyer/OrdersStorage";
import type {
  ApiCourierData,
  ApiOrder,
  ApiOrderFlowStatus,
  ApiOrderType,
  ApiTrackingSnapshot,
  BuyerNotifyState,
  PositiveStep,
  StoreReviewDraft,
} from "./types";

export const CARD = "rounded-2xl border border-gray-200 bg-white shadow-sm";
export const CARD_PAD = `${CARD} p-4`;
export const CARD_PAD_SM = `${CARD} p-3`;

export const BUYER_TRACK_NOTIFY_KEY_PREFIX = "buyer_track_notify_v1:";

export const FLOW_STEPS: PositiveStep[] = [
  {
    key: "WAITING_CONFIRMATION",
    label: "Esperando confirmación",
    hint: "El negocio revisará disponibilidad y confirmará tu pedido",
  },
  { key: "STORE_CONFIRMED", label: "Confirmado por el negocio", hint: "Ya puedes proceder al pago" },
  { key: "PAYMENT_PENDING", label: "Procesando pago", hint: "Estamos procesando tu pago" },
  { key: "PAID", label: "Pago aprobado", hint: "Tu pedido pasa a preparación" },
  { key: "PREPARING", label: "En preparación", hint: "El negocio está preparando tu pedido" },
  { key: "EN_ROUTE", label: "En camino", hint: "Tu repartidor ya salió" },
  { key: "DELIVERED", label: "Entregado", hint: "¡Disfrútalo!" },
];

export type CourierServiceType = "PICKUP_AND_DELIVERY" | "SEND_PACKAGE" | "ERRAND" | string | null;

export function getCourierServiceTypeFromSources(order: any, tracking: any): string {
  return String(
    tracking?.courierServiceType ??
      order?.courierServiceType ??
      order?.courier?.courierServiceType ??
      ""
  )
    .trim()
    .toUpperCase();
}

export function getServiceKeyFromSources(order: any, tracking: any): string {
  const raw = String(
    tracking?.serviceType ??
      order?.serviceType ??
      tracking?.courierServiceType ??
      order?.courierServiceType ??
      order?.courier?.courierServiceType ??
      ""
  )
    .trim()
    .toUpperCase();

  if (raw === "MOTORCARGO" || raw === "MOTOCARGA") return "MOTORCARGO";
  if (raw === "TAXI") return "TAXI";
  if (raw === "PACKAGE" || raw === "SEND_PACKAGE") return "SEND_PACKAGE";
  if (raw === "DELIVERY" || raw === "PICKUP_AND_DELIVERY") return "PICKUP_AND_DELIVERY";

  const text = String(
    order?.packageType ??
      order?.courier?.packageType ??
      tracking?.courier?.packageType ??
      order?.packageDescription ??
      order?.courier?.packageDescription ??
      tracking?.courier?.packageDescription ??
      order?.customerNote ??
      ""
  )
    .trim()
    .toUpperCase();

  if (text.includes("MOTOCARGA") || text.includes("MOTORCARGO")) return "MOTORCARGO";
  if (text.includes("TAXI")) return "TAXI";
  if (text.includes("KRONIX ENVÍOS") || text.includes("KRONIX ENVIOS") || text.includes("SEND_PACKAGE")) return "SEND_PACKAGE";
  if (text.includes("DOMICILIO EXPRESS") || text.includes("PICKUP_AND_DELIVERY")) return "PICKUP_AND_DELIVERY";

  return raw;
}

export function getCourierServiceLabel(serviceType?: CourierServiceType) {
  const t = String(serviceType ?? "").trim().toUpperCase();

  if (t === "TAXI") return "Taxi";
  if (t === "MOTORCARGO" || t === "MOTOCARGA") return "Motocarga";
  if (t === "SEND_PACKAGE" || t === "PACKAGE") return "KroniX Envíos";
  if (t === "PICKUP_AND_DELIVERY" || t === "DELIVERY") return "Domicilio Express";

  return "Servicio KroniX";
}

export function getContextualFlowSteps(args: {
  isCourier: boolean;
  courierServiceType?: CourierServiceType;
}): PositiveStep[] {
  if (!args.isCourier) return FLOW_STEPS;

  const t = String(args.courierServiceType ?? "").trim().toUpperCase();
  const serviceLabel = getCourierServiceLabel(t);
  const workerLabel = t === "TAXI" ? "taxista" : t === "MOTORCARGO" ? "motocarguero" : "Domiciliario";

  if (t === "SEND_PACKAGE") {
  return [
    { key: "WAITING_CONFIRMATION", label: "Solicitud recibida", hint: "Estamos registrando tu envío" },
    { key: "STORE_CONFIRMED", label: "Envío confirmado", hint: `Buscaremos un ${workerLabel} disponible` },
    { key: "PAID", label: `Buscando ${workerLabel}`, hint: `Tu solicitud ya está disponible para los ${workerLabel}s autorizados` },
    { key: "PREPARING", label: "Recogiendo paquete", hint: `El ${workerLabel} se dirige al punto de recogida` },
    { key: "EN_ROUTE", label: "En camino", hint: "Tu paquete va hacia el destino" },
    { key: "DELIVERED", label: "Entregado", hint: "Tu envío fue completado" },
  ];
}

  return [
    { key: "WAITING_CONFIRMATION", label: "Solicitud recibida", hint: `Estamos registrando tu servicio ${serviceLabel}` },
    { key: "STORE_CONFIRMED", label: "Servicio confirmado", hint: `Buscaremos un ${workerLabel} disponible` },
    { key: "PAID", label: `Buscando ${workerLabel}`, hint: "Tu solicitud ya está disponible para los ${workerLabel}s autorizados" },
    { key: "PREPARING", label: `${workerLabel} asignado`, hint: `El ${workerLabel} se dirige al punto indicado` },
    { key: "EN_ROUTE", label: "Servicio en curso", hint: "El servicio ya está en proceso" },
    { key: "DELIVERED", label: "Finalizado", hint: "Tu servicio fue completado" },
  ];
}

export function contextualFlowLabel(args: {
  flow?: ApiOrderFlowStatus | null;
  isCourier: boolean;
  courierServiceType?: CourierServiceType;
}) {
  const steps = getContextualFlowSteps({
    isCourier: args.isCourier,
    courierServiceType: args.courierServiceType,
  });

  const found = steps.find((s) => s.key === args.flow);
  if (found) return found.label.toUpperCase();

  return flowLabel(args.flow);
}

export function formatCOP(value: number) {
  const n = Number.isFinite(value) ? value : 0;
  return n.toLocaleString("es-CO", { style: "currency", currency: "COP" });
}

export function flowLabel(flow?: ApiOrderFlowStatus | null) {
  const f = String(flow ?? "");
  if (f === "WAITING_CONFIRMATION") return "ESPERANDO CONFIRMACIÓN";
  if (f === "STORE_CONFIRMED") return "CONFIRMADO";
  if (f === "PAYMENT_PENDING") return "PAGO EN PROCESO";
  if (f === "PAID") return "PAGO APROBADO";
  if (f === "PREPARING") return "PREPARANDO";
  if (f === "EN_ROUTE") return "EN CAMINO";
  if (f === "DELIVERED") return "ENTREGADO";
  if (f === "PAYMENT_FAILED") return "PAGO FALLIDO";
  if (f === "CANCELLED") return "CANCELADO";
  return "—";
}

export function storeImageFromName(name?: string) {
  const n = String(name ?? "").toLowerCase();
  if (!n) return null;
  if (n.includes("napoli")) return "/images/stores/1.png";
  if (n.includes("sabroso")) return "/images/stores/2.png";
  if (n.includes("droguer") || n.includes("abc")) return "/images/stores/3.png";
  if (n.includes("style")) return "/images/stores/4.png";
  if (n.includes("pet")) return "/images/stores/5.png";
  return null;
}

export function pickFirstReason(obj: any): string | undefined {
  const candidates = [obj?.rejectReason, obj?.reject_reason, obj?.reason, obj?.rejectionReason, obj?.rejectedReason];
  for (const c of candidates) {
    const v = String(c ?? "").trim();
    if (v) return v;
  }
  return undefined;
}

export function normName(name: any) {
  return String(name ?? "").trim().toLowerCase();
}

export function getLocalOrderById(orderId: string): Order | null {
  try {
    const orders = loadOrders();
    return orders.find((o) => o.id === orderId) ?? null;
  } catch {
    return null;
  }
}

export function mapApiOrderToBuyerOrder(data: ApiOrder, previous?: Order | null): Order {
  const createdAt = Date.parse(data.createdAt);
  const createdAtMs = Number.isFinite(createdAt) ? createdAt : Date.now();

  const apiOrderType = String(data.orderType ?? "STORE").trim().toUpperCase() as ApiOrderType;
  const isCourier = apiOrderType === "COURIER";

  const pickups = Array.isArray(data.pickups) ? data.pickups : [];
  const items = Array.isArray(data.items) ? data.items : [];
  const pickupsSorted = pickups.slice().sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));

  const storesSummary = !isCourier
    ? pickupsSorted.map((p) => ({
        storeId: String(p.storeId),
        name: p.store?.name ?? "Tienda",
      }))
    : [];

  const storeStates = !isCourier
    ? pickupsSorted.map((p) => {
        const confirmed = !!p.storeConfirmedAt;
        const rejected = !!p.storeRejectedAt;
        const state: StoreState = confirmed ? "CONFIRMED" : rejected ? "REJECTED" : "PENDING";

        return {
          storeId: String(p.storeId),
          name: p.store?.name ?? "Tienda",
          state,
          reason: pickFirstReason(p),
        };
      })
    : [];

  const rejectedIds = new Set(pickupsSorted.filter((p) => !!p.storeRejectedAt).map((p) => String(p.storeId)));
  const confirmedIds = new Set(pickupsSorted.filter((p) => !!p.storeConfirmedAt).map((p) => String(p.storeId)));
  const allClosed = pickupsSorted.length > 0 && pickupsSorted.every((p) => !!p.storeConfirmedAt || !!p.storeRejectedAt);

  const keepStore = (storeId: string) => {
    if (allClosed) return confirmedIds.has(storeId);
    return !rejectedIds.has(storeId);
  };

  const buyerItemsAll = !isCourier
    ? items.map((it) => ({
        id: it.productId ?? it.id,
        storeId: it.storeId,
        name: it.name,
        price: it.priceCOP,
        qty: it.qty,
      }))
    : [
        {
          id: "courier-service",
          storeId: "",
          name: String(data.packageType ?? "Domicilio Express"),
          price: Number(data.totalCOP ?? 0),
          qty: 1,
        },
      ];

  const buyerItems = buyerItemsAll.filter((it) => {
    const sid = String(it.storeId ?? "");
    if (!sid) return true;
    return keepStore(sid);
  });

  const storeNameById = new Map(storesSummary.map((s) => [s.storeId, s.name]));
  const groupsMap = new Map<
    string,
    { storeId: string; storeName: string; storeImage?: string | null; items: any[]; subtotal: number }
  >();

  if (!isCourier) {
    for (const it of buyerItems) {
      const sid = String(it.storeId ?? "na");
      const storeName = storeNameById.get(sid) ?? "Tienda";

      const g = groupsMap.get(sid) ?? {
        storeId: sid,
        storeName,
        storeImage: storeImageFromName(storeName),
        items: [],
        subtotal: 0,
      };

      g.items.push(it);
      g.subtotal += Number(it.price || 0) * Number(it.qty || 0);
      groupsMap.set(sid, g);
    }
  }

  const groups = Array.from(groupsMap.values()).filter((g) => g.storeId !== "na");
  const apiFlow = (data.flowStatus ?? "WAITING_CONFIRMATION") as ApiOrderFlowStatus;

  const courierPickupLocations =
    isCourier && data.pickupAddress
      ? [{ address: String(data.pickupAddress), lat: Number(data.pickupLat ?? 0), lng: Number(data.pickupLng ?? 0) }]
      : [];

  const order: Order = {
    id: data.id,
    createdAt: createdAtMs,
    status: "CONFIRMADO",
    total: Number(data.totalCOP ?? 0),
    items: buyerItems,
    groups: !isCourier && groups.length ? (groups as any) : undefined,
    deliveryFeeCOP: Number(data.deliveryFeeCOP ?? 0),
    storesSummary: !isCourier && storesSummary.length ? storesSummary : undefined,
    storeStates: !isCourier && storeStates.length ? (storeStates as any) : undefined,
    tipCOP: Number(data.tipCOP ?? 0),
    customerNote: data.customerNote ?? undefined,
    address: data.dropoffAddress,
    paymentMethod: ((previous?.paymentMethod as PaymentMethod | undefined) ?? "NEQUI"),
    pickupLocations: isCourier
      ? courierPickupLocations
      : pickupsSorted.map((p) => ({ address: p.pickupAddress, lat: p.pickupLat, lng: p.pickupLng })),
    dropoffLocation: { address: data.dropoffAddress, lat: data.dropoffLat, lng: data.dropoffLng },
    flowStatus: apiFlow as any,
    payment: {
      status:
        data.paymentStatus === "PAID"
          ? "PAID"
          : data.paymentStatus === "FAILED"
          ? "FAILED"
          : data.paymentStatus === "PENDING"
          ? "PENDING"
          : "NONE",
      reference: data.paymentReference ?? undefined,
      updatedAt: data.updatedAt ? Date.parse(data.updatedAt) : undefined,
    },
    citySlug: previous?.citySlug,
    cityLabel: previous?.cityLabel,
  };

  (order as any).storesSubtotalCOP = Number(data.storesSubtotalCOP ?? 0);
  (order as any).promoCOP = Number(data.promoCOP ?? 0);
  (order as any).serviceFeeCOP = Number(data.serviceFeeCOP ?? 0);
  (order as any).orderType = apiOrderType;
  (order as any).courier = isCourier
    ? {
        pickupAddress: data.pickupAddress ?? null,
        pickupLat: data.pickupLat ?? null,
        pickupLng: data.pickupLng ?? null,
        pickupPlaceName: data.pickupPlaceName ?? null,
        pickupReference: data.pickupReference ?? null,
        dropoffPlaceName: data.dropoffPlaceName ?? null,
        dropoffReference: data.dropoffReference ?? null,
        senderName: data.senderName ?? null,
        senderPhone: data.senderPhone ?? null,
        receiverName: data.receiverName ?? null,
        receiverPhone: data.receiverPhone ?? null,
        packageType: data.packageType ?? null,
        packageDescription: data.packageDescription ?? null,
      }
    : null;

  return order;
}

export function isFiniteCoord(n: unknown, kind: "lat" | "lng") {
  if (typeof n !== "number" || !Number.isFinite(n)) return false;
  if (kind === "lat") return n >= -90 && n <= 90;
  return n >= -180 && n <= 180;
}

export function mapCenterBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  return { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
}

export function buildEmbedUrl(center: { lat: number; lng: number }, zoom = 15) {
  const q = `${center.lat},${center.lng}`;
  return `https://www.google.com/maps?q=${encodeURIComponent(q)}&z=${encodeURIComponent(String(zoom))}&output=embed`;
}

export function buildOpenMapsUrl(args: { dest: { lat: number; lng: number }; origin?: { lat: number; lng: number } }) {
  const destination = `${args.dest.lat},${args.dest.lng}`;
  const base = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
  if (args.origin) {
    const origin = `${args.origin.lat},${args.origin.lng}`;
    return `${base}&origin=${encodeURIComponent(origin)}&travelmode=driving`;
  }
  return base;
}

export function normalizePhoneAny(p?: string | null) {
  const raw = String(p ?? "").trim();
  if (!raw) return "";
  if (raw.startsWith("+")) return raw;
  if (/^\d{10}$/.test(raw)) return `+57${raw}`;
  if (/^\d{12,13}$/.test(raw) && raw.startsWith("57")) return `+${raw}`;
  return raw;
}

export function buildWhatsAppUrl(phoneE164: string, message: string) {
  const digits = phoneE164.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function loadBuyerNotifyState(orderId: string): BuyerNotifyState {
  try {
    const raw = localStorage.getItem(`${BUYER_TRACK_NOTIFY_KEY_PREFIX}${orderId}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as BuyerNotifyState;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveBuyerNotifyState(orderId: string, state: BuyerNotifyState) {
  try {
    localStorage.setItem(`${BUYER_TRACK_NOTIFY_KEY_PREFIX}${orderId}`, JSON.stringify(state));
  } catch {}
}

export function buildStoresToRate(order: Order | null, tracking: ApiTrackingSnapshot | null): StoreReviewDraft[] {
  const orderType = String((order as any)?.orderType ?? tracking?.orderType ?? "STORE").trim().toUpperCase();
  if (orderType === "COURIER") return [];

  const map = new Map<string, StoreReviewDraft>();

  const groups = Array.isArray(order?.groups) ? order!.groups : [];
  for (const g of groups as any[]) {
    const storeId = String(g?.storeId ?? "").trim();
    const storeName = String(g?.storeName ?? "").trim() || "Tienda";
    const key = normName(storeName);
    if (!key) continue;

    if (!map.has(key)) {
      map.set(key, { storeId, storeName, stars: 5, comment: "", isCommentOpen: false });
    }
  }

  const pickups = Array.isArray(tracking?.pickups) ? tracking!.pickups : [];
  for (const p of pickups) {
    const storeId = String(p?.storeCode ?? "").trim();
    const storeName = String(p?.storeName ?? "").trim() || "Tienda";
    const key = normName(storeName);
    if (!key || !storeId) continue;

    if (!map.has(key)) {
      map.set(key, { storeId, storeName, stars: 5, comment: "", isCommentOpen: false });
    }
  }

  return Array.from(map.values());
}

export function getStarButtonClass(active: boolean) {
  return [
    "h-8 w-8 rounded-lg ring-1 transition",
    active ? "bg-amber-50 text-amber-700 ring-amber-200" : "bg-white text-gray-400 ring-gray-200",
  ].join(" ");
}