// components/buyer/kronix/GenericTransportServiceRequest.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AuthRequiredModal from "@/components/buyer/AuthRequiredModal";
import { useAuth } from "@/components/buyer/useAuth";
import { useBuyerCity } from "@/components/buyer/CityContext";
import { apiFetch, type ApiError } from "@/lib/api";
import { geocodeAddressOSMInCity } from "@/lib/geocode";
import type { DynamicTransportService } from "@/lib/services/transportServices";

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

type CreateServiceOrderResponse = {
  id: string;
  status: string;
  flowStatus: string;
  totalCOP: number;
  createdAt: string;
  serviceType?: string | null;
  orderType?: "COURIER" | "STORE";
};

type ServiceConfig = DynamicTransportService;

function getUserName(user: any) {
  return String(user?.name ?? user?.user?.name ?? "").trim();
}

function getUserPhone(user: any) {
  return String(user?.phone ?? user?.user?.phone ?? "")
    .replace(/\D/g, "")
    .slice(0, 15);
}

function cleanPhone(value: unknown) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 15);
}


function normalizeHexColor(value: unknown, fallback: string) {
  const raw = String(value ?? "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(raw) ? raw.toUpperCase() : fallback;
}

function hexToRgba(hex: string, alpha: number) {
  const clean = normalizeHexColor(hex, "#64748B").slice(1);
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function GenericTransportServiceRequest({
  config,
}: {
  config: ServiceConfig;
}) {
  const router = useRouter();
  const { isAuthed, isLoading: authLoading, user } = useAuth();
  const { citySlug, cityReady, cityGeoLabel, cityLabel } = useBuyerCity();

  const schema = config.requestSchema ?? {};
  const originSchema = schema.origin ?? {};
  const contactSchema = schema.contact ?? {};
  const noteSchema = schema.note ?? {};
  const submitSchema = schema.submit ?? {};

  const serviceTitle = String(config.name ?? config.shortName ?? "Servicio KRONIX").trim();
  const serviceDescription = String(config.description ?? "").trim();
  const serviceIcon = String(config.icon ?? "🧰").trim() || "🧰";
  const serviceImage = String(config.cardImageRight ?? "").trim();
  const serviceKey = String(config.serviceKey ?? "").trim().toUpperCase();
  const workerTypeKey = String(config.workerTypeKey ?? "MOTORCYCLE").trim().toUpperCase();
  const workerLabel = String(config.workerLabel ?? "Worker").trim() || "Worker";
  const packageType = String(schema.packageType ?? config.shortName ?? serviceTitle).trim();
  const loginNext = `/kronix/${encodeURIComponent(config.slug)}`;

  const servicePrimaryColor = normalizeHexColor(
    config.primaryColor,
    "#0F766E"
  );
  const serviceAccentColor = normalizeHexColor(
    config.accentColor,
    "#ECFDF5"
  );

  const serviceSurfaceBackground = [
    `radial-gradient(circle at 88% 3%, ${hexToRgba(servicePrimaryColor, 0.18)} 0%, ${hexToRgba(servicePrimaryColor, 0.08)} 24%, transparent 48%)`,
    `linear-gradient(180deg, ${serviceAccentColor} 0px, ${hexToRgba(serviceAccentColor, 0.82)} 120px, #FFFFFF 310px)`,
  ].join(", ");

  const [placeName, setPlaceName] = useState("");
  const [address, setAddress] = useState("");
  const [reference, setReference] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [showSavedAddressModal, setShowSavedAddressModal] = useState(false);
  const addressInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const root = document.documentElement;

    root.style.setProperty("--kx-service-primary", servicePrimaryColor);
    root.style.setProperty("--kx-service-accent", serviceAccentColor);
    root.style.setProperty(
      "--kx-service-primary-soft",
      hexToRgba(servicePrimaryColor, 0.16)
    );
    root.style.setProperty(
      "--kx-service-primary-faint",
      hexToRgba(servicePrimaryColor, 0.07)
    );
    root.dataset.kxServiceTheme = "active";

    return () => {
      root.style.removeProperty("--kx-service-primary");
      root.style.removeProperty("--kx-service-accent");
      root.style.removeProperty("--kx-service-primary-soft");
      root.style.removeProperty("--kx-service-primary-faint");
      delete root.dataset.kxServiceTheme;
    };
  }, [servicePrimaryColor, serviceAccentColor]);

  useEffect(() => {
    const profileName = getUserName(user);
    const profilePhone = getUserPhone(user);

    setContactName((prev) => prev || profileName);
    setContactPhone((prev) => prev || profilePhone);
  }, [user]);

  useEffect(() => {
    let alive = true;

    async function loadAddresses() {
      if (!cityReady || !citySlug || !isAuthed) return;
      setAddressesLoading(true);

      try {
        const rows = await apiFetch<AddressItem[]>(
          `/users/me/addresses?citySlug=${encodeURIComponent(citySlug)}`,
          { suppressSessionExpiredEvent: true } as any
        );
        if (!alive) return;
        setAddresses(Array.isArray(rows) ? rows : []);
      } catch {
        if (!alive) return;
        setAddresses([]);
      } finally {
        if (alive) setAddressesLoading(false);
      }
    }

    loadAddresses();

    return () => {
      alive = false;
    };
  }, [cityReady, citySlug, isAuthed]);

  const addressOk = originSchema.required === false || address.trim().length >= 8;
  const contactOk = contactSchema.required === false || contactName.trim().length >= 3;
  const noteOk = noteSchema.required !== true || notes.trim().length >= 2;

  const ready = useMemo(() => {
    return addressOk && contactOk && noteOk && !!citySlug;
  }, [addressOk, contactOk, noteOk, citySlug]);

  function resetErrors() {
    setGeoError(null);
    setCreateError(null);
  }

  function applySavedAddress(id: string) {
    const selected = addresses.find((a) => a.id === id);
    if (!selected) return;

    resetErrors();
    setTouched(false);
    setPlaceName(String(selected.placeName ?? selected.label ?? "").trim());
    setAddress(String(selected.address ?? "").trim());
    setReference(String(selected.reference ?? "").trim());
    setLat(
      selected.lat != null && Number.isFinite(Number(selected.lat))
        ? Number(selected.lat)
        : null
    );
    setLng(
      selected.lng != null && Number.isFinite(Number(selected.lng))
        ? Number(selected.lng)
        : null
    );
    setShowSavedAddressModal(false);

    setContactName(
      String(selected.contactName ?? "").trim() || contactName || getUserName(user)
    );
    setContactPhone(
      cleanPhone(selected.contactPhone) || contactPhone || getUserPhone(user)
    );
  }

  async function getGeo() {
    if (
      typeof lat === "number" &&
      typeof lng === "number" &&
      Number.isFinite(lat) &&
      Number.isFinite(lng)
    ) {
      return { lat: Number(lat), lng: Number(lng) };
    }

    return await geocodeAddressOSMInCity(address, cityGeoLabel);
  }

  function requestService() {
    setTouched(true);
    if (config.operationalAvailable === false) { setCreateError("No hay trabajadores disponibles en este momento. Intenta nuevamente más tarde."); return; }
    setCreateError(null);

    if (!authLoading && !isAuthed) {
      setShowAuthModal(true);
      return;
    }

    if (!ready) {
      setCreateError("Revisa ubicación y contacto antes de solicitar el servicio.");
      return;
    }

    void handleSubmit();
  }

  async function handleSubmit() {
    if (submitting) return;
    setCreateError(null);

    if (!ready) return;

    if (!user?.id) {
      setCreateError("No pudimos identificar tu sesión. Vuelve a iniciar sesión.");
      return;
    }

    setSubmitting(true);

    try {
      const geo = await getGeo();

      if (!geo) {
        setCreateError(
          `No pudimos ubicar con precisión el punto de inicio en ${cityLabel}. Revisa la dirección e inténtalo de nuevo.`
        );
        setSubmitting(false);
        return;
      }

      const safeNotes = notes.trim() || String(noteSchema.defaultValue ?? "").trim();
      const normalizedWorkerLabel = workerLabel.toLowerCase();

const packageDescription = [
  `SERVICIO: ${serviceTitle}`,
  "PAGO CLIENTE: El cliente paga directamente al " +
    normalizedWorkerLabel +
    " según el acuerdo o tarifa establecida.",
  "COMISIÓN KRONIX: Se descontará al " +
    normalizedWorkerLabel +
    " al finalizar exitosamente el servicio.",
  "",
  `INDICACIÓN DEL CLIENTE: ${safeNotes}`,
]
  .filter(Boolean)
  .join("\n");

      const payload = {
        orderType: "COURIER" as const,
        courierServiceType:
          serviceKey === "PACKAGE" ? "SEND_PACKAGE" : "PICKUP_AND_DELIVERY",
        // Identidad dinámica maestra del servicio.
        serviceDefinitionId: config.id,
        serviceKey,
        serviceVersion: Number(config.version ?? 1),

        // Campos legacy temporales mientras Prisma conserva sus enums actuales.
        serviceType: serviceKey,
        requiredWorkerType: workerTypeKey,
        customerId: user.id,
        citySlug,

        dropoffAddress: address.trim(),
        dropoffLat: geo.lat,
        dropoffLng: geo.lng,
        customerNote: safeNotes,

        deliveryFeeCOP: 0,
        serviceFeeCOP: 0,
        promoCOP: 0,
        tipCOP: 0,
        totalCOP: 0,

        packageType,
        packageDescription,

        origin: {
          address: address.trim(),
          lat: geo.lat,
          lng: geo.lng,
          placeName: placeName.trim() || "Punto de inicio",
          reference: reference.trim() || undefined,
          senderName: contactName.trim(),
          senderPhone: contactPhone.trim() || undefined,
        },

        destination: {
          address: address.trim(),
          lat: geo.lat,
          lng: geo.lng,
          placeName: placeName.trim() || "Punto de inicio",
          reference: reference.trim() || undefined,
          receiverName: contactName.trim(),
          receiverPhone: contactPhone.trim() || undefined,
        },
      };

      const created = await apiFetch<CreateServiceOrderResponse>("/orders", {
        method: "POST",
        json: payload,
      });

      if (!created?.id) {
        throw new Error("La API no devolvió un id de orden válido.");
      }

      router.push(`/tracking/${created.id}`);
    } catch (e: any) {
      const err = e as ApiError;
      setCreateError(
        String(err?.message ?? "").trim() ||
          "No se pudo crear la solicitud en este momento."
      );
      setSubmitting(false);
    }
  }

  return (
    <div
      className="-mt-px min-h-full space-y-2 px-4 pb-4 pt-1"
      style={{ background: serviceSurfaceBackground }}
    >
      <div
        className="relative flex items-center gap-3 overflow-hidden rounded-[22px] px-2 py-2"
        style={{
          background: `linear-gradient(90deg, ${hexToRgba(
            servicePrimaryColor,
            0.05
          )} 0%, ${hexToRgba(servicePrimaryColor, 0.13)} 100%)`,
        }}
      >
        {serviceImage ? (
          <img
            src={serviceImage}
            alt={serviceTitle}
            className="h-[70px] w-[92px] shrink-0 object-contain"
          />
        ) : (
          <div className="grid h-[58px] w-[58px] shrink-0 place-items-center rounded-full bg-white/70 text-[34px] ring-1 ring-slate-200">
            {serviceIcon}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="text-[24px] font-black leading-tight text-slate-950">
            {serviceTitle}
          </h1>
          <p className="mt-1 text-[13px] font-semibold leading-5 text-slate-600">
            {serviceDescription}
          </p>
        </div>
      </div>

      <div className="rounded-[20px] border border-slate-200 bg-white p-2 shadow-sm">
        {schema.allowSavedAddress !== false && (addresses.length > 0 || addressesLoading) ? (
          <div className="rounded-[16px] border border-blue-100 bg-gradient-to-r from-blue-50 to-cyan-50 px-2 py-2">
            <div className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-blue-700">
              Usar dirección guardada
            </div>
            <button
              type="button"
              disabled={addressesLoading}
              onClick={() => setShowSavedAddressModal(true)}
              className="flex h-11 w-full items-center justify-between rounded-[14px] border border-blue-100 bg-white px-3 text-left shadow-sm transition active:scale-[0.99] disabled:opacity-60"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-blue-50 text-base">📍</span>
                <span className="truncate text-[13px] font-bold text-slate-700">
                  {addressesLoading ? "Cargando direcciones..." : "Seleccionar dirección"}
                </span>
              </span>
              <span className="text-lg font-black text-blue-600">›</span>
            </button>
          </div>
        ) : null}

        {geoError ? (
          <div className="mt-2 rounded-[14px] border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700">
            {geoError}
          </div>
        ) : null}


        <div className="mt-2 grid gap-1.5">
          <input
            ref={addressInputRef}
            type="text"
            value={address}
            onChange={(e) => {
              resetErrors();
              setAddress(e.target.value);
              // Una dirección digitada manualmente debe resolverse nuevamente
              // dentro de la ciudad operativa activa.
              setLat(null);
              setLng(null);
            }}
            onBlur={() => setTouched(true)}
            placeholder={`${originSchema.addressLabel || "Dirección o ubicación de inicio"}${originSchema.required === false ? "" : " *"}`}
            className={[
              "h-12 w-full rounded-[14px] border bg-slate-50 px-4 text-[15px] font-semibold text-slate-900 outline-none transition focus:bg-white",
              touched && !addressOk
                ? "border-red-300 focus:border-red-400"
                : "border-slate-200 focus:border-blue-300",
            ].join(" ")}
            maxLength={220}
          />

          <input
            type="text"
            value={placeName}
            onChange={(e) => {
              resetErrors();
              setPlaceName(e.target.value);
            }}
            placeholder={originSchema.placeNameLabel || "Nombre del lugar (opcional)"}
            className="h-12 w-full rounded-[14px] border border-slate-200 bg-slate-50 px-4 text-[15px] font-semibold text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white"
            maxLength={80}
          />

          <textarea
            value={reference}
            onChange={(e) => {
              resetErrors();
              setReference(e.target.value);
            }}
            placeholder={originSchema.referenceLabel || "Referencia: barrio, portería, local, frente a..."}
            rows={2}
            className="w-full rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-2 text-[15px] font-semibold text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white"
            maxLength={160}
          />
        </div>
      </div>

      {contactSchema.enabled !== false || noteSchema.enabled !== false ? (
      <div className="rounded-[20px] border border-slate-200 bg-white p-2 shadow-sm">
        <div className="grid grid-cols-[70px_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5">
          <label className="text-[14px] font-black text-slate-700">Contacto</label>
          <input
            type="text"
            value={contactName}
            onChange={(e) => {
              resetErrors();
              setContactName(e.target.value);
            }}
            onBlur={() => setTouched(true)}
            placeholder="Contacto"
            className={[
              "h-12 w-full rounded-[12px] border bg-slate-50 px-4 text-[15px] font-semibold text-slate-900 outline-none transition focus:bg-white",
              touched && !contactOk
                ? "border-red-300 focus:border-red-400"
                : "border-slate-200 focus:border-emerald-300",
            ].join(" ")}
            maxLength={80}
          />

          <label className="text-[14px] font-black text-slate-700">Celular</label>
          <input
            type="text"
            value={contactPhone}
            onChange={(e) => {
              resetErrors();
              setContactPhone(cleanPhone(e.target.value));
            }}
            placeholder="Celular"
            inputMode="numeric"
            className="h-12 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-4 text-[14px] font-semibold text-slate-900 outline-none transition focus:border-emerald-300 focus:bg-white"
            maxLength={15}
          />

          <label className="self-start pt-2 text-[14px] font-black text-slate-700">
            Nota
          </label>
          <textarea
            value={notes}
            onChange={(e) => {
              resetErrors();
              setNotes(e.target.value);
            }}
            placeholder={noteSchema.placeholder || "Describe lo que necesitas"}
            rows={2}
            maxLength={300}
            className="w-full rounded-[12px] border border-slate-200 bg-slate-50 px-4 py-2 text-[14px] font-semibold text-slate-900 outline-none transition focus:border-emerald-300 focus:bg-white"
          />
        </div>
      </div>
      ) : null}

      {touched && !ready ? (
        <div className="rounded-[14px] border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700">
          Revisa ubicación y contacto antes de solicitar el servicio.
        </div>
      ) : null}

      {createError ? (
        <div className="rounded-[14px] border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700">
          {createError}
        </div>
      ) : null}

      <button
        type="button"
        disabled={!ready || submitting}
        onClick={requestService}
        className={[
          "w-full rounded-[20px] py-3 text-[15px] font-black text-white transition",
          ready && !submitting
            ? "shadow-[0_10px_18px_rgba(15,23,42,0.14)] hover:scale-[0.995] hover:brightness-95"
            : "cursor-not-allowed bg-slate-300 shadow-none",
        ].join(" ")}
        style={
          ready && !submitting
            ? {
                background: `linear-gradient(90deg, ${servicePrimaryColor} 0%, ${hexToRgba(
                  servicePrimaryColor,
                  0.72
                )} 100%)`,
              }
            : undefined
        }
      >
        {submitting ? submitSchema.creatingText || "Creando solicitud..." : submitSchema.buttonText || `Solicitar ${serviceTitle}`}
      </button>

      {showSavedAddressModal ? (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]">
          <button
            type="button"
            aria-label="Cerrar selector de direcciones"
            className="absolute inset-0"
            onClick={() => setShowSavedAddressModal(false)}
          />

          <div className="relative z-10 flex max-h-[84dvh] w-full max-w-md flex-col overflow-hidden rounded-[26px] border border-white/70 bg-[#f8fafc] shadow-[0_24px_70px_rgba(15,23,42,0.30)]">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
              <div>
                <div className="text-[17px] font-black text-slate-950">Selecciona una dirección</div>
                <div className="mt-0.5 text-[11px] font-semibold text-slate-500">Tus direcciones guardadas en {cityLabel}</div>
              </div>
              <button
                type="button"
                onClick={() => setShowSavedAddressModal(false)}
                className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-xl font-black text-slate-600"
              >
                ×
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
              {addresses.map((item) => {
                const title = String(item.placeName ?? item.label ?? "Dirección guardada").trim();
                const itemAddress = String(item.address ?? "").trim();
                const itemReference = String(item.reference ?? "").trim();

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => applySavedAddress(item.id)}
                    className="flex w-full items-start gap-3 rounded-[18px] border border-slate-200 bg-white px-3 py-3 text-left shadow-sm transition hover:border-blue-300 active:scale-[0.995]"
                  >
                    <span className={[
                      "grid h-10 w-10 shrink-0 place-items-center rounded-[14px] text-lg",
                      item.isDefault
                        ? "bg-emerald-50 ring-1 ring-emerald-200"
                        : item.isFavorite
                          ? "bg-rose-50 ring-1 ring-rose-200"
                          : "bg-blue-50 ring-1 ring-blue-100",
                    ].join(" ")}>
                      {item.isDefault ? "🏠" : item.isFavorite ? "❤️" : "📍"}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[14px] font-extrabold text-slate-900">{title}</span>
                        {item.isDefault ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-extrabold text-emerald-700 ring-1 ring-emerald-200">
                            PRINCIPAL
                          </span>
                        ) : item.isFavorite ? (
                          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[9px] font-extrabold text-rose-700 ring-1 ring-rose-200">
                            FAVORITA
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-1 block break-words text-[13px] font-semibold leading-5 text-slate-700">
                        {itemAddress}
                      </span>
                      {itemReference ? (
                        <span className="mt-1 block text-[11px] leading-4 text-slate-500">
                          Ref.: {itemReference}
                        </span>
                      ) : null}
                    </span>

                    <span className="mt-2 text-lg font-black text-blue-600">›</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <AuthRequiredModal
        open={showAuthModal}
        onConfirm={() =>
          router.push(`/login?next=${encodeURIComponent(loginNext)}`)
        }
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}

export type { ServiceConfig };
