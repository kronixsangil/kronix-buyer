// components/buyer/StoreTabs.tsx
"use client";

import { useMemo, useState } from "react";

type Info = {
  address: string;
  hours: string;
  notes: string;
};

type Review = {
  id: string;
  name: string;
  text: string;
  stars: number;
  badgeText?: string | null;
  isDefault?: boolean;
};

type TabKey = "menu" | "info" | "reviews" | "images";

export default function StoreTabs({
  menu,
  images,
  storeInfo,
  reviews,
  theme,
}: {
  menu: React.ReactNode;
  images: React.ReactNode;
  storeInfo: Info;
  reviews: Review[];
  theme?: {
    buttonBg?: string;
    buttonTextColor?: string;
  };
}) {
  const [tab, setTab] = useState<TabKey>("menu");

  const tabBtn = (key: TabKey, label: string, icon: string) => {
    const active = tab === key;

    return (
      <button
        type="button"
        onClick={() => setTab(key)}
        className={[
          "flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] font-extrabold transition-all",
          active
            ? ""
            : "bg-transparent text-slate-700 hover:bg-white hover:shadow-[0_8px_18px_rgba(15,23,42,0.04)]",
        ].join(" ")}
        style={
  active
    ? {
        backgroundColor: theme?.buttonBg ?? "#08b256",
        color: theme?.buttonTextColor ?? "#ffffff",
      }
    : undefined
}
      >
        <span className="text-[14px] leading-none">{icon}</span>
        <span className="truncate">{label}</span>
      </button>
    );
  };

  const content = useMemo(() => {
    if (tab === "menu") return menu;

    if (tab === "images") return images;

    if (tab === "info") {
      return (
        <div className="rounded-[18px] bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.05)] ring-1 ring-black/5">
          <div className="text-sm font-extrabold text-slate-900">Información</div>

          <div className="mt-3 space-y-3 text-sm text-slate-700">
            <div>
              <div className="font-bold text-slate-900">Dirección</div>
              <div className="mt-1 text-slate-600">{storeInfo.address}</div>
            </div>

            <div>
              <div className="font-bold text-slate-900">Horario</div>
              <div className="mt-1 text-slate-600">{storeInfo.hours}</div>
            </div>

            <div>
              <div className="font-bold text-slate-900">Notas</div>
              <div className="mt-1 text-slate-600">{storeInfo.notes}</div>
            </div>
          </div>
        </div>
      );
    }

    if (!reviews.length) {
      return (
        <div className="rounded-[18px] bg-white p-4 text-sm text-slate-600 shadow-[0_8px_20px_rgba(15,23,42,0.05)] ring-1 ring-black/5">
          Esta tienda aún no tiene reseñas.
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {reviews.map((r) => (
          <div
            key={r.id}
            className={[
              "rounded-[18px] p-4 shadow-[0_8px_20px_rgba(15,23,42,0.05)] ring-1",
              r.isDefault
                ? "bg-gradient-to-br from-[#f8fff9] via-white to-[#f6fbff] ring-emerald-200"
                : "bg-white ring-black/5",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-extrabold text-slate-900">{r.name}</div>

                {r.badgeText ? (
                  <div className="mt-1 inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700 ring-1 ring-emerald-200">
                    {r.badgeText}
                  </div>
                ) : null}
              </div>

              <div className="shrink-0 text-[11px] font-semibold text-slate-600">
                ⭐ {r.stars}/5
              </div>
            </div>

            <div className="mt-2 text-sm leading-5 text-slate-600">{r.text}</div>
          </div>
        ))}
      </div>
    );
  }, [images, menu, reviews, storeInfo, tab]);

  return (
    <div>
      <div className="grid grid-cols-4 gap-0.5">
        {tabBtn("menu", "Menú", "🍴")}
        {tabBtn("info", "Info", "ⓘ")}
        {tabBtn("reviews", "Reseñas", "☆")}
        {tabBtn("images", "Imágenes", "🖼")}
      </div>

      <div className="mt-2">{content}</div>
    </div>
  );
}