//app\(buyer)\legal\privacy\page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BUYER_PRIVACY_FALLBACK_VERSION,
  getCurrentBuyerLegalDocument,
  type BuyerLegalDocument,
} from "@/components/buyer/legal/buyerLegal";

function LegalContent({ content }: { content: string }) {
  return (
    <div className="space-y-4 text-[14px] leading-7 text-slate-700">
      {content
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, idx) => {
          if (line.startsWith("# ")) {
            return (
              <h2 key={idx} className="mt-8 text-[22px] font-black text-slate-900">
                {line.replace("# ", "")}
              </h2>
            );
          }

          if (line.startsWith("## ")) {
            return (
              <h3 key={idx} className="mt-7 text-[20px] font-black text-slate-900">
                {line.replace("## ", "")}
              </h3>
            );
          }

          if (line.startsWith("---")) {
            return <hr key={idx} className="my-6 border-slate-200" />;
          }

          return <p key={idx}>{line}</p>;
        })}
    </div>
  );
}

export default function PrivacyPage() {
  const [doc, setDoc] = useState<BuyerLegalDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentBuyerLegalDocument("BUYER_PRIVACY")
      .then((res) => setDoc(res))
      .catch(() => setDoc(null))
      .finally(() => setLoading(false));
  }, []);

  const version = doc?.version || BUYER_PRIVACY_FALLBACK_VERSION;
  const content =
    doc?.content?.trim() ||
    "No se pudo cargar el documento legal vigente. Intenta nuevamente.";

  return (
    <div className="min-h-full bg-slate-50">
      <div className="w-full px-4 py-4">
        <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-cyan-700 via-sky-700 to-blue-900 px-6 py-8 text-white">
            <div className="text-[12px] font-black uppercase tracking-[0.25em] text-cyan-100">
              KroniX
            </div>

            <h1 className="mt-2 text-[34px] font-black leading-tight">
              {doc?.title || "Política de Privacidad"}
            </h1>

            <p className="mt-3 text-[15px] leading-7 text-slate-100">
              Versión vigente: {version}
            </p>
          </div>

          <div className="px-6 py-8">
            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
                Cargando documento legal vigente...
              </div>
            ) : (
              <LegalContent content={content} />
            )}

            <div className="mt-10 border-t border-slate-200 pt-6 text-center">
              <Link
                href="/"
                className="inline-flex rounded-2xl bg-slate-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-slate-800"
              >
                Volver a KroniX
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}