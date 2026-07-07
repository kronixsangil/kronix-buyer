//app/(buyer)/tracking/[orderId]/page.tsx
"use client";

import AuthRequiredModal from "@/components/buyer/AuthRequiredModal";
import { useTrackingPage } from "./_tracking/useTrackingPage";
import { TrackingHeaderMapCard } from "./_tracking/TrackingHeaderMapCard";
import { TrackingStatusCard } from "./_tracking/TrackingStatusCard";
import { TrackingCourierDetailsCard } from "./_tracking/TrackingCourierDetailsCard";
import { TrackingDriverCard } from "./_tracking/TrackingDriverCard";
import { TrackingPaymentCard } from "./_tracking/TrackingPaymentCard";
import { TrackingSummaryCard } from "./_tracking/TrackingSummaryCard";
import { TrackingRatingCard } from "./_tracking/TrackingRatingCard";

export default function TrackingPage() {
  const vm = useTrackingPage();

  if (vm.invalidOrderId) {
    return <div className="p-4 text-sm text-gray-600">Pedido inválido.</div>;
  }

  if (!vm.order && vm.loadErr) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6">
        <div className="mx-auto w-full max-w-md">
          <div className="text-lg font-extrabold text-gray-900">Tracking</div>

          <div className={`${vm.CARD_PAD} mt-3 text-sm text-gray-700`}>
            <div className="font-extrabold text-red-700">No pudimos cargar el pedido</div>
            <div className="mt-1 text-sm text-gray-700">{vm.loadErr}</div>
          </div>

          <button
            className="mt-4 w-full rounded-2xl bg-blue-600 py-3 text-sm font-extrabold text-white hover:bg-blue-700"
            onClick={() => vm.router.push("/orders")}
          >
            Ver historial de pedidos
          </button>
        </div>
      </div>
    );
  }

  if (!vm.order) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6">
        <div className="mx-auto w-full max-w-md">
          <div className="text-lg font-extrabold text-gray-900">Tracking</div>
          <div className={`${vm.CARD_PAD} mt-3 text-sm text-gray-600`}>Cargando pedido…</div>

          <button
            className="mt-4 w-full rounded-2xl bg-blue-600 py-3 text-sm font-extrabold text-white hover:bg-blue-700"
            onClick={() => vm.router.push("/orders")}
          >
            Ver pedidos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-6 pt-4">
      <div className="mx-auto w-full max-w-md">
        <TrackingHeaderMapCard vm={vm} />

        <TrackingStatusCard vm={vm} />

        {vm.isCourier ? <TrackingCourierDetailsCard vm={vm} /> : null}

        <TrackingDriverCard vm={vm} />

        <TrackingRatingCard vm={vm} />

        {!vm.isServiceOrder ? <TrackingPaymentCard vm={vm} /> : null}

        {!vm.isServiceOrder ? <TrackingSummaryCard vm={vm} /> : null}

        {vm.cancelMsg ? (
          <div className="mt-4 rounded-2xl bg-green-50 p-3 text-sm font-extrabold text-green-800 ring-1 ring-green-200">
            {vm.cancelMsg}
          </div>
        ) : null}

        {vm.cancelErr ? (
          <div className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700 ring-1 ring-red-200">
            {vm.cancelErr}
          </div>
        ) : null}

        {vm.canCancel ? (
          <button
            disabled={vm.cancelling}
            onClick={vm.cancelOrder}
            className="mt-4 w-full rounded-2xl border border-red-200 bg-white py-3 text-sm font-extrabold text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {vm.cancelling ? "Cancelando…" : "Cancelar pedido"}
          </button>
        ) : null}

        <button
          className="mt-3 w-full rounded-2xl bg-blue-600 py-3 text-sm font-extrabold text-white hover:bg-blue-700"
          onClick={() => vm.router.push("/orders")}
        >
          Ver historial de pedidos
        </button>
      </div>

      <AuthRequiredModal
        open={vm.showAuthModal}
        onConfirm={() => vm.router.push(`/login?next=${encodeURIComponent(vm.authNext)}`)}
        onClose={() => vm.setShowAuthModal(false)}
      />
    </div>
  );
}