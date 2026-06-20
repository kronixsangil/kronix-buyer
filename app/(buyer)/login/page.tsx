// app/(buyer)/login/page.tsx
"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getMe } from "@/lib/authClient";
import { login } from "@/lib/authActions";
import { useBuyerCity } from "@/components/buyer/CityContext";

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

function normalizePath(value: string) {
  const v = String(value || "").trim();
  if (!v.startsWith("/")) return "/";
  return v;
}

function isAuthRoute(path: string) {
  return (
    path === "/login" ||
    path.startsWith("/login?") ||
    path === "/register" ||
    path.startsWith("/register?") ||
    path === "/forgot-password" ||
    path.startsWith("/forgot-password?")
  );
}

function getSafeNext(rawNext: string, referrer: string) {
  const fallback = "/";
  const next = normalizePath(rawNext);

  if (!next || next === "/") return fallback;
  if (isAuthRoute(next)) return fallback;

  try {
    if (!referrer) return next;

    const refUrl = new URL(referrer);
    const sameOrigin =
      typeof window !== "undefined" && refUrl.origin === window.location.origin;

    if (!sameOrigin) return next;

    const refPath = `${refUrl.pathname}${refUrl.search}`;

    if (next === "/comprar" || next.startsWith("/comprar?")) {
      if (refPath === "/comprar" || refPath.startsWith("/comprar?")) {
        return next;
      }
      return fallback;
    }

    return next;
  } catch {
    if (next === "/comprar" || next.startsWith("/comprar?")) {
      return fallback;
    }
    return next;
  }
}

const loginBanners = [
  {
    id: "rapido",
    src: "/branding/kronix/kronix-login-banner-rapido.png",
    alt: "KroniX rápido",
    title: "Rápido",
  },
  {
    id: "seguro",
    src: "/branding/kronix/kronix-login-banner-seguro.png",
    alt: "KroniX seguro",
    title: "Seguro",
  },
  {
    id: "local",
    src: "/branding/kronix/kronix-login-banner-local.png",
    alt: "KroniX local",
    title: "Local",
  },
];

export default function BuyerLoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const { city, cities, citiesLoading, setCity } = useBuyerCity();

  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCityModal, setShowCityModal] = useState(false);
  const [resolvedNext, setResolvedNext] = useState("/");
  const [currentBanner, setCurrentBanner] = useState(0);

  const reasonFromQuery = useMemo(() => {
    return String(sp.get("reason") ?? "").trim().toLowerCase();
  }, [sp]);

  const nextFromQuery = useMemo(() => {
    return String(sp.get("next") ?? "").trim();
  }, [sp]);

  useEffect(() => {
    const safeNext = getSafeNext(
      nextFromQuery,
      typeof document !== "undefined" ? document.referrer : ""
    );
    setResolvedNext(safeNext);
  }, [nextFromQuery]);

  useEffect(() => {
    let alive = true;

    (async () => {
      const me = await getMe();
      if (!alive) return;

            if (me?.user?.sub) {
        const role = String(me?.user?.role ?? "").toUpperCase();

        if (role !== "BUYER" && role !== "DRIVER") {
          const { logout } = await import("@/lib/authActions");
          await logout();

          setError(
            "Esta cuenta pertenece a comercio o administrador. Usa la aplicación correspondiente."
          );
          setChecking(false);
          return;
        }

        router.replace(resolvedNext || "/");
        return;
      }

      setChecking(false);
    })();

    return () => {
      alive = false;
    };
  }, [router, resolvedNext]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % loginBanners.length);
    }, 5000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const canSubmit =
    emailOrPhone.trim().length >= 3 && password.trim().length >= 4 && !loading;

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      await login(emailOrPhone, password);
      const { clearSessionExpiredShown } = await import("@/lib/sessionExpired");
      clearSessionExpiredShown();
      router.replace(resolvedNext || "/");
    } catch (e: any) {
      const msg = String(e?.message ?? "");
            if (
        msg.toLowerCase().includes("no pertenece a buyer") ||
        msg.toLowerCase().includes("cuenta buyer")
      ) {
        setError(
          "Esta cuenta pertenece a conductor, comercio o administrador. Usa la aplicación correspondiente."
        );
      } else if (
        msg.toLowerCase().includes("inválidos") ||
        msg.toLowerCase().includes("invalid")
      ) {
        setError("Usuario o contraseña incorrectos.");
      } else {
        setError("No pudimos iniciar sesión. Intenta nuevamente.");
      }
      setLoading(false);
    }
  };

  function handleSelectCity(selectedCity: typeof city) {
    setCity(selectedCity);
    setShowCityModal(false);
  }

  if (checking) {
    return (
      <div className="px-4 pt-2 pb-4">
        <div className="rounded-3xl bg-white p-5 shadow-sm animate-pulse">
          <div className="mb-3 h-6 w-40 rounded bg-gray-100" />
          <div className="mb-2 h-12 rounded bg-gray-100" />
          <div className="mb-2 h-12 rounded bg-gray-100" />
          <div className="h-12 rounded bg-gray-100" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative px-4 pt-2 pb-5">
  
  {/* Degradado inferior estilo KroniX */}
  <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-28">
    <div className="h-full w-full bg-gradient-to-b from-transparent via-[#0b356d]/70 to-[#03102b]" />
    
    {/* estrellas */}
    <span className="absolute left-[10%] bottom-[20%] h-1 w-1 rounded-full bg-white/90" />
    <span className="absolute left-[25%] bottom-[35%] h-1 w-1 rounded-full bg-white/80" />
    <span className="absolute left-[40%] bottom-[15%] h-1 w-1 rounded-full bg-white/90" />
    <span className="absolute left-[60%] bottom-[30%] h-1 w-1 rounded-full bg-white/80" />
    <span className="absolute left-[75%] bottom-[18%] h-1 w-1 rounded-full bg-white/90" />
    <span className="absolute left-[88%] bottom-[28%] h-1 w-1 rounded-full bg-white/80" />
  </div>
        <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl">
          <div className="relative overflow-hidden px-5 pt-5 pb-6 text-white">
            <div className="absolute inset-0 bg-gradient-to-t from-white via-[#4a79b7] via-[#0b356d] via-40% to-[#03102b]" />

            <div className="absolute inset-0 pointer-events-none">
              <span className="absolute left-[8%] top-[18%] h-1 w-1 rounded-full bg-white/95" />
              <span className="absolute left-[18%] top-[30%] h-1 w-1 rounded-full bg-white/90" />
              <span className="absolute left-[29%] top-[14%] h-1 w-1 rounded-full bg-white/95" />
              <span className="absolute left-[41%] top-[24%] h-1 w-1 rounded-full bg-white/85" />
              <span className="absolute left-[54%] top-[12%] h-1 w-1 rounded-full bg-white/95" />
              <span className="absolute left-[66%] top-[28%] h-1 w-1 rounded-full bg-white/90" />
              <span className="absolute left-[78%] top-[16%] h-1 w-1 rounded-full bg-white/95" />
              <span className="absolute left-[88%] top-[26%] h-1 w-1 rounded-full bg-white/85" />
              <span className="absolute left-[12%] top-[42%] h-[3px] w-[3px] rounded-full bg-white/80" />
              <span className="absolute left-[73%] top-[40%] h-[3px] w-[3px] rounded-full bg-white/75" />
            </div>

            <div className="relative z-10 text-center">
              <div className="text-2xl font-extrabold text-white">
                Bienvenido a KroniX
              </div>
              <div className="mt-1.5 text-sm text-white/90">
                Accede a tu cuenta y continúa tus pedidos en segundos.
              </div>
            </div>
          </div>
          <div className="-mt-3 px-5 pb-4">
            <div className="rounded-3xl bg-white p-5 shadow-lg">
              <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2">                
                <div className="mt-1 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-extrabold text-emerald-900">
                      📍 {city.name}, {city.department}
                    </div>                    
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowCityModal(true)}
                    className="shrink-0 rounded-xl border border-emerald-300 bg-white px-4 py-2 text-xs font-extrabold text-emerald-800 hover:bg-emerald-100"
                  >
                    Cambiar
                  </button>
                </div>
              </div>

              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-gray-600">
                  Email o Teléfono
                </div>
                <input
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  placeholder="Ingresa tu email o número"
                  autoComplete="username"                  
                  className="mt-2 w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-[15px] font-semibold text-slate-900 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-blue-300 focus:bg-white"
                />
              </div>

              <div className="mt-4">
                <div className="text-xs font-bold uppercase tracking-wide text-gray-600">
                  Contraseña
                </div>

                <div className="relative mt-2">
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPass ? "text" : "password"}
                    placeholder="Ingresa tu contraseña"
                    autoComplete="current-password"
                    className="mt-2 w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-[15px] font-semibold text-slate-900 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-blue-300 focus:bg-white"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && canSubmit) handleSubmit();
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-gray-500 hover:text-gray-800"
                  >
                    {showPass ? "🙈" : "🔍"}
                  </button>
                </div>

                <div className="mt-2.5 flex items-center justify-end">
                  <a
                    href={`/forgot-password?next=${encodeURIComponent(resolvedNext || "/")}`}
                    className="text-xs font-extrabold text-blue-700 underline decoration-blue-300 hover:text-blue-900 hover:decoration-blue-600"
                  >
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
              </div>

              {reasonFromQuery === "session-expired" ? (
                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
                  Tu sesión expiró por seguridad. Inicia sesión nuevamente para continuar.
                </div>
              ) : null}

              {error ? (
                <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
                  {error}
                </div>
              ) : null}

              <button
                disabled={!canSubmit}
                onClick={handleSubmit}
                className={cx(
                  "mt-5 w-full rounded-2xl py-3 text-sm font-extrabold text-white transition-all duration-200",
                  "bg-green-600 hover:bg-green-700 active:scale-[0.98]",
                  "disabled:cursor-not-allowed disabled:opacity-50"
                )}
              >
                {loading ? "Ingresando…" : "INICIAR SESIÓN"}
              </button>

              <div className="mt-5 text-center text-sm text-gray-600">
                ¿No tienes cuenta?{" "}
                <a
                  href="/register"
                  className="font-extrabold text-blue-600 transition hover:text-blue-800"
                >
                  Crear cuenta
                </a>
              </div>
            </div>            
              <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50">
                <div className="relative aspect-[16/9] w-full">
                  {loginBanners.map((banner, index) => (
                    <div
                      key={banner.id}
                      className={[
                        "absolute inset-0 transition-opacity duration-700",
                        currentBanner === index
                          ? "opacity-100"
                          : "pointer-events-none opacity-0",
                      ].join(" ")}
                    >
                      <Image
                        src={banner.src}
                        alt={banner.alt}
                        fill
                        sizes="(max-width: 768px) 100vw, 420px"
                        className="object-cover"
                        priority={index === 0}
                      />
                    </div>
                  ))}
                </div>

                <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2">
                  {loginBanners.map((banner, index) => (
                    <button
                      key={banner.id}
                      type="button"
                      onClick={() => setCurrentBanner(index)}
                      aria-label={`Ver banner ${banner.title}`}
                      className={[
                        "h-2.5 rounded-full transition-all duration-300",
                        currentBanner === index
                          ? "w-7 bg-white shadow"
                          : "w-2.5 bg-white/65",
                      ].join(" ")}
                    />
                  ))}
                </div>
              </div>
            </div>
        </div>
      </div>

      {showCityModal ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-[24px] bg-white shadow-2xl ring-1 ring-black/5">
            <div className="border-b border-gray-100 px-4 py-4">
              <div className="text-base font-extrabold text-gray-900">
                Selecciona tu ciudad
              </div>
              <div className="mt-1 text-sm text-gray-500">
                Esta selección filtrará tiendas, home y pedidos.
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-4">
              {citiesLoading ? (
                <div className="text-sm font-semibold text-gray-500">
                  Cargando ciudades...
                </div>
              ) : !cities.length ? (
                <div className="text-sm font-semibold text-gray-500">
                  No hay ciudades activas.
                </div>
              ) : (
                <div className="space-y-3">
                  {cities.map((item) => {
                    const isSelected = item.slug === city.slug;

                    return (
                      <button
                        key={item.slug}
                        type="button"
                        onClick={() => handleSelectCity(item)}
                        className={[
                          "w-full rounded-2xl border px-4 py-4 text-left shadow-sm transition",
                          isSelected
                            ? "border-green-300 bg-green-50 ring-1 ring-green-200"
                            : "border-gray-200 bg-white hover:bg-gray-50",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-extrabold text-gray-900">
                              {item.name}, {item.department}
                            </div>
                            <div className="mt-1 text-xs font-medium text-gray-500">
                              {item.country}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            {item.isFeatured ? (
                              <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-extrabold text-amber-700">
                                Destacada
                              </span>
                            ) : null}

                            {isSelected ? (
                              <span className="rounded-full bg-green-600 px-2 py-1 text-[10px] font-extrabold text-white">
                                Actual
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 p-4">
              <button
                type="button"
                onClick={() => setShowCityModal(false)}
                className="w-full rounded-2xl border border-gray-200 bg-white py-3 text-sm font-extrabold text-gray-800 hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}