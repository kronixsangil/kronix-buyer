//app\(buyer)\kronix\KronixStepShell.tsx
"use client";

import type { ReactNode } from "react";

type StepItem = {
  id: number;
  label: string;
  shortLabel?: string;
};

type Props = {
  eyebrow?: string;
  title: string;
  subtitle: string;
  currentStep: number;
  totalSteps: number;
  steps?: StepItem[];
  children: ReactNode;
  footer?: ReactNode;
};

const DEFAULT_STEPS: StepItem[] = [
  { id: 1, label: "Recoger en", shortLabel: "Recoger" },
  { id: 2, label: "Entregar en", shortLabel: "Entregar" },
  { id: 3, label: "Detalles", shortLabel: "Detalles" },
  { id: 4, label: "Resumen", shortLabel: "Resumen" },
];

export default function KronixStepShell({
  eyebrow = "KroniX Ya",
  title,
  subtitle,
  currentStep,
  totalSteps,
  steps = DEFAULT_STEPS,
  children,
  footer,
}: Props) {
  const progress = Math.max(0, Math.min(100, Math.round((currentStep / totalSteps) * 100)));

  return (
    <div className="min-h-full bg-slate-50">
      <section className="border-b border-slate-200 bg-white px-4 pb-4 pt-3">
        <div className="relative z-10">
          <div>
            <h1 className="text-[25px] font-black leading-[1.02] tracking-tight text-slate-900">
              {title}
            </h1>
          </div>

          <div className="mt-3 rounded-[22px] border border-slate-200 bg-white p-3 shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  Paso {currentStep} de {totalSteps}
                </div>
                <div className="mt-0.5 truncate text-[15px] font-extrabold text-slate-900">
                  {steps.find((s) => s.id === currentStep)?.label ?? "Paso actual"}
                </div>
              </div>

              <div className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-extrabold text-slate-700 ring-1 ring-slate-200">
                {progress}%
              </div>
            </div>

            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#0c45ff_0%,#0b8bdf_55%,#1fd09a_100%)] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2">
              {steps.slice(0, totalSteps).map((step) => {
                const isDone = step.id < currentStep;
                const isCurrent = step.id === currentStep;

                return (
                  <div
                    key={step.id}
                    className={[
                      "rounded-[18px] px-2 py-2 text-center ring-1 transition",
                      isCurrent
                        ? "bg-slate-900 text-white ring-slate-900 shadow-[0_6px_14px_rgba(15,23,42,0.16)]"
                        : isDone
                        ? "bg-emerald-50 text-emerald-900 ring-emerald-200"
                        : "bg-slate-50 text-slate-500 ring-slate-200",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "mx-auto grid h-6 w-6 place-items-center rounded-full text-[11px] font-black",
                        isCurrent
                          ? "bg-white text-slate-900"
                          : isDone
                          ? "bg-emerald-500 text-white"
                          : "bg-white text-slate-500 ring-1 ring-slate-200",
                      ].join(" ")}
                    >
                      {isDone ? "✓" : step.id}
                    </div>

                    <div className="mt-1 text-[10px] font-extrabold leading-3">
                      {step.shortLabel || step.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-6 pt-4">{children}</section>

      {footer ? (
        <div className="sticky bottom-[70px] z-20 border-t border-slate-200 bg-white/92 px-4 py-3 backdrop-blur">
          <div className="mx-auto w-full max-w-md">{footer}</div>
        </div>
      ) : null}
    </div>
  );
}