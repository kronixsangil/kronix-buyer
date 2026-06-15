// app/(buyer)/register/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { geocodeAddressOSMInCity } from "@/lib/geocode";
import { useBuyerCity } from "@/components/buyer/CityContext";
import BuyerTermsModal from "@/components/buyer/legal/BuyerTermsModal";
import {
  acceptBuyerTermsBackend,
  getCurrentBuyerTermsVersion,
} from "@/components/buyer/legal/buyerLegal";

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

function isValidKronixPassword(value: string) {
  const clean = String(value ?? "").trim();
  return clean.length >= 8 && /[a-zA-Z]/.test(clean) && /\d/.test(clean);
}

function passwordHint(value: string) {
  const clean = String(value ?? "").trim();
  if (!clean) return "Debe tener mínimo 8 caracteres y combinar letras y números.";
  if (clean.length < 8) return "Faltan caracteres: mínimo 8.";
  if (!/[a-zA-Z]/.test(clean)) return "Agrega al menos una letra.";
  if (!/\d/.test(clean)) return "Agrega al menos un número.";
  return "Contraseña válida.";
}

function formatPhone(value: string) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 15);
}

const inputClass =
  "w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-[15px] font-semibold text-slate-900 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-blue-300 focus:bg-white";

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
  const sp = useSearchParams();
  const { citySlug, cityLabel, cityGeoLabel, cityReady } = useBuyerCity();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [primaryAddress, setPrimaryAddress] = useState("");
  const [primaryReference, setPrimaryReference] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = useMemo(() => {
    const n = String(sp.get("next") ?? "").trim();
    if (!n || !n.startsWith("/")) return "/";
    return n;
  }, [sp]);

  const passwordOk = isValidKronixPassword(password);

  const passwordsMatch =
    password.trim().length > 0 &&
    confirmPassword.trim().length > 0 &&
    password === confirmPassword;

  const cleanPhone = phone.trim();
  const cleanAddress = primaryAddress.trim();

  const canSubmit =
    cleanPhone.length >= 7 &&
    cleanAddress.length >= 8 &&
    passwordOk &&
    passwordsMatch &&
    termsAccepted &&
    cityReady &&
    Boolean(citySlug) &&
    !loading;

  async function createPrimaryAddress() {
    if (!citySlug) throw new Error("No se encontró ciudad activa.");

    const geo = await geocodeAddressOSMInCity(cleanAddress, cityGeoLabel);

    if (!geo) {
      throw new Error(
        `No pudimos ubicar tu dirección principal en ${cityLabel}. Revisa que esté bien escrita e intenta de nuevo.`
      );
    }

    await apiFetch(`/users/me/addresses?citySlug=${encodeURIComponent(citySlug)}`, {
      method: "POST",
      suppressSessionExpiredEvent: true,
      json: {
        label: "Casa",
        placeName: "Dirección principal",
        address: cleanAddress,
        reference: primaryReference.trim() || null,
        contactName: name.trim() || null,
        contactPhone: cleanPhone || null,
        lat: geo.lat,
        lng: geo.lng,
        isDefault: true,
        isFavorite: true,
      },
    } as any);
  }

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setError(null);
    setLoading(true);

    if (!passwordOk) {
      setError("La contraseña debe tener mínimo 8 caracteres y combinar letras y números. No necesita símbolos.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      setLoading(false);
      return;
    }

    if (cleanAddress.length < 8) {
      setError("La dirección principal es obligatoria y debe estar más completa.");
      setLoading(false);
      return;
    }

    try {
      const termsVersion = await getCurrentBuyerTermsVersion();

      await apiFetch("/auth/register", {
        method: "POST",
        json: {
          name: name.trim() || "Usuario",
          phone: cleanPhone,
          email: email.trim() || null,
          password: password.trim(),
          termsAccepted: true,
          termsVersion,
        },
      });

      await acceptBuyerTermsBackend(termsVersion);
      await createPrimaryAddress();

      window.dispatchEvent(new Event("ct-auth-changed"));
      window.dispatchEvent(new Event("auth:changed"));

      router.replace(next);
    } catch (e: any) {
      const raw = String(e?.message ?? "");
      const msg = raw.toLowerCase();

      if (
        msg.includes("phone_already_used") ||
        (msg.includes("phone") && msg.includes("used"))
      ) {
        setError("Este teléfono ya está registrado.");
      } else if (msg.includes("email_already_used")) {
        setError("Este email ya está registrado.");
      } else if (msg.includes("contraseña") || msg.includes("password")) {
        setError("La contraseña debe tener mínimo 8 caracteres y combinar letras y números. No necesita símbolos.");
      } else if (raw.trim()) {
        setError(raw.trim());
      } else {
        setError("No pudimos crear tu cuenta. Revisa tus datos e intenta de nuevo.");
      }

      setLoading(false);
    }
  };

  return (
    <div className="px-4 pb-6 pt-3">
      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white px-4 py-3">
          <div className="text-[11px] font-extrabold text-gray-500">KroniX</div>
          <div className="mt-1 text-lg font-extrabold text-gray-900">Crear cuenta</div>
          <div className="mt-1 text-xs font-semibold text-gray-600">
            Regístrate para guardar pedidos, direcciones y tu historial.
          </div>
        </div>

        <div className="space-y-2 p-3">
          <FieldRow label="Nombre">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Blass"
              className={inputClass}
            />
          </FieldRow>

          <FieldRow label="Teléfono">
            <input
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="Ej: 3112461059"
              inputMode="tel"
              className={inputClass}
            />
          </FieldRow>

          <FieldRow label="Email">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ej: tu@email.com"
              autoComplete="email"
              className={inputClass}
            />
          </FieldRow>

          <FieldRow label="Dirección">
            <textarea
              value={primaryAddress}
              onChange={(e) => setPrimaryAddress(e.target.value)}
              placeholder={`Dirección principal en ${cityLabel || "tu ciudad"} *`}
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </FieldRow>

          <FieldRow label="Referencia">
  <textarea
    value={primaryReference}
    onChange={(e) => setPrimaryReference(e.target.value)}
    placeholder="Ej: Frente al parque, portón negro, apto 302..."
    rows={2}
    className={`${inputClass} resize-none`}
  />
</FieldRow>

          <FieldRow label="Contraseña">
            <div className="flex min-w-0 items-center gap-2">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8 caracteres, letras y números"
                autoComplete="new-password"
                type={showPass ? "text" : "password"}
                className={cx(
                  "min-w-0 flex-1 rounded-[20px] border bg-slate-50 px-4 py-4 text-[15px] font-semibold text-slate-900 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:bg-white",
                  password.length > 0 && !passwordOk
                    ? "border-amber-300 bg-amber-50 focus:border-amber-400"
                    : "border-slate-200 focus:border-blue-300"
                )}
              />

              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="shrink-0 rounded-[18px] border border-gray-200 bg-white px-3 py-4 text-xs font-extrabold text-gray-800 hover:bg-gray-50"
              >
                {showPass ? "Ocultar" : "Ver"}
              </button>
            </div>
          </FieldRow>

          <div className={cx("pl-[92px] text-[11px] font-bold", passwordOk ? "text-emerald-600" : "text-gray-500")}>
            {passwordHint(password)}
          </div>

          <FieldRow label="Confirmar">
            <div className="flex min-w-0 items-center gap-2">
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite tu contraseña"
                autoComplete="new-password"
                type={showConfirmPass ? "text" : "password"}
                className={cx(
                  "min-w-0 flex-1 rounded-[20px] border bg-slate-50 px-4 py-4 text-[15px] font-semibold text-slate-900 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:bg-white",
                  confirmPassword.length > 0 && !passwordsMatch
                    ? "border-red-300 bg-red-50 focus:border-red-400"
                    : "border-slate-200 focus:border-blue-300"
                )}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canSubmit) handleSubmit();
                }}
              />

              <button
                type="button"
                onClick={() => setShowConfirmPass((v) => !v)}
                className="shrink-0 rounded-[18px] border border-gray-200 bg-white px-3 py-4 text-xs font-extrabold text-gray-800 hover:bg-gray-50"
              >
                {showConfirmPass ? "Ocultar" : "Ver"}
              </button>
            </div>
          </FieldRow>

          {confirmPassword.length > 0 && !passwordsMatch ? (
            <div className="pl-[92px] text-[11px] font-bold text-red-600">Las contraseñas no coinciden.</div>
          ) : confirmPassword.length > 0 && passwordsMatch ? (
            <div className="pl-[92px] text-[11px] font-bold text-emerald-600">Contraseñas coinciden correctamente.</div>
          ) : null}

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
            onClick={handleSubmit}
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
    </div>
  );
}
