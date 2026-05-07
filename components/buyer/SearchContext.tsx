//componentes/buyer/SearchContext.tsx
"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

type SearchState = {
  query: string;
  setQuery: (v: string) => void;
};

const SearchContext = createContext<SearchState | null>(null);

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearch must be used within <SearchProvider />");
  return ctx;
}

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState("");

  const value = useMemo(() => ({ query, setQuery }), [query]);

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}