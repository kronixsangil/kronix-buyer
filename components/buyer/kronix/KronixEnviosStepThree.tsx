// components/buyer/kronix/KronixEnviosStepThree.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearKronixEnviarDraft,
  loadKronixEnviarDraft,
  saveKronixEnviarDraft,
  type KronixEnviarDraft,
} from "@/components/buyer/kronix/kronixEnviarDraft";
import AuthRequiredModal from "@/components/buyer/AuthRequiredModal";
import { useAuth } from "@/components/buyer/useAuth";
import { useBuyerCity } from "@/components/buyer/CityContext";
import { geocodeAddressOSMInCity } from "@/lib/geocode";
import { apiFetch, type ApiError } from "@/lib/api";
import Image from "next/image";

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
    businessName?: string | null;
    businessType?: string | null;
    placeName?: string | null;
    address?: string | null;
    addressReference?: string | null;
    contactName?: string | null;
    phone?: string | null;
    email?: string | null;
    citySlug?: string | null;
    cityName?: string | null;
    expectedShipmentsPerMonth?: number | null;
    notes?: string | null;
  } | null;
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

function cleanPhone(value: unknown) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 15);
}

function getUserName(user: any) {
  return String(user?.name ?? user?.user?.name ?? "").trim();
}

function getUserPhone(user: any) {
  return cleanPhone(user?.phone ?? user?.user?.phone ?? "");
}

function buildPickupDraftFromAddress(
  address: AddressItem | null,
  user: any,
  plusStatus: KronixPlusStatusResponse | null
): KronixEnviarDraft {
  const app = plusStatus?.application ?? null;
  const profileName = getUserName(user);
  const profilePhone = getUserPhone(user);

  const appPlaceName = String(app?.placeName ?? app?.businessName ?? "").trim();
  const appAddress = String(app?.address ?? "").trim();
  const appReference = String(app?.addressReference ?? "").trim();

  const addressPlaceName = String(address?.placeName ?? address?.label ?? "").trim();
  const addressAddress = String(address?.address ?? "").trim();
  const addressReference = String(address?.reference ?? "").trim();

  const pickupPlaceName = appPlaceName || addressPlaceName || "Punto de recogida KroniX Plus";
  const pickupAddress = appAddress || addressAddress;
  const pickupReference = appReference || addressReference;

  return {
    ...loadKronixEnviarDraft(),
    pickupPlaceName,
    pickupAddress,
    pickupReference,
    pickupLat:
      address?.lat != null && Number.isFinite(Number(address.lat))
        ? Number(address.lat)
        : null,
    pickupLng:
      address?.lng != null && Number.isFinite(Number(address.lng))
        ? Number(address.lng)
        : null,
    pickupUseCurrentLocation: false,

    dropoffPlaceName: "Destino definido en sitio",
    dropoffAddress: pickupAddress,
    dropoffReference: "El motorizado recibirá la información del envío en el punto de recogida.",
    dropoffLat:
      address?.lat != null && Number.isFinite(Number(address.lat))
        ? Number(address.lat)
        : null,
    dropoffLng:
      address?.lng != null && Number.isFinite(Number(address.lng))
        ? Number(address.lng)
        : null,
    dropoffUseCurrentLocation: false,

    packageType: "KroniX Plus autorizado",
    packageDescription:
      "Servicio KroniX Envíos Plus de un toque. Paquete/destino final definidos en sitio según condiciones aprobadas para el cliente.",
    senderName:
      String(app?.contactName ?? "").trim() ||
      String(address?.contactName ?? "").trim() ||
      profileName ||
      "Contacto KroniX Plus",
    senderPhone:
      cleanPhone(app?.phone) ||
      cleanPhone(address?.contactPhone) ||
      profilePhone,
    receiverName: "Motorizado confirma en sitio",
    receiverPhone: "",
    notes: "",
    isComplex: false,
    zoneFeeCOP: 0,
    tipCOP: 0,
  };
}

function InfoLine({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="grid grid-cols-[86px_1fr] items-start gap-x-3 border-b border-slate-100 py-[3px] last:border-b-0">
      <div className="text-[13px] font-medium leading-tight text-slate-500">
        {label}
      </div>

      <div
        className={[
          "break-words text-right text-[14px] leading-tight",
          strong ? "font-black text-slate-950" : "font-bold text-slate-800",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

function PriceLine({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-[5px] last:border-b-0">
      <div
        className={
          highlight
            ? "text-[14px] font-black text-slate-950"
            : "text-[14px] font-semibold text-slate-600"
        }
      >
        {label}
      </div>
      <div
        className={
          highlight
            ? "text-[17px] font-black text-slate-950"
            : "text-[14px] font-black text-slate-900"
        }
      >
        {value}
      </div>
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
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100">
              Confirmación KroniX
            </div>
            <div className="mt-2 text-[22px] font-black leading-tight">
              Confirmar y pagar con Wallet
            </div>
            <div className="mt-2 text-[13px] font-semibold leading-5 text-white/85">
              KroniX descontará el valor estimado de tu Wallet y creará el envío de inmediato.
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

          <div className="rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-bold leading-5 text-amber-900">
            El valor mostrado es una estimación inicial y puede variar por lluvias,
            tráfico, tiempos de espera, distancias superiores a las previstas,
            paquetes grandes, pesados, voluminosos o cualquier condición especial
            detectada durante la prestación del servicio.
          </div>

          <div className="rounded-[22px] border border-blue-200 bg-blue-50 px-4 py-3 text-[13px] font-bold leading-5 text-blue-900">
            Si el motorizado necesita ajustar el valor, deberá proponerlo a través
            de KroniX y el cliente podrá aprobar o rechazar el ajuste antes de
            continuar el servicio.
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-[14px] font-black text-slate-800 shadow-sm disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={submitting}
              className="rounded-[22px] bg-[linear-gradient(90deg,#059669_0%,#0ea5e9_100%)] px-4 py-3 text-[14px] font-black text-white shadow-[0_12px_22px_rgba(5,150,105,0.24)] disabled:opacity-60"
            >
              {submitting ? "Pagando..." : "Aceptar y pagar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function KronixEnviosStepThree() {
  const router = useRouter();
  const { isAuthed, isLoading: authLoading, user } = useAuth();
  const { city, citySlug, cityReady, cityGeoLabel, cityLabel } = useBuyerCity();

  const [draft, setDraft] = useState<KronixEnviarDraft>(() =>
    loadKronixEnviarDraft()
  );
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [statusLoading, setStatusLoading] = useState(true);
  const [kronixPlusStatus, setKronixPlusStatus] =
    useState<KronixPlusStatusResponse | null>(null);

  const [pickupLoading, setPickupLoading] = useState(true);
  const [pickupError, setPickupError] = useState<string | null>(null);

  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [zoneCalculation, setZoneCalculation] =
    useState<CourierZoneCalculateResponse | null>(null);

  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletResponse["wallet"] | null>(null);

  const ready = useMemo(() => {
    return (
      draft.pickupAddress.trim().length >= 8 &&
      draft.senderName.trim().length >= 3 &&
      !!citySlug
    );
  }, [citySlug, draft.pickupAddress, draft.senderName]);

  const pricing = useMemo(() => {
    const apiPricing = zoneCalculation?.pricing;
    return {
      baseFee: getSafeMoney(apiPricing?.baseServiceCOP),
      zoneFee: getSafeMoney(apiPricing?.zoneFeeCOP),
      serviceFee: getSafeMoney(apiPricing?.serviceFeeCOP),
      total: getSafeMoney(apiPricing?.totalCOP),
      zoneNumber: zoneCalculation?.zone?.zoneNumber ?? null,
      isNegotiable: Boolean(zoneCalculation?.zone?.isNegotiable),
      deliveryFee:
        getSafeMoney(apiPricing?.baseServiceCOP) +
        getSafeMoney(apiPricing?.zoneFeeCOP),
    };
  }, [zoneCalculation]);

  const walletAvailableCOP = useMemo(() => {
    return Number(wallet?.totalAvailableCOP ?? 0);
  }, [wallet?.totalAvailableCOP]);

  const hasEnoughWalletBalance = useMemo(() => {
    return walletAvailableCOP >= pricing.total && pricing.total > 0;
  }, [pricing.total, walletAvailableCOP]);

  async function getPickupGeo() {
    if (
      typeof draft.pickupLat === "number" &&
      typeof draft.pickupLng === "number" &&
      Number.isFinite(draft.pickupLat) &&
      Number.isFinite(draft.pickupLng)
    ) {
      return {
        lat: Number(draft.pickupLat),
        lng: Number(draft.pickupLng),
      };
    }

    return await geocodeAddressOSMInCity(draft.pickupAddress, cityGeoLabel);
  }

  useEffect(() => {
    let alive = true;

    async function loadStatus() {
      if (authLoading) return;

      if (!isAuthed || !user?.id) {
        if (!alive) return;
        setKronixPlusStatus(null);
        setStatusLoading(false);
        return;
      }

      setStatusLoading(true);

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
        if (alive) setStatusLoading(false);
      }
    }

    loadStatus();

    return () => {
      alive = false;
    };
  }, [authLoading, isAuthed, user?.id]);

  useEffect(() => {
    let alive = true;

    async function loadPickupPoint() {
      if (!cityReady || !citySlug || statusLoading) return;
      if (!isAuthed || !user?.id || !kronixPlusStatus?.approved) {
        setPickupLoading(false);
        return;
      }

      setPickupLoading(true);
      setPickupError(null);

      try {
        const addresses = await apiFetch<AddressItem[]>(
          `/users/me/addresses?citySlug=${encodeURIComponent(citySlug)}`,
          { suppressSessionExpiredEvent: true } as any
        );

        const list = Array.isArray(addresses) ? addresses : [];
        const selected =
          list.find((a) => a.isDefault) ??
          list.find((a) => a.isFavorite) ??
          list[0] ??
          null;

        const appAddress = String(kronixPlusStatus?.application?.address ?? "").trim();

        if (!selected && appAddress.length < 8) {
          if (!alive) return;
          setPickupError(
            "No encontramos una dirección de recogida KroniX Plus. Actualiza tu solicitud o agrega una dirección en Perfil > Direcciones."
          );
          setPickupLoading(false);
          return;
        }

        const nextDraft = buildPickupDraftFromAddress(
          selected,
          user,
          kronixPlusStatus
        );

        if (!alive) return;
        setDraft(nextDraft);
        saveKronixEnviarDraft(nextDraft);
      } catch {
        if (!alive) return;
        setPickupError(
          "No pudimos cargar tu punto de recogida KroniX Plus. Intenta nuevamente."
        );
      } finally {
        if (alive) setPickupLoading(false);
      }
    }

    loadPickupPoint();

    return () => {
      alive = false;
    };
  }, [cityReady, citySlug, statusLoading, isAuthed, user?.id, kronixPlusStatus?.approved]);

  useEffect(() => {
    let alive = true;

    async function loadWallet() {
      if (!isAuthed || !user?.id || !city?.id || !kronixPlusStatus?.approved) {
        if (!alive) return;
        setWallet(null);
        setWalletLoading(false);
        return;
      }

      setWalletLoading(true);
      setWalletError(null);

      try {
        const response = await apiFetch<WalletResponse>(
          `/wallet/me?cityId=${encodeURIComponent(city.id)}`,
          {
            method: "GET",
            suppressSessionExpiredEvent: true,
          } as any
        );

        if (!alive) return;
        setWallet(response?.wallet ?? null);
      } catch (e: any) {
        if (!alive) return;
        setWallet(null);
        setWalletError(
          String(e?.message ?? "").trim() ||
            "No pudimos consultar tu saldo KroniX Wallet."
        );
      } finally {
        if (alive) setWalletLoading(false);
      }
    }

    loadWallet();

    return () => {
      alive = false;
    };
  }, [isAuthed, user?.id, city?.id, kronixPlusStatus?.approved]);

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
          if (!cancelled) {
            setPricingError(
              `No pudimos ubicar con precisión el punto de recogida en ${cityLabel}. Revisa la dirección.`
            );
          }
          return;
        }

        const response = await apiFetch<CourierZoneCalculateResponse>(
          "/courier/zones/calculate",
          {
            method: "POST",
            json: {
              citySlug,
              serviceType: "SEND_PACKAGE",
              points: [
                {
                  lat: pickupGeo.lat,
                  lng: pickupGeo.lng,
                  label: "Punto de recogida KroniX Envíos Plus",
                  address: draft.pickupAddress.trim(),
                },
                {
                  lat: pickupGeo.lat,
                  lng: pickupGeo.lng,
                  label: "Confirmación en sitio KroniX Envíos Plus",
                  address: draft.pickupAddress.trim(),
                },
              ],
              tipCOP: 0,
              isLargePackage: false,
            },
          }
        );

        if (!cancelled) {
          setZoneCalculation(response);
        }
      } catch (e: any) {
        const err = e as ApiError;
        if (!cancelled) {
          setPricingError(
            String(err?.message ?? "").trim() ||
              "No pudimos calcular la tarifa automática en este momento."
          );
        }
      } finally {
        if (!cancelled) setPricingLoading(false);
      }
    }

    calculatePricing();

    return () => {
      cancelled = true;
    };
  }, [ready, citySlug, cityLabel, cityGeoLabel, draft.pickupAddress, draft.pickupLat, draft.pickupLng]);

  function requestConfirm() {
    setCreateError(null);

    if (!authLoading && !isAuthed) {
      setShowAuthModal(true);
      return;
    }

    if (!ready) {
      setCreateError("No tenemos completo el punto de recogida KroniX Plus.");
      return;
    }

    if (!zoneCalculation) {
      setCreateError(
        "Aún no tenemos la tarifa automática lista. Espera unos segundos e inténtalo de nuevo."
      );
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
      setCreateError("Debes tener una KroniX Wallet activa para confirmar este envío.");
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
      saveKronixEnviarDraft(draft);

      const pickupGeo = await getPickupGeo();

      if (!pickupGeo) {
        setCreateError(
          `No pudimos ubicar con precisión el punto de recogida en ${cityLabel}. Revisa la dirección e inténtalo de nuevo.`
        );
        setSubmitting(false);
        return;
      }

      const packageDescription = [
        "SERVICIO: KroniX Envíos Plus de un toque",
        "TIPO DE PAQUETE: Definido por condiciones KroniX Plus aprobadas",
        `ZONA CALCULADA: Zona ${pricing.zoneNumber ?? "pendiente"}`,
        `VALOR ZONA: ${formatCOP(pricing.zoneFee)}`,
        `COSTO SERVICIO: ${formatCOP(pricing.serviceFee)}`,
        pricing.isNegotiable
          ? "NOTA OPERATIVA: Zona fuera de cobertura estándar o sujeta a negociación. El motorizado podrá proponer ajuste por la aplicación y el cliente deberá aprobarlo."
          : "NOTA OPERATIVA: Valor estimado sujeto a ajustes autorizados por cliente en caso de lluvia, distancia, sobredimensión, peso o condiciones especiales.",
        "",
        "DESTINO/PAQUETE: El cliente entregará información y paquete al motorizado en el punto de recogida.",
      ]
        .filter(Boolean)
        .join("\n");

      const payload = {
        orderType: "COURIER" as const,
        courierServiceType: "SEND_PACKAGE" as const,
        customerId: user.id,
        citySlug,

        paymentMethod: "WALLET",
        autoPayWithWallet: true,

        dropoffAddress: draft.pickupAddress.trim(),
        dropoffLat: pickupGeo.lat,
        dropoffLng: pickupGeo.lng,

        customerNote:
          "KroniX Envíos Plus de un toque. Motorizado debe llegar al punto de recogida y confirmar detalles del envío en sitio.",

        deliveryFeeCOP: pricing.deliveryFee,
        serviceFeeCOP: pricing.serviceFee,
        promoCOP: 0,
        tipCOP: 0,
        totalCOP: pricing.total,

        packageType: "KroniX Plus autorizado",
        packageDescription,

        origin: {
          address: draft.pickupAddress.trim(),
          lat: pickupGeo.lat,
          lng: pickupGeo.lng,
          placeName: draft.pickupPlaceName.trim() || undefined,
          reference: draft.pickupReference.trim() || undefined,
          senderName: draft.senderName.trim(),
          senderPhone: draft.senderPhone.trim() || undefined,
        },

        destination: {
          address: draft.pickupAddress.trim(),
          lat: pickupGeo.lat,
          lng: pickupGeo.lng,
          placeName: "Destino definido en sitio",
          reference:
            "El destino final y los datos del paquete se confirmarán en el punto de recogida.",
          receiverName: "Confirmar en sitio",
          receiverPhone: undefined,
        },
      };

      const created = await apiFetch<CreateCourierOrderResponse>("/orders", {
        method: "POST",
        json: payload,
      });

      if (!created?.id) {
        throw new Error("La API no devolvió un id de orden válido.");
      }

      clearKronixEnviarDraft();
      router.push(`/tracking/${created.id}`);
    } catch (e: any) {
      const err = e as ApiError;
      const msg =
        String(err?.message ?? "").trim() ||
        "No se pudo crear la solicitud en este momento.";

      setCreateError(msg);
      setSubmitting(false);
      setShowConfirmModal(false);
    }
  }

  if (authLoading || statusLoading || pickupLoading) {
    return (
      <div className="space-y-3 px-4 pb-4 pt-3">
        <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="h-6 w-48 animate-pulse rounded bg-slate-100" />
          <div className="mt-3 h-24 animate-pulse rounded-[22px] bg-slate-100" />
        </div>
      </div>
    );
  }

  if (!isAuthed || !user?.id) {
    return (
      <div className="px-4 pb-4 pt-3">
        <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <div className="text-[20px] font-black">Inicia sesión para usar KroniX Envíos</div>
          <div className="mt-2 text-[14px] font-semibold leading-6">
            Este servicio requiere una cuenta Buyer activa y validación KroniX Plus.
          </div>
          <button
            type="button"
            onClick={() => router.push("/login?next=/kronix/enviar")}
            className="mt-5 w-full rounded-[22px] bg-slate-900 px-4 py-4 text-[15px] font-black text-white"
          >
            Iniciar sesión
          </button>
        </div>
      </div>
    );
  }

  if (!kronixPlusStatus?.approved) {
    const status = String(kronixPlusStatus?.status ?? "NONE").toUpperCase();
    const pending = status === "PENDING";

    return (
      <div className="px-4 pb-4 pt-3">
        <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
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
            <button
              type="button"
              onClick={() => router.push("/")}
              className="w-full rounded-[22px] bg-[linear-gradient(90deg,#0c45ff_0%,#0b8bdf_50%,#1fd09a_100%)] px-4 py-4 text-[15px] font-black text-white shadow-[0_12px_22px_rgba(12,69,255,0.22)]"
            >
              {pending ? "Volver al inicio" : "Aplicar a KroniX Plus"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 px-4 pb-4 pt-2">
      

      <div className="rounded-[24px] border border-slate-200 bg-white px-4 pb-2 pt-3 shadow-[0_8px_18px_rgba(15,23,42,0.06)]">
        <div className="flex items-start gap-3">
          <div className="relative -ml-1 -mt-1 h-[56px] w-[56px] shrink-0">
            <Image
              src="/branding/kronix/startpoint.png"
              alt="Punto de recogida"
              fill
              className="object-contain scale-[1.5] translate-x-[-5px] translate-y-[-8px]"
              sizes="62px"
            />
          </div>

          <div className="min-w-0 flex-1 pt-[2px]">
            <div className="text-[18px] font-black leading-[1.02] text-slate-900">
              Punto de recogida
            </div>
          </div>
        </div>

        <div className="-mt-1 grid gap-1">
          <InfoLine label="Lugar" value={draft.pickupPlaceName.trim() || "Punto KroniX Plus"} />
          <InfoLine label="Dirección" value={draft.pickupAddress.trim() || "No definida"} strong />
          <InfoLine label="Referencia" value={draft.pickupReference.trim() || "Sin referencia"} />
          <InfoLine label="Contacto" value={draft.senderName.trim() || "No definido"} />
          <InfoLine label="Teléfono" value={draft.senderPhone.trim() || "Sin teléfono"} />
        </div>
      </div>

      <div className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[18px] font-black text-slate-900">
            Precio estimado
          </div>

          <div className="rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-black text-emerald-700 ring-1 ring-emerald-100">
            {pricingLoading
              ? "Calculando..."
              : pricing.zoneNumber
                ? `Zona ${pricing.zoneNumber}`
                : "Zona pendiente"}
          </div>
        </div>

        {pricingError ? (
          <div className="mt-3 rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700">
            {pricingError}
          </div>
        ) : null}

        <div className="mt-2 rounded-[20px] bg-slate-50 px-4 py-2 ring-1 ring-slate-200">
          <PriceLine label="Base del servicio" value={formatCOP(pricing.baseFee)} />
          <PriceLine label="Costo servicio" value={formatCOP(pricing.serviceFee)} />
          <div className="my-2 border-t border-slate-200" />
          <PriceLine label="Total estimado" value={formatCOP(pricing.total)} highlight />
        </div>

        {pricing.isNegotiable ? (
          <div className="mt-3 rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-semibold leading-5 text-amber-800">
            Este servicio puede requerir ajuste por zona o condiciones especiales.
            El motorizado podrá proponerlo por la aplicación y el cliente deberá aprobarlo.
          </div>
        ) : null}
      </div>

      <div className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[18px] font-black text-slate-900">
              KroniX Wallet
            </div>
            </div>

          <div
            className={[
              "rounded-full px-3 py-1 text-[12px] font-black ring-1",
              hasEnoughWalletBalance
                ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                : "bg-amber-50 text-amber-700 ring-amber-100",
            ].join(" ")}
          >
            {walletLoading
              ? "Consultando..."
              : hasEnoughWalletBalance
                ? "Saldo OK"
                : "Recargar"}
          </div>
        </div>

        <div className="mt-2 rounded-[20px] bg-slate-50 px-4 py-2 ring-1 ring-slate-200">
          <PriceLine
            label="Saldo disponible"
            value={walletLoading ? "..." : formatCOP(walletAvailableCOP)}
          />
          <PriceLine label="Costo del envío" value={formatCOP(pricing.total)} />
          <div className="my-2 border-t border-slate-200" />
          <PriceLine
            label={hasEnoughWalletBalance ? "Disponible después" : "Falta por recargar"}
            value={
              hasEnoughWalletBalance
                ? formatCOP(walletAvailableCOP - pricing.total)
                : formatCOP(Math.max(pricing.total - walletAvailableCOP, 0))
            }
            highlight
          />
        </div>

        {walletError ? (
          <div className="mt-3 rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700">
            {walletError}
          </div>
        ) : null}

        {!walletLoading && pricing.total > 0 && !hasEnoughWalletBalance ? (
          <button
            type="button"
            onClick={() => router.push("/wallet")}
            className="mt-3 w-full rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-[14px] font-black text-emerald-800 shadow-sm"
          >
            Ir a Wallet para recargar
          </button>
        ) : null}
      </div>

      {pickupError ? (
        <div className="rounded-[22px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700">
          {pickupError}
        </div>
      ) : null}

      {createError ? (
        <div className="rounded-[22px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700">
          {createError}
        </div>
      ) : null}

      <button
        type="button"
        disabled={
          !ready ||
          submitting ||
          pricingLoading ||
          walletLoading ||
          !zoneCalculation ||
          !!pickupError ||
          !hasEnoughWalletBalance
        }
        onClick={requestConfirm}
        className={[
          "w-full rounded-[24px] py-4 text-[15px] font-black text-white transition",
          ready &&
          !submitting &&
          !pricingLoading &&
          !walletLoading &&
          zoneCalculation &&
          !pickupError &&
          hasEnoughWalletBalance
            ? "bg-[linear-gradient(90deg,#059669_0%,#0ea5e9_100%)] shadow-[0_12px_22px_rgba(5,150,105,0.22)] hover:scale-[0.995]"
            : "cursor-not-allowed bg-slate-300 shadow-none",
        ].join(" ")}
      >
        {submitting ? "Pagando y creando envío..." : "Confirmar y pagar con Wallet"}
      </button>

      <ConfirmationModal
        open={showConfirmModal}
        submitting={submitting}
        totalCOP={pricing.total}
        walletAvailableCOP={walletAvailableCOP}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleSubmit}
      />

      <AuthRequiredModal
        open={showAuthModal}
        onConfirm={() =>
          router.push(`/login?next=${encodeURIComponent("/kronix/enviar")}`)
        }
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}
