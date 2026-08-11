"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useBuyerCity } from "@/components/buyer/CityContext";
import {
  publicGetTelAvailability,
  type TelAvailability,
} from "@/lib/buyerCatalogApi";

type TelContextValue = TelAvailability & {
  loading: boolean;
};

const TelAvailabilityContext = createContext<TelContextValue>({
  enabled: false,
  showMessage: false,
  message: null,
  loading: true,
});

export function TelAvailabilityProvider({ children }: { children: React.ReactNode }) {
  const { citySlug, cityReady } = useBuyerCity();
  const [state, setState] = useState<TelContextValue>({
    enabled: false,
    showMessage: false,
    message: null,
    loading: true,
  });

  useEffect(() => {
    if (!cityReady) {
      setState((current) => ({ ...current, loading: true }));
      return;
    }

    let alive = true;

    publicGetTelAvailability(citySlug)
      .then((value) => {
        if (!alive) return;
        setState({ ...value, loading: false });
      })
      .catch(() => {
        if (!alive) return;
        setState({
          enabled: false,
          showMessage: false,
          message: null,
          loading: false,
        });
      });

    return () => {
      alive = false;
    };
  }, [cityReady, citySlug]);

  const value = useMemo(() => state, [state]);
  return (
    <TelAvailabilityContext.Provider value={value}>
      {children}
    </TelAvailabilityContext.Provider>
  );
}

export function useTelAvailability() {
  return useContext(TelAvailabilityContext);
}
