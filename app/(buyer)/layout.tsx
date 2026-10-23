// app/(buyer)/layout.tsx
"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import BuyerHeader from "@/components/buyer/BuyerHeader";
import BottomNav from "@/components/buyer/BottomNav";
import { CartProvider } from "@/components/buyer/CartContext";
import { SearchProvider } from "@/components/buyer/SearchContext";
import { BuyerCityProvider } from "@/components/buyer/CityContext";
function BottomKronixGlow() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden"
      style={{ height: "calc(96px + env(safe-area-inset-bottom))" }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-[#03102b] via-[#0b356d] to-transparent opacity-95" />
    </div>
  );
}

export default function BuyerLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();


  const hideGlobalHeader = pathname === "/" || pathname === "/establecimientos" || pathname.startsWith("/profile/");
  const hideBottomNav = false;

  const topClass = hideGlobalHeader
    ? "top-0"
    : pathname === "/comprar"
      ? "top-[96px]"
      : "top-[96px]";

  return (
    <CartProvider>
      <SearchProvider>
        <BuyerCityProvider>
          <div className="fixed inset-0 overflow-hidden bg-[#03102b] buyer-app-shell">
            <div className="mx-auto h-[100dvh] w-full max-w-md overflow-hidden bg-[#03102b] shadow-lg md:my-4 md:h-[calc(100dvh-2rem)] md:rounded-[28px] md:ring-1 md:ring-black/10">
              <div className="relative h-full w-full overflow-hidden" style={{ background: "var(--kx-page-bg, #f8fafc)" }}>


                {!hideGlobalHeader ? (
                  <header className="absolute left-0 right-0 top-0 z-[1000] bg-white">
                    <BuyerHeader />
                  </header>
                ) : null}

                <main
                  id="buyer-scroll-container"
                  className={[
                    "absolute left-0 right-0 overflow-y-auto overscroll-contain no-scrollbar",
                    "touch-pan-y scroll-smooth bg-gray-50",
                    hideBottomNav
                      ? `${hideGlobalHeader ? "top-0" : topClass} bottom-0 pb-[calc(96px+env(safe-area-inset-bottom))]`
                      : `${topClass} bottom-[calc(76px+env(safe-area-inset-bottom))] pb-2`,
                  ].join(" ")}
                >
                  {children}
                </main>

                {hideBottomNav ? <BottomKronixGlow /> : null}

                {!hideBottomNav ? <BottomNav /> : null}
              </div>
            </div>
          </div>
        </BuyerCityProvider>
      </SearchProvider>
    </CartProvider>
  );
}
