//app\(buyer)\tracking\[orderId]\_tracking\TrackingCourierDetailsCard.tsx
"use client";

import type { TrackingViewModel } from "./types";
import { getCourierServiceLabel } from "./utils";

function normalizeText(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeAddress(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getServiceKey(vm: TrackingViewModel) {
  const fromVm = String(vm.courierServiceType ?? "").trim().toUpperCase();
  if (fromVm) return fromVm;

  const raw = [
    vm.courierData.packageType,
    vm.courierData.packageDescription,
    vm.order?.customerNote,
  ]
    .map((x) => String(x ?? "").toUpperCase())
    .join(" ");

  if (raw.includes("MOTOCARGA") || raw.includes("MOTORCARGO")) return "MOTORCARGO";
  if (raw.includes("TAXI")) return "TAXI";
  if (raw.includes("KRONIX ENVÍOS") || raw.includes("KRONIX ENVIOS")) return "SEND_PACKAGE";
  if (raw.includes("DOMICILIO EXPRESS")) return "PICKUP_AND_DELIVERY";

  return "SERVICE";
}

function cleanServiceDescription(value: unknown, fallback: string) {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;

  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => {
      const upper = line.toUpperCase();
      if (upper.startsWith("PAGO CLIENTE:")) return false;
      if (upper.startsWith("PAGO KRONIX:")) return false;
      if (upper.startsWith("COMISIÓN KRONIX:")) return false;
      if (upper.startsWith("COMISION KRONIX:")) return false;
      if (upper.startsWith("TIPO WORKER:")) return false;
      if (upper.startsWith("SERVICIO:")) return false;
      return true;
    });

  const indication = lines.find((line) => line.toUpperCase().startsWith("INDICACIÓN DEL CLIENTE:"));
  if (indication) {
    return indication.replace(/^INDICACI[ÓO]N DEL CLIENTE:\s*/i, "").trim() || fallback;
  }

  const first = lines.find((line) => line.length > 0);
  return first || fallback;
}

function SectionCard({
  eyebrow,
  title,
  description,
  icon,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-lg shadow-sm ring-1 ring-slate-200">
          {icon}
        </div>

        <div className="min-w-0">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
            {eyebrow}
          </div>
          <div className="mt-1 text-sm font-extrabold text-slate-900">{title}</div>
          <div className="mt-1 text-xs text-slate-600">{description}</div>
        </div>
      </div>
    </div>
  );
}

function ContactRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className="text-right font-extrabold text-slate-900">{value}</span>
    </div>
  );
}

export function TrackingCourierDetailsCard({ vm }: { vm: TrackingViewModel }) {
  if (!vm.isCourier) return null;

  const serviceKey = getServiceKey(vm);
  const serviceLabel = getCourierServiceLabel(serviceKey);

  const isTaxi = serviceKey === "TAXI";
  const isMotorcargo = serviceKey === "MOTORCARGO" || serviceKey === "MOTOCARGA";
  const isPackage = serviceKey === "SEND_PACKAGE" || serviceKey === "PACKAGE";
  const isDelivery = serviceKey === "PICKUP_AND_DELIVERY" || serviceKey === "DELIVERY";

  const pickupAddress = vm.courierData.pickupAddress || vm.order?.address || "—";
  const dropoffAddress = vm.order?.address || "";
  const sameAddress = normalizeAddress(pickupAddress) === normalizeAddress(dropoffAddress);

  const shouldShowDestination = isPackage && !sameAddress;

  const cardTitle = `Detalles de ${serviceLabel}`;

  const pickupTitle =
    vm.courierData.pickupPlaceName ||
    (isTaxi
      ? "Punto donde te recoge el taxi"
      : isMotorcargo
      ? "Punto donde recoge la motocarga"
      : isPackage
      ? "Punto de recogida"
      : isDelivery
      ? "Punto del servicio"
      : "Punto de inicio");

  const packageEyebrow = isTaxi
    ? "Solicitud"
    : isMotorcargo
    ? "Carga solicitada"
    : isPackage
    ? "Envío"
    : "Servicio solicitado";

  const packageTitle = vm.courierData.packageType || serviceLabel;

  const cleanDescription = cleanServiceDescription(
    vm.courierData.packageDescription,
    isTaxi
      ? "Cliente solicita Taxi. La tarifa será acordada directamente con el taxista."
      : isMotorcargo
      ? "Cliente solicita Motocarga. Detalles y tarifa serán confirmados directamente con el motocarguero."
      : isPackage
      ? "Cliente solicita KroniX Envíos. Detalles del envío se confirman en el punto de recogida."
      : "Cliente solicita un servicio KroniX."
  );

  const senderName = vm.courierData.senderName || "—";
  const senderPhone = vm.courierData.senderPhone || "—";
  const receiverName = vm.courierData.receiverName || "";
  const receiverPhone = vm.courierData.receiverPhone || "";

  const sameContact =
    normalizeText(senderName) === normalizeText(receiverName) &&
    normalizeText(senderPhone) === normalizeText(receiverPhone);

  const shouldShowReceiver = Boolean(receiverName || receiverPhone) && !sameContact && shouldShowDestination;

  const notesLabel = isTaxi
    ? "Indicaciones para el taxista"
    : isMotorcargo
    ? "Indicaciones para el motocarguero"
    : isPackage
    ? "Indicaciones del envío"
    : "Indicaciones del servicio";

  return (
    <div className={`${vm.CARD_PAD} mt-4`}>
      <div className="text-sm font-extrabold text-gray-900">{cardTitle}</div>

      <div className="mt-3 grid gap-3">
        <SectionCard
          eyebrow="Punto inicial"
          title={pickupTitle}
          description={pickupAddress}
          icon="📍"
        />

        {vm.courierData.pickupReference ? (
          <div className="rounded-2xl bg-white px-3 py-2 text-xs text-slate-500 ring-1 ring-slate-200">
            <span className="font-extrabold text-slate-700">Referencia:</span>{" "}
            {vm.courierData.pickupReference}
          </div>
        ) : null}

        {shouldShowDestination ? (
          <>
            <SectionCard
              eyebrow="Destino"
              title={vm.courierData.dropoffPlaceName || "Punto final"}
              description={dropoffAddress || "—"}
              icon="🏁"
            />

            {vm.courierData.dropoffReference ? (
              <div className="rounded-2xl bg-white px-3 py-2 text-xs text-slate-500 ring-1 ring-slate-200">
                <span className="font-extrabold text-slate-700">Referencia destino:</span>{" "}
                {vm.courierData.dropoffReference}
              </div>
            ) : null}
          </>
        ) : null}

        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
            {packageEyebrow}
          </div>
          <div className="mt-1 text-sm font-extrabold text-slate-900">
            {packageTitle}
          </div>
          <div className="mt-1 whitespace-pre-wrap text-xs text-slate-600">
            {cleanDescription}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
            Contacto
          </div>

          <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-slate-700">
            <ContactRow label="Nombre" value={senderName} />
            <ContactRow label="Teléfono" value={senderPhone} />

            {shouldShowReceiver ? (
              <>
                <ContactRow label="Contacto final" value={receiverName || "—"} />
                <ContactRow label="Tel. final" value={receiverPhone || "—"} />
              </>
            ) : null}
          </div>
        </div>

        {vm.order?.customerNote ? (
          <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
              {notesLabel}
            </div>
            <div className="mt-1 text-xs text-slate-700">{vm.order.customerNote}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
