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
import BuyerPrivacyModal from "@/components/buyer/legal/BuyerPrivacyModal";
import {
  checkBuyerPrivacyStatus,
  checkBuyerTermsStatus,
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

function ForcePasswordChangeScreen({ onGo }: { onGo: () => void }) {
  return (
    <div className="grid min-h-[calc(100dvh-150px)] place-items-center px-4 py-6">
      <div className="w-full rounded-3xl border border-amber-200 bg-white p-5 text-center shadow-sm">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-2xl ring-1 ring-amber-200">
          🔐
        </div>
        <h1 className="mt-4 text-lg font-extrabold text-gray-950">
          Cambio de contraseña requerido
        </h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-gray-600">
          Tu contraseña fue restablecida por KroniX. Debes cambiarla antes de continuar.
        </p>
        <button
          type="button"
          onClick={onGo}
          className="mt-5 w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-extrabold text-white"
        >
          Cambiar contraseña ahora
        </button>
      </div>
    </div>
  );
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
  const [checkingLegal, setCheckingLegal] = useState(true);

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  const isPublicAuthRoute = useMemo(() => isAuthRoute(pathname), [pathname]);

  useEffect(() => {
    let alive = true;

    async function validate() {
      if (isPublicAuthRoute) {
        if (alive) {
          setCheckingAuth(false);
          setCheckingLegal(false);
          setMustChangePassword(false);
        }
        return;
      }

      if (alive) {
        setCheckingAuth(true);
        setCheckingLegal(true);
      }

      try {
        const me = await getMe();

        if (!alive) return;

        if (!me?.user?.sub) {
          const next = buildNext(pathname, searchParams);
          router.replace(`/login?next=${encodeURIComponent(next)}`);
          return;
        }

        setTermsAccepted(false);
        setPrivacyAccepted(false);

        const forcePasswordChange = Boolean((me?.user as any)?.mustChangePassword);
        setMustChangePassword(forcePasswordChange);
        setCheckingAuth(false);

        if (forcePasswordChange) {
          setCheckingLegal(true);
          return;
        }

        try {
          const termsOk = await checkBuyerTermsStatus();

          if (!alive) return;

          setTermsAccepted(termsOk);

          if (!termsOk) {
            setPrivacyAccepted(false);
            setCheckingLegal(false);
            return;
          }

          const privacyOk = await checkBuyerPrivacyStatus();

          if (!alive) return;

          setPrivacyAccepted(privacyOk);
        } catch {
          if (!alive) return;

          setTermsAccepted(false);
          setPrivacyAccepted(false);
        } finally {
          if (alive) setCheckingLegal(false);
        }
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
      <div className="px-4 pb-6 pt-6">
        <div className="animate-pulse rounded-3xl bg-white p-6 shadow-sm">
          <div className="mb-4 h-6 w-40 rounded bg-gray-100" />
          <div className="mb-3 h-12 rounded bg-gray-100" />
          <div className="mb-3 h-12 rounded bg-gray-100" />
          <div className="h-12 rounded bg-gray-100" />
        </div>
      </div>
    );
  }

  if (!isPublicAuthRoute && mustChangePassword && pathname !== "/profile/security") {
    return (
      <ForcePasswordChangeScreen
        onGo={() => {
          router.replace("/profile/security");
        }}
      />
    );
  }

  const mustAcceptTerms =
    !isPublicAuthRoute && !checkingLegal && !termsAccepted;

  const mustAcceptPrivacy =
    !isPublicAuthRoute &&
    !checkingLegal &&
    termsAccepted &&
    !privacyAccepted;

  return (
    <>
      {children}

      {mustAcceptTerms ? (
        <BuyerTermsModal
          open
          force
          authenticated
          onClose={() => {}}
          onAccepted={() => {
            setTermsAccepted(true);
            setPrivacyAccepted(false);
          }}
        />
      ) : null}

      {mustAcceptPrivacy ? (
        <BuyerPrivacyModal
          open
          force
          authenticated
          onClose={() => {}}
          onAccepted={() => {
            setPrivacyAccepted(true);
          }}
        />
      ) : null}
    </>
  );
}

function AuthGateFallback() {
  return (
    <div className="px-4 pb-6 pt-6">
      <div className="animate-pulse rounded-3xl bg-white p-6 shadow-sm">
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
          <div className="fixed inset-0 overflow-hidden bg-[#03102b] buyer-app-shell">
            <div className="mx-auto h-[100dvh] w-full max-w-md overflow-hidden bg-[#03102b] shadow-lg md:my-4 md:h-[calc(100dvh-2rem)] md:rounded-[28px] md:ring-1 md:ring-black/10">
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
                      ? `${hideGlobalHeader ? "top-0" : topClass} bottom-0 pb-[calc(96px+env(safe-area-inset-bottom))]`
                      : `${topClass} bottom-[calc(88px+env(safe-area-inset-bottom))] pb-4`,
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
