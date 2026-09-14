"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useBuyerCity } from "@/components/buyer/CityContext";
import BuyerTermsModal from "@/components/buyer/legal/BuyerTermsModal";
import {
  acceptBuyerTermsBackend,
  getCurrentBuyerTermsVersion,
} from "@/components/buyer/legal/buyerLegal";

const inputClass =
  "w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-[15px] font-semibold text-slate-900 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-blue-300 focus:bg-white";

const cx = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(" ");

const formatPhone = (value: string) =>
  String(value ?? "").replace(/\D/g, "").slice(0, 15);

const isValidKronixPassword = (value: string) => {
  const clean = String(value ?? "").trim();
  return clean.length >= 8 && /[a-zA-Z]/.test(clean) && /\d/.test(clean);
};

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[84px_1fr] items-center gap-2">
      <label className="text-xs font-extrabold text-slate-900">{label}</label>
      {children}
    </div>
  );
}

export default function BuyerRegisterPage() {
  const router = useRouter();
  const { citySlug, cityLabel, cityReady } = useBuyerCity();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [registeredPhone, setRegisteredPhone] = useState("");
  const [showWelcome, setShowWelcome] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const cleanName = name.trim();
  const cleanPhone = phone.trim();

  const canSubmit =
    cleanName.length >= 2 &&
    cleanPhone.length >= 7 &&
    termsAccepted &&
    cityReady &&
    Boolean(citySlug) &&
    !loading;

  const newPasswordOk = isValidKronixPassword(newPassword);
  const passwordsMatch =
    newPassword.length > 0 &&
    confirmPassword.length > 0 &&
    newPassword === confirmPassword;

  const canChangePassword =
    newPasswordOk && passwordsMatch && !changingPassword;

  const goHome = () => {
    setShowWelcome(false);
    setShowChangePassword(false);
    router.replace("/");
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setError(null);
    setLoading(true);

    try {
      const termsVersion = await getCurrentBuyerTermsVersion();

      await apiFetch("/auth/register", {
        method: "POST",
        json: {
          name: cleanName,
          phone: cleanPhone,
          password: cleanPhone,
          termsAccepted: true,
          termsVersion,
          citySlug,
        },
      });

      try {
        await acceptBuyerTermsBackend(termsVersion);
      } catch (legalError) {
        console.warn(
          "[KroniX] Cuenta creada; aceptación legal detallada pendiente.",
          legalError
        );
      }

      window.dispatchEvent(new Event("ct-auth-changed"));
      window.dispatchEvent(new Event("auth:changed"));
      setRegisteredPhone(cleanPhone);
      setShowWelcome(true);
    } catch (e: any) {
      const raw = String(e?.message ?? "").trim();
      const msg = raw.toLowerCase();

      setError(
        msg.includes("phone_already_used") ||
          (msg.includes("phone") && msg.includes("used")) ||
          msg.includes("teléfono ya está registrado") ||
          msg.includes("telefono ya esta registrado")
          ? "Este teléfono ya está registrado."
          : raw ||
              "No pudimos crear tu cuenta. Revisa tus datos e intenta de nuevo."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChangeInitialPassword = async () => {
    setPasswordError(null);

    if (!newPasswordOk) {
      setPasswordError(
        "La contraseña debe tener mínimo 8 caracteres y combinar letras y números."
      );
      return;
    }

    if (!passwordsMatch) {
      setPasswordError("Las contraseñas no coinciden.");
      return;
    }

    setChangingPassword(true);

    try {
      await apiFetch("/auth/change-password", {
        method: "POST",
        json: {
          currentPassword: registeredPhone,
          newPassword: newPassword.trim(),
        },
      });

      window.dispatchEvent(new Event("ct-auth-changed"));
      window.dispatchEvent(new Event("auth:changed"));
      goHome();
    } catch (e: any) {
      setPasswordError(
        String(e?.message ?? "").trim() ||
          "No pudimos actualizar la contraseña. Intenta nuevamente."
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const closePasswordChange = () => {
    setPasswordError(null);
    setNewPassword("");
    setConfirmPassword("");
    setShowChangePassword(false);
  };

  return (
    <div className="px-4 pb-6 pt-3">
      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white px-4 py-3">
          <div className="text-[11px] font-extrabold text-gray-500">KroniX</div>
          <div className="mt-1 text-lg font-extrabold text-gray-900">Crear cuenta</div>
          <div className="mt-1 text-xs font-semibold text-gray-600">
            Regístrate en segundos. Tu teléfono será tu usuario de acceso.
          </div>
          {cityLabel ? (
            <div className="mt-1 text-[11px] font-bold text-emerald-700">
              Ciudad activa: {cityLabel}
            </div>
          ) : null}
        </div>

        <div className="space-y-3 p-3">
          <FieldRow label="Nombre">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Blass"
              autoComplete="name"
              className={inputClass}
            />
          </FieldRow>

          <FieldRow label="Teléfono">
            <input
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="Ej: 3112461059"
              inputMode="tel"
              autoComplete="tel"
              className={inputClass}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSubmit) void handleSubmit();
              }}
            />
          </FieldRow>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
              {error}
            </div>
          ) : null}

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300"
              />
              <div className="text-[12px] leading-5 text-gray-700">
                Acepto los{" "}
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="font-extrabold text-blue-700 hover:underline"
                >
                  Términos y Condiciones
                </button>{" "}
                y autorizo el tratamiento de mis datos conforme a la política de privacidad de KroniX.
              </div>
            </label>
          </div>

          <button
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
            className={cx(
              "w-full rounded-2xl py-3 text-sm font-extrabold text-white",
              "bg-green-600 hover:bg-green-700 disabled:opacity-50"
            )}
          >
            {loading ? "Creando…" : "CREAR CUENTA"}
          </button>

          <div className="text-center text-[12px] text-gray-600">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="font-extrabold text-blue-700 hover:underline">
              Inicia sesión
            </Link>
          </div>
        </div>
      </div>

      <BuyerTermsModal
        open={showTermsModal}
        authenticated={false}
        onClose={() => setShowTermsModal(false)}
        onAccepted={() => setTermsAccepted(true)}
      />

      {showWelcome ? (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-sm overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_26px_80px_rgba(15,23,42,0.35)]">
            {!showChangePassword ? (
              <div className="p-5">
                <div className="text-center text-[30px]">🎉</div>
                <div className="mt-1 text-center text-xl font-black text-slate-950">
                  ¡Bienvenido a KroniX!
                </div>
                <div className="mt-2 text-center text-sm font-semibold leading-5 text-slate-600">
                  Tu cuenta ya está lista para usar.
                </div>

                <div className="mt-5 space-y-2 rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-bold text-slate-500">Tu usuario</div>
                  <div className="break-all text-lg font-black text-slate-950">
                    {registeredPhone}
                  </div>
                  <div className="pt-2 text-xs font-bold text-slate-500">Tu contraseña</div>
                  <div className="break-all text-lg font-black text-slate-950">
                    {registeredPhone}
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-900">
                  Por seguridad, te recomendamos cambiar tu contraseña desde Perfil.
                </div>

                <div className="mt-4 grid gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPasswordError(null);
                      setShowChangePassword(true);
                    }}
                    className="w-full rounded-2xl bg-green-600 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-green-700"
                  >
                    CAMBIAR CONTRASEÑA
                  </button>
                  <button
                    type="button"
                    onClick={goHome}
                    className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700"
                  >
                    CONSERVAR CONTRASEÑA
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5">
                <div className="text-lg font-black text-slate-950">Crear contraseña</div>
                <div className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                  Usa mínimo 8 caracteres e incluye letras y números.
                </div>

                <div className="mt-4 space-y-3">
                  {[
                    {
                      label: "Crear contraseña",
                      value: newPassword,
                      setValue: setNewPassword,
                      visible: showNewPassword,
                      setVisible: setShowNewPassword,
                      placeholder: "Nueva contraseña",
                    },
                    {
                      label: "Confirmar contraseña",
                      value: confirmPassword,
                      setValue: setConfirmPassword,
                      visible: showConfirmPassword,
                      setVisible: setShowConfirmPassword,
                      placeholder: "Repite la contraseña",
                    },
                  ].map((field, index) => (
                    <div key={field.label}>
                      <div className="mb-1 text-xs font-extrabold text-slate-700">
                        {field.label}
                      </div>
                      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3">
                        <input
                          type={field.visible ? "text" : "password"}
                          value={field.value}
                          onChange={(e) => {
                            setPasswordError(null);
                            field.setValue(e.target.value);
                          }}
                          placeholder={field.placeholder}
                          autoComplete="new-password"
                          className="min-w-0 flex-1 bg-transparent py-3 text-sm font-semibold text-slate-900 outline-none"
                          onKeyDown={(e) => {
                            if (
                              index === 1 &&
                              e.key === "Enter" &&
                              canChangePassword
                            ) {
                              void handleChangeInitialPassword();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => field.setVisible((v) => !v)}
                          className="rounded-xl px-2 py-2 text-xs font-extrabold text-slate-600"
                        >
                          {field.visible ? "Ocultar" : "Ver"}
                        </button>
                      </div>
                    </div>
                  ))}

                  {passwordError ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
                      {passwordError}
                    </div>
                  ) : null}

                  <button
                    type="button"
                    disabled={!canChangePassword}
                    onClick={() => void handleChangeInitialPassword()}
                    className="w-full rounded-2xl bg-green-600 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
                  >
                    {changingPassword ? "GUARDANDO…" : "GUARDAR CONTRASEÑA"}
                  </button>

                  <button
                    type="button"
                    disabled={changingPassword}
                    onClick={closePasswordChange}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-700"
                  >
                    Volver
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
