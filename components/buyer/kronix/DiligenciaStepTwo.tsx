//components\buyer\kronix\DiligenciaStepTwo.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  EMPTY_STOP,
  type KronixDiligenciaDraft,
  type KronixDomicilioStop,
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

const MAX_STOPS = 3;

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

function emptyStop(): KronixDomicilioStop {
  return {
    ...EMPTY_STOP,
  };
}

function normalizeStops(stops: KronixDomicilioStop[]) {
  const safeStops =
    Array.isArray(stops) && stops.length > 0 ? stops : [emptyStop()];

  return safeStops.slice(0, MAX_STOPS).map((stop) => ({
    placeName: String(stop?.placeName ?? ""),
    address: String(stop?.address ?? ""),
    reference: String(stop?.reference ?? ""),
    contactName: String(stop?.contactName ?? ""),
    contactPhone: String(stop?.contactPhone ?? ""),
    instructions: String(stop?.instructions ?? ""),
    lat: typeof stop?.lat === "number" ? stop.lat : null,
    lng: typeof stop?.lng === "number" ? stop.lng : null,
  }));
}

export default function DiligenciaStepTwo() {
  const router = useRouter();
  const { citySlug, cityReady } = useBuyerCity();

  const [form, setForm] = useState<KronixDiligenciaDraft>(
    loadKronixDiligenciaDraft()
  );
  const [touched, setTouched] = useState(false);
  const [saved, setSaved] = useState(false);
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [mapPickerIndex, setMapPickerIndex] = useState<number | null>(null);

  useEffect(() => {
    setForm(loadKronixDiligenciaDraft());
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

  const stops = useMemo(() => normalizeStops(form.stops), [form.stops]);

  function updateStops(nextStops: KronixDomicilioStop[]) {
    const cleanStops = normalizeStops(nextStops);

    setSaved(false);

    setForm((prev) => ({
      ...prev,
      stops: cleanStops,
      stopCount: cleanStops.length,
      dropoffPlaceName: cleanStops[0]?.placeName ?? "",
      dropoffAddress: cleanStops[0]?.address ?? "",
      dropoffReference: cleanStops[0]?.reference ?? "",
      receiverName: cleanStops[0]?.contactName ?? "",
      receiverPhone: cleanStops[0]?.contactPhone ?? "",
    }));
  }

  function updateStop<K extends keyof KronixDomicilioStop>(
    index: number,
    key: K,
    value: KronixDomicilioStop[K]
  ) {
    const nextStops = stops.map((stop, i) => {
      if (i !== index) return stop;

      return {
        ...stop,
        [key]: value,
        ...(key === "address" ? { lat: null, lng: null } : {}),
      };
    });

    updateStops(nextStops);
  }

  function applySavedAddress(index: number, id: string) {
    const selected = addresses.find((a) => a.id === id);
    if (!selected) return;

    const nextStops = stops.map((stop, i) => {
      if (i !== index) return stop;

      return {
        ...stop,
        placeName: String(selected.placeName ?? selected.label ?? "").trim(),
        address: String(selected.address ?? "").trim(),
        reference: String(selected.reference ?? "").trim(),
        lat: typeof selected.lat === "number" ? selected.lat : null,
        lng: typeof selected.lng === "number" ? selected.lng : null,
      };
    });

    setTouched(false);
    setMapPickerIndex(null);
    updateStops(nextStops);
  }

  function applyMapAddress(index: number, lat: number, lng: number, address: string) {
  const nextStops = stops.map((stop, i) => {
    if (i !== index) return stop;

    return {
      ...stop,
      placeName: "Lugar seleccionado desde mapa",
      address: address || "Ubicación seleccionada en el mapa",
      reference: "NULL",
      lat,
      lng,

      // 🔥 CLAVE
      useCurrentLocation: true,
    };
  });

  setTouched(false);
  setMapPickerIndex(null);
  updateStops(nextStops);
}

  function addStop() {
    if (stops.length >= MAX_STOPS) return;
    updateStops([...stops, emptyStop()]);
  }

  function removeStop(index: number) {
    if (stops.length <= 1) return;

    if (mapPickerIndex === index) {
      setMapPickerIndex(null);
    }

    updateStops(stops.filter((_, i) => i !== index));
  }

  function updateReturnRequired(value: boolean) {
    setSaved(false);
    setForm((prev) => ({
      ...prev,
      needsReturn: value,
      returnRequired: value,
    }));
  }

  const canContinue = useMemo(() => {
    return stops.every((stop) => String(stop.address || "").trim().length >= 8);
  }, [stops]);

  const addressError =
    touched && !canContinue
      ? "Cada punto debe tener una dirección clara de mínimo 8 caracteres."
      : "";

  function goBack() {
    saveKronixDiligenciaDraft(form);
    router.push("/kronix/diligencia?step=1");
  }

  function handleContinue() {
    setTouched(true);
    if (!canContinue) return;

    const cleanStops = normalizeStops(stops);

    saveKronixDiligenciaDraft({
      ...form,
      stops: cleanStops,
      stopCount: cleanStops.length,
      dropoffPlaceName: cleanStops[0]?.placeName ?? "",
      dropoffAddress: cleanStops[0]?.address ?? "",
      dropoffReference: cleanStops[0]?.reference ?? "",
      receiverName: cleanStops[0]?.contactName ?? "",
      receiverPhone: cleanStops[0]?.contactPhone ?? "",
    });

    setSaved(true);

    setTimeout(() => {
      router.push("/kronix/diligencia?step=3");
    }, 180);
  }

  const returnRequired = Boolean(form.returnRequired ?? form.needsReturn);

  return (
    <div className="space-y-3">
      <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.07)]">
        <div className="flex items-start gap-3">
          <div className="relative h-[62px] w-[62px] shrink-0 overflow-visible">
            <Image
              src="/branding/kronix/endpoint.png"
              alt="Puntos de entrega"
              fill
              className="object-contain scale-[1.3]"
              sizes="62px"
            />
          </div>

          <div className="min-w-0">
            <div className="text-[18px] font-black leading-tight text-slate-900">
              ¿Cuántos domicilios necesitas?
            </div>
            <div className="mt-1 text-[13px] leading-5 text-slate-500">
              Puedes agregar de 1 a 3 puntos de entrega en un solo servicio.
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 p-3">
          <div className="text-[13px] font-black text-slate-900">
            ¿El conductor debe retornar al punto inicial?
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => updateReturnRequired(false)}
              className={[
                "rounded-[18px] px-4 py-3 text-[13px] font-black transition",
                !returnRequired
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-800",
              ].join(" ")}
            >
              No, termina en el último punto
            </button>

            <button
              type="button"
              onClick={() => updateReturnRequired(true)}
              className={[
                "rounded-[18px] px-4 py-3 text-[13px] font-black transition",
                returnRequired
                  ? "bg-emerald-600 text-white"
                  : "border border-slate-200 bg-white text-slate-800",
              ].join(" ")}
            >
              Sí, debe retornar
            </button>
          </div>
        </div>
      </div>

      {stops.map((stop, index) => {
        const addressOk = String(stop.address || "").trim().length >= 8;
        const showMapForThisStop = mapPickerIndex === index;

        return (
          <div
            key={`stop-${index}`}
            className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.07)]"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[17px] font-black text-slate-900">
                  Punto de entrega {index + 1}
                </div>
                <div className="mt-1 text-[12px] text-slate-500">
                  Dirección y datos para este domicilio.
                </div>
              </div>

              {stops.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeStop(index)}
                  className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-black text-red-600"
                >
                  Quitar
                </button>
              ) : null}
            </div>

            <div className="mt-4 space-y-3">
              {addresses.length > 0 || addressesLoading ? (
                <div className="rounded-[22px] border border-emerald-100 bg-emerald-50 px-3 py-3">
                  <label className="mb-2 block text-[12px] font-extrabold uppercase tracking-[0.12em] text-emerald-700">
                    Usar dirección guardada
                  </label>

                  <select
                    disabled={addressesLoading}
                    defaultValue=""
                    onChange={(e) => applySavedAddress(index, e.target.value)}
                    className="w-full rounded-[18px] border border-emerald-100 bg-white px-3 py-3 text-[14px] font-bold text-slate-900 outline-none"
                  >
                    <option value="">
                      {addressesLoading
                        ? "Cargando direcciones..."
                        : "Seleccionar dirección"}
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
                onClick={() =>
                  setMapPickerIndex((current) =>
                    current === index ? null : index
                  )
                }
                className="w-full rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-4 text-[15px] font-black text-emerald-800 shadow-sm transition hover:bg-emerald-100"
              >
                🗺️{" "}
                {showMapForThisStop
                  ? "Cerrar mapa"
                  : `Seleccionar punto ${index + 1} en el mapa`}
              </button>

              {showMapForThisStop ? (
                <LocationPickerMap
                  initialLat={typeof stop.lat === "number" ? stop.lat : undefined}
                  initialLng={typeof stop.lng === "number" ? stop.lng : undefined}
                  onSelect={({ lat, lng, address }) =>
                    applyMapAddress(index, lat, lng, address)
                  }
                />
              ) : null}

              <div>
                <label className="mb-2 block text-[12px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                  Nombre del lugar{" "}
                  <span className="normal-case font-semibold">(opcional)</span>
                </label>

                <input
                  value={stop.placeName || ""}
                  onChange={(e) =>
                    updateStop(index, "placeName", e.target.value)
                  }
                  placeholder="Ej: Casa, oficina, local, edificio"
                  className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] font-semibold text-slate-900 outline-none transition focus:border-emerald-300 focus:bg-white"
                  maxLength={80}
                />
              </div>

              <div>
                <label className="mb-2 block text-[12px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                  Dirección de entrega <span className="text-red-500">*</span>
                </label>

                <textarea
                  value={stop.address || ""}
                  onChange={(e) => {
  updateStop(index, "address", e.target.value);
  updateStop(index, "useCurrentLocation", false as any);
}}
                  onBlur={() => setTouched(true)}
                  placeholder="Ej: Calle 8 # 15-20, barrio, referencia visible..."
                  rows={3}
                  className={[
                    "w-full rounded-[20px] border bg-slate-50 px-4 py-4 text-[15px] font-semibold text-slate-900 outline-none transition focus:bg-white",
                    touched && !addressOk
                      ? "border-red-300 focus:border-red-400"
                      : "border-slate-200 focus:border-emerald-300",
                  ].join(" ")}
                  maxLength={220}
                />

                <div className="mt-2 flex items-center justify-between gap-3">
                  <div
                    className={
                      touched && !addressOk
                        ? "text-[12px] font-semibold text-red-600"
                        : "text-[12px] text-slate-500"
                    }
                  >
                    {touched && !addressOk
                      ? "Dirección obligatoria para este punto."
                      : "Incluye barrio, referencia o algo visible si ayuda."}
                  </div>

                  <div className="shrink-0 text-[11px] font-semibold text-slate-400">
                    {String(stop.address || "").length}/220
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[12px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                  Referencia adicional{" "}
                  <span className="normal-case font-semibold">(opcional)</span>
                </label>

                <input
                  value={stop.reference || ""}
                  onChange={(e) =>
                    updateStop(index, "reference", e.target.value)
                  }
                  placeholder="Ej: Portería 1, casa blanca, timbrar"
                  className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] font-semibold text-slate-900 outline-none transition focus:border-emerald-300 focus:bg-white"
                  maxLength={120}
                />
              </div>
            </div>
          </div>
        );
      })}

      {stops.length < MAX_STOPS ? (
        <button
          type="button"
          onClick={addStop}
          className="w-full rounded-[24px] border border-dashed border-emerald-300 bg-emerald-50 py-4 text-[15px] font-black text-emerald-800"
        >
          + Agregar otro domicilio
        </button>
      ) : (
        <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-center text-[13px] font-bold text-slate-600">
          Ya agregaste el máximo de 3 puntos permitidos.
        </div>
      )}

      {addressError ? (
        <div className="rounded-[22px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700">
          {addressError}
        </div>
      ) : null}

      {saved ? (
        <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] font-extrabold text-emerald-800">
          Paso 2 guardado correctamente ✅
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={goBack}
          className="rounded-[24px] border border-slate-200 bg-white py-4 text-[15px] font-black text-slate-800 shadow-sm transition hover:bg-slate-50"
        >
          Volver
        </button>

        <button
          type="button"
          onClick={handleContinue}
          className={[
            "rounded-[24px] py-4 text-[15px] font-black text-white transition",
            canContinue
              ? "bg-[linear-gradient(90deg,#0ea5e9_0%,#10b981_55%,#22c55e_100%)]"
              : "cursor-not-allowed bg-slate-300",
          ].join(" ")}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}