// app/(buyer)/kronix/enviar/page.tsx
"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import KronixStepShell from "@/components/buyer/kronix/KronixStepShell";
import KronixEnviosStepOne from "@/components/buyer/kronix/KronixEnviosStepOne";
import KronixEnviosStepTwo from "@/components/buyer/kronix/KronixEnviosStepTwo";
import KronixEnviosStepThree from "@/components/buyer/kronix/KronixEnviosStepThree";

function getStepMeta(step: number) {
  if (step === 2) {
    return {
      title: "KroniX Envíos",
      subtitle:
        "Define dónde entregamos el envío y agrega los detalles básicos del paquete.",
      currentStep: 2,
    };
  }

  if (step === 3) {
    return {
      title: "KroniX Envíos",
      subtitle:
        "Revisa recogida, entrega, zona, propina y precio estimado antes de confirmar.",
      currentStep: 3,
    };
  }

  return {
    title: "KroniX Envíos",
    subtitle:
      "Servicio rápido para envíos frecuentes, tiendas, negocios y clientes que necesitan mover paquetes con confianza.",
    currentStep: 1,
  };
}

export default function KronixEnviarPage() {
  const searchParams = useSearchParams();
  const rawStep = Number(searchParams.get("step") || "1");

  const step = useMemo(() => {
    if ([1, 2, 3].includes(rawStep)) return rawStep;
    return 1;
  }, [rawStep]);

  const meta = getStepMeta(step);

  return (
    <KronixStepShell
      eyebrow="KroniX"
      title={meta.title}
      subtitle={meta.subtitle}
      currentStep={meta.currentStep}
      totalSteps={3}
    >
      {step === 1 ? <KronixEnviosStepOne /> : null}
      {step === 2 ? <KronixEnviosStepTwo /> : null}
      {step === 3 ? <KronixEnviosStepThree /> : null}
    </KronixStepShell>
  );
}