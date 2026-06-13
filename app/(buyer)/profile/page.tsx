// app/(buyer)/profile/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/authActions";
import { apiFetch } from "@/lib/api";
import { useBuyerCity } from "@/components/buyer/CityContext";

import Image from "next/image";

// ICONOS KRONIX
import infoIcon from "@/public/icons/informacion.png";
import seguridadIcon from "@/public/icons/seguridad.png";
import tarjetasIcon from "@/public/icons/tarjetas.png";
import direccionesIcon from "@/public/icons/direcciones.png";
import privacidadIcon from "@/public/icons/privacidad.png";
import soporteIcon from "@/public/icons/soporte.png";
import tycIcon from "@/public/icons/tyc.png";

type MeResponse =
  | {
      user: {
        sub?: string;
        role?: string;
        phone?: string;
        email?: string;
        name?: string;
      };
    }
  | { user?: any };

function maskEmail(email?: string | null) {
  const e = String(email ?? "").trim();
  if (!e.includes("@")) return e;
  const [u, d] = e.split("@");
  if (!u) return e;
  const left = u.slice(0, 2);
  return `${left}${"•".repeat(Math.max(1, u.length - 2))}@${d}`;
}

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

export default function ProfilePage() {
  const router = useRouter();
  const { city, cities, citiesLoading, setCity } = useBuyerCity();

  const [isChecking, setIsChecking] = useState(true);
  const [me, setMe] = useState<MeResponse["user"] | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  
  async function refreshMe() {
    try {
      setIsChecking(true);

      const data = await apiFetch<MeResponse>("/auth/me", {
        method: "GET",
        cache: "no-store",
      });

      const user = (data as any)?.user ?? null;
      setMe(user && typeof user === "object" ? user : null);
    } catch {
      setMe(null);
    } finally {
      setIsChecking(false);
    }
  }

  useEffect(() => {
    refreshMe();

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLoggedIn = !!(me && (me as any)?.sub);

  const displayName = useMemo(() => {
    const n = String((me as any)?.name ?? "").trim();
    if (n) return n;

    const e = String((me as any)?.email ?? "").trim();
    if (e) return e.split("@")[0]?.replace(/[._-]/g, " ").trim();

    const p = String((me as any)?.phone ?? "").trim();
    if (p) return p;

    return "Usuario";
  }, [me]);

  const displaySub = useMemo(() => {
    const e = String((me as any)?.email ?? "").trim();
    if (e) return maskEmail(e);
    const p = String((me as any)?.phone ?? "").trim();
    if (p) return p;
    return "";
  }, [me]);

  const initials = useMemo(() => getInitials(displayName), [displayName]);

  const profilePhotoSrc = useMemo(
    () => normalizeProfileImageUrl((me as any)?.profileImageUrl),
    [me]
  );

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
      window.dispatchEvent(new Event("ct-auth-changed"));
      window.dispatchEvent(new Event("auth:changed"));
      router.replace("/");
    }
  }

  function handleSelectCity(selectedCity: typeof city) {
    setCity(selectedCity);
    setShowCityModal(false);
  }

  return (
    <div className="px-4 pb-6 pt-4">
      <div className="text-lg font-extrabold text-gray-900">Perfil</div>
      <div className="mt-1 text-xs text-gray-600">Tu cuenta y configuración</div>

      <div className="mt-4">
        {isChecking ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="h-4 w-44 rounded bg-gray-100 animate-pulse" />
            <div className="mt-3 h-3 w-64 rounded bg-gray-100 animate-pulse" />
          </div>
        ) : isLoggedIn ? (
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-[#0a1f44] via-[#0b5ed7] to-black" />

            <div className="absolute inset-0 pointer-events-none">
              <span className="absolute left-[8%] top-[18%] h-1 w-1 rounded-full bg-white/90" />
              <span className="absolute left-[18%] top-[28%] h-1 w-1 rounded-full bg-white/80" />
              <span className="absolute left-[31%] top-[14%] h-1 w-1 rounded-full bg-white/90" />
              <span className="absolute left-[46%] top-[24%] h-1 w-1 rounded-full bg-white/80" />
              <span className="absolute left-[58%] top-[12%] h-1 w-1 rounded-full bg-white/90" />
              <span className="absolute left-[71%] top-[22%] h-1 w-1 rounded-full bg-white/80" />
              <span className="absolute left-[84%] top-[16%] h-1 w-1 rounded-full bg-white/90" />
            </div>

            <div className="relative p-3">
              <div className="flex items-start justify-between gap-2">
  <div className="flex items-center gap-2">
    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-white/15 font-extrabold text-white ring-1 ring-white/25 backdrop-blur-sm">
      {profilePhotoSrc ? (
        <img
          src={profilePhotoSrc}
          alt="Foto de perfil"
          className="block h-full w-full object-cover"
        />
      ) : (
        <div className="grid h-full w-full place-items-center">{initials}</div>
      )}
    </div>

    <div className="min-w-0">
      <div className="truncate text-base font-extrabold text-white">
        {displayName}
      </div>

      {displaySub ? (
        <div className="truncate text-xs text-white/90">{displaySub}</div>
      ) : (
        <div className="truncate text-xs text-white/80">En línea</div>
      )}
    </div>
  </div>

  <div className="flex flex-col items-end gap-1">
    <button
      type="button"
      onClick={handleLogout}
      disabled={loggingOut}
      className="rounded-xl bg-white px-3 py-2 text-xs font-extrabold text-slate-900 shadow-sm hover:bg-white/90 disabled:opacity-60"
    >
      {loggingOut ? "Cerrando…" : "Cerrar sesión"}
    </button>

    <button
      type="button"
      onClick={() => setShowCityModal(true)}
      className="rounded-lg border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-extrabold text-white backdrop-blur-sm hover:bg-white/20"
    >
      Cambiar ciudad
    </button>
  </div>
</div>
              
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-gray-100 font-extrabold text-gray-700">
                👤
              </div>

              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-extrabold text-gray-900">
                  Invitado
                </div>
                <div className="truncate text-xs text-gray-600">
                  Inicia sesión para ver tu información
                </div>
              </div>

              <Link
                href="/login?next=/profile"
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-extrabold text-blue-700 hover:bg-gray-50"
              >
                Iniciar sesión
              </Link>
            </div>

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCityModal(true)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-extrabold text-gray-800 hover:bg-gray-50"
              >
                Ciudad
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-3">
        <Link
          href="/profile/info"
          className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:bg-gray-50"
        >
          <div className="relative h-10 w-10">
  <Image
    src={infoIcon}
    alt="Información"
    fill
    className="object-contain scale-160 -translate-y-[1px]"
  />
</div>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-extrabold text-gray-900">Tu información</div>
            <div className="text-xs text-gray-600">Datos personales básicos</div>
          </div>
          <div className="text-gray-400">›</div>
        </Link>

        <Link
          href="/profile/security"
          className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:bg-gray-50"
        >
          <div className="relative h-10 w-10">
  <Image
    src={seguridadIcon}
    alt="Seguridad"
    fill
    className="object-contain scale-160"
  />
</div>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-extrabold text-gray-900">Seguridad</div>
            <div className="text-xs text-gray-600">Contraseña y sesiones</div>
          </div>
          <div className="text-gray-400">›</div>
        </Link>

        <Link
          href="/profile/cards"
          className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:bg-gray-50"
        >
          <div className="relative h-10 w-10">
  <Image
    src={tarjetasIcon}
    alt="Tarjetas"
    fill
    className="object-contain scale-160"
  />
</div>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-extrabold text-gray-900">Tarjetas</div>
            <div className="text-xs text-gray-600">Tus métodos de pago</div>
          </div>
          <div className="text-gray-400">›</div>
        </Link>

        <Link
          href="/profile/addresses"
          className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:bg-gray-50"
        >
          <div className="relative h-10 w-10">
  <Image
    src={direccionesIcon}
    alt="Direcciones"
    fill
    className="object-contain scale-160"
  />
</div>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-extrabold text-gray-900">Direcciones</div>
            <div className="text-xs text-gray-600">Se guardan con tus pedidos</div>
          </div>
          <div className="text-gray-400">›</div>
        </Link>

        <Link
          href="/profile/privacy"
          className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:bg-gray-50"
        >
          <div className="relative h-10 w-10">
  <Image
    src={privacidadIcon}
    alt="Privacidad"
    fill
    className="object-contain scale-160"
  />
</div>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-extrabold text-gray-900">Privacidad</div>
            <div className="text-xs text-gray-600">Controla tu cuenta y datos</div>
          </div>
          <div className="text-gray-400">›</div>
        </Link>

        <Link
  href="/profile/terms"
  className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:bg-gray-50"
>
  <div className="relative h-10 w-10">
  <Image
    src={tycIcon}
    alt="Términos y Condiciones"
    fill
    className="object-contain scale-160"
  />
</div>

  <div className="min-w-0 flex-1">
    <div className="text-lg font-extrabold text-gray-900">
      Términos y Condiciones
    </div>
    <div className="text-xs text-gray-600">
      Condiciones de uso de KroniX
    </div>
  </div>

  <div className="text-gray-400">›</div>
</Link>

        <Link
          href="/profile/support"
          className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:bg-gray-50"
        >
          <div className="relative h-10 w-10">
  <Image
    src={soporteIcon}
    alt="Soporte"
    fill
    className="object-contain scale-160"
  />
</div>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-extrabold text-gray-900">Soporte</div>
            <div className="text-xs text-gray-600">Ayuda y contacto</div>
          </div>
          <div className="text-gray-400">›</div>
        </Link>
      </div>

      {!isChecking && !isLoggedIn ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          Estás navegando como invitado. Inicia sesión para que tus pedidos y datos queden asociados a tu cuenta.
        </div>
      ) : null}

      {showCityModal ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-[24px] bg-white shadow-2xl ring-1 ring-black/5">
            <div className="border-b border-gray-100 px-4 py-4">
              <div className="text-base font-extrabold text-gray-900">Selecciona tu ciudad</div>
              <div className="mt-1 text-sm text-gray-500">
                Esta selección filtrará tiendas, home y pedidos.
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-4">
              {citiesLoading ? (
                <div className="text-sm font-semibold text-gray-500">Cargando ciudades...</div>
              ) : !cities.length ? (
                <div className="text-sm font-semibold text-gray-500">No hay ciudades activas.</div>
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
    </div>
  );
}
