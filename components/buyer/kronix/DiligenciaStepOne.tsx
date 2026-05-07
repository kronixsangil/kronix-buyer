//components\buyer\kronix\DiligenciaStepOne.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  type KronixDiligenciaDraft,
  loadKronixDiligenciaDraft,
  saveKronixDiligenciaDraft,
} from "@/components/buyer/kronix/kronixDiligenciaDraft";
import { useBuyerCity } from "@/components/buyer/CityContext";
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
  address: string;
  lat?: number | null;
  lng?: number | null;
  isDefault?: boolean;
  isFavorite?: boolean;
  usageCount?: number;
};

export default function DiligenciaStepOne() {
  const router = useRouter();
  const { citySlug, cityReady } = useBuyerCity();

  const [form, setForm] = useState<KronixDiligenciaDraft>(
    loadKronixDiligenciaDraft()
  );
  const [touched, setTouched] = useState(false);
  const [saved, setSaved] = useState(false);
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);

  useEffect(() => {
    const draft = loadKronixDiligenciaDraft();
    setForm(draft);
  }, []);

  useEffect(() => {
    saveKronixDiligenciaDraft(form);
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

        setAddresses(Array.isArray(rows) ? rows : []);
      } catch {
        setAddresses([]);
      } finally {
        setAddressesLoading(false);
      }
    }

    loadAddresses();
  }, [cityReady, citySlug]);

  const canContinue = useMemo(() => {
    return form.pickupAddress.trim().length >= 8;
  }, [form.pickupAddress]);

  const addressError =
    touched && !canContinue
      ? "Escribe una dirección más clara para que el conductor pueda iniciar correctamente el domicilio."
      : "";

  function updateField<K extends keyof KronixDiligenciaDraft>(
    key: K,
    value: KronixDiligenciaDraft[K]
  ) {
    setSaved(false);
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function applySavedAddress(id: string) {
    const selected = addresses.find((a) => a.id === id);
    if (!selected) return;

    setSaved(false);
    setTouched(false);
    setShowMapPicker(false);

    setForm((prev) => ({
      ...prev,
      pickupPlaceName: String(selected.placeName ?? selected.label ?? "").trim(),
      pickupAddress: String(selected.address ?? "").trim(),
      pickupReference: String(selected.reference ?? "").trim(),
      pickupLat: typeof selected.lat === "number" ? selected.lat : null,
      pickupLng: typeof selected.lng === "number" ? selected.lng : null,
    }));
  }

  function handleContinue() {
    setTouched(true);
    if (!canContinue) return;

    saveKronixDiligenciaDraft(form);
    setSaved(true);

    setTimeout(() => {
      router.push("/kronix/diligencia?step=2");
    }, 180);
  }

  return (
    <div className="space-y-2">
      <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.07)]">
        <div className="flex items-start gap-3">
          <div className="relative h-[62px] w-[62px] shrink-0 overflow-visible">
            <Image
              src="/branding/kronix/startpoint.png"
              alt="Inicio domicilio"
              fill
              className="object-contain scale-[1.28]"
              sizes="62px"
            />
          </div>

          <div className="min-w-0">
            <div className="text-[18px] font-black leading-tight text-slate-900">
              ¿Dónde inicia el domicilio?
            </div>
            <div className="mt-1 text-[13px] leading-5 text-slate-500">
              Define el punto donde el conductor comenzará el servicio.
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {addresses.length > 0 || addressesLoading ? (
            <div className="rounded-[22px] border border-blue-100 bg-blue-50 px-3 py-3">
              <label className="mb-2 block text-[12px] font-extrabold uppercase tracking-[0.12em] text-blue-700">
                Usar dirección guardada
              </label>

              <select
                disabled={addressesLoading}
                defaultValue=""
                onChange={(e) => applySavedAddress(e.target.value)}
                className="w-full rounded-[18px] border border-blue-100 bg-white px-3 py-3 text-[14px] font-bold text-slate-900 outline-none"
              >
                <option value="">
                  {addressesLoading ? "Cargando direcciones..." : "Seleccionar dirección"}
                </option>

                {addresses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {`${a.isDefault ? "🏠 " : a.isFavorite ? "❤️ " : ""}${
                      a.placeName || a.label || "Dirección guardada"
                    } — ${a.address}`}
                  </option>
                ))}
              </select>

              <div className="mt-2 text-[11px] font-semibold text-blue-700/80">
                Al seleccionar una dirección, se llenan lugar, dirección y referencia.
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setSaved(false);
              setShowMapPicker((prev) => !prev);
            }}
            className="w-full rounded-[22px] border border-blue-200 bg-blue-50 px-4 py-4 text-[15px] font-black text-blue-800 shadow-sm transition hover:bg-blue-100"
          >
            🗺️ {showMapPicker ? "Cerrar mapa" : "Seleccionar inicio en el mapa"}
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
  setSaved(false);

  setForm((prev) => ({
    ...prev,
    pickupPlaceName: "Lugar seleccionado desde mapa",
    pickupAddress: address || "Ubicación seleccionada en el mapa",
    pickupReference: "NULL",
    pickupLat: lat,
    pickupLng: lng,

    // 🔥 CLAVE
    pickupUseCurrentLocation: true,
  }));

  setTouched(false);
  setShowMapPicker(false);
}}
            />
          ) : null}

          <div>
            <label className="mb-2 block text-[12px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
              Nombre del lugar{" "}
              <span className="normal-case font-semibold">(opcional)</span>
            </label>

            <input
              type="text"
              value={form.pickupPlaceName}
              onChange={(e) => updateField("pickupPlaceName", e.target.value)}
              placeholder="Ej: Restaurante, tienda, casa"
              className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] font-semibold text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white"
              maxLength={80}
            />
          </div>

          <div>
            <label className="mb-2 block text-[12px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
              Dirección de inicio <span className="text-red-500">*</span>
            </label>

            <textarea
              value={form.pickupAddress}
              onChange={(e) => {
                updateField("pickupAddress", e.target.value);
                updateField("pickupLat", null as any);
                updateField("pickupLng", null as any);
                updateField("pickupUseCurrentLocation", false as any);
              }}
              onBlur={() => setTouched(true)}
              placeholder="Ej: Carrera 10 # 12-45, barrio centro..."
              rows={3}
              className={[
                "w-full rounded-[20px] border bg-slate-50 px-4 py-4 text-[15px] font-semibold outline-none transition",
                addressError
                  ? "border-red-300"
                  : "border-slate-200 focus:border-blue-300",
              ].join(" ")}
              maxLength={220}
            />

            <div className="mt-2 flex justify-between text-[12px]">
              <span
                className={
                  addressError ? "text-red-600 font-semibold" : "text-slate-500"
                }
              >
                {addressError ||
                  "Incluye referencia o punto visible para facilitar la llegada."}
              </span>

              <span className="text-slate-400">
                {form.pickupAddress.length}/220
              </span>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[12px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
              Referencia adicional{" "}
              <span className="normal-case font-semibold">(opcional)</span>
            </label>

            <input
              type="text"
              value={form.pickupReference}
              onChange={(e) => updateField("pickupReference", e.target.value)}
              placeholder="Ej: Portón negro, local esquina"
              className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] font-semibold outline-none transition focus:border-blue-300 focus:bg-white"
              maxLength={120}
            />
          </div>
        </div>
      </div>

      {saved && (
        <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] font-extrabold text-emerald-800">
          Paso 1 guardado correctamente ✅
        </div>
      )}

      <button
        type="button"
        onClick={handleContinue}
        className={[
          "w-full rounded-[24px] py-4 text-[15px] font-black text-white transition",
          canContinue
            ? "bg-[linear-gradient(90deg,#0c45ff_0%,#0b8bdf_50%,#1fd09a_100%)]"
            : "bg-slate-300 cursor-not-allowed",
        ].join(" ")}
      >
        Continuar
      </button>

      <div className="text-center text-[12px] text-slate-500">
        En el siguiente paso definirás los puntos de entrega.
      </div>
    </div>
  );
}