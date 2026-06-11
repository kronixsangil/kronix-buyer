// components/buyer/kronix/DomicilioExpressStepOne.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearKronixRecogerDraft,
  type KronixPickupDraft,
  formatPhoneDraft,
  loadKronixRecogerDraft,
  saveKronixRecogerDraft,
} from "@/components/buyer/kronix/kronixRecogerDraft";
import AuthRequiredModal from "@/components/buyer/AuthRequiredModal";
import { useBuyerCity } from "@/components/buyer/CityContext";
import { useAuth } from "@/components/buyer/useAuth";
import { apiFetch, type ApiError } from "@/lib/api";
import { geocodeAddressOSMInCity } from "@/lib/geocode";

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

type CreateCourierOrderResponse = {
  id: string;
  status: string;
  flowStatus: string;
  totalCOP: number;
  createdAt: string;
  orderType: "COURIER" | "STORE";
};

type CourierZoneCalculateResponse = {
  serviceType: "PICKUP_AND_DELIVERY" | "SEND_PACKAGE" | "ERRAND";
  zone: {
    id: string;
    zoneNumber: number;
    name: string;
    isNegotiable: boolean;
    isInsideCoverage: boolean;
  };
  pricing: {
    baseServiceCOP: number;
    zoneFeeCOP: number;
    serviceFeeCOP: number;
    packageLargeFeeCOP: number;
    additionalPointsFeeCOP: number;
    returnFeeCOP: number;
    complexityFeeCOP: number;
    tipCOP: number;
    totalCOP: number;
  };
  message: string;
};

type WalletResponse = {
  ok?: boolean;
  wallet?: {
    id: string;
    userId: string;
    cityId: string;
    cashBalanceCOP: number;
    bonusBalanceCOP: number;
    totalAvailableCOP: number;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
  } | null;
};

function formatCOP(value: number) {
  return Number(value || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

function getSafeMoney(value: unknown) {
  const n = Math.round(Number(value ?? 0));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function getUserName(user: any) {
  return String(user?.name ?? user?.user?.name ?? "").trim();
}

function getUserPhone(user: any) {
  return String(user?.phone ?? user?.user?.phone ?? "")
    .replace(/\D/g, "")
    .slice(0, 15);
}

function PriceLine({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-[5px] last:border-b-0">
      <div className={highlight ? "text-[15px] font-black text-slate-950" : "text-[14px] font-semibold text-slate-600"}>{label}</div>
      <div className={highlight ? "text-[18px] font-black text-slate-950" : "text-[15px] font-black text-slate-900"}>{value}</div>
    </div>
  );
}

function ConfirmationModal({
  open,
  submitting,
  totalCOP,
  walletAvailableCOP,
  onClose,
  onConfirm,
}: {
  open: boolean;
  submitting: boolean;
  totalCOP: number;
  walletAvailableCOP: number;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[390px] overflow-hidden rounded-[28px] bg-white shadow-2xl ring-1 ring-black/10">
        <div className="relative px-5 pb-5 pt-5 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.28),transparent_34%),linear-gradient(135deg,#03102b_0%,#082b63_55%,#0f172a_100%)]" />
          <div className="relative z-10">
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100">Confirmación KroniX</div>
            <div className="mt-2 text-[22px] font-black leading-tight">Confirmar y pagar con Wallet</div>
            <div className="mt-2 text-[13px] font-semibold leading-5 text-white/85">
              KroniX descontará el valor estimado de tu Wallet y creará el Domicilio Express de inmediato.
            </div>
          </div>
        </div>

        <div className="space-y-3 p-5">
          <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3">
            <div className="flex items-center justify-between gap-3 text-[13px] font-black text-emerald-950">
              <span>Saldo Wallet</span>
              <span>{formatCOP(walletAvailableCOP)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 border-t border-emerald-100 pt-2 text-[13px] font-black text-emerald-950">
              <span>Valor a descontar</span>
              <span>{formatCOP(totalCOP)}</span>
            </div>
          </div>

          <div className="rounded-[22px] border border-blue-200 bg-blue-50 px-4 py-3 text-[13px] font-bold leading-5 text-blue-900">
            El valor mostrado es una estimación inicial y puede variar por lluvias, tráfico, tiempos de espera, distancias superiores a las previstas, paquetes grandes, pesados, voluminosos o cualquier condición especial detectada durante la prestación del servicio. El motorizado podrá realizar cobro extra en efectivo en caso de que se presenten estas condiciones.
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={submitting} className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-[14px] font-black text-slate-800 shadow-sm disabled:opacity-50">
              Cancelar
            </button>
            <button type="button" onClick={onConfirm} disabled={submitting} className="rounded-[22px] bg-[linear-gradient(90deg,#059669_0%,#0ea5e9_100%)] px-4 py-3 text-[14px] font-black text-white shadow-[0_12px_22px_rgba(5,150,105,0.24)] disabled:opacity-60">
              {submitting ? "Pagando..." : "Aceptar y pagar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DomicilioExpressStepOne() {
  const router = useRouter();
  const { isAuthed, isLoading: authLoading, user } = useAuth();
  const { city, citySlug, cityReady, cityGeoLabel, cityLabel } = useBuyerCity();

  const [form, setForm] = useState<KronixPickupDraft>(() => loadKronixRecogerDraft());
  const [touched, setTouched] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [zoneCalculation, setZoneCalculation] = useState<CourierZoneCalculateResponse | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletResponse["wallet"] | null>(null);

  useEffect(() => {
    const draft = loadKronixRecogerDraft();
    const profileName = getUserName(user);
    const profilePhone = getUserPhone(user);

    setForm({
      ...draft,
      senderName: profileName || draft.senderName.trim(),
      senderPhone: profilePhone || draft.senderPhone.trim(),
      notes: "",
      packageType: "Domicilio Express",
    });
  }, [user]);

  useEffect(() => {
    saveKronixRecogerDraft(form);
  }, [form]);

  useEffect(() => {
    let alive = true;

    async function loadAddresses() {
      if (!cityReady || !citySlug) return;
      setAddressesLoading(true);

      try {
        const rows = await apiFetch<AddressItem[]>(`/users/me/addresses?citySlug=${encodeURIComponent(citySlug)}`, { suppressSessionExpiredEvent: true } as any);
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
  }, [cityReady, citySlug]);

  const pickupOk = form.pickupAddress.trim().length >= 8;
  const senderNameOk = form.senderName.trim().length >= 3;
  const taskOk = form.notes.trim().length >= 5;

  const ready = useMemo(() => pickupOk && senderNameOk && taskOk && !!citySlug, [citySlug, pickupOk, senderNameOk, taskOk]);

  const pricing = useMemo(() => {
    const apiPricing = zoneCalculation?.pricing;
    return {
      baseFee: getSafeMoney(apiPricing?.baseServiceCOP),
      zoneFee: getSafeMoney(apiPricing?.zoneFeeCOP),
      serviceFee: getSafeMoney(apiPricing?.serviceFeeCOP),
      total: getSafeMoney(apiPricing?.totalCOP),
      zoneNumber: zoneCalculation?.zone?.zoneNumber ?? null,
      isNegotiable: Boolean(zoneCalculation?.zone?.isNegotiable),
      deliveryFee: getSafeMoney(apiPricing?.baseServiceCOP) + getSafeMoney(apiPricing?.zoneFeeCOP),
    };
  }, [zoneCalculation]);

  const walletAvailableCOP = useMemo(() => Number(wallet?.totalAvailableCOP ?? 0), [wallet?.totalAvailableCOP]);
  const hasEnoughWalletBalance = useMemo(() => walletAvailableCOP >= pricing.total && pricing.total > 0, [pricing.total, walletAvailableCOP]);

  function updateField<K extends keyof KronixPickupDraft>(key: K, value: KronixPickupDraft[K]) {
    setGeoError(null);
    setCreateError(null);
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function applySavedAddress(id: string) {
    const selected = addresses.find((a) => a.id === id);
    if (!selected) return;

    setTouched(false);
    setGeoError(null);
    setCreateError(null);

    setForm((prev) => ({
      ...prev,
      pickupPlaceName: String(selected.placeName ?? selected.label ?? "").trim(),
      pickupAddress: String(selected.address ?? "").trim(),
      pickupReference: String(selected.reference ?? "").trim(),
      pickupLat: selected.lat != null && Number.isFinite(Number(selected.lat)) ? Number(selected.lat) : null,
      pickupLng: selected.lng != null && Number.isFinite(Number(selected.lng)) ? Number(selected.lng) : null,
      pickupUseCurrentLocation: false,
    }));
  }

  function useCurrentLocation() {
    setGeoError(null);
    setCreateError(null);

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
          pickupReference: prev.pickupReference.trim() || "El conductor debe llegar a mi ubicación GPS actual.",
          pickupLat: lat,
          pickupLng: lng,
          pickupUseCurrentLocation: true,
        }));

        setTouched(false);
        setGeoLoading(false);
      },
      () => {
        setGeoError("No pudimos tomar tu ubicación. Revisa permisos del navegador o escribe la dirección manualmente.");
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }

  async function getPickupGeo() {
    if (typeof form.pickupLat === "number" && typeof form.pickupLng === "number" && Number.isFinite(form.pickupLat) && Number.isFinite(form.pickupLng)) {
      return { lat: Number(form.pickupLat), lng: Number(form.pickupLng) };
    }

    return await geocodeAddressOSMInCity(form.pickupAddress, cityGeoLabel);
  }

  useEffect(() => {
    let alive = true;

    async function loadWallet() {
      if (!isAuthed || !user?.id || !city?.id) {
        if (!alive) return;
        setWallet(null);
        setWalletLoading(false);
        return;
      }

      setWalletLoading(true);
      setWalletError(null);

      try {
        const response = await apiFetch<WalletResponse>(`/wallet/me?cityId=${encodeURIComponent(city.id)}`, { method: "GET", suppressSessionExpiredEvent: true } as any);
        if (!alive) return;
        setWallet(response?.wallet ?? null);
      } catch (e: any) {
        if (!alive) return;
        setWallet(null);
        setWalletError(String(e?.message ?? "").trim() || "No pudimos consultar tu saldo KroniX Wallet.");
      } finally {
        if (alive) setWalletLoading(false);
      }
    }

    loadWallet();
    return () => {
      alive = false;
    };
  }, [isAuthed, user?.id, city?.id]);

  useEffect(() => {
    let cancelled = false;

    async function calculatePricing() {
      setPricingError(null);
      setZoneCalculation(null);

      if (!ready || !citySlug) return;
      setPricingLoading(true);

      try {
        const pickupGeo = await getPickupGeo();

        if (!pickupGeo) {
          if (!cancelled) setPricingError(`No pudimos ubicar con precisión el punto de inicio en ${cityLabel}. Revisa la dirección.`);
          return;
        }

        const response = await apiFetch<CourierZoneCalculateResponse>("/courier/zones/calculate", {
          method: "POST",
          json: {
            citySlug,
            serviceType: "PICKUP_AND_DELIVERY",
            points: [
              {
                lat: pickupGeo.lat,
                lng: pickupGeo.lng,
                label: "Punto de inicio Domicilio Express",
                address: form.pickupAddress.trim(),
              },
            ],
            tipCOP: 0,
          },
        });

        if (!cancelled) setZoneCalculation(response);
      } catch (e: any) {
        const err = e as ApiError;
        if (!cancelled) setPricingError(String(err?.message ?? "").trim() || "No pudimos calcular la tarifa automática en este momento.");
      } finally {
        if (!cancelled) setPricingLoading(false);
      }
    }

    calculatePricing();
    return () => {
      cancelled = true;
    };
  }, [ready, citySlug, cityLabel, cityGeoLabel, form.pickupAddress, form.pickupLat, form.pickupLng]);

  function requestConfirm() {
    setTouched(true);
    setCreateError(null);

    if (!authLoading && !isAuthed) {
      setShowAuthModal(true);
      return;
    }

    if (!ready) {
      setCreateError("Revisa ubicación, contacto e indicación del servicio.");
      return;
    }

    if (!zoneCalculation) {
      setCreateError("Aún no tenemos la tarifa automática lista. Espera unos segundos e inténtalo de nuevo.");
      return;
    }

    if (walletLoading) {
      setCreateError("Estamos consultando tu saldo KroniX Wallet. Espera unos segundos.");
      return;
    }

    if (walletError) {
      setCreateError(walletError);
      return;
    }

    if (!wallet?.isActive) {
      setCreateError("Debes tener una KroniX Wallet activa para confirmar este servicio.");
      return;
    }

    if (!hasEnoughWalletBalance) {
      setCreateError("Saldo insuficiente en tu KroniX Wallet. Recarga saldo antes de confirmar.");
      return;
    }

    setShowConfirmModal(true);
  }

  async function handleSubmit() {
    setCreateError(null);

    if (!ready || !zoneCalculation) return;

    if (!user?.id) {
      setCreateError("No pudimos identificar tu sesión. Vuelve a iniciar sesión.");
      return;
    }

    setSubmitting(true);

    try {
      const pickupGeo = await getPickupGeo();

      if (!pickupGeo) {
        setCreateError(`No pudimos ubicar con precisión el punto de inicio en ${cityLabel}. Revisa la dirección e inténtalo de nuevo.`);
        setSubmitting(false);
        return;
      }

      const nextDraft: KronixPickupDraft = {
        ...form,
        packageType: "Domicilio Express",
        packageDescription: form.packageDescription.trim() || "Servicio express: el cliente explicará la tarea al llegar el conductor.",
        receiverName: form.senderName.trim() || "Cliente",
        receiverPhone: form.senderPhone.trim(),
        dropoffPlaceName: form.pickupPlaceName,
        dropoffAddress: form.pickupAddress,
        dropoffReference: form.pickupReference,
        dropoffLat: pickupGeo.lat,
        dropoffLng: pickupGeo.lng,
        tipCOP: 0,
      };

      saveKronixRecogerDraft(nextDraft);

      const packageDescription = [
        "SERVICIO: Domicilio Express",
        "TIPO: Motorizado rápido para tarea simple",
        `ZONA CALCULADA: Zona ${pricing.zoneNumber ?? "pendiente"}`,
        `VALOR ZONA: ${formatCOP(pricing.zoneFee)}`,
        `COSTO SERVICIO: ${formatCOP(pricing.serviceFee)}`,
        "PROPINA: $ 0",
        "",
        `INDICACIÓN DEL CLIENTE: ${form.notes.trim()}`,
        "",
        "CONDICIÓN OPERATIVA:",
        "Servicio Domicilio Express cubre zona urbana cercana y paquetes/tareas de tamaño normal sin pérdidas de tiempo excesivas. En caso de que el servicio exceda estas condiciones, el cliente podrá renegociar el servicio con el motorizado en punto o cancelar según política KroniX.",
        "",
        "NOTA OPERATIVA: El cliente explicará detalles adicionales cuando llegue el conductor.",
      ].filter(Boolean).join("\n");

      const payload = {
        orderType: "COURIER" as const,
        courierServiceType: "PICKUP_AND_DELIVERY" as const,
        customerId: user.id,
        citySlug,
        paymentMethod: "WALLET",
        autoPayWithWallet: true,
        dropoffAddress: form.pickupAddress.trim(),
        dropoffLat: pickupGeo.lat,
        dropoffLng: pickupGeo.lng,
        customerNote: form.notes.trim() || undefined,
        deliveryFeeCOP: pricing.deliveryFee,
        serviceFeeCOP: pricing.serviceFee,
        promoCOP: 0,
        tipCOP: 0,
        totalCOP: pricing.total,
        packageType: "Domicilio Express",
        packageDescription,
        origin: {
          address: form.pickupAddress.trim(),
          lat: pickupGeo.lat,
          lng: pickupGeo.lng,
          placeName: form.pickupPlaceName.trim() || "Punto de inicio",
          reference: form.pickupReference.trim() || undefined,
          senderName: form.senderName.trim(),
          senderPhone: form.senderPhone.trim() || undefined,
        },
        destination: {
          address: form.pickupAddress.trim(),
          lat: pickupGeo.lat,
          lng: pickupGeo.lng,
          placeName: form.pickupPlaceName.trim() || "Punto de inicio",
          reference: form.pickupReference.trim() || undefined,
          receiverName: form.senderName.trim(),
          receiverPhone: form.senderPhone.trim() || undefined,
        },
      };

      const created = await apiFetch<CreateCourierOrderResponse>("/orders", { method: "POST", json: payload });

      if (!created?.id) throw new Error("La API no devolvió un id de orden válido.");

      clearKronixRecogerDraft();
      router.push(`/tracking/${created.id}`);
    } catch (e: any) {
      const err = e as ApiError;
      const msg = String(err?.message ?? "").trim() || "No se pudo crear la solicitud en este momento.";
      setCreateError(msg);
      setSubmitting(false);
      setShowConfirmModal(false);
    }
  }

  return (
    <div className="space-y-1 px-0 pb-4 pt-0">
      <div className="rounded-[18px] border border-slate-200 bg-white p-2 shadow-[0_6px_14px_rgba(15,23,42,0.05)]">
        {addresses.length > 0 || addressesLoading ? (
          <div className="rounded-[15px] border border-blue-100 bg-blue-50 px-2 py-2">
            <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-blue-700">Usar dirección guardada</label>
            <select disabled={addressesLoading} defaultValue="" onChange={(e) => applySavedAddress(e.target.value)} className="h-10 w-full rounded-[14px] border border-blue-100 bg-white px-4 text-[13px] font-bold text-slate-900 outline-none">
              <option value="">{addressesLoading ? "Cargando..." : "Seleccionar dirección"}</option>
              {addresses.map((a) => (
                <option key={a.id} value={a.id}>
                  {`${a.isDefault ? "🏠 " : a.isFavorite ? "❤️ " : ""}${a.placeName || a.label || "Dirección guardada"} — ${a.address}`}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <button type="button" onClick={useCurrentLocation} disabled={geoLoading} className={["mt-2 h-12 w-full rounded-[16px] px-4 text-[14px] font-black text-white shadow-sm transition", geoLoading ? "cursor-not-allowed bg-slate-300" : "bg-emerald-600 hover:bg-emerald-700"].join(" ")}>
          {geoLoading ? "Tomando ubicación..." : "📍 Usar mi ubicación actual"}
        </button>

        {geoError ? (
          <div className="mt-2 rounded-[14px] border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700">{geoError}</div>
        ) : null}

        <div className="mt-2 grid gap-1.5">
          <input
            type="text"
            value={form.pickupAddress}
            onChange={(e) => {
              const value = e.target.value;
              setGeoError(null);
              setCreateError(null);
              setForm((prev) => ({ ...prev, pickupAddress: value, pickupLat: null, pickupLng: null, pickupUseCurrentLocation: false }));
            }}
            onBlur={() => setTouched(true)}
            placeholder="Dirección o ubicación de inicio *"
            className={["h-12 w-full rounded-[14px] border bg-slate-50 px-4 text-[15px] font-semibold text-slate-900 outline-none transition focus:bg-white", touched && !pickupOk ? "border-red-300 focus:border-red-400" : "border-slate-200 focus:border-blue-300"].join(" ")}
            maxLength={220}
          />

          <textarea
            value={form.pickupReference}
            onChange={(e) => updateField("pickupReference", e.target.value)}
            placeholder="Referencia"
            rows={2}
            className="w-full rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-2 text-[15px] font-semibold text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white"
            maxLength={120}
          />
        </div>
      </div>

      <div className="rounded-[18px] border border-slate-200 bg-white p-2 shadow-[0_6px_14px_rgba(15,23,42,0.05)]">
        <div className="grid grid-cols-[70px_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5">
          <label className="text-[14px] font-black text-slate-700">Contacto</label>
          <input
            type="text"
            value={form.senderName}
            onChange={(e) => updateField("senderName", e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="Contacto"
            className={["h-12 w-full rounded-[12px] border bg-slate-50 px-4 text-[15px] font-semibold text-slate-900 outline-none transition focus:bg-white", touched && !senderNameOk ? "border-red-300 focus:border-red-400" : "border-slate-200 focus:border-emerald-300"].join(" ")}
            maxLength={80}
          />

          <label className="text-[14px] font-black text-slate-700">Celular</label>
          <input
            type="text"
            value={form.senderPhone}
            onChange={(e) => updateField("senderPhone", formatPhoneDraft(e.target.value))}
            placeholder="Celular"
            inputMode="numeric"
            className="h-12 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-4 text-[14px] font-semibold text-slate-900 outline-none transition focus:border-emerald-300 focus:bg-white"
            maxLength={20}
          />

          <label className="self-start pt-2 text-[14px] font-black text-slate-700">Tarea</label>
          <textarea
            value={form.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="Indicación rápida"
            rows={2}
            maxLength={300}
            className={["w-full rounded-[12px] border bg-slate-50 px-4 py-2 text-[14px] font-semibold text-slate-900 outline-none transition focus:bg-white", touched && !taskOk ? "border-red-300 focus:border-red-400" : "border-slate-200 focus:border-emerald-300"].join(" ")}
          />
        </div>
      </div>

      <div className="rounded-[18px] border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[16px] font-black text-slate-900">Precio estimado</div>
          <div className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700 ring-1 ring-emerald-100">
            {pricingLoading ? "Calculando..." : pricing.zoneNumber ? `Zona ${pricing.zoneNumber}` : "Zona pendiente"}
          </div>
        </div>

        {pricingError ? <div className="mt-2 rounded-[14px] border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700">{pricingError}</div> : null}

        <div className="mt-2 rounded-[16px] bg-slate-50 px-3 py-1.5 ring-1 ring-slate-200">
          <PriceLine label="Base del servicio" value={formatCOP(pricing.baseFee)} />
          <PriceLine label="Costo servicio" value={formatCOP(pricing.serviceFee)} />
          <div className="my-1 border-t border-slate-200" />
          <PriceLine label="Total estimado" value={formatCOP(pricing.total)} highlight />
        </div>
      </div>

      <div className="rounded-[18px] border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[16px] font-black text-slate-900">KroniX Wallet</div>
          <div className={["rounded-full px-2.5 py-1 text-[10px] font-black ring-1", hasEnoughWalletBalance ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : "bg-amber-50 text-amber-700 ring-amber-100"].join(" ")}>
            {walletLoading ? "Consultando..." : hasEnoughWalletBalance ? "Saldo OK" : "Recargar"}
          </div>
        </div>

        <div className="mt-2 rounded-[16px] bg-slate-50 px-3 py-1.5 ring-1 ring-slate-200">
          <PriceLine label="Saldo disponible" value={walletLoading ? "..." : formatCOP(walletAvailableCOP)} />
          <PriceLine label="Costo del servicio" value={formatCOP(pricing.total)} />
          <div className="my-1 border-t border-slate-200" />
          <PriceLine label={hasEnoughWalletBalance ? "Disponible después" : "Falta por recargar"} value={hasEnoughWalletBalance ? formatCOP(walletAvailableCOP - pricing.total) : formatCOP(Math.max(pricing.total - walletAvailableCOP, 0))} highlight />
        </div>

        {walletError ? <div className="mt-2 rounded-[14px] border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700">{walletError}</div> : null}

        {!walletLoading && pricing.total > 0 && !hasEnoughWalletBalance ? (
          <button type="button" onClick={() => router.push("/wallet")} className="mt-2 h-10 w-full rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 text-[12px] font-black text-emerald-800 shadow-sm">
            Ir a Wallet para recargar
          </button>
        ) : null}
      </div>

      {touched && !ready ? <div className="rounded-[14px] border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700">Revisa ubicación, contacto e indicación del servicio.</div> : null}
      {createError ? <div className="rounded-[14px] border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700">{createError}</div> : null}

      <button
        type="button"
        disabled={!ready || submitting || pricingLoading || walletLoading || !zoneCalculation || !hasEnoughWalletBalance}
        onClick={requestConfirm}
        className={[
          "w-full rounded-[20px] py-3 text-[15px] font-black text-white transition",
          ready && !submitting && !pricingLoading && !walletLoading && zoneCalculation && hasEnoughWalletBalance
            ? "bg-[linear-gradient(90deg,#059669_0%,#0ea5e9_100%)] shadow-[0_10px_18px_rgba(5,150,105,0.22)] hover:scale-[0.995]"
            : "cursor-not-allowed bg-slate-300 shadow-none",
        ].join(" ")}
      >
        {submitting ? "Pagando y creando express..." : "Confirmar y pagar con Wallet"}
      </button>

      <ConfirmationModal open={showConfirmModal} submitting={submitting} totalCOP={pricing.total} walletAvailableCOP={walletAvailableCOP} onClose={() => setShowConfirmModal(false)} onConfirm={handleSubmit} />

      <AuthRequiredModal open={showAuthModal} onConfirm={() => router.push(`/login?next=${encodeURIComponent("/kronix/recoger")}`)} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}
