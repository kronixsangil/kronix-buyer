//app\(buyer)\comprar\page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useSearch } from "@/components/buyer/SearchContext";
import { useBuyerCity } from "@/components/buyer/CityContext";
import { publicGetBuyerHome } from "@/lib/buyerCatalogApi";
import KronixBannerSlider from "./components/KronixBannerSlider";

type ApiBuyerCategory = {
  id: string;
  slug: string;
  name: string;
  emoji: string | null;
  sortOrder: number;
  matchTerms: string | null;
};

type ApiBuyerHomeConfig = {
  id: string;
  key: string;
  homeBgMode: "SOLID" | "GRADIENT";
  homeBgColor: string;
  homeBgColor2: string | null;
  showRecommended: boolean;
  recommendedTitle: string;
  recommendedMax: number;
  storeCardLayout: "FEATURED" | "COMPACT";
  storeCardShowName: boolean;
  storeCardShowDescription: boolean;
  storeCardShowCategory: boolean;
  storeCardShowRating: boolean;
  storeCardShowDistance: boolean;
  storeCardShowEta: boolean;
  storeCardShowSticker: boolean;
  storeCardShowExtraImages: boolean;
  storeCardExtraImagesCount: number;
  storeCardShowBadge: boolean;
  storeCardCornerRadius: number;
  storeCardImageWidth: number;
  storeCardImageHeight: number;
  storeCardTitleFontSize: number;
  storeCardSubtitleFontSize: number;
  storeCardMetaFontSize: number;
  createdAt: string;
  updatedAt: string;
};

type ApiPublicStore = {
  id: string;
  storeCode: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: string;
  description: string;
  etaMin: number;
  etaMax: number;
  image: string | null;
  image2: string | null;
  image3: string | null;
  image4: string | null;
  isBuyerRecommended: boolean;
  buyerRecommendedOrder: number | null;
  buyerCardTitleOverride: string | null;
  buyerCardSubtitleOverride: string | null;
  buyerCardBadgeText: string | null;
  buyerCardDistanceText: string | null;
  buyerCardRatingText: string | null;
  buyerCardStickerEmoji: string | null;
  buyerCardImageOrder: string | null;
};

type ApiBuyerHomeResponse = {
  categories: ApiBuyerCategory[];
  config: ApiBuyerHomeConfig;
  stores: ApiPublicStore[];
};

type CategoryTab = {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  sortOrder: number;
  matchTerms: string;
};

function norm(input: string) {
  return (input ?? "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function splitTerms(input: string) {
  return norm(input)
    .split(/[,\|\n;]/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

function mapApiCategories(items: ApiBuyerCategory[]): CategoryTab[] {
  return items.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    emoji: c.emoji || "✨",
    sortOrder: c.sortOrder ?? 100,
    matchTerms: c.matchTerms || "",
  }));
}

function storeMatchesCategory(store: ApiPublicStore, category: CategoryTab) {
  const hay = norm(`${store.category} ${store.name} ${store.description}`);
  const terms = Array.from(new Set([norm(category.slug), ...splitTerms(category.matchTerms)]));
  return terms.length > 0 && terms.some((term) => hay.includes(term));
}

function getFallbackSticker(store: ApiPublicStore) {
  const hay = norm(`${store.name} ${store.category} ${store.description}`);

  if (hay.includes("pet")) {
    return { emoji: "🐾", bg: "bg-orange-100", ring: "ring-orange-200" };
  }

  if (
    hay.includes("boutique") ||
    hay.includes("ropa") ||
    hay.includes("moda") ||
    hay.includes("style")
  ) {
    return { emoji: "👜", bg: "bg-rose-100", ring: "ring-rose-200" };
  }

  if (hay.includes("farmacia") || hay.includes("droguer") || hay.includes("pharmacy")) {
    return { emoji: "💊", bg: "bg-emerald-100", ring: "ring-emerald-200" };
  }

  if (hay.includes("supermercado") || hay.includes("supermarket") || hay.includes("market")) {
    return { emoji: "🛒", bg: "bg-sky-100", ring: "ring-sky-200" };
  }

  return { emoji: "🏬", bg: "bg-gray-100", ring: "ring-gray-200" };
}

function getStoreSticker(store: ApiPublicStore) {
  const fallback = getFallbackSticker(store);
  const stickerEmoji = String(store.buyerCardStickerEmoji ?? "").trim();

  if (stickerEmoji) {
    return {
      emoji: stickerEmoji,
      bg: fallback.bg,
      ring: fallback.ring,
    };
  }

  return fallback;
}

function getRawGallery(store: ApiPublicStore) {
  return [
    { key: "image", url: store.image },
    { key: "image2", url: store.image2 },
    { key: "image3", url: store.image3 },
    { key: "image4", url: store.image4 },
  ].filter((x) => Boolean(x.url)) as Array<{ key: string; url: string }>;
}

function getOrderedGallery(store: ApiPublicStore) {
  const raw = getRawGallery(store);
  const map = new Map(raw.map((x) => [x.key, x.url]));
  const rawOrder = String(store.buyerCardImageOrder ?? "").trim();

  if (!rawOrder) return raw.map((x) => x.url);

  const normalizedKeys = rawOrder
    .split(/[,\|\n; ]/g)
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)
    .map((token) => {
      if (token === "1" || token === "image1") return "image";
      if (token === "2" || token === "image2") return "image2";
      if (token === "3" || token === "image3") return "image3";
      if (token === "4" || token === "image4") return "image4";
      return token;
    });

  const ordered: string[] = [];

  normalizedKeys.forEach((key) => {
    const found = map.get(key);
    if (found && !ordered.includes(found)) {
      ordered.push(found);
    }
  });

  raw.forEach((item) => {
    if (!ordered.includes(item.url)) {
      ordered.push(item.url);
    }
  });

  return ordered;
}

function getStoreCardTitle(store: ApiPublicStore) {
  const t = String(store.buyerCardTitleOverride ?? "").trim();
  return t || store.name;
}

function getStoreCardSubtitle(store: ApiPublicStore) {
  const t = String(store.buyerCardSubtitleOverride ?? "").trim();
  return t || store.description || store.category;
}

function getStoreBadgeText(store: ApiPublicStore) {
  const t = String(store.buyerCardBadgeText ?? "").trim();
  return t || store.name;
}

function getStoreDistanceText(store: ApiPublicStore) {
  const t = String(store.buyerCardDistanceText ?? "").trim();
  return t || "1.5 km";
}

function getStoreRatingText(store: ApiPublicStore) {
  const t = String(store.buyerCardRatingText ?? "").trim();
  return t || "4.8";
}

function CategoryRow({
  items,
  active,
  query,
  searchOpen,
  onChange,
  onToggleSearch,
  onQueryChange,
}: {
  items: Array<{ id: string; name: string; emoji: string }>;
  active: string;
  query: string;
  searchOpen: boolean;
  onChange: (id: string) => void;
  onToggleSearch: () => void;
  onQueryChange: (value: string) => void;
}) {
  return (
    <div className="mt-1 space-y-1.5">
      <div className="no-scrollbar -mx-3 overflow-x-auto px-3">
        <div className="flex w-max items-center gap-2">
          <button
            type="button"
            onClick={onToggleSearch}
            className="relative flex h-10 w-10 flex-none items-center justify-center overflow-visible rounded-full transition active:scale-95"
            aria-label={searchOpen ? "Cerrar búsqueda" : "Abrir búsqueda"}
          >
            {searchOpen ? (
              <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-950/85 text-[18px] font-black text-white shadow-sm ring-1 ring-white/60">
                ×
              </span>
            ) : (
              <Image
                src="/branding/kronix/lupa.png"
                alt="Buscar"
                width={40}
                height={40}
                className="h-10 w-10 object-contain drop-shadow-sm"
                priority={false}
              />
            )}
          </button>

          {items.map((c) => {
            const selected = c.id === active;

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onChange(c.id)}
                className={[
                  "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[13px] transition-all shadow-sm",
                  selected
                    ? "border-slate-300 bg-white font-extrabold text-slate-900 ring-1 ring-slate-200"
                    : "border-gray-200 bg-white font-bold text-gray-600 hover:bg-gray-50",
                ].join(" ")}
              >
                <span aria-hidden="true">{c.emoji}</span>
                <span>{c.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {searchOpen ? (
        <div className="flex h-10 items-center rounded-full bg-white px-4 shadow-sm ring-1 ring-black/10">
          <span className="mr-2 text-[15px] leading-none text-slate-400">⌕</span>
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="¿Qué estás buscando?"
            className="w-full bg-transparent text-[13px] font-semibold text-slate-900 outline-none placeholder:text-slate-400"
          />
          {query ? (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              className="ml-2 text-[13px] font-black text-slate-400"
              aria-label="Limpiar búsqueda"
            >
              ×
            </button>
          ) : null}
        </div>
      ) : null}

      <style jsx>{`
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

function StoreSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="mt-1 space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
        >
          <div className="grid grid-cols-[132px_1fr]">
            <div className="h-[132px] animate-pulse bg-gray-100" />
            <div className="space-y-1 p-3">
              <div className="h-5 w-2/3 animate-pulse rounded bg-gray-100" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-gray-100" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-gray-100" />
              <div className="h-9 w-28 animate-pulse rounded-xl bg-gray-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyStores({ onClear }: { onClear: () => void }) {
  return (
    <div className="mt-1 rounded-2xl border border-gray-200 bg-white p-1 shadow-sm">
      <div className="text-sm font-extrabold text-gray-900">😕 No encontramos negocios</div>
      <div className="mt-1 text-xs text-gray-600">
        Prueba con otra palabra o limpia la búsqueda para ver todos.
      </div>

      <button
        type="button"
        onClick={onClear}
        className="mt-1 rounded-xl bg-green-600 px-1 py-1 text-xs font-extrabold text-white hover:bg-green-700"
      >
        Limpiar búsqueda
      </button>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-1 mt-1 flex items-center justify-between">
      <h2 className="text-[20px] font-extrabold tracking-tight text-green-800">{title}</h2>
      <span className="text-xl text-slate-400">›</span>
    </div>
  );
}

function StoreCard({
  store,
  config,
  featured,
}: {
  store: ApiPublicStore;
  config: ApiBuyerHomeConfig;
  featured: boolean;
}) {
  const gallery = getOrderedGallery(store);
  const main = gallery[0] || null;
  const extras = gallery.slice(1, 1 + Math.max(0, config.storeCardExtraImagesCount || 0));
  const sticker = getStoreSticker(store);
  const title = getStoreCardTitle(store);
  const subtitle = getStoreCardSubtitle(store);
  const badgeText = getStoreBadgeText(store);
  const ratingText = getStoreRatingText(store);
  const distanceText = getStoreDistanceText(store);

  const imageWidth = featured ? config.storeCardImageWidth || 140 : 132;
  const imageHeight = featured ? config.storeCardImageHeight || 150 : 140;
  const gridCols = featured ? `${imageWidth}px 1fr` : `132px 1fr`;

  const titleSize = config.storeCardTitleFontSize || 18;
  const subtitleSize = config.storeCardSubtitleFontSize || 14;
  const metaSize = config.storeCardMetaFontSize || 14;
  const radius = config.storeCardCornerRadius || 22;

  return (
    <Link
      href={`/store/${store.storeCode}`}
      className="block overflow-hidden border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
      style={{ borderRadius: `${radius}px` }}
    >
      <div style={{ display: "grid", gridTemplateColumns: gridCols }}>
        <div className="relative bg-gray-100" style={{ height: `${imageHeight}px` }}>
          {main ? (
            <Image
              src={main}
              alt={title}
              fill
              className="object-cover"
              sizes={`${imageWidth}px`}
            />
          ) : null}
        </div>

        <div className="p-2">
          {config.storeCardShowName ? (
            <div
              className="line-clamp-1 font-extrabold text-slate-900"
              style={{ fontSize: `${titleSize}px` }}
            >
              {title}
            </div>
          ) : null}

          {config.storeCardShowDescription ? (
            <div
              className="font-extrabold text-blue-900"
              style={{ fontSize: `${subtitleSize}px` }}
            >
              {subtitle}
            </div>
          ) : config.storeCardShowCategory ? (
            <div
              className="mt-1 line-clamp-1 text-slate-500"
              style={{ fontSize: `${subtitleSize}px` }}
            >
              {store.category}
            </div>
          ) : null}

          {config.storeCardShowRating || config.storeCardShowDistance ? (
            <div
              className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5"
              style={{ fontSize: `${metaSize}px` }}
            >
              {config.storeCardShowRating ? (
                <span className="font-bold text-amber-500">★ {ratingText}</span>
              ) : null}

              {config.storeCardShowRating && config.storeCardShowDistance ? (
                <span className="text-slate-400">•</span>
              ) : null}

              {config.storeCardShowDistance ? (
                <span className="font-semibold text-slate-500">{distanceText}</span>
              ) : null}
            </div>
          ) : null}

          

          {config.storeCardShowExtraImages && extras.length ? (
            <div className="mt-0 flex gap-1">
              {extras.map((img, idx) => (
                <div
                  key={`${store.storeCode}-extra-${idx}`}
                  className="relative overflow-hidden rounded-xl bg-slate-100"
                  style={{
                    width: featured ? "85px" : "85px",
                    height: featured ? "58px" : "58px",
                  }}
                >
                  <Image
                    src={img}
                    alt={`${title} ${idx + 2}`}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
              ))}
            </div>
          ) : null}          
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const { query, setQuery } = useSearch();
  const { citySlug, cityReady } = useBuyerCity();

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stores, setStores] = useState<ApiPublicStore[]>([]);
  const [categories, setCategories] = useState<CategoryTab[]>([]);
  const [config, setConfig] = useState<ApiBuyerHomeConfig | null>(null);

  const q = query.trim();

  useEffect(() => {
    if (!cityReady) {
      setIsLoading(true);
      return;
    }

    let alive = true;
    setIsLoading(true);

    publicGetBuyerHome(citySlug)
      .then((data: ApiBuyerHomeResponse) => {
        if (!alive) return;
        setStores(Array.isArray(data?.stores) ? data.stores : []);
        setCategories(mapApiCategories(Array.isArray(data?.categories) ? data.categories : []));
        setConfig(data?.config ?? null);
      })
      .catch(() => {
        if (!alive) return;
        setStores([]);
        setCategories([]);
        setConfig(null);
      })
      .finally(() => {
        if (!alive) return;
        setTimeout(() => setIsLoading(false), 350);
      });

    return () => {
      alive = false;
    };
  }, [citySlug, cityReady]);

  useEffect(() => {
    if (!cityReady) return;
    setIsLoading(true);
    const t = setTimeout(() => setIsLoading(false), 250);
    return () => clearTimeout(t);
  }, [q, activeCategory, cityReady]);

  const categoryTabs = useMemo(() => {
    const dynamic = [...categories].sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.name.localeCompare(b.name, "es");
    });

    return [
      { id: "all", slug: "all", name: "Todo", emoji: "✨", sortOrder: 0, matchTerms: "" },
      ...dynamic,
    ];
  }, [categories]);

  const filteredStores = useMemo(() => {
    const byCat =
      activeCategory === "all"
        ? stores
        : stores.filter((s) => {
            const category = categories.find((c) => c.slug === activeCategory);
            if (!category) return false;
            return storeMatchesCategory(s, category);
          });

    if (!q) return byCat;

    const qn = norm(q);

    return byCat.filter((s) => {
      const storeHay = `${s.name} ${s.description} ${s.category}`;
      return norm(storeHay).includes(qn);
    });
  }, [stores, categories, activeCategory, q]);

  const recommendedStores = useMemo(() => {
    if (!config?.showRecommended) return [];

    return filteredStores
      .filter((s) => s.isBuyerRecommended)
      .sort(
        (a, b) =>
          (Number(a.buyerRecommendedOrder) || 999999) -
          (Number(b.buyerRecommendedOrder) || 999999)
      )
      .slice(0, Math.max(0, config.recommendedMax || 0));
  }, [filteredStores, config]);

  const groupedSections = useMemo(() => {
    if (activeCategory !== "all") return [];

    return categories
      .slice()
      .sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.name.localeCompare(b.name, "es");
      })
      .map((category) => ({
        category,
        stores: stores.filter((s) => storeMatchesCategory(s, category)),
      }))
      .filter((section) => section.stores.length > 0);
  }, [categories, stores, activeCategory]);

  const handleClearSearch = () => setQuery("");

  const resolvedConfig: ApiBuyerHomeConfig = config ?? {
    id: "fallback",
    key: "HOME",
    homeBgMode: "SOLID",
    homeBgColor: "#f8fafc",
    homeBgColor2: "#eef2ff",
    showRecommended: true,
    recommendedTitle: "Recomendados",
    recommendedMax: 2,
    storeCardLayout: "FEATURED",
    storeCardShowName: true,
    storeCardShowDescription: true,
    storeCardShowCategory: false,
    storeCardShowRating: true,
    storeCardShowDistance: true,
    storeCardShowEta: true,
    storeCardShowSticker: true,
    storeCardShowExtraImages: true,
    storeCardExtraImagesCount: 3,
    storeCardShowBadge: true,
    storeCardCornerRadius: 22,
    storeCardImageWidth: 140,
    storeCardImageHeight: 150,
    storeCardTitleFontSize: 18,
    storeCardSubtitleFontSize: 14,
    storeCardMetaFontSize: 14,
    createdAt: "",
    updatedAt: "",
  };

  const pageBackgroundStyle =
    resolvedConfig.homeBgMode === "GRADIENT"
      ? {
          background: `linear-gradient(180deg, ${resolvedConfig.homeBgColor}, ${
            resolvedConfig.homeBgColor2 || resolvedConfig.homeBgColor
          })`,
        }
      : {
          backgroundColor: resolvedConfig.homeBgColor || "#f8fafc",
        };

  const useFeaturedCard = resolvedConfig.storeCardLayout === "FEATURED";

  return (
    <div className="px-3 pb-1 pt-1" style={pageBackgroundStyle}>
      <CategoryRow
        items={categoryTabs.map((c) => ({
          id: c.slug,
          name: c.name,
          emoji: c.emoji || "✨",
        }))}
        active={activeCategory}
        query={query}
        searchOpen={searchOpen}
        onChange={setActiveCategory}
        onToggleSearch={() => setSearchOpen((prev) => !prev)}
        onQueryChange={setQuery}
      />

      {activeCategory === "all" && !q ? <KronixBannerSlider /> : null}

      <div className="mt-1">
        {isLoading ? (
          <StoreSkeletonList count={3} />
        ) : filteredStores.length === 0 ? (
          <EmptyStores onClear={handleClearSearch} />
        ) : activeCategory === "all" && !q ? (
          <>
            {resolvedConfig.showRecommended && recommendedStores.length ? (
              <section>
                <SectionHeader title={resolvedConfig.recommendedTitle || "Recomendados"} />
                <div className="space-y-1">
                  {recommendedStores.map((store) => (
                    <StoreCard
                      key={store.storeCode}
                      store={store}
                      config={resolvedConfig}
                      featured={useFeaturedCard}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {groupedSections.map((section) => (
              <section key={section.category.id}>
                <SectionHeader title={section.category.name} />
                <div className="space-y-1">
                  {section.stores.map((store) => (
                    <StoreCard
                      key={store.storeCode}
                      store={store}
                      config={resolvedConfig}
                      featured={useFeaturedCard}
                    />
                  ))}
                </div>
              </section>
            ))}
          </>
        ) : (
          <section>
            <SectionHeader
              title={
                activeCategory === "all"
                  ? "Resultados"
                  : categoryTabs.find((c) => c.slug === activeCategory)?.name || "Resultados"
              }
            />
            <div className="space-y-1">
              {filteredStores.map((store) => (
                <StoreCard
                  key={store.storeCode}
                  store={store}
                  config={resolvedConfig}
                  featured={useFeaturedCard}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}