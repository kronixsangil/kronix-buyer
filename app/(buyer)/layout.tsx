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

function AuthGate({
  children,
  pathname,
}: {
  children: ReactNode;
  pathname: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checkingAuth, setCheckingAuth] = useState(true);

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

        setCheckingAuth(false);
      } catch {
        if (!alive) return;
        const next = buildNext(pathname, searchParams);
        router.replace(`/login?next=${encodeURIComponent(next)}`);
      }
    }

    validate();

    const onAuthChanged = () => {
      validate();
    };

    const onFocus = () => {
      validate();
    };

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

  return <>{children}</>;
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
      <span className="absolute left-[8%] bottom-[18%] h-1 w-1 rounded-full bg-white/90" />
      <span className="absolute left-[18%] bottom-[30%] h-1 w-1 rounded-full bg-white/80" />
      <span className="absolute left-[31%] bottom-[16%] h-1 w-1 rounded-full bg-white/90" />
      <span className="absolute left-[44%] bottom-[34%] h-1 w-1 rounded-full bg-white/80" />
      <span className="absolute left-[58%] bottom-[20%] h-1 w-1 rounded-full bg-white/90" />
      <span className="absolute left-[72%] bottom-[32%] h-1 w-1 rounded-full bg-white/80" />
      <span className="absolute left-[86%] bottom-[22%] h-1 w-1 rounded-full bg-white/90" />
    </div>
  );
}

export default function BuyerLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPublicAuthRoute = isAuthRoute(pathname);

  const hideGlobalHeader = pathname === "/";
  const hideBottomNav = isPublicAuthRoute;

  return (
    <CartProvider>
      <SearchProvider>
        <BuyerCityProvider>
          <div className="min-h-dvh flex justify-center bg-gray-100 px-2 py-4">
            <div className="w-full max-w-md">
              <div
                className="
                  relative
                  h-[calc(100dvh-2rem)]
                  overflow-hidden
                  rounded-[28px]
                  bg-gray-50
                  shadow-lg
                  ring-1 ring-black/10
                  flex flex-col
                "
              >
                <SessionExpiredModal />

                {!hideGlobalHeader ? (
                  <div className="shrink-0">
                    <BuyerHeader />
                  </div>
                ) : null}

                <main
                  className={[
                    "flex-1 min-h-0 overflow-y-auto no-scrollbar",
                    hideBottomNav
                      ? "pb-0"
                      : "pb-[calc(6rem+env(safe-area-inset-bottom))]",
                  ].join(" ")}
                >
                  <Suspense fallback={<AuthGateFallback />}>
                    <AuthGate pathname={pathname}>{children}</AuthGate>
                  </Suspense>
                </main>

                {hideBottomNav ? <BottomKronixGlow /> : null}

                {!hideBottomNav ? (
                  <div className="shrink-0 sticky bottom-0 bg-gray-50">
                    <BottomNav />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </BuyerCityProvider>
      </SearchProvider>
    </CartProvider>
  );
}