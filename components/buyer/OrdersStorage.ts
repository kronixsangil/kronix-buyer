// components/buyer/OrdersStorage.ts
export type PaymentMethod = "NEQUI" | "WOMPI" | "WALLET";

export type OrderStatus = "CONFIRMADO" | "PREPARANDO" | "EN CAMINO" | "ENTREGADO";

export type OrderFlowStatus =
  | "PENDING_STORE"
  | "STORE_CONFIRMED"
  | "STORE_CHANGES_REQUESTED"
  | "STORE_REJECTED"
  | "PAYMENT_PENDING"
  | "PAID"
  | "PAYMENT_FAILED"
  | "CANCELLED"
  | "WAITING_CONFIRMATION"
  | "PREPARING"
  | "EN_ROUTE"
  | "DELIVERED";

export type GeoPoint = {
  lat: number;
  lng: number;
  address: string;
};

export type OrderItem = {
  id: string;
  storeId?: string;
  name: string;
  price: number;
  qty: number;
};

export type OrderGroup = {
  storeId: string;
  storeName: string;
  storeImage?: string;
  items: OrderItem[];
  subtotal: number;
  status: OrderStatus;
};

export type ChangeRequestItem = {
  itemId: string;
  action: "REPLACE" | "REMOVE";
  reason?: string;
  replaceWithItemId?: string;
  replaceWithName?: string;
  replaceWithPrice?: number;
};

export type PaymentInfo = {
  status: "NONE" | "PENDING" | "PAID" | "FAILED";
  method?: PaymentMethod;
  reference?: string;
  failureReason?: string;
  updatedAt?: number;
};

export type StoreDecision = {
  decidedAt?: number;
  note?: string;
};

export type StoreState = "PENDING" | "CONFIRMED" | "REJECTED";

export type Order = {
  id: string;
  createdAt: number;

  status: OrderStatus;
  total: number;

  items: OrderItem[];
  groups?: OrderGroup[];

  deliveryFeeCOP?: number;
  storesSubtotalCOP?: number;
  serviceFeeCOP?: number;
  promoCOP?: number;
  totalCOP?: number;
  storesSummary?: { storeId: string; name: string }[];
  storeStates?: { storeId: string; name: string; state: StoreState; reason?: string }[];

  tipCOP?: number;
  customerNote?: string;

  address: string;
  paymentMethod: PaymentMethod;

  pickupLocations?: GeoPoint[];
  dropoffLocation?: GeoPoint;

  flowStatus?: OrderFlowStatus;
  storeDecision?: StoreDecision;
  changeRequest?: {
    requestedAt: number;
    message?: string;
    items: ChangeRequestItem[];
  };
  payment?: PaymentInfo;
  parentOrderId?: string;

  lastDriverSyncAt?: number;

  citySlug?: string;
  cityLabel?: string;
};

const KEY = "kronix:orders:v1";

type DriverSyncStatus = "EN_CAMINO" | "EN_RUTA" | "ENTREGADO";

type OrderSyncEvent = {
  eventId: string;
  orderId: string;
  status: DriverSyncStatus;
  source: "DRIVER";
  atISO: string;
};

const ORDER_SYNC_EVENTS_KEY = "order_sync_events_v1";

function loadSyncEvents(): OrderSyncEvent[] {
  try {
    const raw = localStorage.getItem(ORDER_SYNC_EVENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OrderSyncEvent[]) : [];
  } catch {
    return [];
  }
}

function toOrderStatusFromDriver(status: DriverSyncStatus): OrderStatus {
  if (status === "EN_CAMINO") return "PREPARANDO";
  if (status === "EN_RUTA") return "EN CAMINO";
  return "ENTREGADO";
}

function toFlowStatusFromDriver(status: DriverSyncStatus): OrderFlowStatus {
  if (status === "EN_CAMINO") return "PREPARING";
  if (status === "EN_RUTA") return "EN_ROUTE";
  return "DELIVERED";
}

export function applyDriverSyncEvents(now: number = Date.now()): { applied: number } {
  const orders = loadOrders();
  if (!orders.length) return { applied: 0 };

  const events = loadSyncEvents();
  if (!events.length) return { applied: 0 };

  const latestByOrderId = new Map<string, OrderSyncEvent>();
  for (const e of events) {
    const prev = latestByOrderId.get(e.orderId);
    if (!prev) {
      latestByOrderId.set(e.orderId, e);
      continue;
    }
    const prevT = Date.parse(prev.atISO);
    const curT = Date.parse(e.atISO);
    if ((Number.isFinite(curT) ? curT : 0) >= (Number.isFinite(prevT) ? prevT : 0)) {
      latestByOrderId.set(e.orderId, e);
    }
  }

  let applied = 0;

  const next = orders.map((o) => {
    const evt = latestByOrderId.get(o.id);
    if (!evt) return o;

    const evtMs = Date.parse(evt.atISO);
    const eventAt = Number.isFinite(evtMs) ? evtMs : now;

    const last = o.lastDriverSyncAt ?? 0;
    if (eventAt <= last) return o;

    applied++;
    return {
      ...o,
      status: toOrderStatusFromDriver(evt.status),
      flowStatus: toFlowStatusFromDriver(evt.status),
      lastDriverSyncAt: eventAt,
    };
  });

  if (applied > 0) saveOrders(next);
  return { applied };
}

export function loadOrders(): Order[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Order[]) : [];
  } catch {
    return [];
  }
}

export function saveOrders(orders: Order[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(orders));
  } catch {}
}

export function addOrder(order: Order) {
  const orders = loadOrders();
  saveOrders([order, ...orders]);
}

export function getOrder(orderId: string): Order | null {
  const orders = loadOrders();
  return orders.find((o) => o.id === orderId) ?? null;
}

export function updateOrder(orderId: string, patch: Partial<Order>): Order | null {
  const orders = loadOrders();
  let found: Order | null = null;

  const next = orders.map((o) => {
    if (o.id !== orderId) return o;
    found = { ...o, ...patch };
    return found;
  });

  saveOrders(next);
  return found;
}

export function updateOrderStatus(orderId: string, status: OrderStatus) {
  updateOrder(orderId, { status });
}

export function updateOrderFlowStatus(orderId: string, flowStatus: OrderFlowStatus) {
  updateOrder(orderId, { flowStatus });
}

export function setStoreConfirmed(orderId: string, note?: string) {
  const now = Date.now();
  const o = getOrder(orderId);
  return updateOrder(orderId, {
    flowStatus: "STORE_CONFIRMED",
    storeDecision: { decidedAt: now, note },
    payment: o?.payment ?? { status: "NONE", updatedAt: now },
  });
}

export function setStoreRejected(orderId: string, note?: string) {
  const now = Date.now();
  return updateOrder(orderId, {
    flowStatus: "STORE_REJECTED",
    storeDecision: { decidedAt: now, note },
  });
}

export function setStoreChangesRequested(
  orderId: string,
  change: { message?: string; items: ChangeRequestItem[] }
) {
  const now = Date.now();
  return updateOrder(orderId, {
    flowStatus: "STORE_CHANGES_REQUESTED",
    changeRequest: { requestedAt: now, message: change.message, items: change.items },
  });
}

export function setPaymentPending(orderId: string, method?: PaymentMethod) {
  const now = Date.now();
  const o = getOrder(orderId);
  return updateOrder(orderId, {
    flowStatus: "PAYMENT_PENDING",
    payment: { status: "PENDING", method: method ?? o?.paymentMethod, updatedAt: now },
  });
}

export function setPaymentPaid(orderId: string, reference?: string) {
  const now = Date.now();
  const o = getOrder(orderId);
  return updateOrder(orderId, {
    flowStatus: "PAID",
    payment: { ...(o?.payment ?? { status: "NONE" }), status: "PAID", reference, updatedAt: now },
  });
}

export function setPaymentFailed(orderId: string, reason?: string) {
  const now = Date.now();
  const o = getOrder(orderId);
  return updateOrder(orderId, {
    flowStatus: "PAYMENT_FAILED",
    payment: {
      ...(o?.payment ?? { status: "NONE" }),
      status: "FAILED",
      failureReason: reason,
      updatedAt: now,
    },
  });
}

export function cancelOrder(orderId: string, note?: string) {
  const now = Date.now();
  const o = getOrder(orderId);
  return updateOrder(orderId, {
    flowStatus: "CANCELLED",
    storeDecision: note
      ? { ...(o?.storeDecision ?? {}), note, decidedAt: o?.storeDecision?.decidedAt ?? now }
      : o?.storeDecision,
  });
}

export async function publishOrderToBridge(params: {
  orderId: string;
  createdAt: number;
  total: number;
  items: OrderItem[];

  deliveryFee: number;
  stores: { storeId: string; name: string }[];

  tip?: number;
  distanceKm?: number;

  pickupLocations?: { address: string; lat: number; lng: number }[];
  dropoffLocation?: { address: string; lat: number; lng: number };

  notes?: string;
}) {
  try {
    const API = process.env.NEXT_PUBLIC_API;
    if (!API) return;

    const payload = {
      orderId: params.orderId,
      createdAt: params.createdAt,
      stores: params.stores,
      deliveryFee: params.deliveryFee,
      tip: params.tip && params.tip > 0 ? params.tip : undefined,
      distanceKm: typeof params.distanceKm === "number" ? params.distanceKm : undefined,
      notes: params.notes ? params.notes.slice(0, 100) : undefined,
      source: "BUYER",
      pickupLocations: params.pickupLocations,
      dropoffLocation: params.dropoffLocation,
    };

    await fetch(`${API}/mock/orders/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // silencioso
  }
}
