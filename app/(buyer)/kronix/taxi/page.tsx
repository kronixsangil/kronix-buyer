// app/(buyer)/kronix/taxi/page.tsx
"use client";

import GenericTransportServiceRequest from "@/components/buyer/kronix/GenericTransportServiceRequest";
import { getTransportServiceConfig } from "@/lib/services/transportServices";

export default function TaxiPage() {
  return <GenericTransportServiceRequest config={getTransportServiceConfig("taxi")} />;
}
