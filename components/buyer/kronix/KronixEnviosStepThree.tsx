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
  serviceType?: string | null;
};

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

  const pickupPlaceName =
    appPlaceName || addressPlaceName || "Punto de recogida KroniX Plus";
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
    dropoffReference:
      "El motorizado recibirá la información del envío en el punto de recogida.",
    dropoffLat:
      address?.lat != null && Number.isFinite(Number(address.lat))
        ? Number(address.lat)
        : null,
    dropoffLng:
      address?.lng != null && Number.isFinite(Number(address.lng))
        ? Number(address.lng)
        : null,
    dropoffUseCurrentLocation: false,

    packageType: "KroniX Envíos",
    packageDescription:
      "Servicio KroniX Envíos Plus de un toque. Paquete/destino final definidos en sitio.",
    senderName:
      String(app?.contactName ?? "").trim() ||
      String(address?.contactName ?? "").trim() ||
      profileName ||
      "Contacto KroniX Plus",
    senderPhone:
      cleanPhone(app?.phone) || cleanPhone(address?.contactPhone) || profilePhone,
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

export default function KronixEnviosStepThree() {
  const router = useRouter();
  const { isAuthed, isLoading: authLoading, user } = useAuth();
  const { citySlug, cityReady, cityGeoLabel, cityLabel } = useBuyerCity();

  const [draft, setDraft] = useState<KronixEnviarDraft>(() =>
    loadKronixEnviarDraft()
  );
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [statusLoading, setStatusLoading] = useState(false);
  const [kronixPlusStatus, setKronixPlusStatus] =
    useState<KronixPlusStatusResponse | null>(null);

  const [pickupLoading, setPickupLoading] = useState(true);
  const [pickupError, setPickupError] = useState<string | null>(null);

  const ready = useMemo(() => {
    return (
      draft.pickupAddress.trim().length >= 8 &&
      draft.senderName.trim().length >= 3 &&
      !!citySlug
    );
  }, [citySlug, draft.pickupAddress, draft.senderName]);

  const isKronixPlusApproved = useMemo(() => {
    const userStatus = String(user?.kronixPlusStatus ?? "").toUpperCase();
    const refreshedStatus = String(kronixPlusStatus?.status ?? "").toUpperCase();

    return (
      Boolean(user?.isKronixPlusApproved) ||
      userStatus === "APPROVED" ||
      Boolean(kronixPlusStatus?.approved) ||
      refreshedStatus === "APPROVED"
    );
  }, [
    user?.isKronixPlusApproved,
    user?.kronixPlusStatus,
    kronixPlusStatus?.approved,
    kronixPlusStatus?.status,
  ]);

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

    async function refreshStatusInBackground() {
      if (authLoading || !isAuthed || !user?.id) {
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

    refreshStatusInBackground();

    return () => {
      alive = false;
    };
  }, [authLoading, isAuthed, user?.id]);

  useEffect(() => {
    let alive = true;

    async function loadPickupPoint() {
      if (!cityReady || !citySlug) return;
      if (!isAuthed || !user?.id || !isKronixPlusApproved) {
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
  }, [
    cityReady,
    citySlug,
    isAuthed,
    user?.id,
    isKronixPlusApproved,
    kronixPlusStatus?.application,
  ]);

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
        "TIPO WORKER: MOTORCYCLE",
        "PAGO CLIENTE: El cliente paga directamente al motorizado según acuerdo/tarifa personal.",
        "PAGO KRONIX: El cliente no paga a KroniX en esta etapa piloto.",
        "COMISIÓN KRONIX: Se descontará al worker al finalizar exitosamente el servicio.",
        "",
        "DESTINO/PAQUETE: El cliente entregará información y paquete al motorizado en el punto de recogida.",
      ]
        .filter(Boolean)
        .join("\n");

      const payload = {
        orderType: "COURIER" as const,
        courierServiceType: "SEND_PACKAGE" as const,
        serviceType: "PACKAGE" as const,
        requiredWorkerType: "MOTORCYCLE" as const,
        customerId: user.id,
        citySlug,

        dropoffAddress: draft.pickupAddress.trim(),
        dropoffLat: pickupGeo.lat,
        dropoffLng: pickupGeo.lng,

        customerNote:
          "KroniX Envíos Plus de un toque. Motorizado debe llegar al punto de recogida y confirmar detalles del envío en sitio.",

        deliveryFeeCOP: 0,
        serviceFeeCOP: 0,
        promoCOP: 0,
        tipCOP: 0,
        totalCOP: 0,

        packageType: "KroniX Envíos",
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
      setCreateError(
        String(err?.message ?? "").trim() ||
          "No se pudo crear la solicitud en este momento."
      );
      setSubmitting(false);
    }
  }

  if (authLoading || statusLoading || (isKronixPlusApproved && pickupLoading)) {
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
          <div className="text-[20px] font-black">
            Inicia sesión para usar KroniX Envíos
          </div>
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

  if (!isKronixPlusApproved) {
    const status = String(
      kronixPlusStatus?.status ?? user?.kronixPlusStatus ?? "NONE"
    ).toUpperCase();
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
          <InfoLine
            label="Lugar"
            value={draft.pickupPlaceName.trim() || "Punto KroniX Plus"}
          />
          <InfoLine
            label="Dirección"
            value={draft.pickupAddress.trim() || "No definida"}
            strong
          />
          <InfoLine
            label="Referencia"
            value={draft.pickupReference.trim() || "Sin referencia"}
          />
          <InfoLine
            label="Contacto"
            value={draft.senderName.trim() || "No definido"}
          />
          <InfoLine
            label="Teléfono"
            value={draft.senderPhone.trim() || "Sin teléfono"}
          />
        </div>
      </div>

      <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-bold leading-5 text-amber-900">
        El cliente no pagará a KroniX por este envío. El valor se acuerda y se paga directamente al motorizado.
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
        disabled={!ready || submitting || !!pickupError}
        onClick={requestConfirm}
        className={[
          "w-full rounded-[24px] py-4 text-[15px] font-black text-white transition",
          ready && !submitting && !pickupError
            ? "bg-[linear-gradient(90deg,#059669_0%,#0ea5e9_100%)] shadow-[0_12px_22px_rgba(5,150,105,0.22)] hover:scale-[0.995]"
            : "cursor-not-allowed bg-slate-300 shadow-none",
        ].join(" ")}
      >
        {submitting ? "Creando envío..." : "Solicitar KroniX Envíos"}
      </button>

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
