// components/buyer/PromoBanner.tsx
"use client";

import Image from "next/image";
import type { Promo } from "@/lib/catalog";

export function PromoBanner({
  promo,
  onAction,
}: {
  promo: Promo;
  onAction: (p: Promo) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onAction(promo)}
      className="relative w-full overflow-hidden rounded-2xl border border-gray-200 bg-white text-left shadow-sm hover:opacity-[0.98] active:scale-[0.999]"
    >
      {/* Alto del banner */}
      <div className="relative h-[120px] sm:h-[140px]">
        {/* Fondo (imagen) */}
        {promo.image ? (
          <Image
            src={promo.image}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 640px"
            priority={false}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-green-200 to-green-100" />
        )}

        {/* Overlay para legibilidad */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-black/10" />

        {/* Contenido */}
        <div className="absolute inset-0 flex items-center">
          <div className="px-4 sm:px-5">
            <div className="text-white font-extrabold text-lg sm:text-xl leading-tight drop-shadow">
              {promo.title}
            </div>

            {promo.subtitle ? (
              <div className="mt-1 text-white/90 text-sm sm:text-base drop-shadow">
                {promo.subtitle}
              </div>
            ) : null}

            <div className="mt-3 inline-flex items-center rounded-full bg-green-600 px-4 py-2 text-xs font-extrabold text-white shadow hover:bg-green-700">
              PIDE YA
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}