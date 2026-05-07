// components/buyer/CartContext.tsx
"use client";

import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useRef,
} from "react";
import { apiFetch } from "@/lib/api";
import { BUYER_CITY_STORAGE_KEY, CITY_CHANGED_EVENT } from "@/components/buyer/CityContext";

export type CartItem = {
  id: string;
  storeId: string;
  name: string;
  price: number;
  qty: number;
  image?: string;
  storeCode?: string;
};

type FeeSettings = {
  base_delivery: number;
  extra_store_delivery: number;
  service_fee: number;
  service_fee_percent: number;
};

const DEFAULT_FEES: FeeSettings = {
  base_delivery: 4500,
  extra_store_delivery: 3500,
  service_fee: 3000,
  service_fee_percent: 0,
};

type PublicSystemConfig = {
  key: string;
  baseDeliveryCOP: number;
  extraStoreDeliveryCOP: number;
  serviceFeeCOP?: number | null;
  serviceFeePercent?: number | null;
};

type PublicSystemPromo = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  minOrderCOP: number | null;
  maxDiscountCOP: number | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type TotalsSnapshot = {
  subtotal: number;
  shipping: number;
  serviceFee: number;
  promo: number;
  total: number;
};

type CartState = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "qty">, qty?: number) => void;
  removeItem: (id: string, storeId: string) => void;
  setQty: (id: string, storeId: string, qty: number) => void;
  clear: () => void;
  subtotal: number;
  shipping: number;
  serviceFee: number;
  promo: number;
  total: number;
  getTotalsSnapshot: () => TotalsSnapshot;
};

type CartStoragePayload = {
  citySlug: string;
  items: CartItem[];
  updatedAt: number;
};

type BuyerCityStorage = {
  id?: string;
  slug: string;
  name: string;
  department: string;
  country: string;
  isActive?: boolean;
  isFeatured?: boolean;
};

const CartContext = createContext<CartState | null>(null);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider />");
  return ctx;
}

const LEGACY_STORAGE_KEY = "kronix:cart:v2";
const STORAGE_KEY_PREFIX = "kronix:cart:v3:";
const DEFAULT_CITY_SLUG = "san-gil";

function getStorageKey(citySlug: string) {
  return `${STORAGE_KEY_PREFIX}${citySlug}`;
}

function looksLikeStoreCode(v: string) {
  const s = String(v ?? "").trim();
  if (!s) return false;
  return /^\d+$/.test(s);
}

function isPromoCurrentlyActive(promo: PublicSystemPromo) {
  if (!promo?.isActive) return false;

  const now = Date.now();

  if (promo.startsAt) {
    const starts = Date.parse(promo.startsAt);
    if (Number.isFinite(starts) && now < starts) return false;
  }

  if (promo.endsAt) {
    const ends = Date.parse(promo.endsAt);
    if (Number.isFinite(ends) && now > ends) return false;
  }

  return true;
}

function withCitySlug(path: string, citySlug?: string) {
  if (!citySlug) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}citySlug=${encodeURIComponent(citySlug)}`;
}

function getCurrentBuyerCitySlug() {
  try {
    const raw = localStorage.getItem(BUYER_CITY_STORAGE_KEY);
    if (!raw) return DEFAULT_CITY_SLUG;

    const parsed = JSON.parse(raw) as Partial<BuyerCityStorage>;
    const slug = String(parsed?.slug ?? "").trim().toLowerCase();
    return slug || DEFAULT_CITY_SLUG;
  } catch {
    return DEFAULT_CITY_SLUG;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [citySlug, setCitySlug] = useState<string>(DEFAULT_CITY_SLUG);
  const [items, setItems] = useState<CartItem[]>([]);
  const [fees, setFees] = useState<FeeSettings>(DEFAULT_FEES);
  const [promos, setPromos] = useState<PublicSystemPromo[]>([]);

  const migrationRanForCityRef = useRef<string | null>(null);
  const loadedCityRef = useRef<string | null>(null);

  useEffect(() => {
    const syncCity = () => {
      const nextSlug = getCurrentBuyerCitySlug();
      setCitySlug((prev) => {
        if (prev === nextSlug) return prev;
        return nextSlug;
      });
    };

    syncCity();

    const onFocus = () => syncCity();

    const onCityChanged = (event: Event) => {
      const detail = (event as CustomEvent<BuyerCityStorage>)?.detail;
      const nextSlug = String(detail?.slug ?? "").trim().toLowerCase() || getCurrentBuyerCitySlug();
      setCitySlug(nextSlug);
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener(CITY_CHANGED_EVENT, onCityChanged as EventListener);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(CITY_CHANGED_EVENT, onCityChanged as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!citySlug) return;

    setHydrated(false);
    setItems([]);
    setFees(DEFAULT_FEES);
    setPromos([]);
    loadedCityRef.current = null;

    try {
      const key = getStorageKey(citySlug);
      const raw = localStorage.getItem(key);

      if (raw) {
        const parsed = JSON.parse(raw) as CartStoragePayload | CartItem[];
        if (Array.isArray(parsed)) {
          setItems(parsed);
        } else if (Array.isArray(parsed?.items)) {
          setItems(parsed.items);
        } else {
          setItems([]);
        }
      } else {
        const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacyRaw) {
          try {
            const legacyParsed = JSON.parse(legacyRaw) as CartItem[];
            if (Array.isArray(legacyParsed)) {
              setItems(legacyParsed);
              localStorage.setItem(
                key,
                JSON.stringify({
                  citySlug,
                  items: legacyParsed,
                  updatedAt: Date.now(),
                } satisfies CartStoragePayload)
              );
              localStorage.removeItem(LEGACY_STORAGE_KEY);
            } else {
              setItems([]);
            }
          } catch {
            setItems([]);
          }
        } else {
          setItems([]);
        }
      }
    } catch {
      setItems([]);
    } finally {
      loadedCityRef.current = citySlug;
      setHydrated(true);
    }
  }, [citySlug]);

  useEffect(() => {
    if (!citySlug) return;

    let cancelled = false;

    async function loadSystemData() {
      try {
        const [config, promosRes] = await Promise.all([
          apiFetch<PublicSystemConfig>(withCitySlug("/public/system/config", citySlug), {
            suppressSessionExpiredEvent: true,
          }),
          apiFetch<PublicSystemPromo[]>(withCitySlug("/public/system/promos", citySlug), {
            suppressSessionExpiredEvent: true,
          }),
        ]);

        if (cancelled) return;

        const baseDelivery = Number(config?.baseDeliveryCOP);
        const extraStoreDelivery = Number(config?.extraStoreDeliveryCOP);
        const serviceFeeFixed = Number(config?.serviceFeeCOP ?? 0);
        const serviceFeePercent = Number(config?.serviceFeePercent ?? 0);

        setFees({
          base_delivery: Number.isFinite(baseDelivery)
            ? baseDelivery
            : DEFAULT_FEES.base_delivery,
          extra_store_delivery: Number.isFinite(extraStoreDelivery)
            ? extraStoreDelivery
            : DEFAULT_FEES.extra_store_delivery,
          service_fee: Number.isFinite(serviceFeeFixed)
            ? serviceFeeFixed
            : DEFAULT_FEES.service_fee,
          service_fee_percent: Number.isFinite(serviceFeePercent)
            ? serviceFeePercent
            : DEFAULT_FEES.service_fee_percent,
        });

        setPromos(Array.isArray(promosRes) ? promosRes : []);
      } catch {
        if (cancelled) return;
        setFees(DEFAULT_FEES);
        setPromos([]);
      }
    }

    loadSystemData();

    return () => {
      cancelled = true;
    };
  }, [citySlug]);

  useEffect(() => {
    if (!hydrated || !citySlug) return;
    if (migrationRanForCityRef.current === citySlug) return;

    const legacyCodes = Array.from(
      new Set(
        items
          .map((it) => String(it.storeId))
          .filter((sid) => looksLikeStoreCode(sid))
      )
    );

    if (legacyCodes.length === 0) {
      migrationRanForCityRef.current = citySlug;
      return;
    }

    migrationRanForCityRef.current = citySlug;

    (async () => {
      try {
        const mapCodeToId = new Map<string, string>();

        for (const code of legacyCodes) {
          try {
            const s = await apiFetch<any>(
              withCitySlug(`/public/stores/by-code/${encodeURIComponent(code)}`, citySlug),
              {
                suppressSessionExpiredEvent: true,
              }
            );
            const realId = String(s?.id ?? "").trim();
            if (realId) mapCodeToId.set(code, realId);
          } catch {
            // ignore
          }
        }

        if (mapCodeToId.size === 0) return;

        setItems((prev) =>
          prev.map((it) => {
            const sid = String(it.storeId).trim();
            if (!looksLikeStoreCode(sid)) return it;

            const realId = mapCodeToId.get(sid);
            if (!realId) return it;

            return { ...it, storeId: realId, storeCode: sid };
          })
        );
      } catch {
        // ignore
      }
    })();
  }, [hydrated, items, citySlug]);

  useEffect(() => {
    if (!hydrated || !citySlug) return;
    if (loadedCityRef.current !== citySlug) return;

    try {
      localStorage.setItem(
        getStorageKey(citySlug),
        JSON.stringify({
          citySlug,
          items,
          updatedAt: Date.now(),
        } satisfies CartStoragePayload)
      );
    } catch {
      // ignore
    }
  }, [items, hydrated, citySlug]);

  const addItem: CartState["addItem"] = (item, qty = 1) => {
    setItems((prev) => {
      const found = prev.find(
        (p) => p.id === item.id && p.storeId === item.storeId
      );

      if (found) {
        return prev.map((p) => {
          if (p.id === item.id && p.storeId === item.storeId) {
            return {
              ...p,
              qty: p.qty + qty,
              image: p.image ?? item.image,
              storeCode: p.storeCode ?? item.storeCode,
            };
          }
          return p;
        });
      }

      return [...prev, { ...item, qty }];
    });
  };

  const removeItem: CartState["removeItem"] = (id, storeId) => {
    setItems((prev) =>
      prev.filter((p) => !(p.id === id && p.storeId === storeId))
    );
  };

  const setQty: CartState["setQty"] = (id, storeId, qty) => {
    setItems((prev) =>
      prev
        .map((p) => (p.id === id && p.storeId === storeId ? { ...p, qty } : p))
        .filter((p) => p.qty > 0)
    );
  };

  const clear = () => setItems([]);

  const subtotal = useMemo(
    () => items.reduce((acc, p) => acc + p.price * p.qty, 0),
    [items]
  );

  const storeCount = useMemo(() => {
    const set = new Set(items.map((i) => i.storeId));
    return set.size;
  }, [items]);

  const shipping = useMemo(() => {
    if (storeCount <= 0) return 0;
    return (
      fees.base_delivery +
      Math.max(0, storeCount - 1) * fees.extra_store_delivery
    );
  }, [storeCount, fees.base_delivery, fees.extra_store_delivery]);

  const serviceFee = useMemo(() => {
    if (subtotal <= 0) return 0;

    const fixedFee = Math.max(0, Math.round(Number(fees.service_fee || 0)));

    const rawPercent = Number(fees.service_fee_percent || 0);
    const normalizedPercent = rawPercent > 1 ? rawPercent / 100 : rawPercent;
    const percentFee =
      normalizedPercent > 0
        ? Math.max(0, Math.round(subtotal * normalizedPercent))
        : 0;

    return fixedFee + percentFee;
  }, [subtotal, fees.service_fee, fees.service_fee_percent]);

  const promo = useMemo(() => {
    if (subtotal <= 0) return 0;

    const activePromos = promos.filter(isPromoCurrentlyActive);
    if (!activePromos.length) return 0;

    let bestDiscount = 0;

    for (const promoItem of activePromos) {
      const minOrder = Number(promoItem.minOrderCOP ?? 0);
      if (subtotal < minOrder) continue;

      let discount = 0;

      if (promoItem.discountType === "PERCENT") {
        const rawPercent = Number(promoItem.discountValue || 0);
        const normalizedPercent = rawPercent > 1 ? rawPercent / 100 : rawPercent;
        discount = Math.round(subtotal * normalizedPercent);
      } else {
        discount = Math.round(Number(promoItem.discountValue || 0));
      }

      if (promoItem.maxDiscountCOP != null) {
        discount = Math.min(discount, Number(promoItem.maxDiscountCOP));
      }

      discount = Math.max(0, Math.min(subtotal, discount));

      if (discount > bestDiscount) {
        bestDiscount = discount;
      }
    }

    return bestDiscount;
  }, [subtotal, promos]);

  const total = Math.max(0, subtotal + shipping + serviceFee - promo);

  const getTotalsSnapshot = () => ({
    subtotal,
    shipping,
    serviceFee,
    promo,
    total,
  });

  const value: CartState = {
    items,
    addItem,
    removeItem,
    setQty,
    clear,
    subtotal,
    shipping,
    serviceFee,
    promo,
    total,
    getTotalsSnapshot,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}