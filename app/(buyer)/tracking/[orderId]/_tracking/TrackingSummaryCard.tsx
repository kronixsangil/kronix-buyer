//app\(buyer)\tracking\[orderId]\_tracking\TrackingSummaryCard.tsx
"use client";

import Image from "next/image";
import type { TrackingViewModel } from "./types";
import { formatCOP } from "./utils";

function getCourierServiceLabel(vm: TrackingViewModel) {
  const serviceType = String(
    (vm.tracking as any)?.courierServiceType ??
      (vm.order as any)?.courierServiceType ??
      ""
  )
    .trim()
    .toUpperCase();

  if (serviceType === "SEND_PACKAGE") return "KroniX Envíos";
  if (serviceType === "ERRAND") return "Domicilios y Diligencias";
  if (serviceType === "PICKUP_AND_DELIVERY") return "Domicilio Express";

  return vm.courierData.packageType || "Servicio courier";
}

export function TrackingSummaryCard({ vm }: { vm: TrackingViewModel }) {
  const courierServiceLabel = getCourierServiceLabel(vm);

  return (
    <div className={`${vm.CARD_PAD} mt-4`}>
      <div className="text-sm font-extrabold text-gray-900">
        {vm.isCourier ? "Resumen del servicio" : "Resumen del pedido"}
      </div>

      {vm.isCourier ? (
        <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-extrabold text-gray-900">
                {courierServiceLabel}
              </div>
              <div className="mt-1 text-xs text-gray-600">Servicio KroniX</div>
            </div>

            <div className="text-right">
              <div className="text-lg font-extrabold text-gray-900">{formatCOP(vm.order!.total)}</div>
              <div className="text-[11px] text-gray-500">Total</div>
            </div>
          </div>

          {vm.courierData.packageDescription ? (
            <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700 ring-1 ring-slate-200">
              {vm.courierData.packageDescription}
            </div>
          ) : null}

          <div className="mt-4 space-y-2 text-sm text-gray-700">
            <div className="flex items-center justify-between">
              <span>Valor del servicio</span>
              <span className="font-semibold">{formatCOP(vm.totals.deliveryCOP)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span>Servicio plataforma</span>
              <span className="font-semibold">{formatCOP(vm.totals.serviceCOP)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span>Promociones</span>
              <span className="font-semibold">{formatCOP(-vm.totals.promosCOP)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span>Propina</span>
              <span className="font-semibold">{formatCOP(vm.totals.tipCOP)}</span>
            </div>

            <div className="mt-2 flex items-center justify-between border-t pt-2">
              <span className="font-extrabold text-gray-900">Total</span>
              <span className="text-lg font-extrabold text-gray-900">
                {formatCOP(vm.totals.serverTotalCOP || vm.totals.calculatedTotalCOP || vm.order!.total)}
              </span>
            </div>
          </div>
        </div>
      ) : vm.order!.groups?.length ? (
        <div className="mt-3 space-y-3">
          {vm.order!.groups.map((g: any) => (
            <div key={g.storeId} className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-200">
                  {g.storeImage ? <Image src={g.storeImage} alt="" fill className="object-cover" sizes="40px" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-extrabold text-gray-900">{g.storeName}</div>
                  <div className="text-xs text-gray-600">
                    Subtotal: <span className="font-semibold">{formatCOP(Number(g.subtotal ?? 0))}</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 space-y-2 text-sm">
                {g.items.map((it: any) => (
                  <div key={`${g.storeId}:${it.id}`} className="flex items-center justify-between">
                    <span className="text-gray-700">
                      {it.qty}x {it.name}
                    </span>
                    <span className="font-semibold">{formatCOP(Number(it.price ?? 0) * Number(it.qty ?? 0))}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
            <div className="text-sm font-extrabold text-gray-900">Cálculo total</div>

            <div className="mt-2 space-y-1 text-sm text-gray-700">
              <div className="flex items-center justify-between">
                <span>Subtotal (tiendas)</span>
                <span className="font-semibold">{formatCOP(vm.totals.storesSubtotalCOP)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span>Promociones</span>
                <span className="font-semibold">{formatCOP(-vm.totals.promosCOP)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span>Servicio</span>
                <span className="font-semibold">{formatCOP(vm.totals.serviceCOP)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span>Valor del domicilio</span>
                <span className="font-semibold">{formatCOP(vm.totals.deliveryCOP)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span>Propina</span>
                <span className="font-semibold">{formatCOP(vm.totals.tipCOP)}</span>
              </div>

              <div className="mt-2 flex items-center justify-between border-t pt-2">
                <span className="font-extrabold text-gray-900">Total</span>
                <span className="text-lg font-extrabold text-gray-900">{formatCOP(vm.totals.calculatedTotalCOP)}</span>
              </div>

              {vm.totals.serverTotalCOP && vm.totals.serverTotalCOP !== vm.totals.calculatedTotalCOP ? (
                <div className="mt-1 text-[11px] text-gray-500">
                  Total servidor: <span className="font-semibold">{formatCOP(vm.totals.serverTotalCOP)}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-2 text-sm">
          {vm.order!.items.map((it) => (
            <div key={`${it.storeId ?? "na"}:${it.id}`} className="flex items-center justify-between">
              <span className="text-gray-700">
                {it.qty}x {it.name}
              </span>
              <span className="font-semibold">{formatCOP(it.price * it.qty)}</span>
            </div>
          ))}

          <div className="mt-2 flex items-center justify-between border-t pt-2">
            <span className="font-extrabold text-gray-900">Total</span>
            <span className="text-lg font-extrabold text-gray-900">{formatCOP(vm.order!.total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}