// components/buyer/kronix/DomicilioExpressStepOne.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  type KronixPickupDraft,
  formatPhoneDraft,
  loadKronixRecogerDraft,
  saveKronixRecogerDraft,
} from "@/components/buyer/kronix/kronixRecogerDraft";
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
  address: string;
  lat?: number | null;
  lng?: number | null;
  isDefault?: boolean;
  isFavorite?: boolean;
};

function getUserName(user: any) {
  return String(user?.name ?? user?.user?.name ?? "").trim();
}

function getUserPhone(user: any) {
  return String(user?.phone ?? user?.user?.phone ?? "").replace(/\D/g, "").slice(0, 15);
}

export default function DomicilioExpressStepOne() {
  const router = useRouter();
  const { citySlug, cityReady } = useBuyerCity();
  const { user } = useAuth();

  const [form, setForm] = useState<KronixPickupDraft>(loadKronixRecogerDraft());
  const [touched, setTouched] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);

  const [showMapPicker, setShowMapPicker] = useState(false);

  useEffect(() => {
    const draft = loadKronixRecogerDraft();
    const profileName = getUserName(user);
    const profilePhone = getUserPhone(user);

    setForm({
      ...draft,
      senderName: draft.senderName.trim() || profileName,
      senderPhone: draft.senderPhone.trim() || profilePhone,
    });
  }, [user]);

  useEffect(() => {
    saveKronixRecogerDraft(form);
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

  const pickupOk = form.pickupAddress.trim().length >= 8;
  const senderNameOk = form.senderName.trim().length >= 3;
  const taskOk = form.notes.trim().length >= 5;

  const canContinue = useMemo(() => {
    return pickupOk && senderNameOk && taskOk;
  }, [pickupOk, senderNameOk, taskOk]);

  function updateField<K extends keyof KronixPickupDraft>(
    key: K,
    value: KronixPickupDraft[K]
  ) {
    setGeoError(null);

    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function applySavedAddress(id: string) {
    const selected = addresses.find((a) => a.id === id);
    if (!selected) return;

    setTouched(false);
    setGeoError(null);

    setForm((prev) => ({
      ...prev,
      pickupPlaceName: String(selected.placeName ?? selected.label ?? "").trim(),
      pickupAddress: String(selected.address ?? "").trim(),
      pickupReference: String(selected.reference ?? "").trim(),
      pickupLat: typeof selected.lat === "number" ? selected.lat : null,
      pickupLng: typeof selected.lng === "number" ? selected.lng : null,
      pickupUseCurrentLocation: false,
    }));
  }

  function useCurrentLocation() {
    setGeoError(null);
    setShowMapPicker(false);

    if (!navigator?.geolocation) {
      setGeoError("Tu navegador no permite usar ubicación actual.");
      return;
    }

    setGeoLoading(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude);
        const lng = Number(pos.coords.longitude);

        setForm((prev) => ({
          ...prev,
          pickupPlaceName: "Mi ubicación actual",
          pickupAddress: "Mi ubicación actual",
          pickupReference:
            prev.pickupReference.trim() ||
            "El conductor debe llegar a mi ubicación GPS actual.",
          pickupLat: lat,
          pickupLng: lng,
          pickupUseCurrentLocation: true,
        }));

        setTouched(false);
        setGeoLoading(false);
      },
      () => {
        setGeoError(
          "No pudimos tomar tu ubicación. Revisa permisos del navegador o escribe la dirección manualmente."
        );
        setGeoLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      }
    );
  }

  function handleContinue() {
    setTouched(true);
    if (!canContinue) return;

    saveKronixRecogerDraft({
      ...form,
      packageType: "Domicilio Express",
      packageDescription:
        form.packageDescription.trim() ||
        "Servicio express: el cliente explicará la tarea al llegar el conductor.",
      receiverName: form.senderName.trim() || "Cliente",
      receiverPhone: form.senderPhone.trim(),
      dropoffPlaceName: form.pickupPlaceName,
      dropoffAddress: form.pickupAddress,
      dropoffReference: form.pickupReference,
      dropoffLat: form.pickupLat ?? null,
      dropoffLng: form.pickupLng ?? null,
    });

    router.push("/kronix/recoger?step=2");
  }

  console.log("LAT LNG PICKUP:", form.pickupLat, form.pickupLng);

  return (
    <div className="space-y-2">
      <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.07)]">
        <div className="flex items-start gap-3">
          <div className="relative h-[62px] w-[62px] shrink-0 overflow-visible">
            <Image
              src="/branding/kronix/recoger-llevar.png"
              alt="Domicilio Express"
              fill
              className="object-contain scale-[1.5] translate-x-[-2px] translate-y-0"
              sizes="62px"
            />
          </div>

          <div className="min-w-0">
            <div className="text-[18px] font-black leading-tight text-slate-900">
              ¿Dónde debe llegar el motorizado?
            </div>
            <div className="mt-1 text-[13px] leading-5 text-slate-500">
              Usa tu ubicación actual, selecciona en el mapa, una dirección guardada o escribe el punto donde inicia el servicio.
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={geoLoading}
            className={[
              "w-full rounded-[22px] px-4 py-4 text-[15px] font-black text-white shadow-sm transition",
              geoLoading
                ? "cursor-not-allowed bg-slate-300"
                : "bg-emerald-600 hover:bg-emerald-700",
            ].join(" ")}
          >
            {geoLoading ? "Tomando ubicación..." : "📍 Usar mi ubicación actual"}
          </button>

          <button
            type="button"
            onClick={() => {
              setGeoError(null);
              setShowMapPicker((prev) => !prev);
            }}
            className="w-full rounded-[22px] border border-blue-200 bg-blue-50 px-4 py-4 text-[15px] font-black text-blue-800 shadow-sm transition hover:bg-blue-100"
          >
            🗺️ {showMapPicker ? "Cerrar mapa" : "Seleccionar en el mapa"}
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
                setForm((prev) => ({
                  ...prev,
                    pickupPlaceName: "Lugar seleccionado desde mapa",
                    pickupAddress: "Ubicación seleccionada desde mapa",
                    pickupReference: "",
                    pickupLat: lat,
                    pickupLng: lng,

                    // 🔥 ESTA ES LA CLAVE
                    pickupUseCurrentLocation: true,
                }));

                setTouched(false);
                setGeoError(null);
                setShowMapPicker(false);
              }}
            />
          ) : null}

          {geoError ? (
            <div className="rounded-[18px] border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-700">
              {geoError}
            </div>
          ) : null}

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
            </div>
          ) : null}

          <input
            type="text"
            value={form.pickupPlaceName}
            onChange={(e) => updateField("pickupPlaceName", e.target.value)}
            placeholder="Nombre del lugar: Mi casa, oficina, local..."
            className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-[15px] font-semibold text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white"
            maxLength={80}
          />

          <textarea
            value={form.pickupAddress}
            onChange={(e) => {
              const value = e.target.value;

              setGeoError(null);

              setForm((prev) => ({
                ...prev,
                pickupAddress: value,
                pickupLat: null,
                pickupLng: null,
                pickupUseCurrentLocation: false,
              }));
            }}
            onBlur={() => setTouched(true)}
            placeholder="Dirección o ubicación de inicio *"
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
            placeholder="Referencia adicional: portón, apto, local..."
            className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-[15px] font-semibold text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white"
            maxLength={120}
          />
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.07)]">
        <div className="text-[18px] font-black text-slate-900">
          ¿Qué necesitas que haga el motorizado?
        </div>

        <div className="mt-1 text-[13px] leading-5 text-slate-500">
          Tus datos se cargan automáticamente. Solo escribe una indicación rápida.
        </div>

        <div className="mt-4 space-y-3">
          <input
            type="text"
            value={form.senderName}
            onChange={(e) => updateField("senderName", e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="Tu nombre *"
            className={[
              "w-full rounded-[20px] border bg-slate-50 px-4 py-4 text-[15px] font-semibold text-slate-900 outline-none transition focus:bg-white",
              touched && !senderNameOk
                ? "border-red-300 focus:border-red-400"
                : "border-slate-200 focus:border-emerald-300",
            ].join(" ")}
            maxLength={80}
          />

          <input
            type="text"
            value={form.senderPhone}
            onChange={(e) => updateField("senderPhone", formatPhoneDraft(e.target.value))}
            placeholder="Tu teléfono"
            inputMode="numeric"
            className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-[15px] font-semibold text-slate-900 outline-none transition focus:border-emerald-300 focus:bg-white"
            maxLength={20}
          />

          <textarea
            value={form.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="Ej: Necesito un motorizado para una vuelta rápida. Yo le explico al llegar."
            rows={4}
            maxLength={300}
            className={[
              "w-full rounded-[20px] border bg-slate-50 px-4 py-4 text-[15px] font-semibold text-slate-900 outline-none transition focus:bg-white",
              touched && !taskOk
                ? "border-red-300 focus:border-red-400"
                : "border-slate-200 focus:border-emerald-300",
            ].join(" ")}
          />

          <div className="flex items-center justify-between gap-3 text-[12px]">
            <span
              className={
                touched && !taskOk ? "font-semibold text-red-600" : "text-slate-500"
              }
            >
              {touched && !taskOk
                ? "Escribe una indicación mínima para el conductor."
                : "Servicio rápido: el conductor llega y tú le explicas los detalles."}
            </span>

            <span className="shrink-0 font-semibold text-slate-400">
              {form.notes.length}/300
            </span>
          </div>
        </div>
      </div>

      {touched && !canContinue ? (
        <div className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700">
          Revisa ubicación, nombre e indicación del servicio.
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