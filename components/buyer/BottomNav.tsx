//components/buyer/BottomNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/buyer/CartContext";

/**
 * BottomNav con fondo estilo BuyerHeader invertido
 * Ajuste visual:
 * - Más azul visible en la parte media/alta
 * - Íconos y textos en blanco
 * - Activo en verde brillante
 * - Cuadros redondeados transparentes estilo Android
 */

function IconHome({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      {active ? <path d="M10 21v-6h4v6" stroke="currentColor" strokeWidth="2" /> : null}
    </svg>
  );
}

function IconOrders() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M7 3h10a2 2 0 0 1 2 2v16l-3-2-3 2-3-2-3 2V5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" />
      <path d="M9 8h6M9 12h6M9 16h4" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconCart() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M6 7h15l-2 10H8L6 7Z" stroke="currentColor" strokeWidth="2" />
      <path d="M6 7 5 4H2" stroke="currentColor" strokeWidth="2" />
      <path d="M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM18 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconWallet() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1h1a1 1 0 0 1 1 1v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="17" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

function IconProfile() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke="currentColor" strokeWidth="2" />
      <path d="M4 21a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function NavItemBox({ children, active }: { children: React.ReactNode; active: boolean }) {
  return (
    <div
      className={[
        "relative grid h-11 w-11 place-items-center rounded-2xl border backdrop-blur-sm transition-all duration-200",
        active
          ? "border-green-300/80 text-green-300 shadow-[0_6px_18px_rgba(34,197,94,0.22)]"
          : "border-white/30 text-white",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const { items } = useCart();
  const cartCount = items.reduce((acc, it) => acc + it.qty, 0);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const itemClass = (active: boolean) =>
    [
      "relative flex flex-1 flex-col items-center justify-center gap-1.5 py-1",
      active ? "text-green-300" : "text-white",
    ].join(" ");

  const labelClass = (active: boolean) =>
    [
      "text-[11px] leading-none",
      active ? "font-extrabold text-green-300" : "font-semibold text-white",
    ].join(" ");

  return (
    <nav className="absolute bottom-0 left-0 right-0 z-[1000] overflow-hidden border-t border-white/20 pb-[env(safe-area-inset-bottom)]">
      <div
        className="relative"
        style={{
          background:
            "linear-gradient(180deg, #ffffff 0%, #cfe0f4 12%, #7aa0cf 28%, #2e5d98 52%, #0b356d 74%, #03102b 100%)",
        }}
      >
        <div className="relative flex items-center justify-between px-1 py-3">

          {/* Inicio */}
          <Link className={itemClass(isActive("/"))} href="/">
            <NavItemBox active={isActive("/")}>
              <IconHome active={isActive("/")} />
            </NavItemBox>
            <span className={labelClass(isActive("/"))}>Inicio</span>
          </Link>

          {/* Pedidos */}
          <Link className={itemClass(isActive("/orders"))} href="/orders">
            <NavItemBox active={isActive("/orders")}>
              <IconOrders />
            </NavItemBox>
            <span className={labelClass(isActive("/orders"))}>Pedidos</span>
          </Link>

          {/* Carrito */}
          <Link className={itemClass(isActive("/cart"))} href="/cart">
            <span className="relative">
              <NavItemBox active={isActive("/cart")}>
                <IconCart />
              </NavItemBox>

              {cartCount > 0 && (
                <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-green-600 px-1 text-[10px] font-extrabold text-white">
                  {cartCount}
                </span>
              )}
            </span>
            <span className={labelClass(isActive("/cart"))}>Carrito</span>
          </Link>

          {/* NUEVO: SALDO */}
          <Link className={itemClass(isActive("/wallet"))} href="/wallet">
            <NavItemBox active={isActive("/wallet")}>
              <IconWallet />
            </NavItemBox>
            <span className={labelClass(isActive("/wallet"))}>Saldo</span>
          </Link>

          {/* Perfil */}
          <Link className={itemClass(isActive("/profile"))} href="/profile">
            <NavItemBox active={isActive("/profile")}>
              <IconProfile />
            </NavItemBox>
            <span className={labelClass(isActive("/profile"))}>Perfil</span>
          </Link>

        </div>
      </div>
    </nav>
  );
}