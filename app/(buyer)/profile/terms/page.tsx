//app\(buyer)\profile\terms\page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  acceptBuyerTermsBackend,
  checkBuyerTermsStatus,
  getCurrentBuyerLegalDocument,
  type BuyerLegalDocument,
} from "@/components/buyer/legal/buyerLegal";

type LegalSection = {
  icon: string;
  title: string;
  paragraphs: string[];
  tone: string;
};

const SECTION_TONES = [
  "bg-blue-50 text-blue-700",
  "bg-emerald-50 text-emerald-700",
  "bg-sky-50 text-blue-600",
  "bg-blue-50 text-blue-700",
  "bg-emerald-50 text-emerald-700",
  "bg-slate-100 text-slate-700",
  "bg-cyan-50 text-cyan-700",
];

const SECTION_ICONS = [
  "👥",
  "🛡️",
  "🚙",
  "💳",
  "📍",
  "⚖️",
  "📄",
];

function cleanLine(line: string) {
  return line
    .replace(/^#+\s*/g, "")
    .replace(/^-+\s*$/g, "")
    .trim();
}

function isSectionTitle(line: string) {
  const clean = cleanLine(line);
  return /^\d+\.\s+/.test(clean);
}

function parseLegalContent(content: string): LegalSection[] {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const sections: LegalSection[] = [];
  let current: LegalSection | null = null;

  for (const rawLine of lines) {
    const line = cleanLine(rawLine);

    if (!line) continue;

    if (
      line.toUpperCase().includes("TÉRMINOS Y CONDICIONES") ||
      line.toUpperCase().includes("TERMINOS Y CONDICIONES") ||
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

export default function ProfileTermsPage() {
  const [accepted, setAccepted] = useState(false);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doc, setDoc] = useState<BuyerLegalDocument | null>(null);

  async function refreshStatus() {
    setChecking(true);

    try {
      const currentDoc = await getCurrentBuyerLegalDocument("BUYER_TERMS");
      setDoc(currentDoc);

      const ok = await checkBuyerTermsStatus();
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
    return parseLegalContent(doc?.content || "");
  }, [doc?.content]);

  async function acceptTerms() {
    if (!doc?.version || saving) return;

    setSaving(true);

    try {
      await acceptBuyerTermsBackend(doc.version);
      setAccepted(true);
      await refreshStatus();
      alert("Términos y Condiciones aceptados correctamente.");
    } catch {
      alert("No fue posible registrar la aceptación. Inténtalo nuevamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-4 pb-8 pt-4">
      <div className="text-lg font-extrabold text-gray-900">
        {doc?.title || "Términos y Condiciones"}
      </div>

      <div className="mt-1 text-xs text-gray-600">
        Documento legal · Versión {doc?.version || "cargando..."}
      </div>

      <div className="mt-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-xs leading-5 text-emerald-950">
        Al utilizar KroniX aceptas los términos vigentes de la plataforma,
        publicados y administrados desde el Legal Center.
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
          {checking ? "Verificando..." : accepted ? "Aceptado" : "Pendiente"}
        </div>

        {!accepted ? (
          <button
            type="button"
            onClick={acceptTerms}
            disabled={saving || checking || !doc?.version}
            className="mt-4 w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-md active:scale-[0.98] disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Aceptar versión vigente"}
          </button>
        ) : null}
      </div>

      {checking ? (
        <div className="mt-4 rounded-3xl border border-gray-200 bg-white p-4 text-xs font-bold text-slate-600 shadow-sm">
          Cargando términos vigentes desde Legal Center...
        </div>
      ) : null}

      {!checking && sections.length === 0 ? (
        <div className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-xs font-bold text-amber-800 shadow-sm">
          No se pudo cargar el contenido vigente de términos.
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
                    <p key={`${item.title}-${idx}`}>{paragraph}</p>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}