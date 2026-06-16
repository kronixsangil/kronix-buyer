//app\instalar\iphone\page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)")?.matches || (window.navigator as any).standalone === true;
}

export default function IPhoneInstallPage() {
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const check = () => setInstalled(isStandaloneMode());
    check();

    const media = window.matchMedia?.("(display-mode: standalone)");
    media?.addEventListener?.("change", check);

    return () => {
      media?.removeEventListener?.("change", check);
    };
  }, []);

  return (
    <main className="min-h-screen overflow-y-auto bg-[#f3f6fb] px-4 py-5 text-slate-950">
      <section className="mx-auto w-full max-w-md rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_46px_rgba(15,23,42,0.16)]">
        <div className="relative overflow-hidden px-5 pb-3 pt-2 text-white">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#03102b_0%,#0b356d_48%,#4a79b7_78%,#ffffff_100%)]" />
          <div className="pointer-events-none absolute inset-0 opacity-90">
            <span className="absolute left-[12%] top-[22%] h-1 w-1 rounded-full bg-white" />
            <span className="absolute left-[40%] top-[16%] h-1 w-1 rounded-full bg-white" />
            <span className="absolute right-[18%] top-[26%] h-1 w-1 rounded-full bg-white" />
          </div>

          <div className="relative flex items-center justify-between gap-3">
            <Link href="/" className="grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-white/10 text-xl shadow-sm backdrop-blur">
              ←
            </Link>

            <img
              src="/branding/kronix/header-logo.png"
              alt="KroniX"
              className="h-16 w-44 object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.35)]"
            />

            <div className="h-11 w-11 rounded-full border border-white/25 bg-white/10" />
          </div>

          <div className="relative mt-4 text-center">
            <div className="text-[26px] font-black leading-tight">Instalar KroniX</div>
            <div className="mt-1 text-sm font-semibold text-white/90">iPhone · Cliente Buyer</div>
          </div>
        </div>

        <div className="space-y-3 px-5 pb-5">
          <div className="rounded-3xl border border-blue-100 bg-blue-50 p-4 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-sm ring-1 ring-blue-100">
  {installed ? (
    <img
      src="/icons/kronix-icon.png"
      alt="KroniX"
      className="h-12 w-12 object-contain"
    />
  ) : (
    <img
      src="/icons/Apple-icon.png"
      alt="Apple"
      className="h-12 w-12 object-contain"
    />
  )}
</div>
            <h1 className="mt-3 text-xl font-black text-slate-950">
              {installed ? "KroniX instalada" : "Agregar KroniX al inicio"}
            </h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
              {installed
                ? "Ya estás usando KroniX como app instalada. Toca Abrir KroniX para iniciar."
                : "En iPhone Apple no permite abrir un botón de instalación automático. Sigue estos pasos en Safari."}
            </p>
          </div>

          {!installed ? (
            <div className="space-y-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-600 text-sm font-black text-white">1</div>
                  <div>
                    <div className="text-sm font-black text-slate-900">Abrir en Safari</div>
                    <div className="mt-1 text-sm font-semibold leading-5 text-slate-600">Si estás en WhatsApp, toca abrir en Safari.</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-600 text-sm font-black text-white">2</div>
                  <div>
                    <div className="text-sm font-black text-slate-900">Tocar Compartir</div>
                    <div className="mt-1 text-sm font-semibold leading-5 text-slate-600">Es el botón cuadrado con flecha hacia arriba.</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-600 text-sm font-black text-white">3</div>
                  <div>
                    <div className="text-sm font-black text-slate-900">Agregar a pantalla de inicio</div>
                    <div className="mt-1 text-sm font-semibold leading-5 text-slate-600">Busca la opción, confirma “Agregar” y listo.</div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <a
            href="https://buyer.kronix.co"
            className={[
              "block rounded-2xl px-4 py-4 text-center text-base font-black text-white shadow-[0_12px_28px_rgba(5,150,105,0.25)]",
              installed ? "bg-blue-700" : "bg-emerald-600",
            ].join(" ")}
          >
            {installed ? "Abrir KroniX" : "Abrir KroniX"}
          </a>

          <Link
            href="/instalar/android"
            className="block rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-center text-sm font-black text-blue-800"
          >
            Tengo Android
          </Link>
        </div>
      </section>
    </main>
  );
}
