// app/(buyer)/layout.tsx
"use client";

import type { ReactNode } from "react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import BuyerHeader from "@/components/buyer/BuyerHeader";
import BottomNav from "@/components/buyer/BottomNav";
import { CartProvider } from "@/components/buyer/CartContext";
import { SearchProvider } from "@/components/buyer/SearchContext";
import SessionExpiredModal from "@/components/buyer/SessionExpiredModal";
import { BuyerCityProvider } from "@/components/buyer/CityContext";
import { getMe } from "@/lib/authClient";
import BuyerTermsModal from "@/components/buyer/legal/BuyerTermsModal";
import {
  checkBuyerTermsStatus,
  hasBuyerTermsLocal,
  saveBuyerTermsLocal,
} from "@/components/buyer/legal/buyerLegal";

function isAuthRoute(pathname: string) {
  return (
    pathname === "/login" ||
    pathname.startsWith("/login?") ||
    pathname === "/register" ||
    pathname.startsWith("/register?") ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/forgot-password?")
  );
}

function buildNext(pathname: string, searchParams: URLSearchParams | null) {
  const qs = searchParams?.toString() || "";
  return qs ? `${pathname}?${qs}` : pathname;
}

function AuthGate({ children, pathname }: { children: ReactNode; pathname: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);
const [checkingTerms, setCheckingTerms] = useState(true);

  const isPublicAuthRoute = useMemo(() => isAuthRoute(pathname), [pathname]);

  useEffect(() => {
    let alive = true;

    async function validate() {
      if (isPublicAuthRoute) {
        if (alive) setCheckingAuth(false);
        return;
      }

      if (alive) setCheckingAuth(true);

      try {
        const me = await getMe();

if (!alive) return;

if (!me?.user?.sub) {
  const next = buildNext(pathname, searchParams);
  router.replace(`/login?next=${encodeURIComponent(next)}`);
  return;
}

try {
  const accepted = await checkBuyerTermsStatus();

  if (!alive) return;

  setTermsAccepted(accepted);
} catch {
  if (!alive) return;

  // Backend es la fuente real. Si no podemos verificar,
  // no damos por aceptado.
  setTermsAccepted(false);
} finally {
  if (alive) setCheckingTerms(false);
}

setCheckingAuth(false);

        if (!alive) return;

        if (!me?.user?.sub) {
          const next = buildNext(pathname, searchParams);
          router.replace(`/login?next=${encodeURIComponent(next)}`);
          return;
        }

        setCheckingAuth(false);
      } catch {
        if (!alive) return;
        const next = buildNext(pathname, searchParams);
        router.replace(`/login?next=${encodeURIComponent(next)}`);
      }
    }

    validate();

    const onAuthChanged = () => validate();
    const onFocus = () => validate();

    window.addEventListener("auth:changed", onAuthChanged);
    window.addEventListener("focus", onFocus);

    return () => {
      alive = false;
      window.removeEventListener("auth:changed", onAuthChanged);
      window.removeEventListener("focus", onFocus);
    };
  }, [isPublicAuthRoute, pathname, router, searchParams]);

  if (!isPublicAuthRoute && checkingAuth) {
    return (
      <div className="px-4 pt-6 pb-6">
        <div className="rounded-3xl bg-white p-6 shadow-sm animate-pulse">
          <div className="mb-4 h-6 w-40 rounded bg-gray-100" />
          <div className="mb-3 h-12 rounded bg-gray-100" />
          <div className="mb-3 h-12 rounded bg-gray-100" />
          <div className="h-12 rounded bg-gray-100" />
        </div>
      </div>
    );
  }

  return (
  <>
    {children}

    {!isPublicAuthRoute && !checkingTerms && !termsAccepted ? (
      <BuyerTermsModal
        open
        force
        authenticated
        onClose={() => {}}
        onAccepted={() => setTermsAccepted(true)}
      />
    ) : null}
  </>
);

}

function AuthGateFallback() {
  return (
    <div className="px-4 pt-6 pb-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm animate-pulse">
        <div className="mb-4 h-6 w-40 rounded bg-gray-100" />
        <div className="mb-3 h-12 rounded bg-gray-100" />
        <div className="mb-3 h-12 rounded bg-gray-100" />
        <div className="h-12 rounded bg-gray-100" />
      </div>
    </div>
  );
}

function BottomKronixGlow() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-[#03102b] via-[#0b356d] to-transparent opacity-95" />
    </div>
  );
}

export default function BuyerLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPublicAuthRoute = isAuthRoute(pathname);

  const hideGlobalHeader = pathname === "/";
  const hideBottomNav = isPublicAuthRoute;

  const topClass = hideGlobalHeader
    ? "top-0"
    : pathname === "/comprar"
      ? "top-[138px]"
      : "top-[104px]";

  return (
    <CartProvider>
      <SearchProvider>
        <BuyerCityProvider>
          <div className="fixed inset-0 overflow-hidden bg-gray-100 buyer-app-shell">
            <div className="mx-auto h-[100dvh] w-full max-w-md overflow-hidden bg-gray-50 shadow-lg md:my-4 md:h-[calc(100dvh-2rem)] md:rounded-[28px] md:ring-1 md:ring-black/10">
              <div className="relative h-full w-full overflow-hidden bg-gray-50">
                <SessionExpiredModal />

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
                      ? `${hideGlobalHeader ? "top-0" : topClass} bottom-0`
                      : `${topClass} bottom-[88px] pb-4`,
                  ].join(" ")}
                >
                  <Suspense fallback={<AuthGateFallback />}>
                    <AuthGate pathname={pathname}>{children}</AuthGate>
                  </Suspense>
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