//app/(buyer)/profile/privacy/page.tsx
//app/(buyer)/profile/privacy/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  acceptBuyerPrivacyBackend,
  checkBuyerPrivacyStatus,
  getCurrentBuyerLegalDocument,
  type BuyerLegalDocument,
} from "@/components/buyer/legal/buyerLegal";

type PrivacySection = {
  icon: string;
  title: string;
  paragraphs: string[];
  tone: string;
};

const SECTION_TONES = [
  "bg-blue-50 text-blue-700",
  "bg-violet-50 text-violet-700",
  "bg-emerald-50 text-emerald-700",
  "bg-rose-50 text-rose-600",
  "bg-sky-50 text-blue-600",
  "bg-amber-50 text-amber-700",
  "bg-cyan-50 text-cyan-700",
  "bg-orange-50 text-orange-600",
  "bg-indigo-50 text-indigo-700",
  "bg-slate-50 text-slate-700",
  "bg-pink-50 text-pink-700",
  "bg-green-50 text-green-700",
];

const SECTION_ICONS = [
  "🛡️",
  "📋",
  "⚙️",
  "📍",
  "💳",
  "🤝",
  "🔐",
  "🍪",
  "👤",
  "⏳",
  "🔔",
  "📄",
];

function cleanLine(line: string) {
  return line.replace(/^#+\s*/g, "").replace(/^-+\s*$/g, "").trim();
}

function isSectionTitle(line: string) {
  return /^\d+\.\s+/.test(cleanLine(line));
}

function parsePrivacyContent(content: string): PrivacySection[] {
  const lines = content.split("\n").map((line) => line.trim()).filter(Boolean);
  const sections: PrivacySection[] = [];
  let current: PrivacySection | null = null;

  for (const rawLine of lines) {
    const line = cleanLine(rawLine);
    if (!line) continue;

    if (
      line.toUpperCase().includes("POLÍTICA DE PRIVACIDAD") ||
      line.toUpperCase().includes("POLITICA DE PRIVACIDAD") ||
      line.toLowerCase().startsWith("versión:") ||
      line.toLowerCase().startsWith("ultima actualización") ||
      line.toLowerCase().startsWith("última actualización") ||
      line.toLowerCase().startsWith("propietario del documento") ||
      line.toLowerCase().startsWith("todos los derechos reservados")
    ) {
      continue;
    }

    if (isSectionTitle(line)) {
      const idx = sections.length;
      current = {
        icon: SECTION_ICONS[idx] || "📄",
        title: line,
        paragraphs: [],
        tone: SECTION_TONES[idx] || "bg-slate-50 text-slate-700",
      };
      sections.push(current);
      continue;
    }

    if (!current) continue;
    current.paragraphs.push(line);
  }

  return sections;
}

function useReachedPageBottom(enabled: boolean) {
  const [reachedBottom, setReachedBottom] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    function checkBottom() {
      const doc = document.documentElement;
      const distanceToBottom =
        doc.scrollHeight - window.scrollY - window.innerHeight;

      if (distanceToBottom <= 80) {
        setReachedBottom(true);
      }
    }

    checkBottom();
    window.addEventListener("scroll", checkBottom, { passive: true });
    window.addEventListener("resize", checkBottom);

    return () => {
      window.removeEventListener("scroll", checkBottom);
      window.removeEventListener("resize", checkBottom);
    };
  }, [enabled]);

  return reachedBottom;
}

export default function ProfilePrivacyPage() {
  const [doc, setDoc] = useState<BuyerLegalDocument | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checked, setChecked] = useState(false);

  async function refreshStatus() {
    setChecking(true);

    try {
      const currentDoc = await getCurrentBuyerLegalDocument("BUYER_PRIVACY");
      setDoc(currentDoc);

      const ok = await checkBuyerPrivacyStatus();
      setAccepted(ok);
    } catch {
      setDoc(null);
      setAccepted(false);
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    refreshStatus();
  }, []);

  const sections = useMemo(() => {
    return parsePrivacyContent(doc?.content || "");
  }, [doc?.content]);

  const reachedBottom = useReachedPageBottom(!checking && !accepted && sections.length > 0);

  async function acceptPrivacy() {
    if (!doc?.version || saving || !reachedBottom || !checked) return;

    setSaving(true);

    try {
      await acceptBuyerPrivacyBackend(doc.version);
      setAccepted(true);
      await refreshStatus();
      alert("Política de Privacidad aceptada correctamente.");
    } catch {
      alert("No fue posible registrar la aceptación. Inténtalo nuevamente.");
    } finally {
      setSaving(false);
    }
  }

  const canAccept = !accepted && reachedBottom && checked && !saving && !!doc?.version;

  return (
    <div className="px-4 pb-8 pt-4">
      <div className="text-lg font-extrabold text-gray-900">
        {doc?.title || "Política de Privacidad"}
      </div>

      <div className="mt-1 text-xs text-gray-600">
        Tratamiento de datos personales · Versión {doc?.version || "cargando..."}
      </div>

      <div className="mt-4 rounded-3xl border border-cyan-200 bg-cyan-50 p-4 text-xs leading-5 text-cyan-950">
        En KroniX protegemos tu información personal y la usamos únicamente para
        operar, mejorar y proteger la plataforma, conforme a la normativa
        colombiana de protección de datos personales.
      </div>

      <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-xs font-bold text-slate-600">
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
          {checking ? "Verificando..." : accepted ? "Aceptada" : "Pendiente"}
        </div>
      </div>

      {checking ? (
        <div className="mt-4 rounded-3xl border border-gray-200 bg-white p-4 text-xs font-bold text-slate-600 shadow-sm">
          Cargando política vigente desde Legal Center...
        </div>
      ) : null}

      {!checking && sections.length === 0 ? (
        <div className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-xs font-bold text-amber-800 shadow-sm">
          No se pudo cargar el contenido vigente de privacidad.
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {sections.map((item) => (
          <section
            key={item.title}
            className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div
                className={[
                  "grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xl",
                  item.tone,
                ].join(" ")}
              >
                {item.icon}
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-[15px] font-black leading-5 text-gray-950">
                  {item.title}
                </h2>

                <div className="mt-2 space-y-3 text-[12.5px] font-medium leading-5 text-slate-600">
                  {item.paragraphs.map((paragraph, idx) => (
                    <p key={`${item.title}-${idx}`}>
                      {paragraph.startsWith("- ")
                        ? `• ${paragraph.replace("- ", "")}`
                        : paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>

      {!accepted && sections.length > 0 ? (
        <div className="mt-5 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          {!reachedBottom ? (
            <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-800">
              Lee el documento completo hasta el final para habilitar la aceptación.
            </div>
          ) : null}

          <label
            className={[
              "flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-3",
              reachedBottom ? "cursor-pointer" : "cursor-not-allowed opacity-60",
            ].join(" ")}
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={!reachedBottom}
              onChange={(e) => {
                if (!reachedBottom) return;
                setChecked(e.target.checked);
              }}
              className="mt-1 h-4 w-4 rounded border-gray-300 accent-emerald-600"
            />

            <span className="text-[12px] font-semibold leading-5 text-gray-700">
              Declaro que he leído, comprendido y acepto la{" "}
              <b>Política de Privacidad</b> vigente de KroniX.
            </span>
          </label>

          <button
            type="button"
            onClick={acceptPrivacy}
            disabled={!canAccept}
            className="mt-3 w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-md active:scale-[0.98] disabled:bg-slate-300 disabled:shadow-none"
          >
            {saving ? "Guardando..." : "Aceptar y guardar"}
          </button>
        </div>
      ) : null}
    </div>
  );
}