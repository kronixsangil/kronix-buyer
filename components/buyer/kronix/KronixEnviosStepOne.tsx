/**
 * OBSOLETO
 * Conservado temporalmente por compatibilidad y respaldo.
 * KroniX Envíos utiliza actualmente el flujo One Touch
 * implementado en KronixEnviosStepThree.
 

// components/buyer/kronix/KronixEnviosStepOne.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  type KronixEnviarDraft,
  loadKronixEnviarDraft,
  saveKronixEnviarDraft,
} from "@/components/buyer/kronix/kronixEnviarDraft";
import { useBuyerCity } from "@/components/buyer/CityContext";
import { useAuth } from "@/components/buyer/useAuth";
import { apiFetch } from "@/lib/api";
import Image from "next/image";

const LocationPickerMap = dynamic(
  () => import("@/components/buyer/maps/LocationPickerMap"),
  { ssr: false }
);

type AddressItem = {
  id: string;
  label?: string | null;
  placeName?: string | null;
  reference?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  address: string;
  lat?: number | null;
  lng?: number | null;
  isDefault?: boolean;
  isFavorite?: boolean;
};


type KronixPlusStatusResponse = {
  ok?: boolean;
  approved?: boolean;
  status?: "NONE" | "PENDING" | "APPROVED" | "REJECTED" | string;
  application?: {
    id: string;
    status: string;
    createdAt?: string | null;
  } | null;
};

function getUserName(user: any) {
  return String(user?.name ?? user?.user?.name ?? "").trim();
}

function getUserPhone(user: any) {
  return String(user?.phone ?? user?.user?.phone ?? "")
    .replace(/\D/g, "")
    .slice(0, 15);
}

export default function KronixEnviosStepOne() {
  const router = useRouter();
  const { citySlug, cityReady } = useBuyerCity();
  const { user, isLoading: authLoading } = useAuth();

  const [form, setForm] = useState<KronixEnviarDraft>(loadKronixEnviarDraft());
  const [touched, setTouched] = useState(false);
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [checkingKronixPlus, setCheckingKronixPlus] = useState(true);
  const [kronixPlusStatus, setKronixPlusStatus] = useState<KronixPlusStatusResponse | null>(null);

  useEffect(() => {
    setForm(loadKronixEnviarDraft());
  }, []);

  useEffect(() => {
    let alive = true;

    async function checkKronixPlus() {
      if (authLoading) return;

      if (!user?.id) {
        setCheckingKronixPlus(false);
        setKronixPlusStatus(null);
        return;
      }

      setCheckingKronixPlus(true);

      try {
        const res = await apiFetch<KronixPlusStatusResponse>(
          "/users/me/kronix-plus/status",
          {
            method: "GET",
            suppressSessionExpiredEvent: true,
          } as any
        );

        if (!alive) return;
        setKronixPlusStatus(res);
      } catch {
        if (!alive) return;
        setKronixPlusStatus(null);
      } finally {
        if (alive) setCheckingKronixPlus(false);
      }
    }

    checkKronixPlus();

    return () => {
      alive = false;
    };
  }, [authLoading, user?.id]);

  useEffect(() => {
    saveKronixEnviarDraft(form);
  }, [form]);

  useEffect(() => {
    async function loadAddresses() {
      if (!cityReady || !citySlug) return;

      setAddressesLoading(true);

      try {
        const rows = await apiFetch<AddressItem[]>(
          `/users/me/addresses?citySlug=${encodeURIComponent(citySlug)}`,
          { suppressSessionExpiredEvent: true } as any
        );

        const list = Array.isArray(rows) ? rows : [];
        setAddresses(list);

        const current = loadKronixEnviarDraft();
        const alreadyHasPickup = current.pickupAddress.trim().length >= 8;

        if (!alreadyHasPickup) {
          const defaultAddress = list.find((a) => a.isDefault) ?? null;

          if (defaultAddress) {
            applyAddressToPickup(defaultAddress, true);
            setAutoFilled(true);
          }
        }
      } catch {
        setAddresses([]);
      } finally {
        setAddressesLoading(false);
      }
    }

    loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityReady, citySlug]);

  const pickupOk = form.pickupAddress.trim().length >= 8;
  const senderOk = form.senderName.trim().length >= 3;

  const canContinue = useMemo(() => {
    return pickupOk && senderOk;
  }, [pickupOk, senderOk]);

  function updateField<K extends keyof KronixEnviarDraft>(
    key: K,
    value: KronixEnviarDraft[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function applyAddressToPickup(address: AddressItem, silent = false) {
    const profileName = getUserName(user);
    const profilePhone = getUserPhone(user);

    setTouched(false);
    setShowMapPicker(false);

    setForm((prev) => ({
      ...prev,
      pickupPlaceName: String(address.placeName ?? address.label ?? "").trim(),
      pickupAddress: String(address.address ?? "").trim(),
      pickupReference: String(address.reference ?? "").trim(),
      senderName:
        String(address.contactName ?? "").trim() ||
        prev.senderName.trim() ||
        profileName,
      senderPhone:
        String(address.contactPhone ?? "").replace(/\D/g, "").slice(0, 15) ||
        prev.senderPhone.trim() ||
        profilePhone,
      ...(address.lat != null && Number.isFinite(Number(address.lat))
        ? { pickupLat: Number(address.lat) }
        : { pickupLat: null }),
      ...(address.lng != null && Number.isFinite(Number(address.lng))
        ? { pickupLng: Number(address.lng) }
        : { pickupLng: null }),
    }));

    if (!silent) setAutoFilled(false);
  }

  function applySavedAddress(id: string) {
    const selected = addresses.find((a) => a.id === id);
    if (!selected) return;
    applyAddressToPickup(selected);
  }

  function handleContinue() {
    setTouched(true);
    if (!canContinue) return;

    saveKronixEnviarDraft(form);
    router.push("/kronix/enviar?step=2");
  }

  if (authLoading || checkingKronixPlus) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.07)]">
        <div className="h-6 w-48 animate-pulse rounded bg-slate-100" />
        <div className="mt-3 h-24 animate-pulse rounded-[22px] bg-slate-100" />
      </div>
    );
  }

  if (!user?.id) {
    return (
      <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-[0_10px_24px_rgba(15,23,42,0.07)]">
        <div className="text-[20px] font-black">Inicia sesión para usar KroniX Envíos</div>
        <div className="mt-2 text-[14px] font-semibold leading-6">
          Este servicio requiere una cuenta Buyer activa y validación KroniX Plus.
        </div>
        <button
          type="button"
          onClick={() => router.push("/login?next=/")}
          className="mt-5 w-full rounded-[22px] bg-slate-900 px-4 py-4 text-[15px] font-black text-white"
        >
          Iniciar sesión
        </button>
      </div>
    );
  }

  if (!kronixPlusStatus?.approved) {
    const status = String(kronixPlusStatus?.status ?? "NONE").toUpperCase();
    const pending = status === "PENDING";

    return (
      <div className="space-y-3">
        <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
          <div className="relative px-5 pb-6 pt-6 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.32),transparent_32%),linear-gradient(135deg,#03102b_0%,#082b63_55%,#0f172a_100%)]" />
            <div className="relative z-10">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100">
                KroniX Plus requerido
              </div>
              <div className="mt-2 text-[25px] font-black leading-tight">
                KroniX Envíos está disponible para clientes validados
              </div>
              <div className="mt-3 text-[14px] font-semibold leading-6 text-white/85">
                {pending
                  ? "Tu solicitud está pendiente de validación. KroniX revisará tu volumen y te contactará."
                  : "Aplica sin costo desde el menú principal. Una vez aprobada tu cuenta, podrás crear envíos frecuentes desde aquí."}
              </div>
            </div>
          </div>

          <div className="p-5">
            <div className="grid gap-3">
              <div className="rounded-[20px] border border-emerald-100 bg-emerald-50 px-4 py-3 text-[13px] font-bold text-emerald-900">
                ✓ Pensado para negocios, tiendas y clientes con envíos recurrentes.
              </div>
              <div className="rounded-[20px] border border-blue-100 bg-blue-50 px-4 py-3 text-[13px] font-bold text-blue-900">
                ✓ Aplicación gratuita y validación operativa por KroniX.
              </div>
              <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] font-bold text-slate-700">
                ✓ Al aprobarse, este flujo quedará habilitado automáticamente.
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push("/")}
              className="mt-5 w-full rounded-[22px] bg-[linear-gradient(90deg,#0c45ff_0%,#0b8bdf_50%,#1fd09a_100%)] px-4 py-4 text-[15px] font-black text-white shadow-[0_12px_22px_rgba(12,69,255,0.22)]"
            >
              {pending ? "Volver al inicio" : "Aplicar a KroniX Plus"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.07)]">
        <div className="flex items-start gap-3">
          <div className="relative h-[62px] w-[62px] shrink-0 overflow-visible">
            <Image
              src="/branding/kronix/Enviar-Paquete1.png"
              alt="KroniX Envíos"
              fill
              className="object-contain scale-[1.5] translate-x-[-5px] translate-y-[-5px]"
              sizes="62px"
            />
          </div>

          <div className="min-w-0">
            <div className="text-[18px] font-black leading-tight text-slate-900">
              ¿Dónde recogemos el envío?
            </div>
            <div className="mt-1 text-[13px] leading-5 text-slate-500">
              Usaremos tu dirección predeterminada si existe. Puedes editarla, seleccionar otra o marcarla en el mapa.
            </div>
          </div>
        </div>

        {autoFilled ? (
          <div className="mt-4 rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12px] font-bold text-emerald-800">
            🏠 Cargamos tu dirección predeterminada automáticamente.
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          {addresses.length > 0 || addressesLoading ? (
            <div className="rounded-[22px] border border-blue-100 bg-blue-50 px-3 py-3">
              <label className="mb-2 block text-[12px] font-extrabold uppercase tracking-[0.12em] text-blue-700">
                Cambiar dirección de recogida
              </label>

              <select
                disabled={addressesLoading}
                defaultValue=""
                onChange={(e) => applySavedAddress(e.target.value)}
                className="w-full rounded-[18px] border border-blue-100 bg-white px-3 py-3 text-[14px] font-bold text-slate-900 outline-none"
              >
                <option value="">
                  {addressesLoading ? "Cargando direcciones..." : "Seleccionar otra dirección"}
                </option>

                {addresses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {`${a.isDefault ? "🏠 " : a.isFavorite ? "❤️ " : ""}${
                      a.placeName || a.label || "Dirección guardada"
                    } — ${a.address}`}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setAutoFilled(false);
              setShowMapPicker((prev) => !prev);
            }}
            className="w-full rounded-[22px] border border-blue-200 bg-blue-50 px-4 py-4 text-[15px] font-black text-blue-800 shadow-sm transition hover:bg-blue-100"
          >
            🗺️ {showMapPicker ? "Cerrar mapa" : "Seleccionar recogida en el mapa"}
          </button>

          {showMapPicker ? (
            <LocationPickerMap
              initialLat={
                typeof form.pickupLat === "number" ? form.pickupLat : undefined
              }
              initialLng={
                typeof form.pickupLng === "number" ? form.pickupLng : undefined
              }
              onSelect={({ lat, lng, address }) => {
  const profileName = getUserName(user);
  const profilePhone = getUserPhone(user);

  setForm((prev) => ({
    ...prev,
    pickupPlaceName: "",
    pickupAddress: address || "Ubicación seleccionada en el mapa",
    pickupReference: "",
    pickupLat: lat,
    pickupLng: lng,

    // 🔥 CLAVE
    pickupUseCurrentLocation: true,

    senderName: prev.senderName.trim() || profileName,
    senderPhone: prev.senderPhone.trim() || profilePhone,
  }));

  setTouched(false);
  setAutoFilled(false);
  setShowMapPicker(false);
}}
            />
          ) : null}

          <input
            type="text"
            value={form.pickupPlaceName}
            onChange={(e) => updateField("pickupPlaceName", e.target.value)}
            placeholder="Nombre del lugar: tienda, bodega, oficina..."
            className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-[15px] font-semibold text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white"
            maxLength={80}
          />

          <textarea
            value={form.pickupAddress}
            onChange={(e) => {
              updateField("pickupAddress", e.target.value);
              setForm((prev) => ({
                ...prev,
                pickupLat: null,
                pickupLng: null,
                pickupUseCurrentLocation: false,
              }));
            }}
            onBlur={() => setTouched(true)}
            placeholder="Dirección de recogida *"
            rows={3}
            className={[
              "w-full rounded-[20px] border bg-slate-50 px-4 py-4 text-[15px] font-semibold text-slate-900 outline-none transition focus:bg-white",
              touched && !pickupOk
                ? "border-red-300 focus:border-red-400"
                : "border-slate-200 focus:border-blue-300",
            ].join(" ")}
            maxLength={220}
          />

          <input
            type="text"
            value={form.pickupReference}
            onChange={(e) => updateField("pickupReference", e.target.value)}
            placeholder="Referencia: local, portería, bodega, recepción..."
            className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-[15px] font-semibold text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white"
            maxLength={120}
          />

          <div className="grid grid-cols-1 gap-3">
            <input
              type="text"
              value={form.senderName}
              onChange={(e) => updateField("senderName", e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="Nombre del contacto en recogida *"
              className={[
                "w-full rounded-[20px] border bg-slate-50 px-4 py-4 text-[15px] font-semibold text-slate-900 outline-none transition focus:bg-white",
                touched && !senderOk
                  ? "border-red-300 focus:border-red-400"
                  : "border-slate-200 focus:border-blue-300",
              ].join(" ")}
              maxLength={80}
            />

            <input
              type="text"
              value={form.senderPhone}
              onChange={(e) =>
                updateField(
                  "senderPhone",
                  e.target.value.replace(/\D/g, "").slice(0, 15)
                )
              }
              placeholder="Teléfono del contacto en recogida"
              inputMode="numeric"
              className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-[15px] font-semibold text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white"
              maxLength={15}
            />
          </div>
        </div>
      </div>

      {touched && !canContinue ? (
        <div className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700">
          Revisa la dirección y el nombre del contacto de recogida.
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleContinue}
        className={[
          "w-full rounded-[24px] py-4 text-[15px] font-black text-white transition",
          canContinue
            ? "bg-[linear-gradient(90deg,#0c45ff_0%,#0b8bdf_50%,#1fd09a_100%)] shadow-[0_12px_22px_rgba(12,69,255,0.22)] hover:scale-[0.995]"
            : "cursor-not-allowed bg-slate-300 shadow-none",
        ].join(" ")}
      >
        Continuar
      </button>
    </div>
  );
}
  */