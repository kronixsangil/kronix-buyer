// app/(buyer)/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useBuyerCity } from "@/components/buyer/CityContext";
import { logout } from "@/lib/authActions";
import { useCart } from "@/components/buyer/CartContext";

type MeResponse =
  | {
      user: {
        sub?: string;
        name?: string;
        email?: string;
        phone?: string;
      };
    }
  | { user?: any };

type KronixOption = {
  href: string;
  title: string;
  subtitle: string;
  featured?: boolean;
  iconEmoji?: string;
  useMotoArt?: boolean;
};

const options: KronixOption[] = [
  {
    href: "/comprar",
    title: "Tienda en Línea",
    subtitle: "Compra en nuestras tiendas afiliadas y te lo llevamos a donde quieras",
    featured: true,
  },
  {
  href: "/kronix/recoger",
  title: "Domicilio Express",
  subtitle: "Pide un motorizado rápido para una tarea simple",
  useMotoArt: true,
  iconEmoji: "/branding/kronix/recoger-llevar.png",
},
{
  href: "/kronix/enviar",
  title: "KroniX Envíos",
  subtitle: "Envíos para negocios, tiendas y clientes frecuentes",
  useMotoArt: true,
  iconEmoji: "/branding/kronix/Enviar-Paquete1.png",
},
  {
    href: "/kronix/diligencia",
    title: "Domicilios y Diligencias",
    subtitle: "Pagos, compras, trámites... lo que necesites",
    useMotoArt: false,
    iconEmoji: "/branding/kronix/check-list.png",
  },
];

function getInitials(input?: string) {
  const s = String(input ?? "").trim();
  if (!s) return "BU";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "B";
  const b =
    parts.length > 1
      ? parts[parts.length - 1]?.[0] ?? ""
      : parts[0]?.[1] ?? "";
  return (a + b).toUpperCase();
}

function HeaderCut() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[92px] overflow-hidden">
      <svg
        viewBox="0 0 400 120"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <path
          d="M0,18 C70,28 110,96 200,96 C290,96 330,28 400,18 L400,120 L0,120 Z"
          fill="#ffffff"
        />
      </svg>
    </div>
  );
}

function LeftMiniIcon({ src }: { src: string }) {
  return (
    <div className="relative h-[54px] w-[54px] shrink-0">
      <Image
        src={src}
        alt="icon"
        fill
        className="object-contain scale-150"
        sizes="54px"
      />
    </div>
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
      {icon}

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

function FeaturedCard({ item }: { item: KronixOption }) {
  return (
    <Link
      href={item.href}
      className="group block min-h-[104px] overflow-hidden rounded-[24px] border border-blue-600/20 bg-white shadow-[0_10px_22px_rgba(10,32,78,0.14)] transition hover:shadow-[0_12px_24px_rgba(10,32,78,0.18)] active:scale-[0.995]"
    >
      <div className="relative flex min-h-[104px] items-center overflow-hidden rounded-[24px] bg-gradient-to-br from-[#03102b] via-[#082b63] to-gray-800 px-2 py-1 text-white">
        <div className="absolute -left-8 top-3 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-white/12 blur-2xl" />

        <div className="relative flex w-full items-center gap-2">
          <div className="relative h-[50px] w-[50px] shrink-0">
            <Image
              src="/branding/kronix/card-comprar6.png"
              alt="Comprar algo"
              fill
              className="object-contain drop-shadow-sm scale-140 translate-y-[-5px]"
              sizes="60px"
              priority
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-[24px] font-black leading-tight">{item.title}</div>
            <div className="mt-1 text-[14px] font-semibold text-white/90">{item.subtitle}</div>
          </div>

          <div className="text-[30px] font-black text-white/75 transition group-hover:translate-x-0.5">
            ›
          </div>
        </div>
      </div>
    </Link>
  );
}

function StandardCard({ item }: { item: KronixOption }) {
  return (
    <Link
      href={item.href}
      className="group block h-[110px] overflow-hidden rounded-[24px] border border-slate-200 bg-white px-4 py-1 shadow-[0_8px_18px_rgba(15,23,42,0.08)] transition hover:shadow-[0_10px_20px_rgba(15,23,42,0.11)] active:scale-[0.995]"
    >
      <div className="flex h-full items-center gap-3">
        {/* ICONO IZQUIERDO */}
        <div className="shrink-0">
          <LeftMiniIcon src={item.iconEmoji || ""} />
        </div>

        {/* TEXTO */}
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          {/* TITULO */}
<div
  className={[
    "ml-1 font-black text-slate-900 leading-tight whitespace-nowrap",
    item.title === "Domicilios y Diligencias"
      ? "text-[18px]"
      : "text-[22px]",
  ].join(" ")}
>
  {item.title}
</div>

          {/* SUBTITULO */}
          <div
            className={[
              "ml-4 mt-1 font-medium text-slate-500",
              "text-[13px] leading-[16px]",
              "line-clamp-3",
              item.title === "Domicilio Express"
                ? "max-w-[200px]"
                : "",
              item.title === "KroniX Envíos"
                ? "max-w-[200px]"
                : "",
              item.title === "Domicilios y Diligencias"
                ? "max-w-[200px]"
                : "",
            ].join(" ")}
          >
            {item.subtitle}
          </div>
        </div>

        {/* MOTO / IMAGEN DERECHA */}
        {item.useMotoArt ? (
          <div className="relative h-[62px] w-[102px] shrink-0">
            <Image
              src={
                item.title === "KroniX Envíos"
                  ? "/branding/kronix/enviar-Paquete2.png"
                  : "/branding/kronix/card-moto.png"
              }
              alt={item.title}
              fill
              className="object-contain opacity-95 scale-[1.65] translate-x-2"
              sizes="102px"
            />
          </div>
        ) : null}

        {/* CHEVRON */}
        <div className="shrink-0 text-[28px] font-black text-slate-300 transition group-hover:translate-x-0.5">
          ›
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const { city } = useBuyerCity();
  const { items } = useCart();

  const [me, setMe] = useState<MeResponse["user"] | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const cartCount = items.reduce((acc, it) => acc + it.qty, 0);

  useEffect(() => {
    let alive = true;

    apiFetch<MeResponse>("/auth/me", {
      method: "GET",
      cache: "no-store",
    })
      .then((data) => {
        if (!alive) return;
        const user = (data as any)?.user ?? null;
        setMe(user && typeof user === "object" ? user : null);
      })
      .catch(() => {
        if (!alive) return;
        setMe(null);
      });

    return () => {
      alive = false;
    };
  }, []);

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

  const cityName = String(city?.name ?? "").trim() || "Tu ciudad";
  const cityDepartment = String(city?.department ?? "").trim();

  const isLoggedIn = !!(me && (me as any)?.sub);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      await logout();
    } finally {
      setLoggingOut(false);
      setMenuOpen(false);
      window.dispatchEvent(new Event("ct-auth-changed"));
      window.dispatchEvent(new Event("auth:changed"));
      window.location.href = "/";
    }
  }

  return (
    <div className="min-h-full bg-white">
      <section
        className="relative overflow-visible px-4 pb-[72px] pt-4 text-white"
        style={{
          background:
            "linear-gradient(180deg, #03102b 0%, #082b63 34%, #0a5f9c 66%, black 100%)",
        }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent_32%,transparent)]" />

        <div className="pointer-events-none absolute inset-0 opacity-90">
          <div className="absolute left-[22px] top-[18px] h-[4px] w-[4px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)]" />
          <div className="absolute left-[56px] top-[34px] h-[3px] w-[3px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)]" />
          <div className="absolute left-[132px] top-[24px] h-[4px] w-[4px] rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,1)]" />
          <div className="absolute left-[184px] top-[18px] h-[3px] w-[3px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)]" />
          <div className="absolute right-[40px] top-[24px] h-[4px] w-[4px] rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,1)]" />
          <div className="absolute right-[82px] top-[42px] h-[3px] w-[3px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)]" />
          <div className="absolute right-[122px] top-[18px] h-[3px] w-[3px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)]" />
          <div className="absolute left-[88px] top-[62px] h-[3px] w-[3px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)]" />
          <div className="absolute right-[158px] top-[62px] h-[4px] w-[4px] rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,1)]" />
          <div className="absolute left-[220px] top-[50px] h-[3px] w-[3px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)]" />
        </div>

        <div className="absolute -left-14 top-14 h-28 w-28 rounded-full bg-cyan-300/10 blur-2xl" />
        <div className="absolute right-[-18px] bottom-4 h-28 w-28 rounded-full bg-emerald-200/14 blur-2xl" />
        <div className="absolute left-1/2 top-10 h-24 w-44 -translate-x-1/2 rounded-full bg-white/8 blur-2xl" />

        <div className="relative z-10 flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="grid h-12 w-12 place-items-center rounded-full border border-white/20 bg-white/10 shadow-sm backdrop-blur"
            aria-label="Abrir menú"
          >
            <span className="flex h-5 w-5 flex-col items-center justify-center gap-[4px]">
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

          <div className="flex flex-1 items-center justify-center px-1">
            <div className="relative h-[96px] w-[274px] sm:w-[292px]">
              <Image
                src="/branding/kronix/header-logo.png"
                alt="KroniX"
                fill
                className="object-contain drop-shadow-[0_10px_26px_rgba(0,0,0,0.45)] scale-110"
                sizes="292px"
                priority
              />
            </div>
          </div>

          <Link
            href="/profile"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 text-sm font-black text-white shadow-sm backdrop-blur"
            aria-label="Perfil"
          >
            {initials}
          </Link>
        </div>

        <div className="relative z-10 -mt-1 flex items-center justify-center gap-2 text-cyan-100">
          <span className="text-[14px]">📍</span>
          <span className="text-[14px] font-semibold">
            {cityName}
            {cityDepartment ? ` - ${cityDepartment}` : ""}
          </span>
        </div>

        {menuOpen ? (
          <div className="absolute left-4 right-4 top-[96px] z-[120] overflow-hidden rounded-[26px] border border-gray-200 bg-white shadow-2xl">
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
                  <div className="grid h-14 w-14 place-items-center rounded-full bg-white/15 font-extrabold ring-1 ring-white/20 backdrop-blur-sm">
                    {isLoggedIn ? initials : "KR"}
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
                              `${cityName}${cityDepartment ? `, ${cityDepartment}` : ""}`
                          )
                        : `${cityName}${cityDepartment ? `, ${cityDepartment}` : ""}`}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white">
                <MenuRow
                  href="/"
                  onClick={() => setMenuOpen(false)}
                  label="Inicio"
                  subtitle="Menú principal"
                  icon={
                    <KronixMenuImageIcon
                      src="/icons/inicio.png"
                      alt="Inicio"
                      scale={1.12}
                      tx={0}
                      ty={0}
                    />
                  }
                />
                <MenuRow
                  href="/comprar"
                  onClick={() => setMenuOpen(false)}
                  label="Comprar algo"
                  subtitle="Negocios y productos"
                  icon={
                    <KronixMenuImageIcon
                      src="/icons/compraralgo.png"
                      alt="Comprar algo"
                      scale={1.12}
                      tx={0}
                      ty={0}
                    />
                  }
                />
                <MenuRow
                  href="/orders"
                  onClick={() => setMenuOpen(false)}
                  label="Pedidos"
                  subtitle="Tus órdenes y estados"
                  icon={
                    <KronixMenuImageIcon
                      src="/icons/pedidos.png"
                      alt="Pedidos"
                      scale={1.12}
                      tx={0}
                      ty={0}
                    />
                  }
                />
                <MenuRow
                  href="/cart"
                  onClick={() => setMenuOpen(false)}
                  label="Carrito"
                  subtitle="Productos agregados"
                  icon={
                    <KronixMenuImageIcon
                      src="/icons/carrito.png"
                      alt="Carrito"
                      scale={1.12}
                      tx={0}
                      ty={0}
                    />
                  }
                  badge={cartCount > 0 ? String(cartCount) : null}
                />
                <MenuRow
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  label="Perfil"
                  subtitle="Cuenta y configuración"
                  icon={
                    <KronixMenuImageIcon
                      src="/icons/perfil.png"
                      alt="Perfil"
                      scale={1.12}
                      tx={0}
                      ty={0}
                    />
                  }
                />
                <MenuRow
                  href="/profile/info"
                  onClick={() => setMenuOpen(false)}
                  label="Tu información"
                  subtitle="Datos personales básicos"
                  icon={
                    <KronixMenuImageIcon
                      src="/icons/informacion.png"
                      alt="Tu información"
                      scale={1.12}
                      tx={0}
                      ty={0}
                    />
                  }
                />
                <MenuRow
                  href="/profile/security"
                  onClick={() => setMenuOpen(false)}
                  label="Seguridad"
                  subtitle="Contraseña y sesiones"
                  icon={
                    <KronixMenuImageIcon
                      src="/icons/seguridad.png"
                      alt="Seguridad"
                      scale={1.12}
                      tx={0}
                      ty={0}
                    />
                  }
                />
                <MenuRow
                  href="/profile/cards"
                  onClick={() => setMenuOpen(false)}
                  label="Tarjetas"
                  subtitle="Tus métodos de pago"
                  icon={
                    <KronixMenuImageIcon
                      src="/icons/tarjetas.png"
                      alt="Tarjetas"
                      scale={1.1}
                      tx={0}
                      ty={0}
                    />
                  }
                />
                <MenuRow
                  href="/profile/addresses"
                  onClick={() => setMenuOpen(false)}
                  label="Direcciones"
                  subtitle="Se guardan con tus pedidos"
                  icon={
                    <KronixMenuImageIcon
                      src="/icons/direcciones.png"
                      alt="Direcciones"
                      scale={1.12}
                      tx={0}
                      ty={0}
                    />
                  }
                />
                <MenuRow
                  href="/profile/privacy"
                  onClick={() => setMenuOpen(false)}
                  label="Privacidad"
                  subtitle="Controla tu cuenta y datos"
                  icon={
                    <KronixMenuImageIcon
                      src="/icons/privacidad.png"
                      alt="Privacidad"
                      scale={1.12}
                      tx={0}
                      ty={0}
                    />
                  }
                />
                <MenuRow
                  href="/profile/support"
                  onClick={() => setMenuOpen(false)}
                  label="Soporte"
                  subtitle="Ayuda y contacto"
                  icon={
                    <KronixMenuImageIcon
                      src="/icons/soporte.png"
                      alt="Soporte"
                      scale={1.12}
                      tx={0}
                      ty={0}
                    />
                  }
                />

                {isLoggedIn ? (
                  <MenuRow
                    onClick={handleLogout}
                    label={loggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
                    subtitle="Salir de tu cuenta actual"
                    icon={
                    <KronixMenuImageIcon
                      src="/icons/cerrarsesion.png"
                      alt="Soporte"
                      scale={1.12}
                      tx={0}
                      ty={0}
                    />
                  }
                  />
                ) : (
                  <MenuRow
                    href="/login?next=/"
                    onClick={() => setMenuOpen(false)}
                    label="Iniciar sesión"
                    subtitle="Accede a tu cuenta"
                    icon={
                      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gray-50 text-gray-700 ring-1 ring-gray-200">
                        <span aria-hidden="true">👤</span>
                      </div>
                    }
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

        <HeaderCut />
      </section>

      <section className="relative z-0 -mt-[2px] bg-white px-4 pb-5 pt-1">
        <div className="text-center">
          <h1 className="text-[31px] font-black leading-none tracking-tight text-[#06153a]">
            ¿Qué necesitas hoy?
          </h1>
          <p className="mt-3 text-[15px] font-medium text-slate-500">
            Elige un servicio y lo resolvemos por ti
          </p>
        </div>

        <div className="mt-5 space-y-3">
          {options.map((item) =>
            item.featured ? (
              <FeaturedCard key={item.title} item={item} />
            ) : (
              <StandardCard key={item.title} item={item} />
            )
          )}
        </div>
      </section>
    </div>
  );
}