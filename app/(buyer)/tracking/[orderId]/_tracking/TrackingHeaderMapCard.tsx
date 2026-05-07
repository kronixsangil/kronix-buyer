//app\(buyer)\tracking\[orderId]\_tracking\TrackingHeaderMapCard.tsx
"use client";

import type { TrackingViewModel } from "./types";

export function TrackingHeaderMapCard({ vm }: { vm: TrackingViewModel }) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div className="text-lg font-extrabold text-gray-900">
          {vm.isCourier ? "Tracking del servicio" : "Tracking"}
        </div>
        <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-extrabold text-green-700 ring-1 ring-green-200">
          {vm.chip}
        </span>
      </div>

      
      <div className={`${vm.CARD_PAD_SM} mt-4`}>
        <div className="relative h-44 w-full overflow-hidden rounded-2xl bg-gray-100 ring-1 ring-gray-200">
          {vm.mapData.embedUrl ? (
            <iframe
              title="Mapa"
              src={vm.mapData.embedUrl}
              className="h-full w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-gray-500">
              Mapa no disponible (sin coordenadas)
            </div>
          )}

          {vm.updatedAgoText ? (
            <div className="absolute bottom-2 left-2 rounded-xl bg-white/90 px-2 py-1 text-[11px] font-semibold text-gray-700 ring-1 ring-gray-200">
              {vm.updatedAgoText}
            </div>
          ) : null}

          {vm.mapData.openUrl ? (
            <button
              type="button"
              onClick={() => window.open(vm.mapData.openUrl!, "_blank", "noopener,noreferrer")}
              className="absolute bottom-2 right-2 rounded-xl bg-blue-600 px-3 py-1 text-[11px] font-extrabold text-white hover:bg-blue-700"
            >
              Abrir en Maps
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm font-extrabold text-gray-900">Pedido #{vm.order!.id}</div>
          <div className="text-xs font-semibold text-green-700">{vm.etaText}</div>
        </div>

        <div className="mt-1 text-xs text-gray-500">{vm.order!.address}</div>

        {vm.orderCityText ? (
          <div className="mt-1 text-xs font-semibold text-blue-700">Ciudad del pedido: {vm.orderCityText}</div>
        ) : null}

        <div className="mt-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <div className="text-xs font-extrabold text-gray-900">Ubicación del driver</div>
            <span
              className={[
                "rounded-full px-2 py-0.5 text-[11px] font-extrabold ring-1",
                vm.mapData.hasDriver
                  ? "bg-green-50 text-green-700 ring-green-200"
                  : "bg-gray-100 text-gray-600 ring-gray-200",
              ].join(" ")}
            >
              {vm.mapData.hasDriver ? "ACTIVA" : "PENDIENTE"}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
              Cliente:{" "}
              <span className="font-extrabold">
                {vm.mapData.customer
                  ? `${vm.mapData.customer.lat.toFixed(5)}, ${vm.mapData.customer.lng.toFixed(5)}`
                  : "—"}
              </span>
            </span>

            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
              Driver:{" "}
              <span className="font-extrabold">
                {vm.mapData.driver
                  ? `${vm.mapData.driver.lat.toFixed(5)}, ${vm.mapData.driver.lng.toFixed(5)}`
                  : "—"}
              </span>
            </span>
          </div>
        </div>
      </div>
    </>
  );
}