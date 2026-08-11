//components/buyer/BottomNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/buyer/CartContext";
import { useTelAvailability } from "@/components/buyer/TelAvailabilityContext";

/**
 * BottomNav con fondo estilo BuyerHeader invertido.
 * Corrección iPhone:
 * - El degradado azul cubre también env(safe-area-inset-bottom).
 * - La zona inferior del iPhone ya no queda blanca/transparente.
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
          ? "border-white/50 shadow-[0_6px_18px_rgba(34,197,94,0.22)]"
          : "border-white/30",
      ].join(" ")}
      style={{
        color: active
          ? "var(--kx-bottom-nav-active, #86efac)"
          : "var(--kx-bottom-nav-inactive, #ffffff)",
      }}
    >
      {children}
    </div>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const { items } = useCart();
  const tel = useTelAvailability();
  const cartCount = items.reduce((acc, it) => acc + it.qty, 0);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const itemClass = (_active: boolean) =>
    "relative flex flex-1 flex-col items-center justify-center gap-1.5 py-1";

  const labelClass = (active: boolean) =>
    [
      "text-[11px] leading-none",
      active ? "font-extrabold" : "font-semibold",
    ].join(" ");

  const labelStyle = (active: boolean) => ({
    color: active
      ? "var(--kx-bottom-nav-active, #86efac)"
      : "var(--kx-bottom-nav-inactive, #ffffff)",
  });

  return (
    <nav className="absolute bottom-0 left-0 right-0 z-[1000] overflow-hidden">
      <div
        className="relative"
        style={{
          background:
            "linear-gradient(180deg, var(--kx-page-bg, #ffffff) 0%, color-mix(in srgb, var(--kx-bottom-nav-bg, #0a3566) 28%, var(--kx-page-bg, #ffffff)) 18%, var(--kx-bottom-nav-bg, #0a3566) 78%, #03102b 100%)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="relative flex items-center justify-between px-1 py-3">
          <Link className={itemClass(isActive("/"))} href="/">
            <NavItemBox active={isActive("/")}>
              <IconHome active={isActive("/")} />
            </NavItemBox>
            <span className={labelClass(isActive("/"))} style={labelStyle(isActive("/"))}>Inicio</span>
          </Link>

          <Link className={itemClass(isActive("/orders"))} href="/orders">
            <NavItemBox active={isActive("/orders")}>
              <IconOrders />
            </NavItemBox>
            <span className={labelClass(isActive("/orders"))} style={labelStyle(isActive("/orders"))}>Pedidos</span>
          </Link>

          {tel.enabled ? (
            <Link className={itemClass(isActive("/cart"))} href="/cart">
              <span className="relative">
                <NavItemBox active={isActive("/cart")}>
                  <IconCart />
                </NavItemBox>

                {cartCount > 0 && (
                  <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-extrabold"
                    style={{ background: "var(--kx-primary, #16a34a)", color: "var(--kx-button-text, #ffffff)" }}>
                    {cartCount}
                  </span>
                )}
              </span>
              <span className={labelClass(isActive("/cart"))} style={labelStyle(isActive("/cart"))}>Carrito</span>
            </Link>
          ) : null}

          <Link className={itemClass(isActive("/wallet"))} href="/wallet">
            <NavItemBox active={isActive("/wallet")}>
              <IconWallet />
            </NavItemBox>
            <span className={labelClass(isActive("/wallet"))} style={labelStyle(isActive("/wallet"))}>Saldo</span>
          </Link>

          <Link className={itemClass(isActive("/profile"))} href="/profile">
            <NavItemBox active={isActive("/profile")}>
              <IconProfile />
            </NavItemBox>
            <span className={labelClass(isActive("/profile"))} style={labelStyle(isActive("/profile"))}>Perfil</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
