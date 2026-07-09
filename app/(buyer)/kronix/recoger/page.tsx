// app/(buyer)/kronix/recoger/page.tsx
"use client";

import GenericTransportServiceRequest from "@/components/buyer/kronix/GenericTransportServiceRequest";
import { getTransportServiceConfig } from "@/lib/services/transportServices";

export default function KronixRecogerPage() {
  return <GenericTransportServiceRequest config={getTransportServiceConfig("recoger")} />;
}
