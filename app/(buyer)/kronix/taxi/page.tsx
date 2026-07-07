//app\(buyer)\kronix\taxi\page.tsx
"use client";

import GenericTransportServiceRequest, {
  type ServiceConfig,
} from "@/components/buyer/kronix/GenericTransportServiceRequest";

const TAXI_CONFIG: ServiceConfig = {
  title: "Taxi",
  shortTitle: "Taxi",
  emoji: "🚕",
  serviceType: "TAXI",
  courierServiceType: "PICKUP_AND_DELIVERY",
  requiredWorkerType: "TAXI",
  packageType: "Taxi",
  heading: "Taxi",
  description:
    "Solicita un taxi legal cercano. El valor del viaje se acuerda y se paga directamente al taxista.",
  notePlaceholder: "Ej: voy para el terminal, llevo maleta, somos 2 pasajeros...",
  defaultNote: "Cliente solicita Taxi. Destino y tarifa serán confirmados directamente con el taxista.",
  loginNext: "/kronix/taxi",
  buttonText: "Solicitar Taxi",
  creatingText: "Solicitando taxi...",
};

export default function TaxiPage() {
  return <GenericTransportServiceRequest config={TAXI_CONFIG} />;
}
