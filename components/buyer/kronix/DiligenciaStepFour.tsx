//components\buyer\kronix\DiligenciaStepFour.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearKronixDiligenciaDraft,
  loadKronixDiligenciaDraft,
  saveKronixDiligenciaDraft,
  type KronixDiligenciaDraft,
} from "@/components/buyer/kronix/kronixDiligenciaDraft";
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
  { label: "Sin propina", value: 0 },
  { label: "$1.000", value: 1000 },
  { label: "$2.000", value: 2000 },
];

function formatCOP(value: number) {
  const safe = Number.isFinite(value) ? value : 0;
  return safe.toLocaleString("es-CO", {
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
    <div className="rounded-[26px] border border-slate-200 bg-white px-4 pt-4 pb-3 shadow-[0_8px_18px_rgba(15,23,42,0.06)]">
      <div className="flex items-start gap-3">
        <div className="relative -ml-1 -mt-1 flex h-[56px] w-[56px] shrink-0 items-center justify-center">
          {icon}
        </div>

        <div className="min-w-0 flex-1 pt-[2px]">
          <div className="text-[18px] font-black leading-[1.02] tracking-[-0.01em] text-slate-900">
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
          "text-right text-[15px] leading-[1.08] break-words",
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

function getStops(draft: KronixDiligenciaDraft) {
  const stops = Array.isArray(draft.stops) ? draft.stops : [];
  return stops.slice(0, 3);
}

function hasMinimumData(draft: KronixDiligenciaDraft) {
  const stops = getStops(draft);

  const pickupOk = draft.pickupAddress.trim().length >= 8;
  const senderOk = draft.senderName.trim().length >= 3;
  const stopsOk =
    stops.length >= 1 &&
    stops.every((stop) => String(stop?.address ?? "").trim().length >= 8);

  return pickupOk && senderOk && stopsOk;
}

function getSafeTip(value: unknown) {
  const n = Math.round(Number(value ?? 0));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T
): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((resolve) => {
      setTimeout(() => resolve(fallback), timeoutMs);
    }),
  ]);
}

export default function DiligenciaStepFour() {
  const router = useRouter();
  const { isAuthed, isLoading: authLoading, user } = useAuth();
  const { citySlug, cityGeoLabel, cityLabel } = useBuyerCity();

  const [draft, setDraft] = useState<KronixDiligenciaDraft>(() =>
    loadKronixDiligenciaDraft()
  );
  const [tipCOP, setTipCOP] = useState<number>(() =>
    getSafeTip(loadKronixDiligenciaDraft().tipCOP)
  );
  const [customTipText, setCustomTipText] = useState<string>("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [zoneCalculation, setZoneCalculation] =
    useState<CourierZoneCalculateResponse | null>(null);

  const stops = useMemo(() => getStops(draft), [draft]);
  const ready = useMemo(() => hasMinimumData(draft), [draft]);
  const lastStop = stops[stops.length - 1] ?? null;

  const pricing = useMemo(() => {
    const apiPricing = zoneCalculation?.pricing;

    const baseFee = getSafeMoney(apiPricing?.baseServiceCOP);
    const zoneFee = getSafeMoney(apiPricing?.zoneFeeCOP);
    const serviceFee = getSafeMoney(apiPricing?.serviceFeeCOP);
    const extraPointFee = getSafeMoney(apiPricing?.additionalPointsFeeCOP);
    const returnFee = getSafeMoney(apiPricing?.returnFeeCOP);
    const complexFee = getSafeMoney(apiPricing?.complexityFeeCOP);
    const apiTipCOP = getSafeMoney(apiPricing?.tipCOP ?? tipCOP);
    const total = getSafeMoney(apiPricing?.totalCOP);

    return {
      stopsCount: Math.max(1, stops.length),
      baseFee,
      zoneFee,
      serviceFee,
      extraPointFee,
      returnFee,
      complexFee,
      tipCOP: apiTipCOP,
      deliveryFee: baseFee + zoneFee + extraPointFee + returnFee + complexFee,
      total,
      zoneNumber: zoneCalculation?.zone?.zoneNumber ?? null,
      zoneName: zoneCalculation?.zone?.name ?? null,
      isNegotiable: Boolean(zoneCalculation?.zone?.isNegotiable),
      isInsideCoverage: zoneCalculation?.zone?.isInsideCoverage ?? true,
    };
  }, [zoneCalculation, tipCOP, stops.length]);

  function persistTip(nextTip: number) {
    const safeTip = getSafeTip(nextTip);

    setTipCOP(safeTip);

    setDraft((prev) => {
      const next = {
        ...prev,
        tipCOP: safeTip,
      };

      saveKronixDiligenciaDraft(next);
      return next;
    });
  }

  function applyCustomTip(value: string) {
    const digits = String(value ?? "").replace(/\D/g, "").slice(0, 7);
    setCustomTipText(digits);
    persistTip(getSafeTip(digits));
  }

  function goBack() {
    saveKronixDiligenciaDraft({
      ...draft,
      tipCOP,
    });
    router.push("/kronix/diligencia?step=3");
  }

  async function getPickupGeo() {
  if (
    typeof draft.pickupLat === "number" &&
    typeof draft.pickupLng === "number"
  ) {
    return {
      lat: Number(draft.pickupLat),
      lng: Number(draft.pickupLng),
    };
  }

  return await geocodeAddressOSMInCity(draft.pickupAddress, cityGeoLabel);
}

async function getStopGeo(stop: any) {
  if (
    typeof stop?.lat === "number" &&
    typeof stop?.lng === "number"
  ) {
    return {
      lat: Number(stop.lat),
      lng: Number(stop.lng),
    };
  }

  return await geocodeAddressOSMInCity(String(stop?.address ?? ""), cityGeoLabel);
}

  useEffect(() => {
    let cancelled = false;

    async function calculatePricing() {
      setPricingError(null);
      setZoneCalculation(null);

      if (!ready || !citySlug) return;

      setPricingLoading(true);

      try {
        const pickupGeo = await withTimeout(getPickupGeo(), 8000, null);

        if (!pickupGeo) {
          if (!cancelled) {
            setPricingError(
              `No pudimos ubicar con precisión el punto inicial en ${cityLabel}. Revisa la dirección.`
            );
          }
          return;
        }

        const stopGeos = await Promise.all(
  stops.map((stop) => withTimeout(getStopGeo(stop), 8000, null))
);

        const missingStopIndex = stopGeos.findIndex((geo) => !geo);
        if (missingStopIndex >= 0) {
          if (!cancelled) {
            setPricingError(
              `No pudimos ubicar con precisión el punto ${missingStopIndex + 1} en ${cityLabel}. Revisa la dirección.`
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
              serviceType: "ERRAND",
              points: [
                {
                  lat: pickupGeo.lat,
                  lng: pickupGeo.lng,
                  label: "Punto inicial Domicilios y Diligencias",
                  address: draft.pickupAddress.trim(),
                },
                ...stops.map((stop, index) => {
                  const geo = stopGeos[index]!;

                  return {
                    lat: geo.lat,
                    lng: geo.lng,
                    label: `Punto ${index + 1} Domicilios y Diligencias`,
                    address: String(stop?.address ?? "").trim(),
                  };
                }),
              ],
              tipCOP: getSafeMoney(tipCOP),
              additionalPointsCount: Math.max(0, stops.length - 1),
              hasReturn: Boolean(draft.returnRequired || draft.needsReturn),
              isComplex: Boolean(draft.isComplex),
            },
          }
        );

        console.log("🧭 DILIGENCIA ZONE RESPONSE:", response);

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
    draft.returnRequired,
    draft.needsReturn,
    draft.isComplex,
    JSON.stringify(stops),
    tipCOP,
  ]);

  async function handleSubmit() {
    setCreateError(null);

    if (!ready) return;

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
      const draftToSave = {
        ...draft,
        tipCOP,
      };

      saveKronixDiligenciaDraft(draftToSave);

            const pickupGeo = await getPickupGeo();

      const stopGeos = await Promise.all(
        stops.map((stop) => getStopGeo(stop))
      );

      const missingStopIndex = stopGeos.findIndex((geo) => !geo);

      if (missingStopIndex >= 0) {
        setCreateError(
          `No pudimos ubicar con precisión el punto ${missingStopIndex + 1} en ${cityLabel}. Revisa la dirección e inténtalo de nuevo.`
        );
        setSubmitting(false);
        return;
      }

      const dropoffGeo = stopGeos[stopGeos.length - 1];

      if (!pickupGeo) {
        setCreateError(
          `No pudimos ubicar con precisión el punto inicial en ${cityLabel}. Revisa la dirección e inténtalo de nuevo.`
        );
        setSubmitting(false);
        return;
      }

      if (!dropoffGeo) {
        setCreateError(
          `No pudimos ubicar con precisión el último punto en ${cityLabel}. Revisa la dirección e inténtalo de nuevo.`
        );
        setSubmitting(false);
        return;
      }

      const stopsText = stops
        .map((stop, index) => {
          return [
            `Punto ${index + 1}: ${String(stop.placeName ?? "").trim() || "Sin nombre"}`,
            `Dirección: ${String(stop.address ?? "").trim()}`,
            `Referencia: ${String(stop.reference ?? "").trim() || "Sin referencia"}`,
            `Contacto: ${String(stop.contactName ?? "").trim() || "Sin contacto"}`,
            `Teléfono: ${String(stop.contactPhone ?? "").trim() || "Sin teléfono"}`,
            stop.instructions?.trim()
              ? `Instrucciones: ${String(stop.instructions).trim()}`
              : "",
          ]
            .filter(Boolean)
            .join(" | ");
        })
        .join("\n");

      const packageDescription = [
        "SERVICIO: Domicilios y Diligencias",
        `DOMICILIOS PROGRAMADOS: ${pricing.stopsCount}`,
        `ZONA CALCULADA: Zona ${pricing.zoneNumber ?? "pendiente"}`,
        `VALOR ZONA: ${formatCOP(pricing.zoneFee)}`,
        draft.returnRequired || draft.needsReturn
          ? "REQUIERE RETORNO: Sí"
          : "REQUIERE RETORNO: No",
        draft.isComplex ? "COMPLEJIDAD: Complejo" : "COMPLEJIDAD: Normal",
        `PUNTOS ADICIONALES: ${formatCOP(pricing.extraPointFee)}`,
        `RETORNO: ${formatCOP(pricing.returnFee)}`,
        `COMPLEJIDAD: ${formatCOP(pricing.complexFee)}`,
        `PROPINA: ${formatCOP(pricing.tipCOP)}`,
        pricing.isNegotiable
          ? "NOTA OPERATIVA: Zona fuera de cobertura. El valor del servicio se acuerda directamente entre cliente y motorizado. KroniX solo cobra el costo de servicio."
          : "",
        "",
        stopsText,
        "",
        draft.notes.trim() ? `NOTAS: ${draft.notes.trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n");

            const hasReturn = Boolean(draft.returnRequired || draft.needsReturn);

      const finalDestination = hasReturn
        ? {
            address: draft.pickupAddress.trim(),
            lat: pickupGeo.lat,
            lng: pickupGeo.lng,
            placeName: draft.pickupPlaceName.trim() || undefined,
            reference: draft.pickupReference.trim() || undefined,
            receiverName: draft.senderName.trim(),
            receiverPhone: draft.senderPhone.trim() || undefined,
          }
        : {
            address: String(lastStop?.address ?? "").trim(),
            lat: dropoffGeo.lat,
            lng: dropoffGeo.lng,
            placeName: String(lastStop?.placeName ?? "").trim() || undefined,
            reference: String(lastStop?.reference ?? "").trim() || undefined,
            receiverName:
              String(lastStop?.contactName ?? "").trim() || draft.senderName.trim(),
            receiverPhone:
              String(lastStop?.contactPhone ?? "").trim() ||
              draft.senderPhone.trim() ||
              undefined,
          };

      const payload = {
        orderType: "COURIER" as const,
        courierServiceType: "ERRAND" as const,
        customerId: user.id,
        citySlug,

        dropoffAddress: finalDestination.address,
        dropoffLat: finalDestination.lat,
        dropoffLng: finalDestination.lng,

        customerNote: draft.notes.trim() || undefined,

        deliveryFeeCOP: pricing.deliveryFee,
        serviceFeeCOP: pricing.serviceFee,
        promoCOP: 0,
        tipCOP: pricing.tipCOP,
        totalCOP: pricing.total,

        packageType: "Domicilios",
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

        destination: finalDestination,
        
                  courierStops: stops.map((stop, index) => {
          const geo = stopGeos[index]!;

          return {
            sequence: index + 1,
            address: String(stop?.address ?? "").trim(),
            lat: geo.lat,
            lng: geo.lng,
            placeName: String(stop?.placeName ?? "").trim() || undefined,
            reference: String(stop?.reference ?? "").trim() || undefined,
            contactName: String(stop?.contactName ?? "").trim() || undefined,
            contactPhone: String(stop?.contactPhone ?? "").trim() || undefined,
            instructions: String(stop?.instructions ?? "").trim() || undefined,
          };
        }),
      };

      const created = await apiFetch<CreateCourierOrderResponse>("/orders", {
        method: "POST",
        json: payload,
      });

      if (!created?.id) {
        throw new Error("La API no devolvió un id de orden válido.");
      }

      clearKronixDiligenciaDraft();
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
              Revisa todo antes de confirmar el domicilio
            </div>
            <div className="mt-1 text-[12px] leading-4 text-emerald-800/80">
              Al confirmar, se crea la orden real con tarifa calculada automáticamente.
            </div>
          </div>
        </div>
      </div>

      <SummaryCard
        title="Punto inicial"
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
        </div>
      </SummaryCard>

      <SummaryCard
        title="Domicilios programados"
        icon={
          <div className="relative h-[62px] w-[62px]">
            <Image
              src="/branding/kronix/check-list.png"
              alt="Domicilios"
              fill
              className="object-contain scale-[1] translate-x-[2px] translate-y-[-4px]"
            />
          </div>
        }
      >
        <div className="grid gap-3 pt-2">
          {stops.map((stop, index) => (
            <div
              key={`summary-stop-${index}`}
              className="rounded-[20px] bg-slate-50 px-4 py-3 ring-1 ring-slate-200"
            >
              <div className="text-[12px] font-black uppercase tracking-[0.12em] text-slate-500">
                Punto {index + 1}
              </div>
              <div className="mt-1 text-[15px] font-black text-slate-900">
                {String(stop.placeName ?? "").trim() || "Sin nombre específico"}
              </div>
              <div className="mt-1 text-[13px] font-bold leading-5 text-slate-700">
                {String(stop.address ?? "").trim()}
              </div>
              <div className="mt-1 text-[12px] font-semibold text-slate-500">
                {String(stop.reference ?? "").trim() || "Sin referencia"}
              </div>
            </div>
          ))}
        </div>
      </SummaryCard>

      <SummaryCard
        title="Resumen del servicio"
        icon={
          <div className="relative h-[62px] w-[62px]">
            <Image
              src="/branding/kronix/Enviar-Paquete1.png"
              alt="Servicio"
              fill
              className="object-contain scale-[1.1] translate-x-[-2px] translate-y-[-6px]"
            />
          </div>
        }
      >
        <div className="grid gap-0">
          <Line label="Cantidad" value={`${pricing.stopsCount} domicilio(s)`} strong />
          <Line
            label="Retorno"
            value={draft.returnRequired || draft.needsReturn ? "Sí requiere retorno" : "No requiere retorno"}
          />
          <Line label="Complejidad" value={draft.isComplex ? "Complejo" : "Normal"} />
          <Line label="Solicitante" value={draft.senderName.trim() || "No definido"} />
          <Line label="Teléfono" value={draft.senderPhone.trim() || "Sin teléfono"} />
          <Line label="Notas" value={draft.notes.trim() || "Sin notas adicionales"} />
        </div>
      </SummaryCard>

      <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.07)]">
        <div className="text-[18px] font-black text-slate-900">Propina para el conductor</div>
        <div className="mt-1 text-[13px] text-slate-500">
          Opcional. Se suma al total y se envía al backend como <b>tipCOP</b>.
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {TIP_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setCustomTipText("");
                persistTip(option.value);
              }}
              className={[
                "rounded-[18px] px-3 py-3 text-[13px] font-black transition",
                tipCOP === option.value && customTipText === ""
                  ? "bg-emerald-600 text-white"
                  : "border border-slate-200 bg-slate-50 text-slate-800",
              ].join(" ")}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="mt-3">
          <label className="mb-2 block text-[12px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
            Otro valor
          </label>

          <input
            value={customTipText}
            onChange={(e) => applyCustomTip(e.target.value)}
            placeholder="Ej: 4000"
            inputMode="numeric"
            className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] font-semibold text-slate-900 outline-none transition focus:border-emerald-300 focus:bg-white"
          />
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.07)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[18px] font-black text-slate-900">Precio estimado</div>
            <div className="mt-1 text-[13px] text-slate-500">
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
          <PriceRow label="Puntos adicionales" value={formatCOP(pricing.extraPointFee)} />
          <PriceRow label="Retorno" value={formatCOP(pricing.returnFee)} />
          <PriceRow label="Complejidad" value={formatCOP(pricing.complexFee)} />
          <PriceRow label="Costo servicio" value={formatCOP(pricing.serviceFee)} />
          <PriceRow label="Propina" value={formatCOP(pricing.tipCOP)} />

          <div className="my-2 border-t border-slate-200" />

          <PriceRow label="Total estimado" value={formatCOP(pricing.total)} highlight />
        </div>

        {pricing.isNegotiable ? (
          <div className="mt-3 rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-semibold leading-5 text-amber-800">
            Zona fuera de cobertura estándar. KroniX solo cobra el costo de servicio;
            el valor del servicio se acuerda directamente con el motorizado.
          </div>
        ) : null}
      </div>

      {!ready ? (
        <div className="rounded-[22px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700">
          Faltan datos obligatorios. Revisa punto inicial, mínimo un domicilio y
          nombre del solicitante.
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
          disabled={!ready || submitting || pricingLoading || !zoneCalculation}
          onClick={handleSubmit}
          className={[
            "flex-1 rounded-[24px] py-4 text-[15px] font-black text-white transition",
            ready && !submitting && !pricingLoading && zoneCalculation
              ? "bg-[linear-gradient(90deg,#059669_0%,#0ea5e9_100%)] shadow-[0_12px_22px_rgba(5,150,105,0.22)] hover:scale-[0.995]"
              : "cursor-not-allowed bg-slate-300 shadow-none",
          ].join(" ")}
        >
          {submitting ? "Creando domicilio..." : "Confirmar domicilio"}
        </button>
      </div>

      <div className="text-center text-[12px] font-medium text-slate-500">
        Si todo sale bien, te redirigiremos automáticamente al tracking real.
      </div>

      <AuthRequiredModal
        open={showAuthModal}
        onConfirm={() =>
          router.push(`/login?next=${encodeURIComponent("/kronix/diligencia?step=4")}`)
        }
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}