//app/(buyer)/forgot-password/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const next = useMemo(() => {
    const n = String(sp.get("next") ?? "").trim();
    if (!n || !n.startsWith("/")) return "/";
    return n;
  }, [sp]);

  const [sent, setSent] = useState(false);
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const cleanIdentifier = emailOrPhone.trim();
  const canRequest = cleanIdentifier.length >= 3 && !loading;

  const requestRecovery = async () => {
    setErr(null);
    setLoading(true);

    try {
      await apiFetch<{ ok: boolean; devCode?: string }>("/auth/forgot-password", {
        method: "POST",
        json: { emailOrPhone: cleanIdentifier },
      });

      setSent(true);
    } catch (e: any) {
      setErr(e?.message || "No se pudo enviar la solicitud. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  function goLogin() {
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }

  return (
    <div className="px-4 pt-6 pb-10">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <div className="relative overflow-hidden bg-[linear-gradient(180deg,#061b3a_0%,#0a3768_48%,#ffffff_100%)] px-6 pt-8 pb-12 text-white">
          <div className="pointer-events-none absolute inset-0 opacity-90">
            <span className="absolute left-[12%] top-[20%] h-1 w-1 rounded-full bg-white" />
            <span className="absolute left-[34%] top-[12%] h-1.5 w-1.5 rounded-full bg-white" />
            <span className="absolute right-[18%] top-[24%] h-1 w-1 rounded-full bg-white" />
            <span className="absolute right-[32%] top-[42%] h-1.5 w-1.5 rounded-full bg-white" />
            <span className="absolute left-[55%] top-[30%] h-1 w-1 rounded-full bg-white" />
          </div>

          <div className="relative z-10">
            <div className="text-2xl font-extrabold drop-shadow-sm">Recuperar contraseña</div>
            <div className="mt-2 text-sm font-medium text-white/90">
              Te ayudamos a recuperar tu acceso a KroniX.
            </div>
          </div>
        </div>

        <div className="px-5 pb-8 -mt-8">
          <div className="rounded-3xl bg-white p-5 shadow-[0_18px_42px_rgba(15,23,42,0.16)]">
            {err ? (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
                {err}
              </div>
            ) : null}

            {!sent ? (
              <>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                    Paso 1 de 2
                  </div>
                  <div className="mt-1 text-[15px] font-black text-slate-950">
                    Solicitar recuperación
                  </div>
                </div>

                <div className="mt-5 text-xs font-bold uppercase tracking-wide text-slate-600">
                  Email o Teléfono
                </div>
                <input
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  placeholder="Ingresa tu email o número"
                  autoComplete="username"
                  className="mt-2 w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-[15px] font-semibold text-slate-900 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-blue-300 focus:bg-white"
                />

                <button
                  disabled={!canRequest}
                  onClick={requestRecovery}
                  className={cx(
                    "mt-6 w-full rounded-2xl py-3 text-sm font-extrabold text-white transition-all duration-200",
                    "bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98]",
                    "disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                >
                  {loading ? "Enviando…" : "SOLICITAR RECUPERACIÓN"}
                </button>

                <div className="mt-4 text-center text-xs text-slate-600">
                  ¿Ya la recordaste?{" "}
                  <a
                    href={`/login?next=${encodeURIComponent(next)}`}
                    className="font-extrabold text-blue-700 underline decoration-blue-300 hover:text-blue-900 hover:decoration-blue-600"
                  >
                    Volver a iniciar sesión
                  </a>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                    Paso 2 de 2
                  </div>
                  <div className="mt-1 text-[15px] font-black text-slate-950">
                    Revisa tu información
                  </div>
                </div>

                <div className="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-center">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border-2 border-emerald-500 bg-white text-3xl text-emerald-600">
                    ✉️
                  </div>

                  <div className="mt-4 text-lg font-black text-emerald-700">
                    Solicitud enviada
                  </div>

                  <div className="mx-auto mt-3 max-w-[300px] text-sm font-medium leading-6 text-slate-700">
                    Si tu cuenta existe, el equipo KroniX revisará la solicitud y te contactará por WhatsApp Business.
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-950 shadow-sm">
                    {cleanIdentifier}
                  </div>

                  <div className="mt-4 text-xs font-semibold leading-5 text-slate-600">
                    El operador podrá restablecer tu contraseña temporalmente. Por seguridad, deberás cambiarla al iniciar sesión.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={goLogin}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-emerald-700 shadow-sm transition hover:bg-slate-50"
                >
                  <span className="text-lg">↩</span>
                  VOLVER A INICIAR SESIÓN
                </button>
              </>
            )}

            <div className="mt-6 text-center text-[11px] text-slate-500">
              Si tienes problemas, contáctanos por <span className="font-bold">Soporte</span>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

