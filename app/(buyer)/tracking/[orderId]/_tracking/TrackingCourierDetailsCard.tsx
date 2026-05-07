//app\(buyer)\tracking\[orderId]\_tracking\TrackingCourierDetailsCard.tsx
"use client";

import type { TrackingViewModel } from "./types";

function normalizeText(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

type CourierExperience = "ENVIAR" | "DILIGENCIA" | "GENERIC";

function detectCourierExperience(vm: TrackingViewModel): CourierExperience {
  const packageType = normalizeText(vm.courierData.packageType);
  const packageDescription = normalizeText(vm.courierData.packageDescription);
  const notes = normalizeText(vm.order?.customerNote);

  const shippingPackageTypes = new Set([
    "documento",
    "sobre",
    "bolsa pequeña",
    "caja pequeña",
    "caja mediana",
    "frágil",
    "fragil",
  ]);

  const diligenceTypes = new Set([
    "pago o consignación",
    "compra rápida",
    "entregar documento",
    "recoger documento",
    "trámite sencillo",
    "tramite sencillo",
    "llevar o traer algo",
  ]);

  const shippingKeywords = [
    "paquete",
    "sobre",
    "caja",
    "documento",
    "envío",
    "envio",
    "enviar",
    "frágil",
    "fragil",
  ];

  const diligenceKeywords = [
    "diligencia",
    "consignación",
    "consignacion",
    "pago",
    "trámite",
    "tramite",
    "comprar",
    "compra",
    "recibo",
    "medicamento",
    "documentos firmados",
    "gestión",
    "gestion",
  ];

  const isDiligenciaByType = diligenceTypes.has(packageType);
  const isDiligenciaByText = diligenceKeywords.some(
    (keyword) => packageDescription.includes(keyword) || notes.includes(keyword)
  );

  if (isDiligenciaByType || isDiligenciaByText) {
    return "DILIGENCIA";
  }

  const isShippingByType = shippingPackageTypes.has(packageType);
  const isShippingByText = shippingKeywords.some(
    (keyword) => packageDescription.includes(keyword) || notes.includes(keyword)
  );

  if (isShippingByType || isShippingByText) {
    return "ENVIAR";
  }

  return "GENERIC";
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

  const experience = detectCourierExperience(vm);

  const isEnviar = experience === "ENVIAR";
  const isDiligencia = experience === "DILIGENCIA";

  const cardTitle = isDiligencia
    ? "Detalles de la diligencia"
    : isEnviar
    ? "Detalles del envío"
    : "Detalles del servicio";

  const pickupEyebrow = isDiligencia
    ? "Punto inicial"
    : isEnviar
    ? "Origen"
    : "Recoger en";

  const pickupTitle =
    vm.courierData.pickupPlaceName ||
    (isDiligencia
      ? "Inicio de la diligencia"
      : isEnviar
      ? "Punto de origen"
      : "Punto de recogida");

  const pickupReferenceLabel = isDiligencia ? "Referencia punto inicial" : "Referencia origen";

  const dropoffEyebrow = isDiligencia
    ? "Punto final"
    : isEnviar
    ? "Destino"
    : "Entregar en";

  const dropoffTitle =
    vm.courierData.dropoffPlaceName ||
    (isDiligencia
      ? "Final de la diligencia"
      : isEnviar
      ? "Punto de destino"
      : "Punto de entrega");

  const dropoffReferenceLabel = isDiligencia ? "Referencia punto final" : "Referencia destino";

  const packageEyebrow = isDiligencia
    ? "Gestión solicitada"
    : isEnviar
    ? "Paquete"
    : "Encargo";

  const packageTitle =
    vm.courierData.packageType ||
    (isDiligencia
      ? "Diligencia solicitada"
      : isEnviar
      ? "Envío de paquete"
      : "Recoger y llevar");

  const contactsEyebrow = isDiligencia
    ? "Personas de contacto"
    : isEnviar
    ? "Datos del envío"
    : "Contactos";

  const senderLabel = isDiligencia ? "Solicitante" : "Remitente";
  const senderPhoneLabel = isDiligencia ? "Tel. principal" : "Tel. remitente";
  const receiverLabel = isDiligencia ? "Contacto final" : "Destinatario";
  const receiverPhoneLabel = isDiligencia ? "Tel. final" : "Tel. destinatario";

  const notesLabel = isDiligencia
    ? "Indicaciones de la diligencia"
    : isEnviar
    ? "Indicaciones del envío"
    : "Notas";

  const emptyDescription = isDiligencia
    ? "No se agregó una explicación adicional de la diligencia."
    : isEnviar
    ? "No se agregó una descripción adicional del paquete."
    : "No se agregó una descripción adicional del encargo.";

  return (
    <div className={`${vm.CARD_PAD} mt-4`}>
      <div className="text-sm font-extrabold text-gray-900">{cardTitle}</div>

      <div className="mt-3 grid gap-3">
        <SectionCard
          eyebrow={pickupEyebrow}
          title={pickupTitle}
          description={vm.courierData.pickupAddress || "—"}
          icon="📍"
        />

        {vm.courierData.pickupReference ? (
          <div className="rounded-2xl bg-white px-3 py-2 text-xs text-slate-500 ring-1 ring-slate-200">
            <span className="font-extrabold text-slate-700">{pickupReferenceLabel}:</span>{" "}
            {vm.courierData.pickupReference}
          </div>
        ) : null}

        <SectionCard
          eyebrow={dropoffEyebrow}
          title={dropoffTitle}
          description={vm.order?.address || "—"}
          icon="🏁"
        />

        {vm.courierData.dropoffReference ? (
          <div className="rounded-2xl bg-white px-3 py-2 text-xs text-slate-500 ring-1 ring-slate-200">
            <span className="font-extrabold text-slate-700">{dropoffReferenceLabel}:</span>{" "}
            {vm.courierData.dropoffReference}
          </div>
        ) : null}

        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
            {packageEyebrow}
          </div>
          <div className="mt-1 text-sm font-extrabold text-slate-900">
            {packageTitle}
          </div>
          {vm.courierData.packageDescription ? (
            <div className="mt-1 text-xs text-slate-600">
              {vm.courierData.packageDescription}
            </div>
          ) : (
            <div className="mt-1 text-xs text-slate-500">{emptyDescription}</div>
          )}
        </div>

        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
            {contactsEyebrow}
          </div>

          <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-slate-700">
            <ContactRow label={senderLabel} value={vm.courierData.senderName || "—"} />

            <ContactRow
              label={senderPhoneLabel}
              value={vm.courierData.senderPhone || "—"}
            />

            <ContactRow label={receiverLabel} value={vm.courierData.receiverName || "—"} />

            <ContactRow
              label={receiverPhoneLabel}
              value={vm.courierData.receiverPhone || "—"}
            />
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