//app\(buyer)\profile\terms\page.tsx
"use client";

import { useEffect, useState } from "react";
import BuyerTermsModal from "@/components/buyer/legal/BuyerTermsModal";
import {
  BUYER_TERMS_VERSION,
  checkBuyerTermsStatus,
} from "@/components/buyer/legal/buyerLegal";

export default function ProfileTermsPage() {
  const [open, setOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [checking, setChecking] = useState(true);

  async function refreshStatus() {
    setChecking(true);
    try {
      const ok = await checkBuyerTermsStatus();
      setAccepted(ok);
    } catch {
      setAccepted(false);
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    refreshStatus();
  }, []);

  return (
    <div className="px-4 pb-8 pt-4">
      <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700">
          Documento legal
        </div>

        <h1 className="mt-2 text-xl font-black text-slate-950">
          Términos y Condiciones
        </h1>

        <p className="mt-2 text-sm leading-5 text-slate-600">
          Consulta, lee y acepta la versión vigente de los términos de uso de KroniX.
        </p>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs font-bold text-slate-600">Versión vigente</div>
          <div className="mt-1 text-xs font-black text-slate-950">
            {BUYER_TERMS_VERSION}
          </div>

          <div className="mt-3 text-xs font-bold text-slate-600">
            Estado de aceptación
          </div>

          <div
            className={[
              "mt-2 inline-flex rounded-full px-3 py-1 text-[11px] font-black ring-1",
              accepted
                ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                : "bg-amber-50 text-amber-700 ring-amber-100",
            ].join(" ")}
          >
            {checking ? "Verificando..." : accepted ? "Aceptado" : "Pendiente"}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-md active:scale-[0.98]"
        >
          Ver documento legal
        </button>
      </div>

      <BuyerTermsModal
        open={open}
        authenticated
        onClose={() => setOpen(false)}
        onAccepted={() => {
          setAccepted(true);
          refreshStatus();
        }}
      />
    </div>
  );
}