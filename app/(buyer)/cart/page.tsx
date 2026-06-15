// app/(buyer)/cart/page.tsx
"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/buyer/CartContext";
import { addOrder, type PaymentMethod } from "@/components/buyer/OrdersStorage";
import { geocodeAddressOSMInCity } from "@/lib/geocode";
import { getCurrentBuyerId } from "@/lib/session";
import { apiFetch } from "@/lib/api";
import AuthRequiredModal from "@/components/buyer/AuthRequiredModal";
import { useAuth } from "@/components/buyer/useAuth";
import { useBuyerCity } from "@/components/buyer/CityContext";

const DEFAULT_CUSTOMER_PHONE = "3113868898";

function formatCOP(value: number) {
  return value.toLocaleString("es-CO", { style: "currency", currency: "COP" });
}

function safeFormatCOP(value: number, mounted: boolean) {
  return mounted ? formatCOP(value) : "$ 0";
}

function clampDigitsOnly(raw: string) {
  return raw.replace(/[^\d]/g, "");
}

function isLikelyStoreCode(value: string) {
  return /^\d+$/.test(String(value || "").trim());
}

function getCheckoutStorageKey(citySlug: string) {
  return `kronix:checkout:v2:${citySlug}`;
}

function buildDropoffAddress(address: string, addressExtra: string) {
  const a = String(address ?? "").trim();
  const ax = String(addressExtra ?? "").trim();
  return ax ? `${a}, ${ax}` : a;
}

function buildGeocodeKey(dropoffAddress: string, cityGeoLabel: string) {
  return `${String(dropoffAddress ?? "").trim()} | ${String(cityGeoLabel ?? "").trim()}`;
}

function EmptyCart({ onGoHome }: { onGoHome: () => void }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-extrabold text-gray-900">🛒 Tu carrito está vacío</div>
      <div className="mt-1 text-xs text-gray-600">
        Explora negocios cercanos y agrega productos para continuar.
      </div>

      <button
        type="button"
        onClick={onGoHome}
        className="mt-3 rounded-xl bg-green-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-green-700"
      >
        Explorar tiendas
      </button>
    </div>
  );
}

type ApiStorePublic = {
  id: string;
  storeCode: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  image: string | null;
  category: string;
  description: string;
  etaMin: number;
  etaMax: number;
  city?: {
    id: string;
    slug: string;
    name: string;
    department: string;
    country: string;
  } | null;
};

type CartUiItem = {
  id: string;
  storeId: string;
  storeCode?: string;
  name: string;
  price: number;
  qty: number;
  image?: string;
};

type StoreGroup = {
  groupKey: string;
  storeId: string;
  storeCode?: string;
  store: ApiStorePublic | null;
  items: CartUiItem[];
  subtotal: number;
};

type TipPreset = "P1" | "P2" | "P5" | "OTHER" | null;

type SavedAddressItem = {
  id: string;
  cityId?: string | null;
  label?: string | null;
  placeName?: string | null;
  reference?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  address: string;
  lat?: number | null;
  lng?: number | null;
  isDefault: boolean;
  isFavorite?: boolean;
  usageCount?: number;
  lastUsedAt?: string | null;
  updatedAt: string;
};

type CheckoutStoragePayload = {
  citySlug: string;
  address?: string;
  addressExtra?: string;
  tipEnabled?: boolean;
  tipPreset?: TipPreset;
  tipCOP?: number;
  note?: string;
  deliveryLat?: number;
  deliveryLng?: number;
  lastGeocodeKey?: string;
};

type StoreZoneCalculation = {
  city: {
    slug: string;
    name: string;
    department: string;
  };
  serviceType: "STORE";
  zone: {
    id: string | null;
    zoneNumber: number;
    name: string;
    isNegotiable: boolean;
    isInsideCoverage: boolean;
  };
  pricing: {
    baseServiceCOP: number;
    zoneFeeCOP: number;
    serviceFeeCOP: number;
    totalCOP: number;
  };
  message?: string;
};

async function fetchStoreForCartItem(
  item: { storeId?: string; storeCode?: string },
  citySlug?: string
) {
  const rawStoreId = String(item.storeId ?? "").trim();
  const rawStoreCode = String(item.storeCode ?? "").trim();

  if (!rawStoreId && !rawStoreCode) return null;

  const attempts: Array<() => Promise<ApiStorePublic>> = [];

  const withCitySlug = (path: string) => {
    if (!citySlug) return path;
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}citySlug=${encodeURIComponent(citySlug)}`;
  };

  if (rawStoreId && !isLikelyStoreCode(rawStoreId)) {
    attempts.push(() =>
      apiFetch<ApiStorePublic>(withCitySlug(`/public/stores/by-id/${encodeURIComponent(rawStoreId)}`), {
        method: "GET",
        suppressSessionExpiredEvent: true,
      })
    );
  }

  if (rawStoreCode) {
    attempts.push(() =>
      apiFetch<ApiStorePublic>(withCitySlug(`/public/stores/by-code/${encodeURIComponent(rawStoreCode)}`), {
        method: "GET",
        suppressSessionExpiredEvent: true,
      })
    );
  }

  if (rawStoreId && isLikelyStoreCode(rawStoreId)) {
    attempts.push(() =>
      apiFetch<ApiStorePublic>(withCitySlug(`/public/stores/by-code/${encodeURIComponent(rawStoreId)}`), {
        method: "GET",
        suppressSessionExpiredEvent: true,
      })
    );
  }

  for (const attempt of attempts) {
    try {
      const store = await attempt();
      if (store?.id) return store;
    } catch {}
  }

  return null;
}

function getSavedAddressLabel(item: SavedAddressItem) {
  const label = String(item.label ?? "").trim();
  const placeName = String(item.placeName ?? "").trim();

  if (label && placeName) return `${label} · ${placeName}`;
  if (label) return label;
  if (placeName) return placeName;

  return "Dirección guardada";
}

function getSavedAddressBadge(item: SavedAddressItem) {
  if (item.isDefault) return "🏠 Predeterminada";
  if (item.isFavorite) return "❤️ Favorita";
  return "🕘 Reciente";
}

function sortSavedAddresses(items: SavedAddressItem[]) {
  return [...items].sort((a, b) => {
    const aDefault = a.isDefault ? 1 : 0;
    const bDefault = b.isDefault ? 1 : 0;
    if (aDefault !== bDefault) return bDefault - aDefault;

    const aFav = a.isFavorite ? 1 : 0;
    const bFav = b.isFavorite ? 1 : 0;
    if (aFav !== bFav) return bFav - aFav;

    const aUsage = Number(a.usageCount ?? 0);
    const bUsage = Number(b.usageCount ?? 0);
    if (aUsage !== bUsage) return bUsage - aUsage;

    const aTime = Date.parse(String(a.lastUsedAt ?? a.updatedAt ?? ""));
    const bTime = Date.parse(String(b.lastUsedAt ?? b.updatedAt ?? ""));
    return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
  });
}

export default function CartPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { citySlug, cityGeoLabel, cityLabel, cityReady } = useBuyerCity();
  const { items, setQty, removeItem, clear, subtotal, shipping, serviceFee, promo } = useCart();
  const router = useRouter();
  const { isLoading: authLoading, isAuthed } = useAuth();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authNext, setAuthNext] = useState("/cart");

  const requireLogin = (nextPath: string) => {
    setAuthNext(nextPath);
    setShowAuthModal(true);
  };

  const [deliveryLat, setDeliveryLat] = useState<number | null>(null);
  const [deliveryLng, setDeliveryLng] = useState<number | null>(null);
  const [lastGeocodeKey, setLastGeocodeKey] = useState<string>("");

  const [address, setAddress] = useState("");
  const [addressExtra, setAddressExtra] = useState("");

  const [savedAddresses, setSavedAddresses] = useState<SavedAddressItem[]>([]);
  const [savedAddressesLoading, setSavedAddressesLoading] = useState(false);
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState("");

  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const paymentMethod: PaymentMethod = "NEQUI";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [zoneLoading, setZoneLoading] = useState(false);
  const [zoneError, setZoneError] = useState<string | null>(null);
  const [storeZoneCalc, setStoreZoneCalc] = useState<StoreZoneCalculation | null>(null);
  const [showOutOfCoverageModal, setShowOutOfCoverageModal] = useState(false);

  const [tipEnabled, setTipEnabled] = useState(false);
  const [tipPreset, setTipPreset] = useState<TipPreset>(null);
  const [tipInput, setTipInput] = useState("");

  const [note, setNote] = useState("");

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);

  const [tmpAddress, setTmpAddress] = useState("");
  const [tmpAddressExtra, setTmpAddressExtra] = useState("");
  const [tmpNote, setTmpNote] = useState("");

  const [storesByGroupKey, setStoresByGroupKey] = useState<Map<string, ApiStorePublic>>(new Map());

  const restoredCheckoutForCityRef = useRef<string | null>(null);
  const hydratedServerAddressRef = useRef<string | null>(null);

  const sortedSavedAddresses = useMemo(
    () => sortSavedAddresses(savedAddresses),
    [savedAddresses]
  );

  function clearDeliveryGeo() {
    setDeliveryLat(null);
    setDeliveryLng(null);
    setLastGeocodeKey("");
  }

  function applySavedAddress(item: SavedAddressItem) {
    const nextAddress = String(item.address ?? "").trim();
    const nextExtra = String(item.reference ?? "").trim();
    const nextDropoff = buildDropoffAddress(nextAddress, nextExtra);

    if (!nextAddress) return;

    setSelectedSavedAddressId(item.id);
    setAddress(nextAddress);
    setAddressExtra(nextExtra);
    setGeoError(null);
    setError(null);
    setZoneError(null);
    if (
      typeof item.lat === "number" &&
      typeof item.lng === "number" &&
      Number.isFinite(item.lat) &&
      Number.isFinite(item.lng)
    ) {
      setDeliveryLat(item.lat);
      setDeliveryLng(item.lng);
      setLastGeocodeKey(buildGeocodeKey(nextDropoff, cityGeoLabel));
    } else {
      clearDeliveryGeo();
    }
  }

  useEffect(() => {
    if (!cityReady || !citySlug) return;

    let alive = true;

    (async () => {
      try {
        const rawItems = (items as any[]).map((it) => ({
          groupKey: String(it.storeCode ?? it.storeId ?? "").trim(),
          storeId: String(it.storeId ?? "").trim(),
          storeCode: String(it.storeCode ?? "").trim(),
        }));

        const uniqueRefs = Array.from(
          new Map(rawItems.filter((it) => it.groupKey).map((it) => [it.groupKey, it])).values()
        );

        if (!uniqueRefs.length) {
          if (!alive) return;
          setStoresByGroupKey(new Map());
          return;
        }

        const results = await Promise.all(
          uniqueRefs.map(async (ref) => {
            const store = await fetchStoreForCartItem(
              {
                storeId: ref.storeId,
                storeCode: ref.storeCode,
              },
              citySlug
            );

            if (!store) {
              console.error(
                "No se pudo cargar store del carrito:",
                JSON.stringify({ storeId: ref.storeId, storeCode: ref.storeCode, citySlug })
              );
              return null;
            }

            return { key: ref.groupKey, store };
          })
        );

        const map = new Map<string, ApiStorePublic>();
        for (const row of results) {
          if (!row?.key || !row.store) continue;
          map.set(row.key, row.store);
        }

        if (!alive) return;
        setStoresByGroupKey(map);
      } catch (e: any) {
        console.error("Error cargando stores del carrito:", e?.message || e);
        if (!alive) return;
        setStoresByGroupKey(new Map());
      }
    })();

    return () => {
      alive = false;
    };
  }, [items, citySlug, cityReady]);

  useEffect(() => {
    if (!cityReady || !citySlug) return;
    if (authLoading || !isAuthed) {
      setSavedAddresses([]);
      setSavedAddressesLoading(false);
      return;
    }

    let alive = true;

    setSavedAddressesLoading(true);

    (async () => {
      try {
        const list = await apiFetch<SavedAddressItem[]>(
          `/users/me/addresses?citySlug=${encodeURIComponent(citySlug)}`,
          {
            method: "GET",
            suppressSessionExpiredEvent: true,
          }
        );

        if (!alive) return;

        const rows = Array.isArray(list) ? sortSavedAddresses(list) : [];
        setSavedAddresses(rows);

        const currentClean = String(address ?? "").trim();

        if (!currentClean && restoredCheckoutForCityRef.current === citySlug) {
          const preferred = rows.find((x) => x.isDefault) ?? rows[0] ?? null;
          if (preferred) applySavedAddress(preferred);
        }
      } catch {
        if (!alive) return;
        setSavedAddresses([]);
      } finally {
        if (!alive) return;
        setSavedAddressesLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityReady, citySlug, authLoading, isAuthed]);

  useEffect(() => {
    if (!cityReady || !citySlug) return;
    if (restoredCheckoutForCityRef.current === citySlug) return;

    try {
      const raw = localStorage.getItem(getCheckoutStorageKey(citySlug));
      if (!raw) {
        setAddress("");
        setAddressExtra("");
        setTipEnabled(false);
        setTipPreset(null);
        setTipInput("");
        setNote("");
        setDeliveryLat(null);
        setDeliveryLng(null);
        setLastGeocodeKey("");
        restoredCheckoutForCityRef.current = citySlug;
        return;
      }

      const parsed = JSON.parse(raw) as CheckoutStoragePayload;

      setAddress(parsed.address ?? "");
      setAddressExtra(parsed.addressExtra ?? "");
      setTipEnabled(typeof parsed.tipEnabled === "boolean" ? parsed.tipEnabled : false);
      setTipPreset(parsed.tipPreset ?? null);
      setTipInput(typeof parsed.tipCOP === "number" && parsed.tipCOP > 0 ? String(parsed.tipCOP) : "");
      setNote(typeof parsed.note === "string" ? parsed.note.slice(0, 150) : "");
      setDeliveryLat(typeof parsed.deliveryLat === "number" ? parsed.deliveryLat : null);
      setDeliveryLng(typeof parsed.deliveryLng === "number" ? parsed.deliveryLng : null);
      setLastGeocodeKey(String(parsed.lastGeocodeKey ?? "").trim());

      restoredCheckoutForCityRef.current = citySlug;
    } catch {
      setAddress("");
      setAddressExtra("");
      setTipEnabled(false);
      setTipPreset(null);
      setTipInput("");
      setNote("");
      setDeliveryLat(null);
      setDeliveryLng(null);
      setLastGeocodeKey("");
      restoredCheckoutForCityRef.current = citySlug;
    }
  }, [cityReady, citySlug]);

  useEffect(() => {
    if (!cityReady || !citySlug) return;
    if (authLoading || !isAuthed) return;
    if (restoredCheckoutForCityRef.current !== citySlug) return;

    if (hydratedServerAddressRef.current === citySlug) return;

    if (String(address ?? "").trim()) {
      hydratedServerAddressRef.current = citySlug;
      return;
    }

    const preferred = sortedSavedAddresses.find((x) => x.isDefault) ?? sortedSavedAddresses[0] ?? null;

    if (preferred) {
      applySavedAddress(preferred);
    }

    hydratedServerAddressRef.current = citySlug;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityReady, citySlug, authLoading, isAuthed, address, sortedSavedAddresses.length]);

  useEffect(() => {
    if (!cityReady || !citySlug) return;

    try {
      localStorage.setItem(
        getCheckoutStorageKey(citySlug),
        JSON.stringify({
          citySlug,
          address,
          addressExtra,
          tipEnabled,
          tipPreset,
          tipCOP: tipEnabled ? Number(tipInput || 0) : 0,
          note: note.slice(0, 150),
          deliveryLat: deliveryLat ?? undefined,
          deliveryLng: deliveryLng ?? undefined,
          lastGeocodeKey: lastGeocodeKey || undefined,
        } satisfies CheckoutStoragePayload)
      );
    } catch {}
  }, [
    cityReady,
    citySlug,
    address,
    addressExtra,
    tipEnabled,
    tipPreset,
    tipInput,
    note,
    deliveryLat,
    deliveryLng,
    lastGeocodeKey,
  ]);

  const currentDropoffAddress = useMemo(
    () => buildDropoffAddress(address, addressExtra),
    [address, addressExtra]
  );

  const currentGeocodeKey = useMemo(
    () => buildGeocodeKey(currentDropoffAddress, cityGeoLabel),
    [currentDropoffAddress, cityGeoLabel]
  );

  async function calculateStoreZoneForPoint(params: {
    lat: number;
    lng: number;
    silent?: boolean;
  }) {
    if (!citySlug) return null;

    const lat = Number(params.lat);
    const lng = Number(params.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    if (!params.silent) {
      setZoneLoading(true);
      setZoneError(null);
    }

    try {
      const res = await apiFetch<StoreZoneCalculation>("/courier/zones/calculate", {
        method: "POST",
        suppressSessionExpiredEvent: true,
        json: {
          citySlug,
          serviceType: "STORE",
          points: [
            {
              lat,
              lng,
              label: "Entrega",
              address: currentDropoffAddress,
            },
          ],
          tipCOP: 0,
        },
      });

      setStoreZoneCalc(res);

      if (res?.zone?.isInsideCoverage === false || Number(res?.zone?.zoneNumber) === 5) {
        setShowOutOfCoverageModal(true);
      }

      return res;
    } catch (e: any) {
      setStoreZoneCalc(null);
      setZoneError(e?.message || "No pudimos calcular la zona de entrega.");
      return null;
    } finally {
      if (!params.silent) setZoneLoading(false);
    }
  }

  const grouped: StoreGroup[] = useMemo(() => {
    const map = new Map<string, StoreGroup>();

    for (const raw of items as any[]) {
      const item: CartUiItem = {
        id: String(raw.id),
        storeId: String(raw.storeId ?? "").trim(),
        storeCode: String(raw.storeCode ?? "").trim() || undefined,
        name: String(raw.name),
        price: Number(raw.price),
        qty: Number(raw.qty),
        image: raw.image ? String(raw.image) : undefined,
      };

      const groupKey = String(item.storeCode ?? item.storeId ?? "").trim();
      if (!groupKey) continue;

      const g =
        map.get(groupKey) ??
        ({
          groupKey,
          storeId: item.storeId,
          storeCode: item.storeCode,
          store: storesByGroupKey.get(groupKey) ?? null,
          items: [],
          subtotal: 0,
        } as StoreGroup);

      g.store = storesByGroupKey.get(groupKey) ?? g.store ?? null;
      g.items.push(item);
      g.subtotal += item.price * item.qty;
      map.set(groupKey, g);
    }

    return Array.from(map.values());
  }, [items, storesByGroupKey]);

  const tipCOP = tipEnabled ? Number(tipInput || 0) : 0;

  const zoneBaseDeliveryCOP = Number(storeZoneCalc?.pricing?.baseServiceCOP ?? shipping);
  const zoneIncrementCOP = Number(storeZoneCalc?.pricing?.zoneFeeCOP ?? 0);
  const zoneDeliveryCOP = zoneBaseDeliveryCOP + zoneIncrementCOP;
  const zoneServiceFeeCOP = Number(storeZoneCalc?.pricing?.serviceFeeCOP ?? serviceFee);

  const totalWithTip = useMemo(() => {
    const t = Number.isFinite(tipCOP) ? tipCOP : 0;

    return Math.max(
      0,
      Math.round(
        Number(subtotal || 0) +
          Number(zoneDeliveryCOP || 0) +
          Number(zoneServiceFeeCOP || 0) -
          Number(promo || 0) +
          (t > 0 ? t : 0)
      )
    );
  }, [subtotal, zoneDeliveryCOP, zoneServiceFeeCOP, promo, tipCOP]);

  useEffect(() => {
    if (!cityReady || !citySlug) return;

    if (
      typeof deliveryLat !== "number" ||
      typeof deliveryLng !== "number" ||
      !Number.isFinite(deliveryLat) ||
      !Number.isFinite(deliveryLng)
    ) {
      setStoreZoneCalc(null);
      setZoneError(null);
      return;
    }

    calculateStoreZoneForPoint({
      lat: deliveryLat,
      lng: deliveryLng,
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityReady, citySlug, deliveryLat, deliveryLng]);

  useEffect(() => {
    if (!cityReady || !citySlug) return;

    const cleanAddress = String(currentDropoffAddress ?? "").trim();

    if (cleanAddress.length < 6) {
      setStoreZoneCalc(null);
      setZoneError(null);
      return;
    }

    if (
      typeof deliveryLat === "number" &&
      typeof deliveryLng === "number" &&
      lastGeocodeKey === currentGeocodeKey
    ) {
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        setZoneLoading(true);
        setZoneError(null);

        const geo = await geocodeAddressOSMInCity(cleanAddress, cityGeoLabel);

        if (!geo) {
          setStoreZoneCalc(null);
          setZoneError("No pudimos ubicar esta dirección para calcular la zona.");
          return;
        }

        setDeliveryLat(geo.lat);
        setDeliveryLng(geo.lng);
        setLastGeocodeKey(currentGeocodeKey);
      } catch {
        setStoreZoneCalc(null);
        setZoneError("No pudimos calcular la zona de esta dirección.");
      } finally {
        setZoneLoading(false);
      }
    }, 900);

    return () => window.clearTimeout(timer);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGeocodeKey, cityReady, citySlug]);

  const isOutOfCoverage =
    storeZoneCalc?.zone?.isInsideCoverage === false ||
    Number(storeZoneCalc?.zone?.zoneNumber) === 5;

  const canConfirm =
    cityReady &&
    items.length > 0 &&
    address.trim().length > 5 &&
    !isSubmitting &&
    !zoneLoading &&
    !isOutOfCoverage;

  const applyTipPercent = (pct: number) => {
    const base = Number(subtotal || 0);
    const computed = Math.round((base * pct) / 100);
    setTipEnabled(true);
    setTipPreset(pct === 1 ? "P1" : pct === 2 ? "P2" : "P5");
    setTipInput(String(Math.max(0, computed)));
  };

  function updateDeliveryAddress(value: string) {
    setAddress(value);
    setSelectedSavedAddressId("");
    clearDeliveryGeo();
    setGeoError(null);
    setError(null);
  }

  function updateDeliveryExtra(value: string) {
    setAddressExtra(value);
    setSelectedSavedAddressId("");
    clearDeliveryGeo();
    setGeoError(null);
    setError(null);
  }

  async function registerUsedDeliveryAddress(params: {
    finalAddress: string;
    lat: number;
    lng: number;
  }) {
    if (!isAuthed || !citySlug) return;

    const cleanAddress = String(params.finalAddress ?? "").trim();
    if (cleanAddress.length < 6) return;

    try {
      await apiFetch(`/users/me/addresses?citySlug=${encodeURIComponent(citySlug)}`, {
        method: "POST",
        suppressSessionExpiredEvent: true,
        json: {
          label: null,
          placeName: "Tienda en Línea",
          address: cleanAddress,
          reference: null,
          contactName: null,
          contactPhone: null,
          lat: params.lat,
          lng: params.lng,
          isDefault: false,
          isFavorite: false,
        },
      } as any);
    } catch {
      // No bloqueamos la compra si no se pudo guardar la dirección.
    }
  }

  function useCurrentLocation() {
    setGeoError(null);
    setError(null);
    setSelectedSavedAddressId("");

    if (!navigator?.geolocation) {
      setGeoError("Tu navegador no permite usar ubicación actual.");
      return;
    }

    setGeoLoading(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude);
        const lng = Number(pos.coords.longitude);
        const nextAddress = "Mi ubicación actual";
        const nextExtra = "El repartidor debe llegar a mi ubicación GPS actual.";
        const nextDropoff = buildDropoffAddress(nextAddress, nextExtra);

        setAddress(nextAddress);
        setAddressExtra(nextExtra);
        setDeliveryLat(lat);
        setDeliveryLng(lng);
        setLastGeocodeKey(buildGeocodeKey(nextDropoff, cityGeoLabel));
        setGeoLoading(false);
      },
      () => {
        setGeoError(
          "No pudimos tomar tu ubicación. Revisa permisos del navegador o escribe la dirección manualmente."
        );
        setGeoLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      }
    );
  }

  const openConfirmFlow = () => {
    if (!authLoading && !isAuthed) {
      requireLogin("/cart");
      return;
    }

    setError(null);
    setTmpAddress(address);
    setTmpAddressExtra(addressExtra);
    setShowAddressModal(true);
  };

  const handleAddressModalConfirm = () => {
    const a = tmpAddress.trim();
    const ax = tmpAddressExtra.trim();

    if (a.length < 6) {
      setError("Por favor escribe una dirección válida (mínimo 6 caracteres).");
      return;
    }

    const oldDropoff = buildDropoffAddress(address, addressExtra);
    const nextDropoff = buildDropoffAddress(a, ax);

    setAddress(a);
    setAddressExtra(ax);

    if (oldDropoff.trim() !== nextDropoff.trim()) {
      clearDeliveryGeo();
    }

    setShowAddressModal(false);
    setTmpNote(note);
    setShowNoteModal(true);
  };

  const handleNoteModalConfirm = async () => {
    const n = tmpNote.slice(0, 150);
    setNote(n);

    setShowNoteModal(false);

    await handleConfirmInternal({
      confirmedAddress: tmpAddress,
      confirmedAddressExtra: tmpAddressExtra,
      confirmedNote: n,
    });
  };

  const handleConfirmWithoutNote = async () => {
    setNote("");
    setTmpNote("");
    setShowNoteModal(false);

    await handleConfirmInternal({
      confirmedAddress: tmpAddress || address,
      confirmedAddressExtra: tmpAddressExtra || addressExtra,
      confirmedNote: "",
    });
  };

  const handleConfirmInternal = async (params: {
    confirmedAddress: string;
    confirmedAddressExtra: string;
    confirmedNote: string;
  }) => {
    if (!authLoading && !isAuthed) {
      setIsSubmitting(false);
      requireLogin("/cart");
      return;
    }

    if (!cityReady || !citySlug) {
      setIsSubmitting(false);
      setError("La ciudad actual aún no está lista. Intenta de nuevo en un momento.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const finalDropoffAddress = buildDropoffAddress(params.confirmedAddress, params.confirmedAddressExtra);
    const finalGeocodeKey = buildGeocodeKey(finalDropoffAddress, cityGeoLabel);

    let lat = deliveryLat;
    let lng = deliveryLng;

    const needsFreshGeocode = lat == null || lng == null || !lastGeocodeKey || lastGeocodeKey !== finalGeocodeKey;

    if (needsFreshGeocode) {
      const geo = await geocodeAddressOSMInCity(finalDropoffAddress, cityGeoLabel);

      if (!geo) {
        setIsSubmitting(false);
        setError("No pudimos ubicar la dirección en el mapa. Ajusta la dirección e intenta de nuevo.");
        return;
      }

      lat = geo.lat;
      lng = geo.lng;
      setDeliveryLat(lat);
      setDeliveryLng(lng);
      setLastGeocodeKey(finalGeocodeKey);
    }

    const finalZoneCalc = await calculateStoreZoneForPoint({
      lat: Number(lat),
      lng: Number(lng),
      silent: true,
    });

    if (
      !finalZoneCalc ||
      finalZoneCalc.zone?.isInsideCoverage === false ||
      Number(finalZoneCalc.zone?.zoneNumber) === 5
    ) {
      setIsSubmitting(false);
      setShowOutOfCoverageModal(true);
      setError("Esta ubicación está fuera de la cobertura de KroniX en esta ciudad.");
      return;
    }

    await registerUsedDeliveryAddress({
      finalAddress: finalDropoffAddress,
      lat: Number(lat),
      lng: Number(lng),
    });

    const API = process.env.NEXT_PUBLIC_API;
    if (!API) {
      setIsSubmitting(false);
      setError("Falta NEXT_PUBLIC_API en .env.local");
      return;
    }

    const groupsWithoutStore = grouped.filter((g) => !g.store);
    if (groupsWithoutStore.length) {
      setIsSubmitting(false);
      setError("Hay productos cuyo establecimiento no se pudo validar para la ciudad seleccionada.");
      return;
    }

    const groupsOutsideCurrentCity = grouped.filter((g) => {
      const storeCitySlug = String(g.store?.city?.slug ?? "").trim();
      return !!storeCitySlug && storeCitySlug !== citySlug;
    });

    if (groupsOutsideCurrentCity.length) {
      setIsSubmitting(false);
      setError("El carrito contiene productos que no pertenecen a la ciudad seleccionada.");
      return;
    }

    const pickups = grouped
      .filter((g) => g.store?.address && g.store?.lat != null && g.store?.lng != null)
      .map((g, idx) => ({
        storeId: String(g.store?.storeCode ?? g.storeCode ?? g.storeId),
        sequence: idx + 1,
        pickupAddress: String(g.store!.address),
        pickupLat: Number(g.store!.lat),
        pickupLng: Number(g.store!.lng),
      }));

    if (!pickups.length) {
      setIsSubmitting(false);
      setError(
        "No hay ubicaciones de recogida válidas. (Las tiendas del carrito no tienen address/lat/lng cargados desde API)."
      );
      return;
    }

    const customerNote = params.confirmedNote.trim().slice(0, 150) || undefined;
    const customerId = getCurrentBuyerId();

    let created: {
      id: string;
      status: string;
      flowStatus?: string;
      createdAt: string | Date;
      totalCOP?: number;
      storesSubtotalCOP?: number;
      serviceFeeCOP?: number;
      promoCOP?: number;
      tipCOP?: number;
      deliveryFeeCOP?: number;
    } | null = null;

    try {
      created = await apiFetch(`${"/orders"}`, {
        method: "POST",
        json: {
          customerId,
          customerPhone: `+57${DEFAULT_CUSTOMER_PHONE}`,
          citySlug,
          dropoffAddress: finalDropoffAddress,
          dropoffLat: lat,
          dropoffLng: lng,
          customerNote,
          deliveryFeeCOP:
            Number(finalZoneCalc.pricing.baseServiceCOP ?? 0) +
            Number(finalZoneCalc.pricing.zoneFeeCOP ?? 0),
          serviceFeeCOP: Number(finalZoneCalc.pricing.serviceFeeCOP ?? 0),
          promoCOP: promo,
          tipCOP,
          totalCOP: totalWithTip,
          paymentMethod,
          useWallet: false,
          pickups,
          items: grouped.flatMap((g) =>
            g.items.map((it) => ({
              productId: String(it.id),
              storeId: String(g.store?.storeCode ?? g.storeCode ?? it.storeCode ?? it.storeId),
              name: String(it.name),
              priceCOP: Number(it.price),
              qty: Number(it.qty),
              image: it.image ? String(it.image) : undefined,
            }))
          ),
        },
      });
    } catch (e: any) {
      setIsSubmitting(false);
      setError(`No se pudo crear la orden. ${e?.message ? `Detalle: ${e.message}` : ""}`);
      return;
    }

    const orderId = String(created?.id || "");
    if (!orderId) {
      setIsSubmitting(false);
      setError("El backend no devolvió un ID de orden válido.");
      return;
    }

    const createdAtMs =
      typeof created?.createdAt === "string"
        ? Date.parse(created.createdAt)
        : created?.createdAt instanceof Date
          ? created.createdAt.getTime()
          : Date.now();

    const createdAtFinal = Number.isFinite(createdAtMs) ? createdAtMs : Date.now();

    const backendFlow = String(created?.flowStatus ?? "WAITING_CONFIRMATION");

    const serverSubtotal = Number(created?.storesSubtotalCOP ?? subtotal);
    const serverDelivery = Number(created?.deliveryFeeCOP ?? shipping);
    const serverService = Number(created?.serviceFeeCOP ?? serviceFee);
    const serverPromo = Number(created?.promoCOP ?? promo);
    const serverTip = Number(created?.tipCOP ?? tipCOP);
    const serverTotal = Number(created?.totalCOP ?? totalWithTip);

    const finalLat = Number(lat);
    const finalLng = Number(lng);

    addOrder({
      id: orderId,
      createdAt: createdAtFinal,
      status: "CONFIRMADO",
      flowStatus: backendFlow as any,
      total: serverTotal,
      items: (items as any[]).map((it) => ({ ...it })),
      address: finalDropoffAddress,
      paymentMethod,
      tipCOP: serverTip,
      customerNote,
      deliveryFeeCOP: serverDelivery,
      storesSubtotalCOP: serverSubtotal,
      serviceFeeCOP: serverService,
      promoCOP: serverPromo,
      citySlug,
      cityLabel,
      storesSummary: grouped.map((g) => ({
        storeId: String(g.store?.id ?? g.storeId),
        name: g.store?.name ?? "Establecimiento",
      })),
      pickupLocations: pickups.map((p) => ({
        address: p.pickupAddress,
        lat: p.pickupLat,
        lng: p.pickupLng,
      })),
      dropoffLocation: { address: finalDropoffAddress, lat: finalLat, lng: finalLng },
    });

    clear();

    try {
      localStorage.removeItem(getCheckoutStorageKey(citySlug));
    } catch {}

    setAddress("");
    setAddressExtra("");
    setSelectedSavedAddressId("");
    setTipEnabled(false);
    setTipPreset(null);
    setTipInput("");
    setNote("");
    setDeliveryLat(null);
    setDeliveryLng(null);
    setLastGeocodeKey("");
    setError(null);

    router.push(`/tracking/${orderId}`);
  };

  return (
    <div className="px-4 pb-6 pt-4">
      <div className="text-lg font-extrabold text-gray-900">Carrito de Compras</div>

      {showAddressModal ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/50 px-[18px] pb-6 pt-24 backdrop-blur-[3px]">
          <div
            className="relative mt-2 w-full max-w-[410px] overflow-hidden rounded-[30px] shadow-[0_35px_90px_rgba(2,8,23,0.62)] ring-1 ring-white/30"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 bg-[linear-gradient(180deg,#061f45_0%,#0a3566_18%,#f8fbff_43%,#ffffff_55%,#eef7ff_66%,#0a3566_86%,#031a3b_100%)]" />

            <div className="relative z-10 px-4 pb-4 pt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-[19px] font-black leading-tight tracking-[-0.03em] text-white drop-shadow">
                    Confirma tu dirección
                  </h2>
                  <div className="mt-2 text-[11.5px] font-bold leading-4 text-cyan-50/90 drop-shadow">
                    Verifica que esté correcta antes de crear tu pedido.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowAddressModal(false);
                    setError(null);
                  }}
                  className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white/95 text-[17px] font-black text-[#07214a] shadow-[0_10px_24px_rgba(2,8,23,0.22)] ring-1 ring-white/70 transition hover:scale-[1.04]"
                  aria-label="Cerrar"
                >
                  ×
                </button>
              </div>

              <div className="mt-4 rounded-[23px] bg-white/95 p-4 shadow-[0_18px_38px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/80 backdrop-blur">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#244163]">
                    Dirección
                  </div>
                  <input
                    value={tmpAddress}
                    onChange={(e) => setTmpAddress(e.target.value)}
                    placeholder={`Ej: Cra 18 #12-35, ${cityLabel}`}
                    className="mt-2 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div className="mt-3">
                  <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#244163]">
                    Complemento opcional
                  </div>
                  <input
                    value={tmpAddressExtra}
                    onChange={(e) => setTmpAddressExtra(e.target.value)}
                    placeholder="Conjunto, torre, bloque, apto, etc."
                    className="mt-2 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddressModal(false);
                    setError(null);
                  }}
                  className="w-1/2 rounded-full bg-white/95 py-3 text-sm font-black text-[#07214a] shadow-[0_10px_24px_rgba(2,8,23,0.16)] ring-1 ring-white/70 transition hover:scale-[1.02]"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleAddressModalConfirm}
                  className="w-1/2 rounded-full bg-[#08b256] py-3 text-sm font-black text-white shadow-[0_12px_26px_rgba(8,178,86,0.34)] transition hover:scale-[1.03] hover:bg-[#07a14d]"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showNoteModal ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/50 px-[18px] pb-6 pt-24 backdrop-blur-[3px]">
          <div
            className="relative mt-2 w-full max-w-[410px] overflow-hidden rounded-[30px] shadow-[0_35px_90px_rgba(2,8,23,0.62)] ring-1 ring-white/30"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 bg-[linear-gradient(180deg,#061f45_0%,#0a3566_18%,#f8fbff_43%,#ffffff_55%,#eef7ff_66%,#0a3566_86%,#031a3b_100%)]" />

            <div className="relative z-10 px-4 pb-4 pt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-[19px] font-black leading-tight tracking-[-0.03em] text-white drop-shadow">
                    Comentarios para tu pedido
                  </h2>
                  <div className="mt-2 text-[11.5px] font-bold leading-4 text-cyan-50/90 drop-shadow">
                    Estos comentarios los verá el negocio y el repartidor.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmWithoutNote}
                  className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white/95 text-[17px] font-black text-[#07214a] shadow-[0_10px_24px_rgba(2,8,23,0.22)] ring-1 ring-white/70 transition hover:scale-[1.04]"
                  aria-label="Cerrar"
                >
                  ×
                </button>
              </div>

              <div className="mt-4 rounded-[23px] bg-white/95 p-4 shadow-[0_18px_38px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/80 backdrop-blur">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#08b256] shadow-[0_0_0_4px_rgba(8,178,86,0.13)]" />
                  <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#244163]">
                    Nota del cliente
                  </div>
                </div>

                <textarea
                  value={tmpNote}
                  onChange={(e) => setTmpNote(e.target.value.slice(0, 150))}
                  placeholder="Ej: Por favor llamar al llegar / Dejar en portería / Sin cebolla..."
                  className="mt-3 h-28 w-full resize-none rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                />

                <div className="mt-2 text-right text-xs font-bold text-slate-500">
                  {tmpNote.length}/150
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleConfirmWithoutNote}
                  className="w-1/2 rounded-full bg-white/95 py-3 text-sm font-black text-[#07214a] shadow-[0_10px_24px_rgba(2,8,23,0.16)] ring-1 ring-white/70 transition hover:scale-[1.02]"
                >
                  Omitir
                </button>

                <button
                  type="button"
                  onClick={handleNoteModalConfirm}
                  className="w-1/2 rounded-full bg-[#08b256] py-3 text-sm font-black text-white shadow-[0_12px_26px_rgba(8,178,86,0.34)] transition hover:scale-[1.03] hover:bg-[#07a14d]"
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <EmptyCart onGoHome={() => router.push("/")} />
        ) : (
          grouped.map((g, idx) => (
            <div
              key={`${g.groupKey || "no-store"}:${idx}`}
              className="rounded-2xl border border-gray-200 bg-white shadow-sm"
            >
              <div className="flex items-center gap-3 border-b border-gray-100 p-4">
                <div className="relative h-10 w-10 overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-200">
                  {g.store?.image ? (
                    <Image src={g.store.image} alt="" fill className="object-cover" sizes="40px" />
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-extrabold text-gray-900">
                    Pedido: {g.store?.name ?? "Establecimiento"}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-600">
                    Subtotal de este pedido:{" "}
                    <span className="font-semibold">{safeFormatCOP(g.subtotal, mounted)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-3">
                {g.items.map((it) => (
                  <div
                    key={`${g.groupKey}:${it.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3"
                  >
                    <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-200">
                      {it.image ? (
                        <Image
                          src={String(it.image)}
                          alt={it.name}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-gray-900">{it.name}</div>
                      <div className="mt-1 text-xs text-gray-600">{safeFormatCOP(it.price, mounted)}</div>

                      <div className="mt-2 flex items-center gap-2">
                        <button
                          className="h-8 w-8 rounded-lg border bg-white font-bold hover:bg-gray-50"
                          onClick={() => setQty(it.id, it.storeId, it.qty - 1)}
                          aria-label="Disminuir"
                        >
                          −
                        </button>

                        <div className="w-10 text-center text-sm font-semibold">{it.qty}</div>

                        <button
                          className="h-8 w-8 rounded-lg border bg-white font-bold hover:bg-gray-50"
                          onClick={() => setQty(it.id, it.storeId, it.qty + 1)}
                          aria-label="Aumentar"
                        >
                          +
                        </button>

                        <button
                          className="ml-auto text-xs font-semibold text-red-600 hover:underline"
                          onClick={() => removeItem(it.id, it.storeId)}
                        >
                          Quitar
                        </button>
                      </div>
                    </div>

                    <div className="text-right text-xs font-extrabold text-gray-900">
                      {safeFormatCOP(it.price * it.qty, mounted)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="text-sm font-extrabold text-gray-900">Dirección</div>

        <div className="mt-3 rounded-[20px] border border-blue-100 bg-blue-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-900">
                Usar dirección guardada
              </div>
            </div>

            {isAuthed ? (
              savedAddressesLoading ? (
                <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-blue-700 ring-1 ring-blue-100">
                  ...
                </span>
              ) : (
                <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-blue-700 ring-1 ring-blue-100">
                  {sortedSavedAddresses.length}
                </span>
              )
            ) : null}
          </div>

          {isAuthed && sortedSavedAddresses.length > 0 ? (
            <select
              value={selectedSavedAddressId}
              onChange={(e) => {
                const id = e.target.value;
                const found = sortedSavedAddresses.find((x) => x.id === id);
                if (found) applySavedAddress(found);
                else setSelectedSavedAddressId("");
              }}
              className="mt-2 w-full rounded-2xl border border-blue-100 bg-white px-3 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Seleccionar dirección</option>
              {sortedSavedAddresses.map((item) => (
                <option key={item.id} value={item.id}>
                  {getSavedAddressBadge(item)} — {getSavedAddressLabel(item)} — {item.address}
                </option>
              ))}
            </select>
          ) : (
            <select
              value=""
              disabled
              className="mt-2 w-full rounded-2xl border border-blue-100 bg-white px-3 py-3 text-sm font-bold text-slate-900 outline-none disabled:opacity-100"
            >
              <option>Seleccionar dirección</option>
            </select>
          )}

          {isAuthed && !savedAddressesLoading && sortedSavedAddresses.length === 0 ? (
            <div className="mt-2 rounded-2xl border border-blue-100 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600">
              Aún no tienes direcciones guardadas en esta ciudad.
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={geoLoading}
          className={[
            "mt-3 w-full rounded-2xl px-3 py-3 text-xs font-extrabold text-white shadow-sm transition",
            geoLoading ? "cursor-not-allowed bg-slate-300" : "bg-emerald-600 hover:bg-emerald-700",
          ].join(" ")}
        >
          {geoLoading ? "Ubicando..." : "📍 Usar mi ubicación actual"}
        </button>

        {geoError ? (
          <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
            {geoError}
          </div>
        ) : null}

        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-[84px_1fr] items-center gap-2">
            <label className="text-xs font-extrabold text-slate-900">Dirección</label>
            <input
              value={address}
              onChange={(e) => updateDeliveryAddress(e.target.value)}
              placeholder="Dirección o ubicación de inicio *"
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm font-semibold text-slate-900 outline-none placeholder:font-semibold placeholder:text-slate-400 focus:border-blue-300 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-[84px_1fr] items-start gap-2">
            <label className="pt-3 text-xs font-extrabold text-slate-900">Referencia</label>
            <textarea
              value={addressExtra}
              onChange={(e) => updateDeliveryExtra(e.target.value)}
              placeholder="Referencia"
              rows={2}
              className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm font-semibold text-slate-900 outline-none placeholder:font-semibold placeholder:text-slate-400 focus:border-blue-300 focus:bg-white"
            />
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-sm font-extrabold text-gray-900">Propina</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setTipEnabled(false);
                setTipPreset(null);
                setTipInput("");
              }}
              className={`rounded-xl px-3 py-2 text-xs font-extrabold ${
                !tipEnabled ? "bg-green-600 text-white" : "border border-gray-200 bg-white text-gray-800"
              }`}
            >
              No
            </button>
            <button
              type="button"
              onClick={() => {
                setTipEnabled(true);
                if (!tipPreset) setTipPreset("P1");
                if (!tipInput) applyTipPercent(1);
              }}
              className={`rounded-xl px-3 py-2 text-xs font-extrabold ${
                tipEnabled ? "bg-green-600 text-white" : "border border-gray-200 bg-white text-gray-800"
              }`}
            >
              Sí
            </button>
          </div>
        </div>

        {tipEnabled ? (
          <div className="mt-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyTipPercent(1)}
                className={`rounded-xl px-3 py-2 text-xs font-extrabold ${
                  tipPreset === "P1" ? "bg-green-600 text-white" : "border border-gray-200 bg-white text-gray-800"
                }`}
              >
                1%
              </button>

              <button
                type="button"
                onClick={() => applyTipPercent(2)}
                className={`rounded-xl px-3 py-2 text-xs font-extrabold ${
                  tipPreset === "P2" ? "bg-green-600 text-white" : "border border-gray-200 bg-white text-gray-800"
                }`}
              >
                2%
              </button>

              <button
                type="button"
                onClick={() => applyTipPercent(5)}
                className={`rounded-xl px-3 py-2 text-xs font-extrabold ${
                  tipPreset === "P5" ? "bg-green-600 text-white" : "border border-gray-200 bg-white text-gray-800"
                }`}
              >
                5%
              </button>

              <button
                type="button"
                onClick={() => {
                  setTipPreset("OTHER");
                  setTipInput("");
                }}
                className={`rounded-xl px-3 py-2 text-xs font-extrabold ${
                  tipPreset === "OTHER" ? "bg-green-600 text-white" : "border border-gray-200 bg-white text-gray-800"
                }`}
              >
                Otro
              </button>
            </div>

            {tipPreset === "OTHER" ? (
              <div className="mt-3">
                <div className="text-xs font-bold text-gray-800">Valor de propina (COP)</div>
                <input
                  value={tipInput}
                  onChange={(e) => setTipInput(clampDigitsOnly(e.target.value))}
                  inputMode="numeric"
                  placeholder="Ej: 2000"
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm outline-none"
                />
              </div>
            ) : (
              <div className="mt-3 text-xs text-gray-600">
                Propina actual:{" "}
                <span className="font-extrabold text-gray-900">{safeFormatCOP(tipCOP, mounted)}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-2 text-xs text-gray-500">Puedes agregar propina si lo deseas.</div>
        )}
      </div>

      <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-700">
            <span>Subtotal</span>
            <span className="font-semibold">{safeFormatCOP(subtotal, mounted)}</span>
          </div>

          <div className="flex justify-between text-gray-700">
            <span>Base Domicilio</span>
            <span className="font-semibold">{safeFormatCOP(zoneBaseDeliveryCOP, mounted)}</span>
          </div>

          <div className="flex justify-between text-gray-700">
            <span>{storeZoneCalc?.zone?.zoneNumber ? ` ${storeZoneCalc.zone.name}` : ""}</span>
            <span className="font-semibold">{safeFormatCOP(zoneIncrementCOP, mounted)}</span>
          </div>

          <div className="flex justify-between text-gray-700">
            <span>Servicio KroniX</span>
            <span className="font-semibold">{safeFormatCOP(zoneServiceFeeCOP, mounted)}</span>
          </div>

          <div className="flex justify-between text-gray-700">
            <span>Promoción</span>
            <span className="font-semibold text-green-700">- {safeFormatCOP(promo, mounted)}</span>
          </div>

          {tipEnabled && tipCOP > 0 ? (
            <div className="flex justify-between text-gray-700">
              <span>Propina</span>
              <span className="font-semibold">{safeFormatCOP(tipCOP, mounted)}</span>
            </div>
          ) : null}
        </div>

        {zoneLoading ? (
          <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
            Calculando zona de entrega...
          </div>
        ) : storeZoneCalc?.zone ? (
          <div
            className={[
              "mt-3 rounded-xl border px-3 py-2 text-xs font-semibold",
              Number(storeZoneCalc.zone.zoneNumber) === 5 ||
              storeZoneCalc.zone.isInsideCoverage === false
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-100 bg-emerald-50 text-emerald-700",
            ].join(" ")}
          >
            {Number(storeZoneCalc.zone.zoneNumber) === 5 ||
            storeZoneCalc.zone.isInsideCoverage === false
              ? `Zona fuera de cobertura: Zona ${storeZoneCalc.zone.zoneNumber} · ${storeZoneCalc.zone.name}`
              : `Zona de entrega: Zona ${storeZoneCalc.zone.zoneNumber} · ${storeZoneCalc.zone.name}`}
          </div>
        ) : zoneError ? (
          <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
            {zoneError}
          </div>
        ) : null}

        <div className="mt-3 text-right text-lg font-extrabold text-gray-900">
          Total {safeFormatCOP(totalWithTip, mounted)}
        </div>

        {error ? <div className="mt-3 text-sm font-semibold text-red-600">{error}</div> : null}

        <button
          disabled={!canConfirm}
          onClick={openConfirmFlow}
          className="mt-4 w-full rounded-2xl bg-green-600 py-3 text-sm font-extrabold text-white hover:bg-green-700 disabled:opacity-50"
        >
          {isSubmitting ? "Enviando pedido…" : "CONFIRMAR PEDIDO"}
        </button>

        <div className="mt-2 text-[11px] text-gray-500">
          El negocio debe confirmar tu pedido antes de procesar el pago.
        </div>
      </div>

      {showOutOfCoverageModal ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 px-5 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[28px] bg-white p-5 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl">
              ⚠️
            </div>

            <div className="mt-4 text-xl font-black text-gray-900">
              Fuera de cobertura
            </div>

            <div className="mt-2 text-sm font-semibold leading-6 text-gray-600">
              Esta ubicación está fuera de la cobertura de KroniX en {cityLabel}.
            </div>

            <button
              type="button"
              onClick={() => setShowOutOfCoverageModal(false)}
              className="mt-5 w-full rounded-2xl bg-slate-900 py-3 text-sm font-extrabold text-white hover:bg-slate-800"
            >
              Entendido
            </button>
          </div>
        </div>
      ) : null}

      <AuthRequiredModal
        open={showAuthModal}
        onConfirm={() => router.push(`/login?next=${encodeURIComponent(authNext)}`)}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}