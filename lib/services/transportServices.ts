// lib/services/transportServices.ts

import type { ServiceConfig } from "@/components/buyer/kronix/GenericTransportServiceRequest";

export type TransportServiceSlug = "taxi" | "motocarga" | "recoger" | "enviar";

export const TRANSPORT_SERVICES: Record<TransportServiceSlug, ServiceConfig> = {
  taxi: {
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
    defaultNote:
      "Cliente solicita Taxi. Destino y tarifa serán confirmados directamente con el taxista.",
    loginNext: "/kronix/taxi",
    buttonText: "Solicitar Taxi",
    creatingText: "Solicitando taxi...",
    imageSrc: "/services/taxi/cardder.png",
  },

  motocarga: {
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
    notePlaceholder:
      "Ej: caja mediana, mercado grande, herramienta, dimensiones aproximadas...",
    defaultNote:
      "Cliente solicita Motocarga. Detalles y tarifa serán confirmados directamente con el motocarguero.",
    loginNext: "/kronix/motocarga",
    buttonText: "Solicitar Motocarga",
    creatingText: "Solicitando motocarga...",
    imageSrc: "/services/motocarga/cardder.png",
  },

  recoger: {
    title: "Domicilio Express",
    shortTitle: "Domicilio",
    emoji: "🏍️",
    serviceType: "DELIVERY",
    courierServiceType: "PICKUP_AND_DELIVERY",
    requiredWorkerType: "MOTORCYCLE",
    packageType: "Domicilio Express",
    heading: "Domicilio Express",
    description:
      "Solicita un motorizado para recoger, comprar o llevar algo dentro de la ciudad.",
    notePlaceholder:
      "Ej: recoger llaves, comprar algo pequeño, llevar documento, punto de entrega, instrucciones...",
    defaultNote:
      "Cliente solicita Domicilio Express. Detalles y tarifa serán confirmados directamente con el motorizado.",
    loginNext: "/kronix/recoger",
    buttonText: "Solicitar Domicilio Express",
    creatingText: "Solicitando domicilio...",
    imageSrc: "/services/delivery/cardder.png",
  },

  enviar: {
    title: "KroniX Envíos",
    shortTitle: "Envíos",
    emoji: "📦",
    serviceType: "PACKAGE",
    courierServiceType: "SEND_PACKAGE",
    requiredWorkerType: "MOTORCYCLE",
    packageType: "KroniX Envíos",
    heading: "KroniX Envíos",
    description:
      "Solicita un motorizado para enviar paquetes, documentos o artículos pequeños dentro de la ciudad.",
    notePlaceholder:
      "Ej: documento, paquete pequeño, nombre del receptor, dirección destino, cuidado especial...",
    defaultNote:
      "Cliente solicita KroniX Envíos. Detalles y tarifa serán confirmados directamente con el motorizado.",
    loginNext: "/kronix/enviar",
    buttonText: "Solicitar Envío",
    creatingText: "Solicitando envío...",
    imageSrc: "/services/package/cardder.png",
  },
};

export function getTransportServiceConfig(slug: TransportServiceSlug) {
  return TRANSPORT_SERVICES[slug];
}
