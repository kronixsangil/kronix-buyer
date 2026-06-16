//app\instalar\android\page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type InstallState = "checking" | "ready" | "installed" | "browser-not-ready" | "ios" | "unsupported";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)")?.matches || (window.navigator as any).standalone === true;
}

function isIOSDevice() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent || "";
  const platform = window.navigator.platform || "";
  return /iphone|ipad|ipod/i.test(ua) || (platform === "MacIntel" && Number((window.navigator as any).maxTouchPoints || 0) > 1);
}

function isAndroidDevice() {
  if (typeof window === "undefined") return false;
  return /android/i.test(window.navigator.userAgent || "");
}

export default function AndroidInstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [state, setState] = useState<InstallState>("checking");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const installLabel = useMemo(() => {
    if (busy) return "Abriendo instalación…";
    return "Instalar KroniX";
  }, [busy]);

  useEffect(() => {
    if (isStandaloneMode()) {
      setState("installed");
      setMessage("KroniX ya está instalada y lista para usarse.");
      return;
    }

    if (isIOSDevice()) {
      setState("ios");
      setMessage("Este teléfono parece ser iPhone o iPad. Usa la guía para iPhone.");
      return;
    }

    if (!isAndroidDevice()) {
      setState("unsupported");
      setMessage("Esta página está optimizada para Android. También puedes abrir KroniX desde el navegador.");
    } else {
      setState("browser-not-ready");
      setMessage("Espera unos segundos. Si el botón no se activa, usa el menú ⋮ de Chrome y toca Instalar app.");
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setState("ready");
      setMessage("Listo. Toca el botón verde para instalar KroniX.");
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setState("installed");
      setMessage("KroniX quedó instalada correctamente.");
    };

    const onDisplayModeChange = () => {
      if (isStandaloneMode()) {
        setDeferredPrompt(null);
        setState("installed");
        setMessage("KroniX ya está instalada y lista para usarse.");
      }
    };

    const media = window.matchMedia?.("(display-mode: standalone)");

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    media?.addEventListener?.("change", onDisplayModeChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      media?.removeEventListener?.("change", onDisplayModeChange);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt || busy) return;

    setBusy(true);
    setMessage("Confirma la instalación cuando Android te lo pregunte.");

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;

      if (choice.outcome === "accepted") {
        setState("installed");
        setMessage("KroniX quedó instalada correctamente.");
      } else {
        setState("browser-not-ready");
        setMessage("Instalación cancelada. Puedes tocar Instalar KroniX nuevamente cuando aparezca disponible.");
      }

      setDeferredPrompt(null);
    } catch {
      setMessage("No pudimos abrir el instalador automático. Usa el menú ⋮ de Chrome y toca Instalar app.");
      setState("browser-not-ready");
    } finally {
      setBusy(false);
    }
  }

  const canInstall = Boolean(deferredPrompt) && !busy && state !== "ios" && state !== "installed";
  const installed = state === "installed";

  return (
    <main className="min-h-dvh bg-[#f3f6fb] px-4 py-5 text-slate-950">
      <section className="mx-auto w-full max-w-md overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_46px_rgba(15,23,42,0.16)]">
        <div className="relative overflow-hidden px-5 pb-8 pt-5 text-white">
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
            <div className="mt-1 text-sm font-semibold text-white/90">Android · Cliente Buyer</div>
          </div>
        </div>

        <div className="space-y-3 px-5 pb-5">
          {installed ? (
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 text-center shadow-sm">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white text-2xl shadow-sm ring-1 ring-emerald-100">
                ✅
              </div>

              <img
                src="/icons/kronix-icon.png"
                alt="Ícono KroniX"
                className="mx-auto mt-4 h-24 w-24 rounded-[24px] object-contain shadow-[0_14px_30px_rgba(15,23,42,0.20)] ring-1 ring-white"
              />

              <h1 className="mt-4 text-xl font-black text-slate-950">KroniX ya está instalada</h1>

              <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
                ¡Perfecto! La app quedó agregada a tu teléfono.
              </p>

              <div className="mt-4 rounded-2xl border border-white bg-white/90 p-4 text-left shadow-sm">
                <div className="text-sm font-black text-slate-900">Para comenzar:</div>
                <ol className="mt-2 space-y-2 text-sm font-semibold leading-5 text-slate-700">
                  <li>1. Cierra esta pantalla del navegador.</li>
                  <li>2. Busca el ícono de KroniX junto a tus otras aplicaciones.</li>
                  <li>3. Tócalo para abrir la app y usar KroniX con mejor experiencia.</li>
                </ol>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-3xl border border-blue-100 bg-blue-50 p-4 text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white text-3xl shadow-sm ring-1 ring-blue-100">📱</div>
                <h1 className="mt-3 text-xl font-black text-slate-950">KroniX en tu pantalla</h1>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                  Toca instalar y confirma. No tienes que buscar opciones ocultas en el navegador.
                </p>
              </div>

              <button
                type="button"
                onClick={handleInstall}
                disabled={!canInstall}
                className="w-full rounded-2xl bg-emerald-600 px-4 py-4 text-base font-black text-white shadow-[0_12px_28px_rgba(5,150,105,0.25)] transition active:scale-[0.99] hover:bg-emerald-700 disabled:bg-emerald-300 disabled:shadow-none"
              >
                {installLabel}
              </button>
            </>
          )}

          {message && !installed ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold leading-5 text-slate-700">
              {message}
            </div>
          ) : null}

          {!installed ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-black text-slate-900">Si no aparece el instalador</div>
              <ol className="mt-2 space-y-2 text-sm font-semibold leading-5 text-slate-600">
                <li>1. Abre esta página en Google Chrome.</li>
                <li>2. Toca el menú ⋮ arriba a la derecha.</li>
                <li>3. Toca “Instalar app” o “Agregar a pantalla principal”.</li>
              </ol>
            </div>
          ) : null}

          <Link
            href="/instalar/iphone"
            className="block rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-center text-sm font-black text-blue-800"
          >
            Tengo iPhone
          </Link>
        </div>
      </section>
    </main>
  );
}
