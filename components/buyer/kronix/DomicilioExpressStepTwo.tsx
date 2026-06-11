/**
 * OBSOLETO
 * Conservado temporalmente por compatibilidad y respaldo.
 * KroniX Envíos utiliza actualmente el flujo One Touch
 * implementado en KronixEnviosStepThree.

// components/buyer/kronix/DomicilioExpressStepTwo.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearKronixRecogerDraft,
  loadKronixRecogerDraft,
  saveKronixRecogerDraft,
  type KronixPickupDraft,
} from "@/components/buyer/kronix/kronixRecogerDraft";
import AuthRequiredModal from "@/components/buyer/AuthRequiredModal";
import { useAuth } from "@/components/buyer/useAuth";
import { useBuyerCity } from "@/components/buyer/CityContext";
import { geocodeAddressOSMInCity } from "@/lib/geocode";
import { apiFetch, type ApiError } from "@/lib/api";
import Image from "next/image";


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

const TIP_OPTIONS = [
  { label: "Ninguna", value: 0 },
  { label: "$1.000", value: 1000 },
  { label: "$2.000", value: 2000 },
];

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

function SummaryCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[26px] border border-slate-200 bg-white px-4 pb-3 pt-4 shadow-[0_8px_18px_rgba(15,23,42,0.06)]">
      <div className="flex items-start gap-3">
        <div className="relative -ml-1 -mt-1 flex h-[56px] w-[56px] shrink-0 items-center justify-center">
          {icon}
        </div>

        <div className="min-w-0 flex-1 pt-[2px]">
          <div className="text-[18px] font-black leading-[1.02] text-slate-900">
            {title}
          </div>
        </div>
      </div>

      <div className="-mt-1">{children}</div>
    </div>
  );
}

function Line({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="grid grid-cols-[88px_1fr] items-start gap-x-3 py-[7px]">
      <div className="text-[14px] font-medium leading-[1.05] text-slate-500">
        {label}
      </div>

      <div
        className={[
          "break-words text-right text-[15px] leading-[1.08]",
          strong ? "font-black text-slate-900" : "font-bold text-slate-800",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

function PriceRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div
        className={
          highlight
            ? "text-[14px] font-black text-slate-900"
            : "text-[14px] font-semibold text-slate-600"
        }
      >
        {label}
      </div>

      <div
        className={
          highlight
            ? "text-[18px] font-black text-slate-900"
            : "text-[14px] font-black text-slate-900"
        }
      >
        {value}
      </div>
    </div>
  );
}

export default function DomicilioExpressStepTwo() {
  const router = useRouter();
  const { isAuthed, isLoading: authLoading, user } = useAuth();
  const { citySlug, cityGeoLabel, cityLabel } = useBuyerCity();

  const [draft, setDraft] = useState<KronixPickupDraft>(() =>
    loadKronixRecogerDraft()
  );
  const [customTipText, setCustomTipText] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [zoneCalculation, setZoneCalculation] =
    useState<CourierZoneCalculateResponse | null>(null);

  const [clientAcceptedExpressRules, setClientAcceptedExpressRules] =
    useState(false);

  const ready = useMemo(() => {
    return (
      draft.pickupAddress.trim().length >= 8 &&
      draft.senderName.trim().length >= 3 &&
      draft.notes.trim().length >= 5
    );
  }, [draft]);

  const pricing = useMemo(() => {
    const apiPricing = zoneCalculation?.pricing;

    return {
      baseFee: getSafeMoney(apiPricing?.baseServiceCOP),
      zoneFee: getSafeMoney(apiPricing?.zoneFeeCOP),
      serviceFee: getSafeMoney(apiPricing?.serviceFeeCOP),
      tipCOP: getSafeMoney(apiPricing?.tipCOP ?? draft.tipCOP),
      deliveryFee:
        getSafeMoney(apiPricing?.baseServiceCOP) +
        getSafeMoney(apiPricing?.zoneFeeCOP),
      total: getSafeMoney(apiPricing?.totalCOP),
      zoneNumber: zoneCalculation?.zone?.zoneNumber ?? null,
      zoneName: zoneCalculation?.zone?.name ?? null,
      isNegotiable: Boolean(zoneCalculation?.zone?.isNegotiable),
      isInsideCoverage: zoneCalculation?.zone?.isInsideCoverage ?? true,
    };
  }, [draft.tipCOP, zoneCalculation]);

  function persist(next: KronixPickupDraft) {
    setDraft(next);
    saveKronixRecogerDraft(next);
  }

  function setTip(value: number) {
    setCustomTipText("");
    persist({
      ...draft,
      tipCOP: getSafeMoney(value),
    });
  }

  function applyCustomTip(value: string) {
    const digits = String(value ?? "").replace(/\D/g, "").slice(0, 7);
    setCustomTipText(digits);

    persist({
      ...draft,
      tipCOP: getSafeMoney(digits),
    });
  }

  function goBack() {
    saveKronixRecogerDraft(draft);
    router.push("/kronix/recoger?step=1");
  }

  async function getPickupGeo() {
    const pickupHasCoords =
  draft.pickupUseCurrentLocation === true &&
  typeof draft.pickupLat === "number" &&
  typeof draft.pickupLng === "number";

if (pickupHasCoords) {
      return {
        lat: Number(draft.pickupLat),
        lng: Number(draft.pickupLng),
      };
    }

    return await geocodeAddressOSMInCity(draft.pickupAddress, cityGeoLabel);
  }

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
              `No pudimos ubicar con precisión el punto de inicio en ${cityLabel}. Revisa la dirección.`
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
              serviceType: "PICKUP_AND_DELIVERY",
              points: [
                {
                  lat: pickupGeo.lat,
                  lng: pickupGeo.lng,
                  label: "Punto de inicio Domicilio Express",
                  address: draft.pickupAddress.trim(),
                },
              ],
              tipCOP: getSafeMoney(draft.tipCOP),
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
        if (!cancelled) {
          setPricingLoading(false);
        }
      }
    }

    calculatePricing();

    return () => {
      cancelled = true;
    };
  }, [
    ready,
    citySlug,
    cityLabel,
    cityGeoLabel,
    draft.pickupAddress,
    draft.pickupLat,
    draft.pickupLng,
    draft.tipCOP,
  ]);

  async function handleSubmit() {
    setCreateError(null);

    if (!ready) return;

    if (!clientAcceptedExpressRules) {
      setCreateError(
        "Debes aceptar las condiciones del Domicilio Express para continuar."
      );
      return;
    }

    if (!zoneCalculation) {
      setCreateError(
        "Aún no tenemos la tarifa automática lista. Espera unos segundos e inténtalo de nuevo."
      );
      return;
    }

    if (!authLoading && !isAuthed) {
      setShowAuthModal(true);
      return;
    }

    if (!user?.id) {
      setCreateError("No pudimos identificar tu sesión. Vuelve a iniciar sesión.");
      return;
    }

    setSubmitting(true);

    try {
      saveKronixRecogerDraft(draft);

      const pickupGeo = await getPickupGeo();

      if (!pickupGeo) {
        setCreateError(
          `No pudimos ubicar con precisión el punto de inicio en ${cityLabel}. Revisa la dirección e inténtalo de nuevo.`
        );
        setSubmitting(false);
        return;
      }

      const packageDescription = [
        "SERVICIO: Domicilio Express",
        "TIPO: Motorizado rápido para tarea simple",
        `ZONA CALCULADA: Zona ${pricing.zoneNumber ?? "pendiente"}`,
        `VALOR ZONA: ${formatCOP(pricing.zoneFee)}`,
        `PROPINA: ${formatCOP(pricing.tipCOP)}`,
        "",
        `INDICACIÓN DEL CLIENTE: ${draft.notes.trim()}`,
        "",
        "CONDICIÓN ACEPTADA POR EL CLIENTE:",
        "Servicio Domicilio Express solo cubre zona urbana cercana en San Gil y paquetes de tamaño normal sin pérdidas de tiempo. En caso de que el servicio exceda estas condiciones, el cliente podrá renegociar el servicio con el motorizado en punto o cancelar el servicio con un cargo de $2.000.",
        "",
        "NOTA OPERATIVA: El cliente explicará detalles adicionales cuando llegue el conductor.",
      ]
        .filter(Boolean)
        .join("\n");

      const payload = {
        orderType: "COURIER" as const,
        courierServiceType: "PICKUP_AND_DELIVERY" as const,
        customerId: user.id,
        citySlug,

        dropoffAddress: draft.pickupAddress.trim(),
        dropoffLat: pickupGeo.lat,
        dropoffLng: pickupGeo.lng,

        customerNote: draft.notes.trim() || undefined,

        deliveryFeeCOP: pricing.deliveryFee,
        serviceFeeCOP: pricing.serviceFee,
        promoCOP: 0,
        tipCOP: pricing.tipCOP,
        totalCOP: pricing.total,

        packageType: "Domicilio Express",
        packageDescription,

        origin: {
          address: draft.pickupAddress.trim(),
          lat: pickupGeo.lat,
          lng: pickupGeo.lng,
          placeName: draft.pickupPlaceName.trim() || "Punto de inicio",
          reference: draft.pickupReference.trim() || undefined,
          senderName: draft.senderName.trim(),
          senderPhone: draft.senderPhone.trim() || undefined,
        },

        destination: {
          address: draft.pickupAddress.trim(),
          lat: pickupGeo.lat,
          lng: pickupGeo.lng,
          placeName: draft.pickupPlaceName.trim() || "Punto de inicio",
          reference: draft.pickupReference.trim() || undefined,
          receiverName: draft.senderName.trim(),
          receiverPhone: draft.senderPhone.trim() || undefined,
        },
      };

      const created = await apiFetch<CreateCourierOrderResponse>("/orders", {
        method: "POST",
        json: payload,
      });

      if (!created?.id) {
        throw new Error("La API no devolvió un id de orden válido.");
      }

      clearKronixRecogerDraft();
      router.push(`/tracking/${created.id}`);
    } catch (e: any) {
      const err = e as ApiError;
      const msg =
        String(err?.message ?? "").trim() ||
        "No se pudo crear la solicitud en este momento.";

      setCreateError(msg);
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="rounded-[26px] border border-emerald-100 bg-emerald-50 px-4 py-3 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-xl shadow-sm ring-1 ring-emerald-100">
            <div className="relative h-10 w-10">
              <Image
                src="/branding/kronix/target.png"
                alt="Resumen"
                fill
                className="object-contain scale-[2] translate-x-[-5px]"
                sizes="62px"
              />
            </div>
          </div>

          <div className="min-w-0">
            <div className="text-[13px] font-bold text-emerald-700">
              Resumen final
            </div>
            <div className="mt-0.5 text-[15px] font-extrabold text-emerald-900">
              Confirma tu Domicilio Express
            </div>
            <div className="mt-1 text-[12px] leading-4 text-emerald-800/80">
              Se creará una orden rápida para que un motorizado llegue al punto indicado.
            </div>
          </div>
        </div>
      </div>

      <SummaryCard
        title="Punto de inicio"
        icon={
          <div className="relative h-10 w-10">
            <Image
              src="/branding/kronix/startpoint.png"
              alt="Inicio"
              fill
              className="object-contain scale-[2] translate-x-[-5px] translate-y-[-8px]"
              sizes="62px"
            />
          </div>
        }
      >
        <div className="grid gap-1">
          <Line label="Lugar" value={draft.pickupPlaceName.trim() || "Sin nombre específico"} />
          <Line label="Dirección" value={draft.pickupAddress.trim() || "No definida"} strong />
          <Line label="Referencia" value={draft.pickupReference.trim() || "Sin referencia"} />
          <Line
            label="GPS"
            value={
              typeof draft.pickupLat === "number" &&
              typeof draft.pickupLng === "number"
                ? "Ubicación detectada"
                : "Se geocodificará al confirmar"
            }
          />
        </div>
      </SummaryCard>

      <SummaryCard
        title="Servicio"
        icon={
          <div className="relative h-[62px] w-[62px]">
            <Image
              src="/branding/kronix/card-moto.png"
              alt="Domicilio Express"
              fill
              className="object-contain scale-[1.6] translate-x-[-16px] translate-y-[-12px]"
              sizes="62px"
            />
          </div>
        }
      >
        <div className="grid gap-0">
          <Line label="Tipo" value="Domicilio Express" strong />
          <Line label="Cliente" value={draft.senderName.trim() || "No definido"} />
          <Line label="Teléfono" value={draft.senderPhone.trim() || "Sin teléfono"} />
          <Line label="Indicación" value={draft.notes.trim() || "Sin indicación"} />
        </div>
      </SummaryCard>

      <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-[18px] font-black text-slate-900">
          Propina para el conductor
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {TIP_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTip(option.value)}
              className={[
                "rounded-[18px] px-3 py-3 text-[13px] font-black transition",
                Number(draft.tipCOP ?? 0) === option.value && customTipText === ""
                  ? "bg-emerald-600 text-white"
                  : "border border-slate-200 bg-slate-50 text-slate-800",
              ].join(" ")}
            >
              {option.label}
            </button>
          ))}
        </div>

        <input
          value={customTipText}
          onChange={(e) => applyCustomTip(e.target.value)}
          placeholder="Otro valor, ej: 4000"
          inputMode="numeric"
          className="mt-3 w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] font-semibold outline-none focus:border-emerald-300 focus:bg-white"
        />
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[18px] font-black text-slate-900">
              Precio estimado
            </div>
            <div className="mt-1 text-[12px] font-semibold text-slate-500">
              Calculado automáticamente por geocerca.
            </div>
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

        <div className="mt-4 rounded-[24px] bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
          <PriceRow label="Base del servicio" value={formatCOP(pricing.baseFee)} />
          <PriceRow
            label={`Zona ${pricing.zoneNumber ?? "x"}`}
            value={formatCOP(pricing.zoneFee)}
          />
          <PriceRow label="Costo servicio" value={formatCOP(pricing.serviceFee)} />
          <PriceRow label="Propina" value={formatCOP(pricing.tipCOP)} />

          <div className="my-2 border-t border-slate-200" />

          <PriceRow label="Total estimado" value={formatCOP(pricing.total)} highlight />
        </div>

        {pricing.isNegotiable ? (
          <div className="mt-3 rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-semibold leading-5 text-amber-800">
            Esta ubicación queda fuera de cobertura estándar. KroniX solo cobra el costo de servicio;
            el valor del domicilio se acuerda directamente con el motorizado.
          </div>
        ) : null}
      </div>

      <label className="block rounded-[28px] border border-amber-200 bg-amber-50 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={clientAcceptedExpressRules}
            onChange={(e) => setClientAcceptedExpressRules(e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 accent-emerald-600"
          />

          <div>
            <div className="text-[15px] font-black text-amber-900">
              Confirmación del Domicilio Express
            </div>
            <div className="mt-1 text-[13px] font-semibold leading-5 text-amber-800">
              Servicio Domicilio Express solo cubre zona urbana cercana en San Gil y paquetes de
              tamaño normal sin pérdidas de tiempo. En caso de que el servicio exceda alguno de
              estos ítems, podrás renegociar el servicio con el motorizado en punto o cancelar el
              servicio con un cargo de {formatCOP(2000)}.
            </div>
          </div>
        </div>
      </label>

      {!ready ? (
        <div className="rounded-[22px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700">
          Faltan datos obligatorios. Vuelve al paso anterior y revisa ubicación, nombre e indicación.
        </div>
      ) : null}

      {createError ? (
        <div className="rounded-[22px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700">
          {createError}
        </div>
      ) : null}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={goBack}
          disabled={submitting}
          className="flex-1 rounded-[24px] border border-slate-200 bg-white py-4 text-[15px] font-black text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          Atrás
        </button>

        <button
          type="button"
          disabled={
            !ready ||
            submitting ||
            pricingLoading ||
            !zoneCalculation ||
            !clientAcceptedExpressRules
          }
          onClick={handleSubmit}
          className={[
            "flex-1 rounded-[24px] py-4 text-[15px] font-black text-white transition",
            ready &&
            !submitting &&
            !pricingLoading &&
            zoneCalculation &&
            clientAcceptedExpressRules
              ? "bg-[linear-gradient(90deg,#059669_0%,#0ea5e9_100%)] shadow-[0_12px_22px_rgba(5,150,105,0.22)] hover:scale-[0.995]"
              : "cursor-not-allowed bg-slate-300 shadow-none",
          ].join(" ")}
        >
          {submitting ? "Creando express..." : "Confirmar Express"}
        </button>
      </div>

      <AuthRequiredModal
        open={showAuthModal}
        onConfirm={() =>
          router.push(`/login?next=${encodeURIComponent("/kronix/recoger?step=2")}`)
        }
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}*/