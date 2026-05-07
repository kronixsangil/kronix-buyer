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

  const [step, setStep] = useState<1 | 2>(1);

  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [devCode, setDevCode] = useState<string | null>(null);

  const canRequest = emailOrPhone.trim().length >= 3 && !loading;
  const canReset =
    emailOrPhone.trim().length >= 3 &&
    code.trim().length >= 4 &&
    newPassword.trim().length >= 6 &&
    newPassword === confirm &&
    !loading;

  const requestCode = async () => {
    setErr(null);
    setMsg(null);
    setDevCode(null);
    setLoading(true);

    try {
      const res = await apiFetch<{ ok: boolean; devCode?: string }>(
        "/auth/forgot-password",
        {
          method: "POST",
          json: { emailOrPhone: emailOrPhone.trim() },
        }
      );

      setMsg("Si el usuario existe, te enviamos un código para recuperar tu contraseña.");
      if (res?.devCode) setDevCode(String(res.devCode));
      setStep(2);
    } catch (e: any) {
      setErr(e?.message || "No se pudo solicitar el código. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    setErr(null);
    setMsg(null);
    setLoading(true);

    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        json: {
          emailOrPhone: emailOrPhone.trim(),
          code: code.trim(),
          newPassword: newPassword.trim(),
        },
      });

      setMsg("✅ Contraseña actualizada. Ahora puedes iniciar sesión.");
      setTimeout(() => {
        router.replace(`/login?next=${encodeURIComponent(next)}`);
      }, 700);
    } catch (e: any) {
      setErr(e?.message || "No se pudo cambiar la contraseña.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 pt-6 pb-10">
      <div className="relative overflow-hidden rounded-3xl shadow-xl border border-gray-200 bg-white">
        {/* Header premium */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-green-500 px-6 pt-8 pb-10 text-white">
          <div className="text-2xl font-extrabold">Recuperar contraseña</div>
          <div className="mt-2 text-sm text-white/90">
            Te ayudamos a recuperar tu acceso en minutos.
          </div>
        </div>

        <div className="px-6 pb-8 -mt-6">
          <div className="rounded-3xl bg-white p-6 shadow-lg">
            {/* Mensajes */}
            {err ? (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
                {err}
              </div>
            ) : null}
            {msg ? (
              <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">
                {msg}
              </div>
            ) : null}

            {/* Paso 1 */}
            <div className={cx(step === 1 ? "block" : "hidden")}>
              <div className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                Email o Teléfono
              </div>
              <input
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                placeholder="Ingresa tu email o número"
                autoComplete="username"
                className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition"
              />

              <button
                disabled={!canRequest}
                onClick={requestCode}
                className={cx(
                  "mt-6 w-full rounded-2xl py-3 text-sm font-extrabold text-white transition-all duration-200",
                  "bg-green-600 hover:bg-green-700 active:scale-[0.98]",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {loading ? "Enviando…" : "ENVIAR CÓDIGO"}
              </button>

              <div className="mt-4 text-center text-xs text-gray-600">
                ¿Ya la recordaste?{" "}
                <a
                  href={`/login?next=${encodeURIComponent(next)}`}
                  className="font-extrabold text-blue-700 hover:text-blue-900 underline decoration-blue-300 hover:decoration-blue-600"
                >
                  Volver a iniciar sesión
                </a>
              </div>
            </div>

            {/* Paso 2 */}
            <div className={cx(step === 2 ? "block" : "hidden")}>
              <div className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                Email o Teléfono
              </div>
              <input
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                placeholder="Ingresa tu email o número"
                autoComplete="username"
                className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition"
              />

              <div className="mt-5 text-xs font-bold text-gray-600 uppercase tracking-wide">
                Código
              </div>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ej: 123456"
                inputMode="numeric"
                className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition"
              />

              {devCode ? (
                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                  <div className="font-extrabold">Código (DEV)</div>
                  <div className="mt-1">
                    Usa este código mientras estás en localhost:{" "}
                    <span className="font-extrabold">{devCode}</span>
                  </div>
                </div>
              ) : null}

              <div className="mt-5 text-xs font-bold text-gray-600 uppercase tracking-wide">
                Nueva contraseña
              </div>
              <div className="mt-2 relative">
                <input
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  type={showNew ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 pr-12 text-sm bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 text-lg"
                >
                  {showNew ? "🙈" : "👁️"}
                </button>
              </div>

              <div className="mt-5 text-xs font-bold text-gray-600 uppercase tracking-wide">
                Confirmar contraseña
              </div>
              <div className="mt-2 relative">
                <input
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  type={showConfirm ? "text" : "password"}
                  placeholder="Repite tu contraseña"
                  autoComplete="new-password"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 pr-12 text-sm bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 text-lg"
                >
                  {showConfirm ? "🙈" : "👁️"}
                </button>
              </div>

              {confirm && newPassword !== confirm ? (
                <div className="mt-2 text-[11px] font-semibold text-red-600">
                  La confirmación no coincide.
                </div>
              ) : null}

              <button
                disabled={!canReset}
                onClick={resetPassword}
                className={cx(
                  "mt-6 w-full rounded-2xl py-3 text-sm font-extrabold text-white transition-all duration-200",
                  "bg-green-600 hover:bg-green-700 active:scale-[0.98]",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {loading ? "Actualizando…" : "ACTUALIZAR CONTRASEÑA"}
              </button>

              <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="font-extrabold text-blue-700 hover:text-blue-900 underline decoration-blue-300 hover:decoration-blue-600"
                >
                  Volver
                </button>

                <button
                  type="button"
                  onClick={requestCode}
                  className="font-extrabold text-blue-700 hover:text-blue-900 underline decoration-blue-300 hover:decoration-blue-600"
                >
                  Reenviar código
                </button>
              </div>
            </div>

            <div className="mt-6 text-center text-[11px] text-gray-500">
              Si tienes problemas, contáctanos por <span className="font-bold">Soporte</span>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
