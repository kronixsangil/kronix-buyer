// components/buyer/ProductList.tsx
"use client";

import Image from "next/image";
import { useState } from "react";
import { useCart } from "@/components/buyer/CartContext";

type UiProduct = {
  id: string;
  storeId: string;
  name: string;
  desc: string;
  info?: string | null;
  price: number;
  image?: string;
};

function formatCOP(value: number) {
  return value.toLocaleString("es-CO", { style: "currency", currency: "COP" });
}

function splitDescription(desc: string) {
  const raw = String(desc || "").trim();
  if (!raw) return { subtitle: "", detail: "" };

  const separators = [" | ", " — ", " – ", " - ", " • ", ", "];

  for (const sep of separators) {
    if (raw.includes(sep)) {
      const parts = raw.split(sep).map((x) => x.trim()).filter(Boolean);
      if (parts.length >= 2) {
        return {
          subtitle: parts[0],
          detail: parts.slice(1).join(" · "),
        };
      }
    }
  }

  return { subtitle: raw, detail: "" };
}

export default function ProductList({ products }: { products: UiProduct[] }) {
  const { addItem } = useCart();
  const [infoProduct, setInfoProduct] = useState<UiProduct | null>(null);

  return (
    <>
      <div className="space-y-1.5">
        {products.map((p) => {
          const parts = splitDescription(p.desc);

          return (
            <div
  key={`${p.storeId}:${p.id}`}
  role="button"
  tabIndex={0}
  onClick={() => setInfoProduct(p)}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setInfoProduct(p);
    }
  }}
  className="flex w-full cursor-pointer items-center gap-3 rounded-[22px] bg-white p-2 text-left shadow-[0_8px_22px_rgba(15,23,42,0.05)] ring-1 ring-black/5 transition hover:scale-[1.005] hover:bg-slate-50 active:scale-[0.995]"
>
              <div className="relative h-[64px] w-[64px] flex-none overflow-hidden rounded-[18px] bg-slate-100 shadow-inner ring-1 ring-black/5">
                {p.image ? (
                  <Image src={p.image} alt={p.name} fill className="object-cover" sizes="64px" />
                ) : null}
              </div>

              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-extrabold tracking-[-0.02em] text-slate-800">
                  {p.name}
                </div>

                {parts.subtitle ? (
                  <div className="mt-0.5 truncate text-[12px] font-medium text-slate-500">
                    {parts.subtitle}
                  </div>
                ) : null}

                {parts.detail ? (
                  <div className="mt-0.5 truncate text-[11px] font-medium text-slate-400">
                    {parts.detail}
                  </div>
                ) : null}

                <div className="mt-1.5 text-[16px] font-extrabold text-slate-900">
                  {formatCOP(p.price)}
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  addItem(
                    {
                      id: p.id,
                      storeId: p.storeId,
                      name: p.name,
                      price: p.price,
                      image: p.image,
                    },
                    1
                  );
                }}
                className="rounded-full bg-[#08b256] px-4 py-2 text-[13px] font-extrabold text-white shadow-[0_8px_18px_rgba(8,178,86,0.2)] transition hover:scale-[1.02] hover:bg-[#07a14d]"
              >
                + Agregar
              </button>
            </div>
          );
        })}
      </div>

      {infoProduct ? (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 px-[18px] pb-6 pt-10 backdrop-blur-[3px] sm:items-center"
          onClick={() => setInfoProduct(null)}
        >
          <div
            className="relative w-full max-w-[410px] overflow-hidden rounded-[30px] shadow-[0_35px_90px_rgba(2,8,23,0.62)] ring-1 ring-white/30"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 bg-[linear-gradient(180deg,#061f45_0%,#0a3566_18%,#f8fbff_43%,#ffffff_55%,#eef7ff_66%,#0a3566_86%,#031a3b_100%)]" />

            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-x-0 top-0 h-[120px] bg-[radial-gradient(circle_at_30%_0%,rgba(14,165,233,0.42),transparent_55%)]" />
              <div className="absolute inset-x-0 bottom-0 h-[110px] bg-[radial-gradient(circle_at_70%_100%,rgba(16,185,129,0.26),transparent_55%)]" />
              <div className="absolute left-8 top-7 h-[3px] w-[3px] rounded-full bg-white/95 shadow-[48px_12px_0_rgba(255,255,255,0.75),128px_2px_0_rgba(255,255,255,0.7),238px_14px_0_rgba(255,255,255,0.8),302px_3px_0_rgba(255,255,255,0.65)]" />
            </div>

            <div className="relative z-10 px-4 pb-4 pt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="line-clamp-2 text-[19px] font-black leading-[1.05] tracking-[-0.03em] text-white drop-shadow">
                    {infoProduct.name}
                  </h2>

                  {infoProduct.desc ? (
                    <div className="mt-2 max-w-full text-[11.5px] font-bold leading-4 text-cyan-50/90 drop-shadow">
                      {infoProduct.desc}
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => setInfoProduct(null)}
                  className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white/95 text-[17px] font-black text-[#07214a] shadow-[0_10px_24px_rgba(2,8,23,0.22)] ring-1 ring-white/70 transition hover:scale-[1.04]"
                  aria-label="Cerrar"
                >
                  ×
                </button>
              </div>

              {infoProduct.image ? (
                <div className="mt-4 rounded-[23px] bg-white p-2.5 shadow-[0_18px_38px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/80">
                  <div className="relative h-[190px] w-full overflow-hidden rounded-[18px] bg-white">
                    <Image
                      src={infoProduct.image}
                      alt={infoProduct.name}
                      fill
                      className="object-contain"
                      sizes="410px"
                    />
                  </div>
                </div>
              ) : null}

              <div className="mt-4 rounded-[22px] bg-white/95 px-4 py-4 shadow-[0_15px_34px_rgba(15,23,42,0.14)] ring-1 ring-slate-200/80 backdrop-blur">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#08b256] shadow-[0_0_0_4px_rgba(8,178,86,0.13)]" />
                  <div className="text-[10.5px] font-black uppercase tracking-[0.18em] text-[#244163]">
                    Información adicional
                  </div>
                </div>

                <div className="mt-2 max-h-[96px] overflow-y-auto pr-1 text-[13px] font-semibold leading-5 text-slate-700">
                  {String(infoProduct.info ?? "").trim() || "Este producto no tiene información adicional por ahora."}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="rounded-full bg-white/12 px-1 text-[20px] font-black tracking-[-0.03em] text-white drop-shadow">
                  {formatCOP(infoProduct.price)}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    addItem(
                      {
                        id: infoProduct.id,
                        storeId: infoProduct.storeId,
                        name: infoProduct.name,
                        price: infoProduct.price,
                        image: infoProduct.image,
                      },
                      1
                    );
                    setInfoProduct(null);
                  }}
                  className="rounded-full bg-[#08b256] px-5 py-3 text-[14px] font-black text-white shadow-[0_12px_26px_rgba(8,178,86,0.34)] transition hover:scale-[1.03] hover:bg-[#07a14d]"
                >
                  + Agregar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}