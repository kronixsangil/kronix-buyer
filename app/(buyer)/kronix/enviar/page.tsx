// app/(buyer)/kronix/enviar/page.tsx
"use client";

import GenericTransportServiceRequest from "@/components/buyer/kronix/GenericTransportServiceRequest";
import { getTransportServiceConfig } from "@/lib/services/transportServices";

export default function KronixEnviarPage() {
  return <GenericTransportServiceRequest config={getTransportServiceConfig("enviar")} />;
}
