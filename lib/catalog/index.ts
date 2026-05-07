// lib/catalog/index.ts
import { parseCSV, toBool01, toNum } from "./csv";

export type StoreCategory =
  | "restaurants"
  | "supermarkets"
  | "pharmacy"
  | "bakery"
  | "retail"
  | string;

export type Store = {
  store_id: string;
  name: string;
  category: StoreCategory;
  desc: string;
  eta_min: number;
  eta_max: number;
  image: string;
  is_active: boolean;

  // 🔹 NUEVO — datos operativos reales
  address: string;
  lat: number;
  lng: number;
  hrOp: string;
  hrCl: string;
};

export type Product = {
  product_id: string;
  store_id: string;
  name: string;
  desc: string;
  price_cop: number;
  image: string;
  is_available: boolean;
};

export type PromoActionType = "STORE" | "CATEGORY" | "SEARCH";

export type Promo = {
  promo_id: string;
  title: string;
  subtitle: string;
  image: string;
  action_type: PromoActionType;
  action_value: string;
  badge: string;
  is_active: boolean;
};

export type Banner = {
  banner_id: string;
  title: string;
  subtitle: string;
  image: string;
  action_type?: "STORE" | "CATEGORY" | "SEARCH" | "";
  action_value?: string;
  is_active?: number;
};

async function fetchText(path: string) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`No se pudo cargar ${path}`);
  return res.text();
}

export async function loadStores(): Promise<Store[]> {
  const rows = parseCSV(await fetchText("/data/stores.csv"));

  return rows
    .map((r) => ({
      store_id: r.store_id,
      name: r.name,
      category: r.category,
      desc: r.desc,
      eta_min: toNum(r.eta_min),
      eta_max: toNum(r.eta_max),
      image: r.image,
      is_active: toBool01(r.is_active),

      // 🔹 NUEVO — parsing seguro
      address: r.address,
      lat: toNum(r.lat),
      lng: toNum(r.lng),
      hrOp: r.hrOp,
      hrCl: r.hrCl,
    }))
    .filter(
      (s) =>
        s.store_id &&
        s.is_active &&
        !Number.isNaN(s.lat) &&
        !Number.isNaN(s.lng)
    );
}

export async function loadProducts(): Promise<Product[]> {
  const rows = parseCSV(await fetchText("/data/products.csv"));
  return rows
    .map((r) => ({
      product_id: r.product_id,
      store_id: r.store_id,
      name: r.name,
      desc: r.desc,
      price_cop: toNum(r.price_cop),
      image: r.image,
      is_available: toBool01(r.is_available),
    }))
    .filter((p) => p.product_id && p.store_id && p.is_available);
}

export async function loadPromos(): Promise<Promo[]> {
  const rows = parseCSV(await fetchText("/data/promos.csv"));
  return rows
    .map((r) => ({
      promo_id: r.promo_id,
      title: r.title,
      subtitle: r.subtitle,
      image: r.image,
      action_type: (r.action_type as PromoActionType) ?? "CATEGORY",
      action_value: r.action_value,
      badge: r.badge ?? "",
      is_active: toBool01(r.is_active),
    }))
    .filter((p) => p.promo_id && p.is_active);
}

export async function loadBanners(): Promise<Banner[]> {
  const rows = parseCSV(await fetchText("/data/banners.csv"));
  return rows
    .map((r) => ({
      banner_id: r.banner_id,
      title: r.title,
      subtitle: r.subtitle,
      image: r.image,
      action_type: (r.action_type as PromoActionType) ?? "CATEGORY",
      action_value: r.action_value,
      is_active: toBool01(r.is_active) ? 1 : 0,
    }))
    .filter((b) => b.banner_id && b.is_active);
}

export async function loadCatalog() {
  const [stores, products, promos, banners] = await Promise.all([
    loadStores(),
    loadProducts(),
    loadPromos(),
    loadBanners(),
  ]);

  const storeById = new Map(stores.map((s) => [s.store_id, s] as const));

  const productsByStore = new Map<string, Product[]>();
  for (const p of products) {
    if (!storeById.has(p.store_id)) continue;
    const arr = productsByStore.get(p.store_id) ?? [];
    arr.push(p);
    productsByStore.set(p.store_id, arr);
  }

  return { stores, products, promos, banners, storeById, productsByStore };
}
