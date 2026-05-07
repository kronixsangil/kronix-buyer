//app\(buyer)\kronix\diligencia\page.tsx
"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import KronixStepShell from "@/components/buyer/kronix/KronixStepShell";
import DiligenciaStepOne from "@/components/buyer/kronix/DiligenciaStepOne";
import DiligenciaStepTwo from "@/components/buyer/kronix/DiligenciaStepTwo";
import DiligenciaStepThree from "@/components/buyer/kronix/DiligenciaStepThree";
import DiligenciaStepFour from "@/components/buyer/kronix/DiligenciaStepFour";

function getStepMeta(step: number) {
  if (step === 2) {
    return {
      title: "Programar domicilios",
      subtitle:
        "Agrega de 1 a 3 puntos de entrega o gestión. También define si el conductor debe retornar al punto inicial.",
      currentStep: 2,
    };
  }

  if (step === 3) {
    return {
      title: "Programar domicilios",
      subtitle:
        "Completa los datos del solicitante, elige si el servicio es normal o complejo y agrega instrucciones para el conductor.",
      currentStep: 3,
    };
  }

  if (step === 4) {
    return {
      title: "Programar domicilios",
      subtitle:
        "Revisa el resumen final, los puntos programados y el precio estimado antes de confirmar.",
      currentStep: 4,
    };
  }

  return {
    title: "Programar domicilios",
    subtitle:
      "Configura el punto donde inicia el servicio. Desde allí el conductor podrá realizar uno o varios domicilios.",
    currentStep: 1,
  };
}

function KronixDiligenciaPageContent() {
  const searchParams = useSearchParams();
  const rawStep = Number(searchParams.get("step") || "1");

  const step = useMemo(() => {
    if ([1, 2, 3, 4].includes(rawStep)) return rawStep;
    return 1;
  }, [rawStep]);

  const meta = getStepMeta(step);

  return (
    <KronixStepShell
      eyebrow="KroniX"
      title={meta.title}
      subtitle={meta.subtitle}
      currentStep={meta.currentStep}
      totalSteps={4}
    >
      {step === 1 ? <DiligenciaStepOne /> : null}
      {step === 2 ? <DiligenciaStepTwo /> : null}
      {step === 3 ? <DiligenciaStepThree /> : null}
      {step === 4 ? <DiligenciaStepFour /> : null}
    </KronixStepShell>
  );
}

export default function KronixDiligenciaPage() {
  return (
    <Suspense fallback={null}>
      <KronixDiligenciaPageContent />
    </Suspense>
  );
}