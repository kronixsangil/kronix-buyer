//components\buyer\CityContext.tsx
"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

export type BuyerCity = {
  id?: string;
  slug: string;
  name: string;
  department: string;
  country: string;
  isActive?: boolean;
  isFeatured?: boolean;
};

type PublicCitiesResponse = {
  ok: boolean;
  items: BuyerCity[];
};

type BuyerCityContextValue = {
  city: BuyerCity;
  setCity: (city: BuyerCity) => void;
  cities: BuyerCity[];
  citiesLoading: boolean;
  reloadCities: () => Promise<void>;
  citySlug: string;
  cityLabel: string;
  cityGeoLabel: string;
  cityReady: boolean;
};

const STORAGE_KEY = "ct_buyer_city_v1";
const CITY_CHANGED_EVENT = "buyer-city:changed";

const DEFAULT_CITY: BuyerCity = {
  slug: "san-gil",
  name: "San Gil",
  department: "Santander",
  country: "Colombia",
  isActive: true,
  isFeatured: true,
};

const BuyerCityContext = createContext<BuyerCityContextValue | null>(null);

function normalizeCity(input: Partial<BuyerCity> | null | undefined): BuyerCity {
  const slug = String(input?.slug ?? "").trim() || DEFAULT_CITY.slug;
  const name = String(input?.name ?? "").trim() || DEFAULT_CITY.name;
  const department = String(input?.department ?? "").trim() || DEFAULT_CITY.department;
  const country = String(input?.country ?? "").trim() || DEFAULT_CITY.country;

  return {
    id: input?.id,
    slug,
    name,
    department,
    country,
    isActive: input?.isActive ?? true,
    isFeatured: input?.isFeatured ?? false,
  };
}

function emitCityChanged(city: BuyerCity) {
  try {
    window.dispatchEvent(
      new CustomEvent(CITY_CHANGED_EVENT, {
        detail: city,
      })
    );
  } catch {}
}

export function BuyerCityProvider({ children }: { children: React.ReactNode }) {
  const [city, setCityState] = useState<BuyerCity | null>(null);
  const [cities, setCities] = useState<BuyerCity[]>([DEFAULT_CITY]);
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setCityState(DEFAULT_CITY);
        setBootstrapped(true);
        return;
      }

      const parsed = JSON.parse(raw) as Partial<BuyerCity>;
      setCityState(normalizeCity(parsed));
      setBootstrapped(true);
    } catch {
      setCityState(DEFAULT_CITY);
      setBootstrapped(true);
    }
  }, []);

  const setCity = (next: BuyerCity) => {
    const normalized = normalizeCity(next);
    setCityState(normalized);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    } catch {}

    emitCityChanged(normalized);
  };

  const reloadCities = async () => {
    if (!bootstrapped) return;

    try {
      setCitiesLoading(true);

      const data = await apiFetch<PublicCitiesResponse>("/public/cities", {
        method: "GET",
        suppressSessionExpiredEvent: true,
      } as any);

      const apiCities = Array.isArray(data?.items)
        ? data.items.map((item) => normalizeCity(item))
        : [];

      const finalCities = apiCities.length ? apiCities : [DEFAULT_CITY];
      setCities(finalCities);

      setCityState((current) => {
        const safeCurrent = normalizeCity(current);
        const currentSlug = String(safeCurrent?.slug ?? "").trim();

        const matched =
          finalCities.find((c) => c.slug === currentSlug) ||
          finalCities.find((c) => c.slug === DEFAULT_CITY.slug) ||
          finalCities[0] ||
          DEFAULT_CITY;

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(matched));
        } catch {}

        return matched;
      });
    } catch {
      const fallbackCities = [DEFAULT_CITY];
      setCities(fallbackCities);

      setCityState((current) => {
        const safeCurrent = normalizeCity(current);

        const matched =
          fallbackCities.find((c) => c.slug === safeCurrent.slug) ||
          DEFAULT_CITY;

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(matched));
        } catch {}

        return matched;
      });
    } finally {
      setCitiesLoading(false);
    }
  };

  useEffect(() => {
    if (!bootstrapped) return;
    reloadCities();
  }, [bootstrapped]);

  const resolvedCity = city ?? DEFAULT_CITY;
  const cityReady = bootstrapped && !citiesLoading && !!resolvedCity?.slug;

  const value = useMemo<BuyerCityContextValue>(() => {
    const cityLabel = `${resolvedCity.name}, ${resolvedCity.department}`;
    const cityGeoLabel = `${resolvedCity.name}, ${resolvedCity.department}, ${resolvedCity.country}`;

    return {
      city: resolvedCity,
      setCity,
      cities,
      citiesLoading,
      reloadCities,
      citySlug: resolvedCity.slug,
      cityLabel,
      cityGeoLabel,
      cityReady,
    };
  }, [resolvedCity, cities, citiesLoading, cityReady]);

  return <BuyerCityContext.Provider value={value}>{children}</BuyerCityContext.Provider>;
}

export function useBuyerCity() {
  const ctx = useContext(BuyerCityContext);
  if (!ctx) {
    throw new Error("useBuyerCity must be used within <BuyerCityProvider />");
  }
  return ctx;
}

export { DEFAULT_CITY, STORAGE_KEY as BUYER_CITY_STORAGE_KEY, CITY_CHANGED_EVENT };