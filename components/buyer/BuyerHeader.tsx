// components/buyer/BuyerHeader.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useSearch } from "@/components/buyer/SearchContext";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { logout } from "@/lib/authActions";
import { useBuyerCity } from "@/components/buyer/CityContext";
import { useCart } from "@/components/buyer/CartContext";

type MeResponse =
  | {
      user: {
        sub?: string;
        role?: string;
        phone?: string;
        email?: string;
        storeId?: string | null;
        storeCode?: string | null;
        name?: string;
        id?: string;
        isKronixPlusApproved?: boolean;
        kronixPlusStatus?: "NONE" | "PENDING" | "APPROVED" | "REJECTED" | string;
        kronixPlusApprovedAt?: string | null;
        profileImageUrl?: string | null;
      };
    }
  | { user?: any };

function getInitials(input?: string) {
  const s = String(input ?? "").trim();
  if (!s) return "U";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "U";
  const b =
    parts.length > 1
      ? parts[parts.length - 1]?.[0] ?? ""
      : parts[0]?.[1] ?? "";
  return (a + b).toUpperCase();
}

function normalizeProfileImageUrl(value?: string | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) return raw;
  if (raw.startsWith("/api/")) return raw;
  if (raw.startsWith("/")) return `/api/buyer${raw}`;
  return raw;
}


function IconHome({ active }: { active?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {active ? <path d="M10 21v-6h4v6" stroke="currentColor" strokeWidth="2" /> : null}
    </svg>
  );
}

function IconOrders() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 3h10a2 2 0 0 1 2 2v16l-3-2-3 2-3-2-3 2V5a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M9 8h6M9 12h6M9 16h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconCart() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 7h15l-2 10H8L6 7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M6 7 5 4H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM18 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function IconProfile() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M4 21a8 8 0 0 1 16 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconChevron() {
  return <span className="text-gray-400">›</span>;
}

type KronixMenuImageIconProps = {
  src: string;
  alt: string;
  scale?: number;
  tx?: number;
  ty?: number;
};

function KronixMenuImageIcon({
  src,
  alt,
  scale = 1,
  tx = 0,
  ty = 0,
}: KronixMenuImageIconProps) {
  return (
    <div className="relative h-10 w-10 overflow-hidden rounded-2xl bg-gray-50 ring-1 ring-gray-200">
      <div
        className="relative h-full w-full"
        style={{
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transformOrigin: "center",
        }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          className="object-contain"
          sizes="40px"
        />
      </div>
    </div>
  );
}

function MenuRow({
  href,
  label,
  subtitle,
  icon,
  onClick,
  badge,
}: {
  href?: string;
  label: string;
  subtitle?: string;
  icon: React.ReactNode;
  onClick?: () => void;
  badge?: string | null;
}) {
  const content = (
    <div className="flex items-center gap-3 px-4 py-4 transition hover:bg-gray-50">
      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gray-50 ring-1 ring-gray-200 overflow-hidden">
  {typeof icon === "string" ? (
    <Image
      src={icon}
      alt={label}
      width={28}
      height={28}
      className="object-contain"
    />
  ) : (
    icon
  )}
</div>

      <div className="min-w-0 flex-1">
        <div className="text-sm font-extrabold text-gray-900">{label}</div>
        {subtitle ? <div className="text-xs text-gray-600">{subtitle}</div> : null}
      </div>

      {badge ? (
        <span className="rounded-full bg-green-600 px-2 py-1 text-[10px] font-extrabold text-white">
          {badge}
        </span>
      ) : (
        <IconChevron />
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} onClick={onClick} className="block border-b border-gray-100 last:border-b-0">
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full border-b border-gray-100 text-left last:border-b-0"
    >
      {content}
    </button>
  );
}

export default function BuyerHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const isShoppingHome = pathname === "/comprar";
  const showBack = !isShoppingHome;

  const { query, setQuery } = useSearch();
  const { city } = useBuyerCity();
  const { items } = useCart();

  const [hasLogo, setHasLogo] = useState(true);
  const [isChecking, setIsChecking] = useState(true);
  const [me, setMe] = useState<MeResponse["user"] | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const cartCount = items.reduce((acc, it) => acc + it.qty, 0);

  async function refreshMe() {
    try {
      setIsChecking(true);

      const data = await apiFetch<any>("/users/me", {
        method: "GET",
        cache: "no-store",
        suppressSessionExpiredEvent: true,
      } as any);

      const user = data && typeof data === "object"
        ? { ...data, sub: data.id ?? data.sub }
        : null;
      setMe(user && typeof user === "object" ? user : null);
    } catch {
      setMe(null);
    } finally {
      setIsChecking(false);
    }
  }

  useEffect(() => {
    refreshMe();
  }, [pathname]);

  useEffect(() => {
    const onAuthChanged = () => refreshMe();
    const onFocus = () => refreshMe();

    window.addEventListener("ct-auth-changed", onAuthChanged);
    window.addEventListener("auth:changed", onAuthChanged);
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("ct-auth-changed", onAuthChanged);
      window.removeEventListener("auth:changed", onAuthChanged);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const isLoggedIn = !!(me && (me as any)?.sub);
  const isPlusApproved =
    isLoggedIn &&
    (Boolean((me as any)?.isKronixPlusApproved) ||
      String((me as any)?.kronixPlusStatus ?? "").toUpperCase() === "APPROVED");

  const displayName = useMemo(() => {
    const n = String((me as any)?.name ?? "").trim();
    if (n) return n;
    const e = String((me as any)?.email ?? "").trim();
    if (e) return e.split("@")[0].replace(/[._-]/g, " ").trim();
    const p = String((me as any)?.phone ?? "").trim();
    if (p) return p;
    return "Usuario";
  }, [me]);

  const initials = useMemo(() => getInitials(displayName), [displayName]);
  const profileImageUrl = normalizeProfileImageUrl((me as any)?.profileImageUrl);

  const cityTitle = useMemo(() => {
    const name = String(city?.name ?? "").trim();
    return name || "Ciudad";
  }, [city]);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);

    // Limpieza visual inmediata: evita que quede mostrando sesión vieja si la red tarda.
    setMe(null);
    setMenuOpen(false);

    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
  <>
    <header className="sticky top-0 z-40 border-b border-white bg-white/95 backdrop-blur">
      <div className="relative w-full">
        <div
          className="
            relative overflow-hidden
            border-b border-white
            px-3 pt-2 pb-2
          "
          style={{
            background:
              "var(--kx-header-gradient, linear-gradient(180deg, #03102b 0%, #0b356d 42%, #4a79b7 70%, #ffffff 100%))",
          }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent_32%,transparent)]" />

          <div className="pointer-events-none absolute inset-0 opacity-95">
            <div className="absolute left-[18px] top-[16px] h-[3px] w-[3px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)]" />
            <div className="absolute left-[46px] top-[28px] h-[2px] w-[2px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)]" />
            <div className="absolute left-[118px] top-[18px] h-[3px] w-[3px] rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,1)]" />
            <div className="absolute left-[166px] top-[14px] h-[2px] w-[2px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)]" />
            <div className="absolute right-[34px] top-[16px] h-[3px] w-[3px] rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,1)]" />
            <div className="absolute right-[72px] top-[34px] h-[2px] w-[2px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)]" />
            <div className="absolute right-[114px] top-[16px] h-[2px] w-[2px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)]" />
            <div className="absolute left-[82px] top-[52px] h-[2px] w-[2px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)]" />
            <div className="absolute right-[150px] top-[50px] h-[3px] w-[3px] rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,1)]" />
            <div className="absolute left-[212px] top-[40px] h-[2px] w-[2px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)]" />
          </div>

          <div className="absolute -left-10 top-8 h-24 w-24 rounded-full bg-cyan-300/10 blur-2xl" />
          <div className="absolute right-[-10px] bottom-3 h-24 w-24 rounded-full bg-blue-200/10 blur-2xl" />
          <div className="absolute left-1/2 top-6 h-20 w-40 -translate-x-1/2 rounded-full bg-white/8 blur-2xl" />

          <div className="relative flex min-h-[72px] items-start">
            <div className="flex w-16 items-start justify-start pt-1">
              {showBack ? (
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-white/10 shadow-sm backdrop-blur hover:bg-white/15"
                  aria-label="Volver"
                >
                  <span className="text-xl leading-none text-white">←</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  className="group relative grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-white/10 shadow-sm backdrop-blur transition hover:bg-white/15"
                  aria-label="Abrir menú"
                >
                  <span className="relative flex h-5 w-5 flex-col items-center justify-center gap-[4px]">
                    <span
                      className={`block h-[2.5px] w-5 rounded-full bg-white transition-all duration-200 ${
                        menuOpen ? "translate-y-[6px] rotate-45" : ""
                      }`}
                    />
                    <span
                      className={`block h-[2.5px] w-5 rounded-full bg-white transition-all duration-200 ${
                        menuOpen ? "opacity-0" : ""
                      }`}
                    />
                    <span
                      className={`block h-[2.5px] w-5 rounded-full bg-white transition-all duration-200 ${
                        menuOpen ? "-translate-y-[6px] -rotate-45" : ""
                      }`}
                    />
                  </span>
                </button>
              )}
            </div>

            <Link
              href="/"
              className="absolute left-1/2 top-0 flex -translate-x-1/2 flex-col items-center justify-start pt-0.5"
            >
              <div className="relative h-[56px] w-[170px] sm:w-[180px]">
                {hasLogo ? (
                  <div
                    role="img"
                    aria-label="KroniX"
                    className="h-full w-full bg-contain bg-center bg-no-repeat drop-shadow-[0_8px_18px_rgba(0,0,0,0.35)] scale-130 -translate-x-3 translate-y-1"
                    style={{
                      backgroundImage:
                        "var(--kx-header-logo, url('/branding/kronix/header-logo.png'))",
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-2xl bg-white/10 text-[24px] font-black text-white backdrop-blur">
                    KroniX
                  </div>
                )}
              </div>

              <div className="-mt-1 flex items-center justify-center gap-1 text-white">
                <span className="text-[12px]">📍</span>
                <span className="text-[13px] font-semibold leading-none">{cityTitle}</span>
              </div>
            </Link>

            {isPlusApproved ? (
              <div
                className="pointer-events-none absolute z-30"
                style={{
                  left: "50%",
                  top: "45px",
                  transform: "translate(180px, -25px) scale(1)",
                  transformOrigin: "center",
                }}
                aria-label="Cliente KroniX Plus aprobado"
                title="KroniX Plus"
              >
                <div className="relative h-[30px] w-[30px]">
                  <Image
                    src="/branding/kronix/plus.png"
                    alt="KroniX Plus"
                    fill
                    className="object-contain"
                    sizes="30px"
                  />
                </div>
              </div>
            ) : null}

            <div className="ml-auto flex w-20 flex-col items-center justify-start pt-0.5">
              <Link
                href="/profile"
                className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border border-white/20 bg-white/10 shadow-sm backdrop-blur hover:opacity-90"
                aria-label="Ir a Perfil"
                title="Perfil"
              >
                {isLoggedIn ? (
                  profileImageUrl ? (
                    <img
                      src={profileImageUrl}
                      alt="Foto de perfil"
                      className="block h-full w-full object-cover"
                    />
                  ) : (
                    <>
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white-400 to-white-600" />
                      <div className="relative z-10 grid h-full w-full place-items-center">
                        <span className="text-sm font-extrabold text-white">{initials}</span>
                      </div>
                    </>
                  )
                ) : (
                  <div className="absolute inset-0 rounded-full bg-white/14" />
                )}
              </Link>

              <div className="mt-1 min-h-[28px] text-center leading-tight">
                {isChecking ? (
                  <span className="text-[11px] font-semibold text-white/70">...</span>
                ) : isLoggedIn ? (
                  <div className="flex items-center justify-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                    <span className="text-[11px] font-extrabold text-white">En Línea</span>
                  </div>
                ) : (
                  <Link
                    href="/login?next=/comprar"
                    className="inline-block text-[10px] font-extrabold leading-tight text-white hover:underline"
                  >
                    Iniciar
                    <br />
                    sesión
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {isShoppingHome ? (
          <div className="px-4 pt-0.5 pb-2">
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
              <span className="text-base text-gray-400" aria-hidden="true">
                🔎
              </span>

              <input
                suppressHydrationWarning
                type="text"
                placeholder="¿Qué estás buscando?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent text-[14px] outline-none placeholder:text-gray-400"
              />

              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              ) : null}

              <button
                type="button"
                className="rounded-lg bg-green-600 px-3 py-1.5 text-[13px] font-extrabold text-white hover:bg-green-700"
              >
                Buscar
              </button>
            </div>
          </div>
        ) : null}

        {isShoppingHome ? (
          <div
            className={`absolute left-4 right-4 top-[96px] z-50 overflow-hidden rounded-[26px] border border-gray-200 bg-white shadow-2xl transition-all duration-300 ${
              menuOpen
                ? "pointer-events-auto max-h-[calc(100dvh-11.5rem)] opacity-100"
                : "pointer-events-none max-h-0 opacity-0"
            }`}
          >
            <div className="no-scrollbar max-h-[calc(100dvh-11.5rem)] overflow-y-auto">
              <div className="relative overflow-hidden border-b border-white/10 px-4 py-4 text-white">
                <div className="absolute inset-0 bg-gradient-to-br from-[#0a1f44] via-[#0b5ed7] to-black" />

                <div className="absolute inset-0 pointer-events-none opacity-95">
                  <span className="absolute left-[8%] top-[18%] h-[3px] w-[3px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)]" />
                  <span className="absolute left-[18%] top-[30%] h-[2px] w-[2px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)]" />
                  <span className="absolute left-[30%] top-[12%] h-[3px] w-[3px] rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,1)]" />
                  <span className="absolute left-[44%] top-[24%] h-[2px] w-[2px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)]" />
                  <span className="absolute left-[56%] top-[14%] h-[3px] w-[3px] rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,1)]" />
                  <span className="absolute left-[72%] top-[22%] h-[2px] w-[2px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)]" />
                  <span className="absolute right-[10%] top-[16%] h-[3px] w-[3px] rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,1)]" />
                  <span className="absolute right-[18%] top-[34%] h-[2px] w-[2px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)]" />
                  <span className="absolute left-[22%] top-[58%] h-[2px] w-[2px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)]" />
                  <span className="absolute right-[28%] top-[56%] h-[3px] w-[3px] rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,1)]" />
                </div>

                <div className="absolute -left-10 top-6 h-24 w-24 rounded-full bg-cyan-300/10 blur-2xl" />
                <div className="absolute right-[-8px] bottom-2 h-24 w-24 rounded-full bg-emerald-200/10 blur-2xl" />
                <div className="absolute left-1/2 top-4 h-20 w-40 -translate-x-1/2 rounded-full bg-white/8 blur-2xl" />

                <div className="relative flex items-center gap-3">
                  <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-white/15 font-extrabold ring-1 ring-white/20 backdrop-blur-sm">
                    {isLoggedIn && profileImageUrl ? (
                      <img src={profileImageUrl} alt="Foto de perfil" className="block h-full w-full object-cover" />
                    ) : (
                      isLoggedIn ? initials : "KR"
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-lg font-extrabold text-white">
                      {isLoggedIn ? `¡Hola ${displayName}!` : "KroniX"}
                    </div>
                    <div className="truncate text-sm text-white/90">
                      {isLoggedIn
                        ? String(
                            (me as any)?.email ??
                              (me as any)?.phone ??
                              `${city?.name ?? "Ciudad"}, ${city?.department ?? ""}`
                          )
                        : `${city?.name ?? "Ciudad"}, ${city?.department ?? ""}`}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white">
                <MenuRow href="/" onClick={() => setMenuOpen(false)} label="Inicio" subtitle="Menú principal" icon={<KronixMenuImageIcon src="/icons/inicio.png" alt="Tu información" scale={1.12} tx={0} ty={0} />} />
                <MenuRow href="/comprar" onClick={() => setMenuOpen(false)} label="Comprar algo" subtitle="Negocios y productos" icon={<KronixMenuImageIcon src="/icons/compraralgo.png" alt="Tu información" scale={1.12} tx={0} ty={0} />} />
                <MenuRow href="/orders" onClick={() => setMenuOpen(false)} label="Pedidos" subtitle="Tus órdenes y estados" icon={<KronixMenuImageIcon src="/icons/pedidos.png" alt="Tu información" scale={1.12} tx={0} ty={0} />} />
                <MenuRow href="/cart" onClick={() => setMenuOpen(false)} label="Carrito" subtitle="Productos agregados" icon={<KronixMenuImageIcon src="/icons/carrito.png" alt="Tu información" scale={1.12} tx={0} ty={0} />} badge={cartCount > 0 ? String(cartCount) : null} />
                <MenuRow href="/profile" onClick={() => setMenuOpen(false)} label="Perfil" subtitle="Cuenta y configuración" icon={<KronixMenuImageIcon src="/icons/perfil.png" alt="Tu información" scale={1.12} tx={0} ty={0} />} />
                <MenuRow href="/profile/info" onClick={() => setMenuOpen(false)} label="Tu información" subtitle="Datos personales básicos" icon={<KronixMenuImageIcon src="/icons/informacion.png" alt="Tu información" scale={1.12} tx={0} ty={0} />} />
                <MenuRow href="/profile/security" onClick={() => setMenuOpen(false)} label="Seguridad" subtitle="Contraseña y sesiones" icon={<KronixMenuImageIcon src="/icons/seguridad.png" alt="Seguridad" scale={1.12} tx={0} ty={0} />} />
                <MenuRow href="/profile/cards" onClick={() => setMenuOpen(false)} label="Tarjetas" subtitle="Tus métodos de pago" icon={<KronixMenuImageIcon src="/icons/tarjetas.png" alt="Tarjetas" scale={1.1} tx={0} ty={0} />} />
                <MenuRow href="/profile/addresses" onClick={() => setMenuOpen(false)} label="Direcciones" subtitle="Se guardan con tus pedidos" icon={<KronixMenuImageIcon src="/icons/direcciones.png" alt="Direcciones" scale={1.12} tx={0} ty={0} />} />
                <MenuRow href="/profile/privacy" onClick={() => setMenuOpen(false)} label="Privacidad" subtitle="Controla tu cuenta y datos" icon={<KronixMenuImageIcon src="/icons/privacidad.png" alt="Privacidad" scale={1.12} tx={0} ty={0} />} />
                <MenuRow href="/profile/support" onClick={() => setMenuOpen(false)} label="Soporte" subtitle="Ayuda y contacto" icon={<KronixMenuImageIcon src="/icons/soporte.png" alt="Soporte" scale={1.12} tx={0} ty={0} />} />

                {isLoggedIn ? (
                  <MenuRow
                    onClick={handleLogout}
                    label={loggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
                    subtitle="Salir de tu cuenta actual"
                    icon={<KronixMenuImageIcon src="/icons/cerrarsesion.png" alt="Soporte" scale={1.12} tx={0} ty={0} />}
                  />
                ) : (
                  <MenuRow
                    href="/login?next=/comprar"
                    onClick={() => setMenuOpen(false)}
                    label="Iniciar sesión"
                    subtitle="Accede a tu cuenta"
                    icon={<span aria-hidden="true">👤</span>}
                  />
                )}
              </div>
            </div>

            <style jsx>{`
              .no-scrollbar {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
              .no-scrollbar::-webkit-scrollbar {
                display: none;
              }
            `}</style>
          </div>
        ) : null}
      </div>
    </header>
  </>
);
}
