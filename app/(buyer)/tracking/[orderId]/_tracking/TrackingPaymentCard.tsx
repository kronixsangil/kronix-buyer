"use client";

import type { TrackingViewModel } from "./types";

export function TrackingPaymentCard({ vm }: { vm: TrackingViewModel }) {
  return (
    <section className={`${vm.CARD_PAD} mt-4`}>
      <h2 className="font-extrabold text-slate-900">Pago directo</h2>
      <p className="mt-2 text-sm text-slate-600">
        Acuerda el pago directamente con el establecimiento o trabajador que atiende tu pedido.
      </p>
    </section>
  );
}
