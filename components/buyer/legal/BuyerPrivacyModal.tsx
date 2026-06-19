//components\buyer\legal\BuyerPrivacyModal.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import {
  acceptBuyerPrivacyBackend,
  BUYER_PRIVACY_FALLBACK_VERSION,
  getCurrentBuyerLegalDocument,
  type BuyerLegalDocument,
} from "./buyerLegal";

type Props = {
  open: boolean;
  force?: boolean;
  authenticated?: boolean;
  onClose: () => void;
  onAccepted: () => void;
};

function LegalContent({ content }: { content: string }) {
  return (
    <div className="space-y-4 text-[12.5px] font-medium leading-5 text-slate-600">
      {content
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, idx) => {
          if (line.startsWith("# ")) {
            return (
              <h2 key={idx} className="pt-2 text-[16px] font-black text-slate-950">
                {line.replace("# ", "")}
              </h2>
            );
          }

          if (line.startsWith("## ")) {
            return (
              <h3 key={idx} className="pt-3 text-[14px] font-black text-slate-950">
                {line.replace("## ", "")}
              </h3>
            );
          }

          if (line.startsWith("---")) {
            return <hr key={idx} className="border-slate-200" />;
          }

          return <p key={idx}>{line}</p>;
        })}
    </div>
  );
}

export default function BuyerPrivacyModal({
  open,
  force = false,
  authenticated = false,
  onClose,
  onAccepted,
}: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [reachedBottom, setReachedBottom] = useState(false);
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [legalDoc, setLegalDoc] = useState<BuyerLegalDocument | null>(null);

  useEffect(() => {
    if (!open) return;

    setReachedBottom(false);
    setChecked(false);
    setSaving(false);
    setLoadingDoc(true);

    getCurrentBuyerLegalDocument("BUYER_PRIVACY")
      .then((doc) => setLegalDoc(doc))
      .catch(() => setLegalDoc(null))
      .finally(() => setLoadingDoc(false));
  }, [open]);

  if (!open) return null;

  const currentVersion = legalDoc?.version || BUYER_PRIVACY_FALLBACK_VERSION;
  const content =
    legalDoc?.content?.trim() ||
    "No se pudo cargar la política de privacidad vigente. Intenta nuevamente.";

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;

    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;

    if (distanceToBottom <= 18) {
      setReachedBottom(true);
    }
  }

  async function handleAccept() {
    if (!reachedBottom || !checked || saving) return;

    setSaving(true);

    try {
      if (authenticated) {
        await acceptBuyerPrivacyBackend(currentVersion);
      }

      onAccepted();
      onClose();

      alert("Gracias por aceptar la Política de Privacidad de KroniX.");
    } catch {
      alert("No fue posible registrar la aceptación. Inténtalo nuevamente.");
    } finally {
      setSaving(false);
    }
  }

  const canCheck = reachedBottom && !loadingDoc;
  const canAccept = reachedBottom && checked && !saving && !loadingDoc;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/45 px-2 pt-3 backdrop-blur-[2px]"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
    >
      <div
        className="relative flex w-[98%] max-w-[430px] flex-col overflow-hidden rounded-[26px] bg-white shadow-2xl ring-1 ring-white/60"
        style={{
          maxHeight: "calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 20px)",
        }}
      >
        <div className="relative border-b border-slate-100 bg-white px-5 pb-3 pt-4 text-center">
          <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-slate-200" />

          {!force ? (
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-xl font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-200"
              aria-label="Cerrar privacidad"
            >
              ×
            </button>
          ) : null}

          <div className="text-[24px] font-black leading-tight tracking-[-0.03em] text-slate-950">
            Política de Privacidad
          </div>
        </div>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="terms-scroll flex-1 overflow-y-auto bg-white px-3 pb-4 pt-3 text-[13px] leading-6 text-slate-700 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="mb-4 rounded-[20px] border border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-blue-50 px-4 py-4 shadow-[0_10px_24px_rgba(14,165,233,0.12)]">
            <div className="flex items-start gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-cyan-100 text-[22px] text-cyan-700">
                🛡️
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-700">
                    Privacidad
                  </span>

                  <span className="shrink-0 rounded-full bg-cyan-100 px-2.5 py-1 text-[10px] font-black text-cyan-800">
                    {currentVersion}
                  </span>
                </div>

                <p className="mt-2 text-[12.5px] font-medium leading-5 text-slate-800">
                  Documento cargado desde el Legal Center de KroniX.
                </p>
              </div>
            </div>
          </div>

          {loadingDoc ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
              Cargando política vigente...
            </div>
          ) : (
            <LegalContent content={content} />
          )}

          <div className="mt-5 rounded-2xl border border-cyan-100 bg-cyan-50 p-3 text-xs font-bold text-cyan-800">
            Has llegado al final del documento.
          </div>
        </div>

        <div
          className="border-t border-slate-200 bg-white px-5 pt-3"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
        >
          {!reachedBottom ? (
            <div className="mb-2 text-center text-[11px] font-bold text-slate-500">
              Lee el documento completo para habilitar la aceptación.
            </div>
          ) : null}

          <label
            className={[
              "mb-3 flex items-start gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200",
              canCheck ? "cursor-pointer" : "cursor-not-allowed opacity-60",
            ].join(" ")}
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={!canCheck}
              onChange={(e) => {
                if (!canCheck) return;
                setChecked(e.target.checked);
              }}
              className="mt-1 h-4 w-4 accent-cyan-600 disabled:cursor-not-allowed"
            />

            <span className="text-[12px] font-semibold leading-5 text-slate-700">
              Declaro que he leído, comprendido y acepto la Política de
              Privacidad de KroniX.
            </span>
          </label>

          <button
            type="button"
            disabled={!canAccept}
            onClick={handleAccept}
            className={[
              "flex w-full items-center justify-center gap-2 rounded-[18px] py-3.5 text-[14px] font-black text-white shadow-lg active:scale-[0.98]",
              canAccept
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 shadow-cyan-500/25"
                : "bg-slate-300 shadow-none",
            ].join(" ")}
          >
            <span className="grid h-5 w-5 place-items-center rounded-full bg-white/20 text-xs">
              ✓
            </span>
            {saving ? "Guardando..." : "Aceptar y continuar"}
          </button>
        </div>
      </div>
    </div>
  );
}
