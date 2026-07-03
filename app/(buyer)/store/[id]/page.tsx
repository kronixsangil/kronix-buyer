// app/(buyer)/store/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import StoreTabs from "@/components/buyer/StoreTabs";
import ProductList from "@/components/buyer/ProductList";
import StoreCartCta from "@/components/buyer/StoreCartCta";
import {
  publicGetStoreByCode,
  publicGetStoreReviewsByCode,
  publicListProductsByStoreCode,
  type ApiPublicStore,
  type ApiPublicProduct,
  type ApiStoreTheme,
} from "@/lib/buyerCatalogApi";
import { useBuyerCity } from "@/components/buyer/CityContext";

type UiProduct = {
  id: string;
  name: string;
  price: number;
  desc: string;
  info?: string | null;
  storeId: string;
  storeCode?: string;
  image?: string | null;

  category?: string | null;
  categoryOrder?: number;
  displayOrder?: number;
  isRecommended?: boolean;
};

type UiReview = {
  id: string;
  name: string;
  text: string;
  stars: number;
  badgeText?: string | null;
  isDefault?: boolean;
};

type StoreReviewsResponse = {
  rating: number;
  ratingCount: number;
  reviews: UiReview[];
};

const FAVORITE_STORES_KEY = "ct_favorite_stores";

function getBannerImage(store: ApiPublicStore | null) {
  if (!store) return null;
  return store.image2 || store.image || null;
}

function getLogoImage(store: ApiPublicStore | null) {
  if (!store) return null;
  return store.image || store.image2 || null;
}

function getGallery(store: ApiPublicStore | null) {
  if (!store) return [];
  return [store.image3, store.image4].filter(Boolean) as string[];
}

function formatRating(value: number) {
  return Number(value || 5.0).toFixed(1);
}

function normalizeStoreTheme(store: ApiPublicStore | null): ApiStoreTheme | null {
  if (!store) return null;

  const base = store.theme ?? null;
  const custom = store.useCustomTheme && store.customThemeJson && typeof store.customThemeJson === "object"
    ? store.customThemeJson
    : null;

  if (!base && !custom) return null;

  return {
    ...(base ?? {}),
    ...(custom ?? {}),
  } as ApiStoreTheme;
}

function themeValue(value: string | null | undefined, fallback: string) {
  const raw = String(value ?? "").trim();
  return raw || fallback;
}

function themeGradient(theme: ApiStoreTheme | null) {
  const pageBg = themeValue(theme?.pageBg, "#ffffff");
  const from = themeValue(theme?.gradientFrom || theme?.headerBg || theme?.secondaryColor, "#03102b");
  const mid = themeValue(theme?.secondaryColor || theme?.headerBg, "#0b356d");
  const to = themeValue(theme?.gradientTo || theme?.primaryColor, "#08b256");

  return `linear-gradient(180deg, ${from} 0%, ${mid} 42%, ${to} 72%, ${pageBg} 100%)`;
}


export default function StoreDetailPage() {
  const params = useParams<{ id: string }>();
  const storeCode = params?.id;
  const { citySlug, cityLabel, cityReady } = useBuyerCity();

  const [store, setStore] = useState<ApiPublicStore | null>(null);
  const [products, setProducts] = useState<ApiPublicProduct[]>([]);
  const [reviews, setReviews] = useState<UiReview[]>([]);
  const [storeRating, setStoreRating] = useState<number>(5.0);
  const [storeRatingCount, setStoreRatingCount] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (!storeCode || !cityReady) {
      setLoading(true);
      return;
    }

    let alive = true;
    setLoading(true);

    Promise.all([
      publicGetStoreByCode(storeCode, citySlug),
      publicListProductsByStoreCode(storeCode, undefined, citySlug),
      publicGetStoreReviewsByCode(storeCode, citySlug),
    ])
      .then(([s, ps, rs]) => {
        if (!alive) return;

        setStore(s);
        setProducts(ps);

        const resolvedRating = Number((rs as StoreReviewsResponse | null)?.rating ?? 5.0);
        const resolvedCount = Number((rs as StoreReviewsResponse | null)?.ratingCount ?? 1);
        const resolvedReviews = Array.isArray((rs as StoreReviewsResponse | null)?.reviews)
          ? (rs as StoreReviewsResponse).reviews
          : [];

        setStoreRating(Number.isFinite(resolvedRating) ? resolvedRating : 5.0);
        setStoreRatingCount(Number.isFinite(resolvedCount) && resolvedCount > 0 ? resolvedCount : 1);
        setReviews(resolvedReviews);
      })
      .catch(() => {
        if (!alive) return;
        setStore(null);
        setProducts([]);
        setStoreRating(5.0);
        setStoreRatingCount(1);
        setReviews([]);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [storeCode, citySlug, cityReady]);

  useEffect(() => {
    if (!storeCode) return;

    try {
      const raw = localStorage.getItem(FAVORITE_STORES_KEY);
      const parsed: string[] = raw ? JSON.parse(raw) : [];
      setIsFavorite(parsed.includes(String(storeCode)));
    } catch {
      setIsFavorite(false);
    }
  }, [storeCode]);

  const toggleFavorite = () => {
    if (!storeCode) return;

    try {
      const raw = localStorage.getItem(FAVORITE_STORES_KEY);
      const parsed: string[] = raw ? JSON.parse(raw) : [];
      const code = String(storeCode);

      let next: string[] = [];

      if (parsed.includes(code)) {
        next = parsed.filter((x) => x !== code);
        setIsFavorite(false);
      } else {
        next = [...parsed, code];
        setIsFavorite(true);
      }

      localStorage.setItem(FAVORITE_STORES_KEY, JSON.stringify(next));
    } catch {
      // no-op
    }
  };

  const logoImage = useMemo(() => getLogoImage(store), [store]);
  const bannerImage = useMemo(() => getBannerImage(store), [store]);
  const gallery = useMemo(() => getGallery(store), [store]);
  const theme = useMemo(() => normalizeStoreTheme(store), [store]);

  const uiProducts = useMemo<UiProduct[]>(() => {
    const realStoreId = String(store?.id ?? "").trim();
    const realStoreCode = String(store?.storeCode ?? storeCode ?? "").trim();

    return products.map((p) => ({
      id: p.externalId,
      name: p.name,
      price: p.priceCOP,
      desc: p.description ?? "",
      info: p.info ?? "",
      storeId: realStoreId,
      storeCode: realStoreCode,
      image: p.image,
      category: p.category,
      categoryOrder: p.categoryOrder,
      displayOrder: p.displayOrder,
      isRecommended: p.isRecommended,
    }));
  }, [products, store, storeCode]);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return uiProducts;

    return uiProducts.filter((p) => {
      const name = p.name.toLowerCase();
      const desc = (p.desc || "").toLowerCase();
      const info = (p.info || "").toLowerCase();
      return name.includes(q) || desc.includes(q) || info.includes(q);
    });
  }, [query, uiProducts]);



  useEffect(() => {
    const root = document.documentElement;

    if (!theme) {
      root.style.removeProperty("--kx-header-gradient");
      root.style.removeProperty("--kx-header-logo");
      root.style.removeProperty("--kx-bottom-nav-bg");
      root.style.removeProperty("--kx-bottom-nav-active");
      root.style.removeProperty("--kx-bottom-nav-inactive");
      root.style.removeProperty("--kx-primary");
      root.style.removeProperty("--kx-button-bg");
      root.style.removeProperty("--kx-button-text");
      return;
    }

    root.style.setProperty("--kx-header-gradient", themeGradient(theme));
    root.style.setProperty("--kx-header-logo", `url("${themeValue(theme.headerLogoUrl, "/branding/kronix/header-logo.png")}")`);
    root.style.setProperty("--kx-bottom-nav-bg", themeValue(theme.bottomNavBg, "#0a3566"));
    root.style.setProperty("--kx-bottom-nav-active", themeValue(theme.bottomNavActiveColor || theme.primaryColor, "#86efac"));
    root.style.setProperty("--kx-bottom-nav-inactive", themeValue(theme.bottomNavInactiveColor, "#ffffff"));
    root.style.setProperty("--kx-primary", themeValue(theme.primaryColor, "#08b256"));
    root.style.setProperty("--kx-button-bg", themeValue(theme.buttonBg || theme.primaryColor, "#08b256"));
    root.style.setProperty("--kx-button-text", themeValue(theme.buttonTextColor, "#ffffff"));
    root.style.setProperty("--kx-page-bg", themeValue(theme.pageBg, "#ffffff"));
    root.style.setProperty("--kx-header-bg", themeValue(theme.headerBg, "#03102b"));

    return () => {
      root.style.removeProperty("--kx-header-gradient");
      root.style.removeProperty("--kx-header-logo");
      root.style.removeProperty("--kx-bottom-nav-bg");
      root.style.removeProperty("--kx-bottom-nav-active");
      root.style.removeProperty("--kx-bottom-nav-inactive");
      root.style.removeProperty("--kx-primary");
      root.style.removeProperty("--kx-button-bg");
      root.style.removeProperty("--kx-button-text");
      root.style.removeProperty("--kx-page-bg");
      root.style.removeProperty("--kx-header-bg");
    };
  }, [theme]);

  const galleryContent = (
    <div className="space-y-2">
      {gallery.length ? (
        <div className="grid grid-cols-2 gap-2.5">
          {gallery.map((img, idx) => (
            <div
              key={`${store?.storeCode ?? "store"}-gallery-${idx}`}
              className="relative aspect-[1/1] overflow-hidden rounded-[18px] bg-white shadow-[0_6px_18px_rgba(15,23,42,0.07)] ring-1 ring-black/5"
            >
              <Image
                src={img}
                alt={`${store?.name ?? "Tienda"} imagen ${idx + 1}`}
                fill
                className="object-cover"
                sizes="50vw"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[18px] bg-white p-4 text-sm text-gray-500 shadow-[0_6px_18px_rgba(15,23,42,0.05)] ring-1 ring-black/5">
          Esta tienda todavía no tiene imágenes adicionales.
        </div>
      )}
    </div>
  );

  if (!storeCode) return <div className="px-4 pt-3 text-sm text-gray-600">Tienda inválida.</div>;

  if (loading) {
    return <div className="px-4 pt-3 text-sm text-gray-600">Cargando tienda…</div>;
  }

  if (!store) {
    return <div className="px-4 pt-3 text-sm text-gray-600">No encontramos la tienda.</div>;
  }

  return (
    <div
      className="relative min-h-screen px-3 pb-20 pt-0"
      style={{ background: themeValue(theme?.pageBg, "#ffffff"), color: themeValue(theme?.textPrimary, "#020617") }}
    >
      
      <div
  className="relative -mt-[1px] overflow-hidden rounded-[24px] shadow-[0_10px_30px_rgba(15,23,42,0.07)] ring-1 ring-black/5"
  style={{ background: themeValue(theme?.pageBg, "#ffffff") }}
>
       
        <div className="relative h-[170px] w-full bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200">
          {bannerImage ? (
            <Image src={bannerImage} alt={store.name} fill className="object-cover" sizes="100vw" />
          ) : null}

          <div className="absolute inset-0 bg-gradient-to-t from-[#07111f]/92 via-[#07111f]/40 to-transparent" />

          <button
            type="button"
            onClick={toggleFavorite}
            aria-label={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#0f172a]/70 backdrop-blur-md shadow-[0_8px_18px_rgba(0,0,0,0.22)] transition hover:scale-[1.03]"
          >
            <span
              className={[
                "text-[18px] leading-none",
                isFavorite ? "text-red-500" : "text-white",
              ].join(" ")}
            >
              {isFavorite ? "♥" : "♡"}
            </span>
          </button>

          <div className="absolute bottom-0 left-0 right-0 p-3">
            <div className="flex items-end gap-3">
              <div className="relative h-[70px] w-[70px] flex-none overflow-hidden rounded-full border-[3px] border-white bg-white shadow-[0_10px_24px_rgba(0,0,0,0.15)]">
                {logoImage ? (
                  <Image src={logoImage} alt={`${store.name} logo`} fill className="object-cover" sizes="70px" />
                ) : null}
              </div>

              <div className="min-w-0 flex-1 pb-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-[18px] font-extrabold tracking-[-0.02em] text-white">
                    {store.name}
                  </h1>
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px] shadow-sm"
                    style={{ background: themeValue(theme?.primaryColor, "#16a34a"), color: themeValue(theme?.buttonTextColor, "#ffffff") }}>
                    ✓
                  </span>
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-white/95">
                  <div className="flex items-center gap-1">
                    <span className="text-[16px] leading-none text-[#facc15]">★</span>
                    <span className="text-[14px] font-extrabold">{formatRating(storeRating)}</span>
                  </div>

                  <div className="text-[11px] font-semibold text-white/85">
                    ({storeRatingCount} reseñas)
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-bold text-white ring-1 ring-white/20 backdrop-blur-sm">
                    {store.etaMin}–{store.etaMax} min
                  </span>
                  <span className="rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-bold capitalize text-white ring-1 ring-white/20 backdrop-blur-sm">
                    {store.category}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2.5">
        <StoreTabs
          menu={
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-11 flex-1 items-center rounded-full px-4 shadow-[0_8px_20px_rgba(15,23,42,0.05)] ring-1 ring-black/5"
                  style={{ background: themeValue(theme?.inputBg, "#ffffff"), borderColor: themeValue(theme?.inputBorder, "rgba(0,0,0,0.05)") }}>
                  <span className="mr-2.5 text-[18px] leading-none text-slate-500">⌕</span>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar productos..."
                    className="w-full bg-transparent text-[14px] font-medium outline-none placeholder:text-gray-600"
style={{ color: themeValue(theme?.textPrimary, "#020617") }}
                  />
                </div>

                <button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-full shadow-[0_8px_20px_rgba(15,23,42,0.05)] ring-1 ring-black/5"
                  style={{ background: themeValue(theme?.buttonBg || theme?.primaryColor, "#ffffff"), color: themeValue(theme?.buttonTextColor, "#334155") }}
                  aria-label="Filtros"
                >
                  <span className="text-[18px] leading-none">☰</span>
                </button>
              </div>

              <ProductList products={filteredProducts as any} theme={theme} />
            </div>
          }
          images={galleryContent}
          storeInfo={{
            address: store.address || "—",
            hours: "Lun–Dom 8:00am – 10:00pm",
            notes: `Datos desde BD (CTCC) · Ciudad activa: ${cityLabel}.`,
          }}
          reviews={reviews}
          theme={theme ?? undefined}
        />
      </div>

      <StoreCartCta />
    </div>
  );
}
