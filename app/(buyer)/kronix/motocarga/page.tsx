// app/(buyer)/kronix/motocarga/page.tsx
"use client";

import GenericTransportServiceRequest from "@/components/buyer/kronix/GenericTransportServiceRequest";
import { getTransportServiceConfig } from "@/lib/services/transportServices";

export default function MotocargaPage() {
  return <GenericTransportServiceRequest config={getTransportServiceConfig("motocarga")} />;
}
