// components/buyer/kronix/GenericTransportServiceRequest.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [useGps, setUseGps] = useState(false);
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
    setUseGps(false);

    setContactName(
      String(selected.contactName ?? "").trim() || contactName || getUserName(user)
    );
    setContactPhone(
      cleanPhone(selected.contactPhone) || contactPhone || getUserPhone(user)
    );
  }

  function useCurrentLocation() {
    resetErrors();

    if (!navigator?.geolocation) {
      setGeoError("Tu navegador no permite usar ubicación actual.");
      return;
    }

    setGeoLoading(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextLat = Number(pos.coords.latitude);
        const nextLng = Number(pos.coords.longitude);

        setPlaceName("Mi ubicación actual");
        setAddress("Mi ubicación actual");
        setReference((prev) =>
          prev.trim() || "El worker debe llegar a mi ubicación GPS actual."
        );
        setLat(nextLat);
        setLng(nextLng);
        setUseGps(true);
        setTouched(false);
        setGeoLoading(false);
      },
      () => {
        setGeoError(
          "No pudimos tomar tu ubicación. Revisa permisos del navegador o escribe la dirección manualmente."
        );
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
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
          placeName: placeName.trim() || (useGps ? "Mi ubicación actual" : "Punto de inicio"),
          reference: reference.trim() || undefined,
          senderName: contactName.trim(),
          senderPhone: contactPhone.trim() || undefined,
        },

        destination: {
          address: address.trim(),
          lat: geo.lat,
          lng: geo.lng,
          placeName: placeName.trim() || (useGps ? "Mi ubicación actual" : "Punto de inicio"),
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
          <div className="rounded-[16px] border border-blue-100 bg-blue-50 px-2 py-2">
            <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-blue-700">
              Usar dirección guardada
            </label>
            <select
              disabled={addressesLoading}
              defaultValue=""
              onChange={(e) => applySavedAddress(e.target.value)}
              className="h-10 w-full rounded-[14px] border border-blue-100 bg-white px-4 text-[13px] font-bold text-slate-900 outline-none"
            >
              <option value="">
                {addressesLoading ? "Cargando..." : "Seleccionar dirección"}
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

        {schema.allowCurrentLocation !== false ? (
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={geoLoading}
          className={[
            "mt-2 h-12 w-full rounded-[16px] px-4 text-[14px] font-black text-white shadow-sm transition",
            geoLoading
              ? "cursor-not-allowed bg-slate-300"
              : "hover:brightness-95",
          ].join(" ")}
          style={
            geoLoading
              ? undefined
              : {
                  background: `linear-gradient(90deg, ${servicePrimaryColor} 0%, ${hexToRgba(
                    servicePrimaryColor,
                    0.78
                  )} 100%)`,
                }
          }
        >
          {geoLoading ? "Tomando ubicación..." : "📍 Usar mi ubicación actual"}
        </button>
        ) : null}

        {geoError ? (
          <div className="mt-2 rounded-[14px] border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700">
            {geoError}
          </div>
        ) : null}

        <div className="mt-2 grid gap-1.5">
          <input
            type="text"
            value={address}
            onChange={(e) => {
              resetErrors();
              setAddress(e.target.value);
              setLat(null);
              setLng(null);
              setUseGps(false);
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
