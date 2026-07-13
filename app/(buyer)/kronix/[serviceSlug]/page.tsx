// app/(buyer)/kronix/[serviceSlug]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import GenericTransportServiceRequest from "@/components/buyer/kronix/GenericTransportServiceRequest";
import { useBuyerCity } from "@/components/buyer/CityContext";
import {
  getDynamicTransportService,
  type DynamicTransportService,
} from "@/lib/services/transportServices";

export default function DynamicServiceRequestPage() {
  const params = useParams<{ serviceSlug: string }>();
  const router = useRouter();
  const { citySlug, cityReady } = useBuyerCity();
  const [service, setService] = useState<DynamicTransportService | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!cityReady || !citySlug) return;
      setLoading(true);
      setError(null);

      try {
        const item = await getDynamicTransportService(
          citySlug,
          String(params?.serviceSlug ?? "")
        );
        if (!alive) return;
        setService(item);
        if (!item) setError("Este servicio no está disponible en tu ciudad.");
      } catch (e: any) {
        if (!alive) return;
        setError(String(e?.message ?? "No pudimos cargar el servicio."));
        setService(null);
      } finally {
        if (alive) setLoading(false);
      }
    }

    void load();
    return () => { alive = false; };
  }, [cityReady, citySlug, params?.serviceSlug]);

  if (loading || !cityReady) {
    return <div className="px-4 py-10 text-center text-sm font-semibold text-slate-500">Cargando servicio...</div>;
  }

  if (!service) {
    return (
      <div className="px-4 py-10">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-center text-sm font-semibold text-amber-900">
          {error || "Servicio no disponible."}
        </div>
        <button type="button" onClick={() => router.push("/")} className="mt-4 w-full rounded-2xl bg-slate-900 py-3 text-sm font-black text-white">Volver al inicio</button>
      </div>
    );
  }

  return <GenericTransportServiceRequest config={service} />;
}
