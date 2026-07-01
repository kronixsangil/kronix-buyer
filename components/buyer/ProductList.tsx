// components/buyer/ProductList.tsx
"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useCart } from "@/components/buyer/CartContext";

type UiProduct = {
  id: string;
  storeId: string;
  name: string;
  desc: string;
  info?: string | null;
  price: number;
  image?: string | null;
  category?: string | null;
  categoryOrder?: number;
  displayOrder?: number;
  isRecommended?: boolean;
};

function formatCOP(value: number) {
  return value.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

function splitDescription(desc: string) {
  const raw = String(desc || "").trim();
  if (!raw) return { subtitle: "", detail: "" };

  const separators = [" | ", " — ", " – ", " - ", " • ", ", "];

  for (const sep of separators) {
    if (raw.includes(sep)) {
      const parts = raw.split(sep).map((x) => x.trim()).filter(Boolean);
      if (parts.length >= 2) {
        return { subtitle: parts[0], detail: parts.slice(1).join(" · ") };
      }
    }
  }

  return { subtitle: raw, detail: "" };
}

function groupProducts(products: UiProduct[]) {
  const sortProducts = (items: UiProduct[]) =>
    [...items].sort(
      (a, b) =>
        (a.displayOrder ?? 100) - (b.displayOrder ?? 100) ||
        a.name.localeCompare(b.name, "es")
    );

  const recommended = sortProducts(products.filter((p) => p.isRecommended));

  const map = new Map<string, UiProduct[]>();

  for (const p of products) {
    const key = String(p.category || "Otros").trim() || "Otros";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }

  const categories = [...map.entries()]
    .map(([name, items]) => ({
      name,
      order: Math.min(...items.map((i) => i.categoryOrder ?? 100)),
      products: sortProducts(items),
    }))
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "es"));

  return { recommended, categories };
}

function ProductGridCard({
  product,
  qty,
  onInfo,
  onAdd,
}: {
  product: UiProduct;
  qty: number;
  onInfo: (p: UiProduct) => void;
  onAdd: (p: UiProduct) => void;
}) {
  const parts = splitDescription(product.desc);
  const subtitle = String(parts.subtitle || "").trim();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onInfo(product)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onInfo(product);
        }
      }}
      className="relative min-w-0 cursor-pointer"
    >
      <div className="relative aspect-[1.13/1] w-full overflow-hidden rounded-[14px] bg-slate-100 shadow-[0_7px_18px_rgba(15,23,42,0.08)] ring-1 ring-black/5">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover"
            sizes="33vw"
          />
        ) : null}

        {qty > 0 ? (
          <div className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-black text-white shadow">
            {qty}
          </div>
        ) : null}
      </div>

      <div className="mt-1.5 pr-7 text-[12px] font-black leading-[1.08] tracking-[-0.03em] text-slate-950 line-clamp-2">
        {product.name}
        {subtitle ? (
          <span className="ml-1 text-[9.5px] font-bold text-slate-500">
            {subtitle}
          </span>
        ) : null}
      </div>

      <div className="relative mt-1 flex min-h-[16px] items-start justify-between gap-1">
        <div className="pt-0.5 text-[12px] font-black tracking-[-0.02em] text-rose-600">
          {formatCOP(product.price)}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAdd(product);
          }}
          className="flex h-7 w-7 flex-none translate-y-[-4px] scale-100 items-center justify-center rounded-[9px] bg-[#08b256] text-[20px] font-black leading-none text-white shadow-[0_7px_16px_rgba(8,178,86,0.28)] transition hover:scale-105 active:scale-95"
          aria-label={`Agregar ${product.name}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

function SectionTitle({
  emoji,
  title,
  expanded,
  onToggle,
}: {
  emoji: string;
  title: string;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="text-[14px]">{emoji}</span>
        <h3 className="truncate text-[14px] font-black tracking-[-0.02em] text-slate-950">
          {title}
        </h3>
      </div>

      {onToggle ? (
        <button
          type="button"
          onClick={onToggle}
          className="flex-none text-[11px] font-black text-[#08b256]"
        >
          {expanded ? "Ver menos" : "Ver más"}
        </button>
      ) : null}
    </div>
  );
}

export default function ProductList({ products }: { products: UiProduct[] }) {
  const cart: any = useCart();
  const addItem = cart.addItem;
  const cartItems = Array.isArray(cart.items)
    ? cart.items
    : Array.isArray(cart.cartItems)
      ? cart.cartItems
      : [];

  const [infoProduct, setInfoProduct] = useState<UiProduct | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const grouped = useMemo(() => groupProducts(products), [products]);

  function getQty(p: UiProduct) {
    return cartItems.reduce((sum: number, item: any) => {
      const sameId = String(item?.id ?? item?.productId ?? "") === String(p.id);
      const sameStore =
        !item?.storeId || !p.storeId || String(item.storeId) === String(p.storeId);

      if (!sameId || !sameStore) return sum;

      return sum + Number(item?.qty ?? item?.quantity ?? 1);
    }, 0);
  }

  function addProductToCart(p: UiProduct) {
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
  }

  return (
    <>
      <div className="space-y-2">
        {grouped.recommended.length > 0 ? (
  <section>
    <SectionTitle
      emoji="🔥"
      title="Recomendados"
      expanded={Boolean(expandedSections.__recommended)}
      onToggle={() =>
        setExpandedSections((prev) => ({
          ...prev,
          __recommended: !prev.__recommended,
        }))
      }
    />

    <div
      className={
        expandedSections.__recommended
          ? "grid grid-cols-3 gap-x-2.5 gap-y-2"
          : "flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      }
    >
      {grouped.recommended.map((p) => (
        <div
          key={`recommended-${p.storeId}:${p.id}`}
          className={
            expandedSections.__recommended
              ? "min-w-0"
              : "w-[calc((100%-20px)/3)] min-w-[calc((100%-20px)/3)] flex-none"
          }
        >
          <ProductGridCard
            product={p}
            qty={getQty(p)}
            onInfo={setInfoProduct}
            onAdd={addProductToCart}
          />
        </div>
      ))}
    </div>
  </section>
) : null}

        {grouped.categories.map((category, index) => {
  const expanded = Boolean(expandedSections[category.name]);

  return (
    <section key={category.name}>
      <SectionTitle
        emoji={index % 3 === 0 ? "🌿" : index % 3 === 1 ? "✨" : "🛍️"}
        title={category.name}
        expanded={expanded}
        onToggle={() =>
          setExpandedSections((prev) => ({
            ...prev,
            [category.name]: !prev[category.name],
          }))
        }
      />

      <div
        className={
          expanded
            ? "grid grid-cols-3 gap-x-2.5 gap-y-2"
            : "flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        }
      >
        {category.products.map((p) => (
          <div
            key={`${category.name}-${p.storeId}:${p.id}`}
            className={
              expanded
                ? "min-w-0"
                : "w-[calc((100%-20px)/3)] min-w-[calc((100%-20px)/3)] flex-none"
            }
          >
            <ProductGridCard
              product={p}
              qty={getQty(p)}
              onInfo={setInfoProduct}
              onAdd={addProductToCart}
            />
          </div>
        ))}
      </div>
    </section>
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
                  {String(infoProduct.info ?? "").trim() ||
                    "Este producto no tiene información adicional por ahora."}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="rounded-full bg-white/12 px-1 text-[20px] font-black tracking-[-0.03em] text-white drop-shadow">
                  {formatCOP(infoProduct.price)}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    addProductToCart(infoProduct);
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