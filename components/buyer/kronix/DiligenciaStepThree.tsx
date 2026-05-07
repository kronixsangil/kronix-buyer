//components\buyer\kronix\DiligenciaStepThree.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  type KronixDiligenciaDraft,
  formatPhoneDraft,
  loadKronixDiligenciaDraft,
  saveKronixDiligenciaDraft,
} from "@/components/buyer/kronix/kronixDiligenciaDraft";
import { useAuth } from "@/components/buyer/useAuth";

type ComplexitySelection = "normal" | "complex" | null;

export default function DiligenciaStepThree() {
  const router = useRouter();
  const { user } = useAuth();

  const [form, setForm] = useState<KronixDiligenciaDraft>(
    loadKronixDiligenciaDraft()
  );
  const [touched, setTouched] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const current = loadKronixDiligenciaDraft();
    const safeUser = user as any;

const profileName = String(safeUser?.name ?? safeUser?.user?.name ?? "").trim();
const profilePhone = String(safeUser?.phone ?? safeUser?.user?.phone ?? "")
      .replace(/\D/g, "")
      .slice(0, 15);

    setForm({
      ...current,
      senderName: current.senderName.trim() || profileName,
      senderPhone: current.senderPhone.trim() || profilePhone,
    });
  }, [user]);

  useEffect(() => {
    saveKronixDiligenciaDraft(form);
  }, [form]);

  function updateField<K extends keyof KronixDiligenciaDraft>(
    key: K,
    value: KronixDiligenciaDraft[K]
  ) {
    setSaved(false);
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function updateExtra(key: string, value: any) {
    setSaved(false);
    setForm((prev) => ({
      ...prev,
      [key]: value,
    } as any));
  }

  const senderNameOk = form.senderName.trim().length >= 3;

  const complexitySelection: ComplexitySelection =
    (form as any).complexitySelected === true
      ? (form as any).isComplex
        ? "complex"
        : "normal"
      : null;

  const complexityOk = complexitySelection !== null;

  const canContinue = useMemo(() => {
    return senderNameOk && complexityOk;
  }, [senderNameOk, complexityOk]);

  const genericError =
    touched && !canContinue
      ? !senderNameOk
        ? "Falta completar: nombre del solicitante."
        : "Debes seleccionar si el servicio es normal o complejo."
      : "";

  function goBack() {
    saveKronixDiligenciaDraft(form);
    router.push("/kronix/diligencia?step=2");
  }

  function handleContinue() {
    setTouched(true);
    if (!canContinue) return;

    saveKronixDiligenciaDraft(form);
    setSaved(true);

    setTimeout(() => {
      router.push("/kronix/diligencia?step=4");
    }, 180);
  }

  return (
    <div className="space-y-2">
      <div className="rounded-[28px] border border-slate-200 bg-white p-[14px] shadow-[0_10px_24px_rgba(15,23,42,0.07)]">
        <div className="text-[18px] font-black text-slate-900">
          Contacto principal
        </div>

        <div className="mt-1 text-[13px] leading-5 text-slate-500">
          Usaremos estos datos para identificar al cliente que solicita el servicio.
        </div>

        <div className="mt-3 grid gap-[14px]">
          <div>
            <label className="mb-2 block text-[12px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
              Nombre del solicitante <span className="text-red-500">*</span>
            </label>

            <input
              type="text"
              value={form.senderName}
              onChange={(e) => updateField("senderName", e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="Ej: Marta Gómez"
              className={[
                "w-full rounded-[20px] border bg-slate-50 px-4 py-[14px] text-[15px] font-semibold text-slate-900 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:bg-white",
                touched && !senderNameOk
                  ? "border-red-300 focus:border-red-400"
                  : "border-slate-200 focus:border-violet-300",
              ].join(" ")}
              maxLength={80}
            />
          </div>

          <div>
            <label className="mb-2 block text-[12px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
              Teléfono principal{" "}
              <span className="font-semibold normal-case tracking-normal">
                (opcional)
              </span>
            </label>

            <input
              type="text"
              value={form.senderPhone}
              onChange={(e) =>
                updateField("senderPhone", formatPhoneDraft(e.target.value))
              }
              placeholder="Ej: 3112461059"
              inputMode="numeric"
              className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-[14px] text-[15px] font-semibold text-slate-900 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-violet-300 focus:bg-white"
              maxLength={20}
            />
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-[14px] shadow-[0_10px_24px_rgba(15,23,42,0.07)]">
        <div className="text-[18px] font-black text-slate-900">
          Complejidad del servicio <span className="text-red-500">*</span>
        </div>

        <div className="mt-1 text-[13px] leading-5 text-slate-500">
          Selecciona con cuidado. Esta opción cambia el valor del servicio.
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              updateExtra("complexitySelected", true);
              updateExtra("isComplex", false);
            }}
            className={[
              "rounded-[22px] px-4 py-4 text-left transition",
              complexitySelection === "normal"
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-800",
            ].join(" ")}
          >
            <div className="text-[15px] font-black">Normal</div>
            <div className="mt-1 text-[12px] font-semibold opacity-80">
              Entrega sencilla, sin espera ni manejo especial.
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              updateExtra("complexitySelected", true);
              updateExtra("isComplex", true);
            }}
            className={[
              "rounded-[22px] px-4 py-4 text-left transition",
              complexitySelection === "complex"
                ? "bg-emerald-600 text-white"
                : "border border-slate-200 bg-white text-slate-800",
            ].join(" ")}
          >
            <div className="text-[15px] font-black">Complejo</div>
            <div className="mt-1 text-[12px] font-semibold opacity-80">
              Compra, espera, cuidado especial o instrucciones largas.
            </div>
          </button>
        </div>

        {touched && !complexityOk ? (
          <div className="mt-3 rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700">
            Debes seleccionar Normal o Complejo para continuar.
          </div>
        ) : null}
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-[14px] shadow-[0_10px_24px_rgba(15,23,42,0.07)]">
        <div className="text-[18px] font-black text-slate-900">
          Indicaciones adicionales
        </div>

        <div className="mt-1 text-[13px] leading-5 text-slate-500">
          Agrega instrucciones opcionales para ayudar al motorizado.
        </div>

        <div className="mt-3">
          <label className="mb-2 block text-[12px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
            Notas para el conductor{" "}
            <span className="font-semibold normal-case tracking-normal">
              (opcional)
            </span>
          </label>

          <textarea
            value={form.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            placeholder="Ej: Comprar en tal local, esperar autorización, llamar antes de llegar, entregar a portería..."
            rows={4}
            maxLength={300}
            className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-[14px] text-[15px] font-semibold text-slate-900 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-violet-300 focus:bg-white"
          />

          <div className="mt-2 text-right text-[11px] font-semibold text-slate-400">
            {form.notes.length}/300
          </div>
        </div>
      </div>

      {genericError ? (
        <div className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700">
          {genericError}
        </div>
      ) : null}

      {saved ? (
        <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] font-extrabold text-emerald-800">
          Paso 3 guardado correctamente ✅
        </div>
      ) : null}

      <div className="flex gap-3 pt-[2px]">
        <button
          type="button"
          onClick={goBack}
          className="flex-1 rounded-[24px] border border-slate-200 bg-white py-[14px] text-[15px] font-black text-slate-800 shadow-sm transition hover:bg-slate-50"
        >
          Atrás
        </button>

        <button
          type="button"
          disabled={!canContinue}
          onClick={handleContinue}
          className={[
            "flex-1 rounded-[24px] py-[14px] text-[15px] font-black text-white transition",
            canContinue
              ? "bg-[linear-gradient(90deg,#6d28d9_0%,#7c3aed_50%,#0ea5e9_100%)] shadow-[0_12px_22px_rgba(109,40,217,0.20)] hover:scale-[0.995]"
              : "cursor-not-allowed bg-slate-300 shadow-none",
          ].join(" ")}
        >
          Continuar
        </button>
      </div>

      <div className="text-center text-[12px] font-medium text-slate-500">
        En el siguiente paso veremos el resumen y el precio estimado.
      </div>
    </div>
  );
}