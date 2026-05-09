// components/buyer/kronix/KronixEnviosStepTwo.tsx
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

const PACKAGE_OPTIONS = [
  "Sobre",
  "Bolsa Normal",
  "Bolsa Grande",
  "Caja Normal",
  "Caja Grande",
  "Otros Normal",
  "Otros Grande",
];

function cleanPhone(value: unknown) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 15);
}

export default function KronixEnviosStepTwo() {
  const router = useRouter();
  const { citySlug, cityReady } = useBuyerCity();

  const [form, setForm] = useState<KronixEnviarDraft>(loadKronixEnviarDraft());
  const [touched, setTouched] = useState(false);
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);

  useEffect(() => {
    setForm(loadKronixEnviarDraft());
  }, []);

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

        setAddresses(Array.isArray(rows) ? rows : []);
      } catch {
        setAddresses([]);
      } finally {
        setAddressesLoading(false);
      }
    }

    loadAddresses();
  }, [cityReady, citySlug]);

  const dropoffOk = form.dropoffAddress.trim().length >= 8;
  const receiverOk = form.receiverName.trim().length >= 3;
  const packageOk = form.packageType.trim().length >= 3;

  const canContinue = useMemo(() => {
    return dropoffOk && receiverOk && packageOk;
  }, [dropoffOk, receiverOk, packageOk]);

  function updateField<K extends keyof KronixEnviarDraft>(
    key: K,
    value: KronixEnviarDraft[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function applySavedAddress(id: string) {
    const selected = addresses.find((a) => a.id === id);
    if (!selected) return;

    setTouched(false);
    setShowMapPicker(false);

    setForm((prev) => ({
      ...prev,
      dropoffPlaceName: String(selected.placeName ?? selected.label ?? "").trim(),
      dropoffAddress: String(selected.address ?? "").trim(),
      dropoffReference: String(selected.reference ?? "").trim(),
      receiverName:
        String(selected.contactName ?? "").trim() || prev.receiverName.trim(),
      receiverPhone:
        cleanPhone(selected.contactPhone) || prev.receiverPhone.trim(),
      ...(selected.lat != null && Number.isFinite(Number(selected.lat))
        ? { dropoffLat: Number(selected.lat) }
        : { dropoffLat: null }),
      ...(selected.lng != null && Number.isFinite(Number(selected.lng))
        ? { dropoffLng: Number(selected.lng) }
        : { dropoffLng: null }),
    }));
  }

  function goBack() {
    saveKronixEnviarDraft(form);
    router.push("/kronix/enviar?step=1");
  }

  function handleContinue() {
    setTouched(true);
    if (!canContinue) return;

    saveKronixEnviarDraft({
      ...form,
      packageDescription:
        form.packageDescription.trim() ||
        `Tipo de envío: ${form.packageType.trim()}`,
    });

    router.push("/kronix/enviar?step=3");
  }

  return (
    <div className="space-y-2">
      <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.07)]">
        <div className="flex items-start gap-3">
          <div className="relative h-[62px] w-[62px] shrink-0 overflow-visible">
            <Image
              src="/branding/kronix/card-moto.png"
              alt="Entrega KroniX Envíos"
              fill
              className="object-contain scale-[1.9] translate-x-[-20px] translate-y-[-15px]"
              sizes="62px"
            />
          </div>

          <div className="min-w-0">
            <div className="text-[18px] font-black leading-tight text-slate-900">
              ¿Dónde entregamos el envío?
            </div>
            <div className="mt-1 text-[13px] leading-5 text-slate-500">
              No lo prellenamos para evitar errores. Puedes escribirlo, marcarlo en el mapa o escoger una dirección guardada.
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {addresses.length > 0 || addressesLoading ? (
            <div className="rounded-[22px] border border-emerald-100 bg-emerald-50 px-3 py-3">
              <label className="mb-2 block text-[12px] font-extrabold uppercase tracking-[0.12em] text-emerald-700">
                Usar dirección guardada
              </label>

              <select
                disabled={addressesLoading}
                defaultValue=""
                onChange={(e) => applySavedAddress(e.target.value)}
                className="w-full rounded-[18px] border border-emerald-100 bg-white px-3 py-3 text-[14px] font-bold text-slate-900 outline-none"
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

          <button
            type="button"
            onClick={() => setShowMapPicker((prev) => !prev)}
            className="w-full rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-4 text-[15px] font-black text-emerald-800 shadow-sm transition hover:bg-emerald-100"
          >
            🗺️ {showMapPicker ? "Cerrar mapa" : "Seleccionar entrega en el mapa"}
          </button>

          {showMapPicker ? (
            <LocationPickerMap
              initialLat={
                typeof form.dropoffLat === "number" ? form.dropoffLat : undefined
              }
              initialLng={
                typeof form.dropoffLng === "number" ? form.dropoffLng : undefined
              }
              onSelect={({ lat, lng, address }) => {
  setForm((prev) => ({
    ...prev,
    dropoffPlaceName: "",
    dropoffAddress: address || "Ubicación seleccionada en el mapa",
    dropoffReference: "",
    dropoffLat: lat,
    dropoffLng: lng,

    // 🔥 CLAVE
    dropoffUseCurrentLocation: true,
  }));

  setTouched(false);
  setShowMapPicker(false);
}}
            />
          ) : null}

          <input
            type="text"
            value={form.dropoffPlaceName}
            onChange={(e) => updateField("dropoffPlaceName", e.target.value)}
            placeholder="Nombre del lugar: casa, oficina, local..."
            className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-[15px] font-semibold text-slate-900 outline-none transition focus:border-emerald-300 focus:bg-white"
            maxLength={80}
          />

          <textarea
            value={form.dropoffAddress}
            onChange={(e) => {
              updateField("dropoffAddress", e.target.value);
              setForm((prev) => ({
                ...prev,
                dropoffLat: null,
                dropoffLng: null,
                dropoffUseCurrentLocation: false,
              }));
            }}
            onBlur={() => setTouched(true)}
            placeholder="Dirección de entrega *"
            rows={3}
            className={[
              "w-full rounded-[20px] border bg-slate-50 px-4 py-4 text-[15px] font-semibold text-slate-900 outline-none transition focus:bg-white",
              touched && !dropoffOk
                ? "border-red-300 focus:border-red-400"
                : "border-slate-200 focus:border-emerald-300",
            ].join(" ")}
            maxLength={220}
          />

          <input
            type="text"
            value={form.dropoffReference}
            onChange={(e) => updateField("dropoffReference", e.target.value)}
            placeholder="Referencia: portería, apto, local, recepción..."
            className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-[15px] font-semibold text-slate-900 outline-none transition focus:border-emerald-300 focus:bg-white"
            maxLength={120}
          />

          <div className="grid grid-cols-1 gap-3">
            <input
              type="text"
              value={form.receiverName}
              onChange={(e) => updateField("receiverName", e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="Nombre del contacto en entrega *"
              className={[
                "w-full rounded-[20px] border bg-slate-50 px-4 py-4 text-[15px] font-semibold text-slate-900 outline-none transition focus:bg-white",
                touched && !receiverOk
                  ? "border-red-300 focus:border-red-400"
                  : "border-slate-200 focus:border-emerald-300",
              ].join(" ")}
              maxLength={80}
            />

            <input
              type="text"
              value={form.receiverPhone}
              onChange={(e) =>
                updateField(
                  "receiverPhone",
                  cleanPhone(e.target.value) as any
                )
              }
              placeholder="Teléfono del contacto en entrega"
              inputMode="numeric"
              className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-[15px] font-semibold text-slate-900 outline-none transition focus:border-emerald-300 focus:bg-white"
              maxLength={15}
            />
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.07)]">
        <div className="text-[18px] font-black text-slate-900">
          Detalles del envío
        </div>

        <div className="mt-1 text-[13px] leading-5 text-slate-500">
          Indica el tamaño del envío y notas opcionales para el conductor.
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-2 block text-[12px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
              ¿Qué vas a enviar? <span className="text-red-500">*</span>
            </label>

            <select
              value={form.packageType}
              onChange={(e) => updateField("packageType", e.target.value)}
              onBlur={() => setTouched(true)}
              className={[
                "w-full rounded-[20px] border bg-slate-50 px-4 py-4 text-[15px] font-semibold outline-none transition focus:bg-white",
                form.packageType ? "text-slate-900" : "text-slate-400",
                touched && !packageOk
                  ? "border-red-300 focus:border-red-400"
                  : "border-slate-200 focus:border-violet-300",
              ].join(" ")}
            >
              <option value="">Seleccione</option>
              {PACKAGE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <textarea
            value={form.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            placeholder="Notas para el conductor (opcional). Ej: entregar en recepción, llamar al llegar, no doblar..."
            rows={4}
            maxLength={300}
            className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-[15px] font-semibold text-slate-900 outline-none transition focus:border-violet-300 focus:bg-white"
          />

          <div className="text-right text-[11px] font-semibold text-slate-400">
            {form.notes.length}/300
          </div>
        </div>
      </div>

      {touched && !canContinue ? (
        <div className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700">
          Revisa dirección de entrega, contacto de entrega y tipo de envío.
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={goBack}
          className="rounded-[24px] border border-slate-200 bg-white py-4 text-[15px] font-black text-slate-800 shadow-sm transition hover:bg-slate-50"
        >
          Atrás
        </button>

        <button
          type="button"
          onClick={handleContinue}
          className={[
            "rounded-[24px] py-4 text-[15px] font-black text-white transition",
            canContinue
              ? "bg-[linear-gradient(90deg,#0ea5e9_0%,#10b981_55%,#22c55e_100%)] shadow-[0_12px_22px_rgba(16,185,129,0.22)] hover:scale-[0.995]"
              : "cursor-not-allowed bg-slate-300 shadow-none",
          ].join(" ")}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}