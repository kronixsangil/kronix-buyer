//app/(buyer)/orders/[orderId]/page.tsx
"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  loadOrders,
  saveOrders,
  type Order,
  type OrderFlowStatus,
} from "@/components/buyer/OrdersStorage";
import { useEffect, useMemo, useState } from "react";

function formatCOP(v: number) {
  return v.toLocaleString("es-CO", { style: "currency", currency: "COP" });
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleString("es-CO");
}

function flowLabel(flow?: OrderFlowStatus) {
  if (!flow) return null;
  switch (flow) {
    case "PENDING_STORE":
      return { text: "ESPERANDO CONFIRMACIÓN", tone: "bg-amber-50 text-amber-800 ring-amber-200" };
    case "STORE_CONFIRMED":
      return { text: "CONFIRMADO POR TIENDA", tone: "bg-green-50 text-green-700 ring-green-200" };
    case "STORE_CHANGES_REQUESTED":
      return { text: "CAMBIOS SOLICITADOS", tone: "bg-blue-50 text-blue-800 ring-blue-200" };
    case "STORE_REJECTED":
      return { text: "NO DISPONIBLE", tone: "bg-red-50 text-red-700 ring-red-200" };
    case "PAYMENT_PENDING":
      return { text: "PAGO EN PROCESO", tone: "bg-amber-50 text-amber-800 ring-amber-200" };
    case "PAID":
      return { text: "PAGO APROBADO", tone: "bg-green-50 text-green-700 ring-green-200" };
    case "PAYMENT_FAILED":
      return { text: "PAGO FALLIDO", tone: "bg-red-50 text-red-700 ring-red-200" };
    case "CANCELLED":
      return { text: "CANCELADO", tone: "bg-gray-50 text-gray-700 ring-gray-200" };
    case "WAITING_CONFIRMATION":
      return { text: "ESPERANDO CONFIRMACIÓN", tone: "bg-amber-50 text-amber-800 ring-amber-200" };
    case "PREPARING":
      return { text: "PREPARANDO", tone: "bg-gray-50 text-gray-700 ring-gray-200" };
    case "EN_ROUTE":
      return { text: "EN CAMINO", tone: "bg-blue-50 text-blue-800 ring-blue-200" };
    case "DELIVERED":
      return { text: "ENTREGADO", tone: "bg-green-50 text-green-700 ring-green-200" };
  }
}

export default function OrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const router = useRouter();
  const orderId = String(params?.orderId ?? "");

  const [order, setOrder] = useState<Order | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    const orders = loadOrders();
    const found = orders.find((o) => o.id === orderId);
    if (!found) {
      setNotFound(true);
      setOrder(null);
      return;
    }
    setNotFound(false);
    setOrder(found);
  };

  useEffect(() => {
    refresh();
  }, [orderId]);

  const itemsTotal = useMemo(() => {
    if (!order) return 0;
    return order.items.reduce((acc, it) => acc + it.price * it.qty, 0);
  }, [order]);

  const acceptChanges = async () => {
    if (!order?.changeRequest?.items?.length) return;
    if (busy) return;
    setBusy(true);

    try {
      const orders = loadOrders();
      const current = orders.find((o) => o.id === orderId);
      if (!current) return;

      const cr = current.changeRequest;
      if (!cr?.items?.length) return;

      const nextItems = [...current.items].map((it) => ({ ...it }));

      const removeIds = new Set(
        cr.items
          .filter((x) => x.action === "REMOVE")
          .map((x) => x.itemId)
      );

      let filtered = nextItems.filter((it) => !removeIds.has(it.id));

      for (const ch of cr.items.filter((x) => x.action === "REPLACE")) {
        const idx = filtered.findIndex((it) => it.id === ch.itemId);
        if (idx === -1) continue;

        if (!ch.replaceWithName || typeof ch.replaceWithPrice !== "number") {
          filtered.splice(idx, 1);
          continue;
        }

        filtered[idx] = {
          ...filtered[idx],
          id: ch.replaceWithItemId ?? `${filtered[idx].id}-rep`,
          name: ch.replaceWithName,
          price: ch.replaceWithPrice,
        };
      }

      const newItemsTotal = filtered.reduce((acc, it) => acc + it.price * it.qty, 0);
      const oldItemsTotal = current.items.reduce((acc, it) => acc + it.price * it.qty, 0);
      const delta = newItemsTotal - oldItemsTotal;
      const newTotal = Math.max(0, (current.total ?? 0) + delta);

      const newOrderId = String(Date.now());

      const newOrder: Order = {
        ...current,
        id: newOrderId,
        createdAt: Date.now(),
        items: filtered,
        total: newTotal,
        status: "CONFIRMADO",
        flowStatus: "PENDING_STORE",
        parentOrderId: current.id,
        changeRequest: undefined,
        storeDecision: undefined,
        payment: undefined,
      };

      saveOrders([newOrder, ...orders]);
      router.push(`/tracking/${newOrderId}`);
    } finally {
      setBusy(false);
    }
  };

  const cancelOrder = () => {
    if (!order) return;
    const orders = loadOrders();
    const updated = orders.map((o) =>
      o.id === orderId ? { ...o, flowStatus: "CANCELLED" as const } : o
    );
    saveOrders(updated);
    refresh();
  };

  if (notFound) {
    return (
      <div className="px-4 pb-6 pt-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-extrabold text-gray-900">Pedido no encontrado</div>
          <div className="mt-2 text-xs text-gray-600">
            No existe un pedido con ID: <span className="font-semibold">{orderId}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="px-4 pb-6 pt-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm text-sm text-gray-600">
          Cargando pedido…
        </div>
      </div>
    );
  }

  const chip = flowLabel(order.flowStatus);

  return (
    <div className="px-4 pb-6 pt-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-extrabold text-gray-900">Pedido #{order.id}</div>
          <div className="mt-1 text-xs text-gray-600">{formatDate(order.createdAt)}</div>

          {order.cityLabel ? (
            <div className="mt-3">
              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-extrabold text-slate-700 ring-1 ring-slate-200">
                Ciudad del pedido: {order.cityLabel}
              </span>
            </div>
          ) : null}
        </div>

        {chip ? (
          <div
            className={[
              "rounded-full px-3 py-1 text-[11px] font-extrabold ring-1",
              chip.tone,
            ].join(" ")}
          >
            {chip.text}
          </div>
        ) : (
          <div className="rounded-full bg-green-50 px-3 py-1 text-[11px] font-extrabold text-green-700 ring-1 ring-green-200">
            {order.status}
          </div>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-extrabold text-gray-900">Checkout</div>

        <div className="mt-3 space-y-2 text-xs text-gray-700">
          <div>
            <div className="font-bold text-gray-900">Dirección</div>
            <div className="text-gray-600">{order.address ?? "—"}</div>
          </div>

          <div>
            <div className="font-bold text-gray-900">Pago</div>
            <div className="text-gray-600">{order.paymentMethod ?? "—"}</div>
          </div>
        </div>
      </div>

      {order.flowStatus === "STORE_CHANGES_REQUESTED" ? (
        <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <div className="text-sm font-extrabold text-blue-900">Cambios solicitados por el negocio</div>
          <div className="mt-1 text-xs text-blue-900/80">
            {order.changeRequest?.message ?? "El negocio propone cambios para poder atender tu pedido."}
          </div>

          <div className="mt-3 space-y-2">
            {(order.changeRequest?.items ?? []).map((ch, idx) => (
              <div
                key={`${ch.itemId}:${idx}`}
                className="rounded-2xl bg-white p-3 ring-1 ring-blue-200"
              >
                <div className="text-xs font-extrabold text-gray-900">
                  {ch.action === "REMOVE" ? "Eliminar" : "Sustituir"} • Item {ch.itemId}
                </div>
                {ch.reason ? <div className="mt-1 text-xs text-gray-600">{ch.reason}</div> : null}

                {ch.action === "REPLACE" ? (
                  <div className="mt-2 text-xs text-gray-700">
                    Propuesta: <span className="font-semibold">{ch.replaceWithName ?? "—"}</span>
                    {typeof ch.replaceWithPrice === "number" ? (
                      <span className="ml-2 font-semibold text-green-700">
                        ({formatCOP(ch.replaceWithPrice)})
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={acceptChanges}
              className="flex-1 rounded-2xl bg-green-600 py-3 text-sm font-extrabold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {busy ? "Aplicando…" : "Aceptar cambios"}
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={cancelOrder}
              className="flex-1 rounded-2xl border border-blue-200 bg-white py-3 text-sm font-extrabold text-blue-900 hover:bg-blue-50 disabled:opacity-50"
            >
              Cancelar pedido
            </button>
          </div>

          <div className="mt-2 text-[11px] text-blue-900/70">
            Al aceptar, se genera un <b>nuevo pedido</b> y vuelve a <b>Esperando confirmación</b>.
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex gap-2">
        <Link
          href={`/tracking/${order.id}`}
          className="flex-1 rounded-2xl bg-green-600 py-3 text-center text-sm font-extrabold text-white hover:bg-green-700"
        >
          Ver tracking
        </Link>
      </div>

      <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-extrabold text-gray-900">Items</div>

        <div className="mt-3 space-y-2">
          {order.items.map((it) => (
            <div key={it.id} className="flex items-center justify-between text-sm">
              <div className="text-gray-700">
                <span className="font-semibold">{it.qty}x</span> {it.name}
              </div>
              <div className="font-semibold text-gray-900">{formatCOP(it.price * it.qty)}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t pt-3">
          <div className="flex items-center justify-between text-sm text-gray-700">
            <span>Subtotal</span>
            <span className="font-semibold">{formatCOP(itemsTotal)}</span>
          </div>

          <div className="mt-2 flex items-center justify-between text-gray-900">
            <span className="text-sm font-extrabold">Total</span>
            <span className="text-lg font-extrabold">{formatCOP(order.total)}</span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <Link
          href="/orders"
          className="block w-full rounded-2xl bg-green-600 py-3 text-center text-sm font-extrabold text-white hover:bg-green-700"
        >
          Ver historial de pedidos
        </Link>
      </div>
    </div>
  );
}
