// app\instalar\page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

function detectTarget() {
  if (typeof window === "undefined") return "/instalar/android";
  const ua = window.navigator.userAgent || "";
  const platform = window.navigator.platform || "";
  const isIOS = /iphone|ipad|ipod/i.test(ua) || (platform === "MacIntel" && Number((window.navigator as any).maxTouchPoints || 0) > 1);
  return isIOS ? "/instalar/iphone" : "/instalar/android";
}

export default function InstallChooserPage() {
  const [target, setTarget] = useState("/instalar/android");

  useEffect(() => {
    const next = detectTarget();
    setTarget(next);
    const id = window.setTimeout(() => {
      window.location.href = next;
    }, 900);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <main className="grid min-h-dvh place-items-center bg-[#f3f6fb] px-4 py-5 text-slate-950">
      <section className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-5 text-center shadow-[0_18px_46px_rgba(15,23,42,0.16)]">
        <img src="/branding/kronix/header-logo.png" alt="KroniX" className="mx-auto h-20 w-56 object-contain" />
        <h1 className="mt-2 text-2xl font-black text-slate-950">Preparando instalación</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">Te llevaremos a la guía correcta para tu teléfono.</p>

        <div className="mt-5 grid gap-2">
          <Link href={target} className="rounded-2xl bg-emerald-600 px-4 py-4 text-base font-black text-white">
            Continuar
          </Link>
          <Link href="/instalar/android" className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-black text-blue-800">
            Android
          </Link>
          <Link href="/instalar/iphone" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800">
            iPhone
          </Link>
        </div>
      </section>
    </main>
  );
}
