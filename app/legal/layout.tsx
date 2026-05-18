// app/legal/layout.tsx
"use client";

import type { ReactNode } from "react";

import BuyerHeader from "@/components/buyer/BuyerHeader";
import BottomNav from "@/components/buyer/BottomNav";

import { CartProvider } from "@/components/buyer/CartContext";
import { SearchProvider } from "@/components/buyer/SearchContext";
import { BuyerCityProvider } from "@/components/buyer/CityContext";

export default function LegalLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <CartProvider>
      <SearchProvider>
        <BuyerCityProvider>

          <div className="fixed inset-0 overflow-hidden bg-gray-100 buyer-app-shell">
            <div className="mx-auto h-[100dvh] w-full max-w-md overflow-hidden bg-gray-50 shadow-lg md:my-4 md:h-[calc(100dvh-2rem)] md:rounded-[28px] md:ring-1 md:ring-black/10">
              <div className="relative h-full w-full overflow-hidden bg-gray-50">

                {/* HEADER */}
                <header className="absolute left-0 right-0 top-0 z-[1000] bg-white">
                  <BuyerHeader />
                </header>

                {/* CONTENT */}
                <main
                  className="
                    absolute
                    left-0
                    right-0
                    top-[104px]
                    bottom-[88px]
                    overflow-y-auto
                    overscroll-contain
                    bg-gray-50
                  "
                >
                  {children}
                </main>

                {/* BOTTOM NAV */}
                <BottomNav />

              </div>
            </div>
          </div>

        </BuyerCityProvider>
      </SearchProvider>
    </CartProvider>
  );
}