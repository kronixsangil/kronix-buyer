// app/(buyer)/kronix/recoger/page.tsx
"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import KronixStepShell from "@/components/buyer/kronix/KronixStepShell";
import DomicilioExpressStepOne from "@/components/buyer/kronix/DomicilioExpressStepOne";
import DomicilioExpressStepTwo from "@/components/buyer/kronix/DomicilioExpressStepTwo";

function getStepMeta(step: number) {
  if (step === 2) {
    return {
      title: "Domicilio Express",
      subtitle: "Revisa el resumen, zona, propina y precio estimado antes de confirmar.",
      currentStep: 2,
    };
  }

  return {
    title: "Domicilio Express",
    subtitle: "Pide un motorizado rápido en pocos datos.",
    currentStep: 1,
  };
}

export default function KronixRecogerPage() {
  const searchParams = useSearchParams();
  const rawStep = Number(searchParams.get("step") || "1");

  const step = useMemo(() => {
    if ([1, 2].includes(rawStep)) return rawStep;
    return 1;
  }, [rawStep]);

  const meta = getStepMeta(step);

  return (
    <KronixStepShell
      eyebrow="KroniX"
      title={meta.title}
      subtitle={meta.subtitle}
      currentStep={meta.currentStep}
      totalSteps={2}
    >
      {step === 1 ? <DomicilioExpressStepOne /> : null}
      {step === 2 ? <DomicilioExpressStepTwo /> : null}
    </KronixStepShell>
  );
}