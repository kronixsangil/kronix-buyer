//app\(buyer)\tracking\[orderId]\_tracking\TrackingStatusCard.tsx
"use client";

import type { TrackingViewModel } from "./types";

export function TrackingStatusCard({ vm }: { vm: TrackingViewModel }) {
  if (!vm.usingFlow) return null;

  return (
    <div className={`${vm.CARD_PAD} mt-4`}>
      <div className="text-sm font-extrabold text-gray-900">
        {vm.isCourier ? "Estado del servicio" : "Estado del pedido"}
      </div>

      {!vm.isCourier && vm.storeStatesToRender?.length ? (
        <div className="mt-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <div className="text-xs font-extrabold text-gray-900">Confirmación por tiendas</div>

          <div className="mt-2 flex flex-col gap-2">
            {vm.storeStatesToRender.map((s: any) => {
              const cls =
                s.state === "CONFIRMED"
                  ? "bg-green-600 ring-green-200"
                  : s.state === "REJECTED"
                  ? "bg-red-600 ring-red-200"
                  : "bg-gray-200 ring-gray-100";

              return (
                <div key={`${String(s.storeId)}:${String(s.name)}`} className="flex items-start gap-2">
                  <span className={["mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full ring-2", cls].join(" ")} />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="max-w-[220px] truncate text-[11px] font-semibold text-gray-700">
                        {s.name}
                      </span>

                      {s.state === "REJECTED" && String(s.reason ?? "").trim() ? (
                        <span className="text-[11px] font-semibold text-red-700">— {String(s.reason).trim()}</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-2 text-[11px] text-gray-600">
            ✅ {vm.storeStatesToRender.filter((x: any) => x.state === "CONFIRMED").length} confirmadas • ❌{" "}
            {vm.storeStatesToRender.filter((x: any) => x.state === "REJECTED").length} rechazadas • ⏳{" "}
            {vm.storeStatesToRender.filter((x: any) => x.state === "PENDING").length} pendientes
          </div>
        </div>
      ) : null}

      <div className="mt-3 space-y-3">
        {vm.timeline.steps.map((s) => (
          <div key={s.key} className="flex items-start gap-3">
            <div
              className={[
                "mt-0.5 h-3.5 w-3.5 rounded-full ring-2",
                s.done ? "bg-green-600 ring-green-200" : "bg-gray-200 ring-gray-100",
              ].join(" ")}
            />
            <div className="min-w-0 flex-1">
              <div className={["text-sm font-extrabold", s.done ? "text-gray-900" : "text-gray-400"].join(" ")}>
                {s.label}{" "}
                {s.current ? <span className="ml-2 text-xs font-semibold text-green-700">(actual)</span> : null}
              </div>
              <div className={["text-xs", s.done ? "text-gray-600" : "text-gray-400"].join(" ")}>{s.hint}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}