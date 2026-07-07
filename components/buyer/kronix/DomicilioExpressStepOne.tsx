// components/buyer/kronix/DomicilioExpressStepOne.tsx
"use client";

import GenericTransportServiceRequest, {
  type ServiceConfig,
} from "@/components/buyer/kronix/GenericTransportServiceRequest";

const DOMICILIO_EXPRESS_CONFIG: ServiceConfig = {
  title: "Domicilio Express",
  shortTitle: "Domicilio",
  emoji: "🏃",
  serviceType: "DELIVERY",
  courierServiceType: "PICKUP_AND_DELIVERY",
  requiredWorkerType: "MOTORCYCLE",
  packageType: "Domicilio Express",
  heading: "Domicilio Express",
  description:
    "Pide un motorizado para una tarea rápida. El valor se acuerda y se paga directamente al motorizado.",
  notePlaceholder: "Ej: recoger unas llaves, llevar un documento, comprar algo pequeño...",
  defaultNote: "Cliente solicita un Domicilio Express y explicará detalles al llegar el motorizado.",
  loginNext: "/kronix/recoger",
  buttonText: "Solicitar Domicilio Express",
  creatingText: "Creando solicitud...",
};

export default function DomicilioExpressStepOne() {
  return <GenericTransportServiceRequest config={DOMICILIO_EXPRESS_CONFIG} />;
}
