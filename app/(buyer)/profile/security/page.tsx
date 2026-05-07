// app/(buyer)/profile/security/page.tsx
"use client";

import { useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/components/buyer/useAuth";

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

function EyeIcon({ open }: { open: boolean }) {
  return (
    <span aria-hidden="true" className="text-gray-500">
      {open ? "🙈" : "👁️"}
    </span>
  );
}

export default function SecurityPage() {
  const { isLoading, isAuthed } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const meetsLen = useMemo(() => newPassword.trim().length >= 6, [newPassword]);
  const matches = useMemo(
    () => confirm.length > 0 && newPassword === confirm,
    [newPassword, confirm]
  );

  const canSubmit =
    !saving &&
    currentPassword.trim().length > 0 &&
    newPassword.trim().length >= 6 &&
    newPassword === confirm;

  const onSubmit = async () => {
    setMsg(null);
    setErr(null);

    if (newPassword !== confirm) {
      setErr("La confirmación no coincide.");
      return;
    }

    setSaving(true);
    try {
      await apiFetch("/users/me/change-password", {
        method: "POST",
        json: {
          currentPassword,
          newPassword,
        },
      });

      setMsg("Contraseña actualizada con éxito.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
    } catch (e: any) {
      setErr(e?.message || "No se pudo cambiar la contraseña.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 pb-6 pt-4">
      <div className="text-lg font-extrabold text-gray-900">Seguridad</div>
      <div className="mt-1 text-xs text-gray-600">
        Cambia tu contraseña y protege tu cuenta.
      </div>

      {!isLoading && !isAuthed ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          Inicia sesión para gestionar tu seguridad.
        </div>
      ) : null}

      {!isLoading && isAuthed ? (
        <>
          {/* Card superior “premium” */}
          <div className="mt-4 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-200">
                  🔒
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-extrabold text-gray-900">
                    Cambiar contraseña
                  </div>
                  <div className="mt-1 text-xs text-gray-600">
                    Recomendación: usa una contraseña única y de al menos 6 caracteres.
                  </div>
                </div>
              </div>

              {/* Requisitos */}
              <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 p-3">
                <div className="text-xs font-extrabold text-gray-900">Requisitos</div>
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={cx(
                        "inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-extrabold",
                        meetsLen ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600"
                      )}
                    >
                      {meetsLen ? "✓" : "•"}
                    </span>
                    <span className={meetsLen ? "text-gray-900" : "text-gray-600"}>
                      Mínimo 6 caracteres
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={cx(
                        "inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-extrabold",
                        matches ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600"
                      )}
                    >
                      {matches ? "✓" : "•"}
                    </span>
                    <span className={matches ? "text-gray-900" : "text-gray-600"}>
                      Confirmación coincide
                    </span>
                  </div>
                </div>
              </div>

              {/* Mensajes */}
              {err ? (
                <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
                  {err}
                </div>
              ) : null}
              {msg ? (
                <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
                  {msg}
                </div>
              ) : null}

              {/* Form */}
              <div className="mt-4 space-y-3">
                {/* Current */}
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="text-xs font-extrabold text-gray-800">
                    Contraseña actual
                  </div>

                  <div className="mt-2 flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-gray-300 focus-within:bg-white">
                    <input
                      type={showCurrent ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-transparent py-1 text-sm outline-none"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent((v) => !v)}
                      className="rounded-xl px-2 py-1 text-xs font-extrabold text-gray-700 hover:bg-gray-100"
                      aria-label={showCurrent ? "Ocultar contraseña actual" : "Mostrar contraseña actual"}
                    >
                      <EyeIcon open={showCurrent} />
                    </button>
                  </div>
                </div>

                {/* New */}
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="text-xs font-extrabold text-gray-800">Nueva contraseña</div>

                  <div className="mt-2 flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-gray-300 focus-within:bg-white">
                    <input
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full bg-transparent py-1 text-sm outline-none"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((v) => !v)}
                      className="rounded-xl px-2 py-1 text-xs font-extrabold text-gray-700 hover:bg-gray-100"
                      aria-label={showNew ? "Ocultar nueva contraseña" : "Mostrar nueva contraseña"}
                    >
                      <EyeIcon open={showNew} />
                    </button>
                  </div>

                  {!meetsLen && newPassword.length > 0 ? (
                    <div className="mt-2 text-[11px] font-semibold text-amber-700">
                      Te faltan caracteres: mínimo 6.
                    </div>
                  ) : null}
                </div>

                {/* Confirm */}
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="text-xs font-extrabold text-gray-800">
                    Confirmar nueva contraseña
                  </div>

                  <div
                    className={cx(
                      "mt-2 flex items-center gap-2 rounded-2xl border bg-gray-50 px-3 py-2 focus-within:bg-white",
                      confirm.length === 0
                        ? "border-gray-200 focus-within:border-gray-300"
                        : newPassword === confirm
                        ? "border-emerald-200 focus-within:border-emerald-300"
                        : "border-red-200 focus-within:border-red-300"
                    )}
                  >
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Repite tu contraseña"
                      className="w-full bg-transparent py-1 text-sm outline-none"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="rounded-xl px-2 py-1 text-xs font-extrabold text-gray-700 hover:bg-gray-100"
                      aria-label={showConfirm ? "Ocultar confirmación" : "Mostrar confirmación"}
                    >
                      <EyeIcon open={showConfirm} />
                    </button>
                  </div>

                  {confirm && newPassword !== confirm ? (
                    <div className="mt-2 text-[11px] font-semibold text-red-600">
                      La confirmación no coincide.
                    </div>
                  ) : null}
                </div>

                <button
                  disabled={!canSubmit}
                  onClick={onSubmit}
                  className={cx(
                    "w-full rounded-2xl py-3 text-sm font-extrabold text-white",
                    "bg-green-600 hover:bg-green-700 disabled:opacity-50"
                  )}
                >
                  {saving ? "Actualizando…" : "Actualizar contraseña"}
                </button>

                <div className="text-center text-[11px] text-gray-500">
                  Si olvidaste tu contraseña, contáctanos por <span className="font-bold">Soporte</span>.
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
