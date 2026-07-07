// app/(buyer)/kronix/motocarga/page.tsx
"use client";

import GenericTransportServiceRequest, {
  type ServiceConfig,
} from "@/components/buyer/kronix/GenericTransportServiceRequest";

const MOTOCARGA_CONFIG: ServiceConfig = {
  title: "Motocarga",
  shortTitle: "Motocarga",
  emoji: "🛵",
  serviceType: "MOTORCARGO",
  courierServiceType: "PICKUP_AND_DELIVERY",
  requiredWorkerType: "MOTORCARGO",
  packageType: "Motocarga",
  heading: "Motocarga",
  description:
    "Solicita transporte en moto adaptada para objetos, paquetes grandes o carga ligera.",
  notePlaceholder: "Ej: caja mediana, mercado grande, herramienta, dimensiones aproximadas...",
  defaultNote: "Cliente solicita Motocarga. Detalles y tarifa serán confirmados directamente con el motocarguero.",
  loginNext: "/kronix/motocarga",
  buttonText: "Solicitar Motocarga",
  creatingText: "Solicitando motocarga...",
};

export default function MotocargaPage() {
  return <GenericTransportServiceRequest config={MOTOCARGA_CONFIG} />;
}
