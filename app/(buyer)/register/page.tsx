// app/(buyer)/register/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

export default function BuyerRegisterPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
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

  const passwordsMatch =
  password.trim().length > 0 &&
  confirmPassword.trim().length > 0 &&
  password === confirmPassword;

const canSubmit =
  phone.trim().length >= 7 &&
  password.trim().length >= 4 &&
  passwordsMatch &&
  termsAccepted &&
  !loading;

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    if (password !== confirmPassword) {
  setError("Las contraseñas no coinciden.");
  setLoading(false);
  return;
}
    try {
      await apiFetch("/auth/register", {
        method: "POST",
        json: {
          name: name.trim() || "Usuario",
          phone: phone.trim(),
          email: email.trim() || null,
          password: password.trim(),
          termsAccepted: true,
          termsVersion: "v1.0",
        },
      });

      // ✅ importante: refresca header/profile
      window.dispatchEvent(new Event("ct-auth-changed"));

      router.replace(next);
    } catch (e: any) {
      const msg = String(e?.message ?? "").toLowerCase();
      if (msg.includes("phone_already_used") || msg.includes("phone") && msg.includes("used")) {
        setError("Este teléfono ya está registrado.");
      } else if (msg.includes("email_already_used")) {
        setError("Este email ya está registrado.");
      } else {
        setError("No pudimos crear tu cuenta. Revisa tus datos e intenta de nuevo.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="px-4 pt-6 pb-6">
      <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-gradient-to-b from-gray-50 to-white p-4 border-b border-gray-100">
          <div className="text-[11px] font-extrabold text-gray-500">KroniX</div>
          <div className="mt-1 text-lg font-extrabold text-gray-900">Crear cuenta</div>
          <div className="mt-1 text-xs text-gray-600">
            Regístrate para guardar pedidos, direcciones y tu historial.
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <div className="text-xs font-extrabold text-gray-800">Nombre</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Blass"
              className={cx(
                "mt-2 w-full rounded-2xl border px-3 py-3 text-sm outline-none bg-gray-50",
                "border-gray-200 focus:bg-white focus:border-gray-300"
              )}
            />
          </div>

          <div>
            <div className="text-xs font-extrabold text-gray-800">Teléfono (obligatorio)</div>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ej: 3112461059"
              inputMode="tel"
              className={cx(
                "mt-2 w-full rounded-2xl border px-3 py-3 text-sm outline-none bg-gray-50",
                "border-gray-200 focus:bg-white focus:border-gray-300"
              )}
            />
          </div>

          <div>
            <div className="text-xs font-extrabold text-gray-800">Email (opcional)</div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ej: tu@email.com"
              autoComplete="email"
              className={cx(
                "mt-2 w-full rounded-2xl border px-3 py-3 text-sm outline-none bg-gray-50",
                "border-gray-200 focus:bg-white focus:border-gray-300"
              )}
            />
          </div>

          <div>
  <div className="text-xs font-extrabold text-gray-800">Contraseña</div>

  <div className="mt-2 flex items-center gap-2">
    <input
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      placeholder="Mínimo 4 caracteres"
      autoComplete="new-password"
      type={showPass ? "text" : "password"}
      className={cx(
        "flex-1 rounded-2xl border px-3 py-3 text-sm outline-none bg-gray-50 transition",
        password.length > 0 && !passwordsMatch && confirmPassword.length > 0
          ? "border-red-300 bg-red-50 focus:border-red-400"
          : "border-gray-200 focus:bg-white focus:border-gray-300"
      )}
    />

  <button
      type="button"
      onClick={() => setShowPass((v) => !v)}
      className={cx(
        "shrink-0 rounded-2xl border px-3 py-3 text-xs font-extrabold",
        "border-gray-200 bg-white text-gray-800 hover:bg-gray-50"
      )}
    >
      {showPass ? "Ocultar" : "Ver"}
    </button>
  </div>

  <div className="mt-4 text-xs font-extrabold text-gray-800">
    Confirmar contraseña
  </div>

  <div className="mt-2 flex items-center gap-2">
    <input
      value={confirmPassword}
      onChange={(e) => setConfirmPassword(e.target.value)}
      placeholder="Escribe nuevamente tu contraseña"
      autoComplete="new-password"
      type={showConfirmPass ? "text" : "password"}
      className={cx(
        "flex-1 rounded-2xl border px-3 py-3 text-sm outline-none bg-gray-50 transition",
        confirmPassword.length > 0 && !passwordsMatch
          ? "border-red-300 bg-red-50 focus:border-red-400"
          : "border-gray-200 focus:bg-white focus:border-gray-300"
      )}
      onKeyDown={(e) => {
        if (e.key === "Enter" && canSubmit) handleSubmit();
      }}
    />

    <button
      type="button"
      onClick={() => setShowConfirmPass((v) => !v)}
      className={cx(
        "shrink-0 rounded-2xl border px-3 py-3 text-xs font-extrabold",
        "border-gray-200 bg-white text-gray-800 hover:bg-gray-50"
      )}
    >
      {showConfirmPass ? "Ocultar" : "Ver"}
    </button>
  </div>

  {confirmPassword.length > 0 && !passwordsMatch ? (
    <div className="mt-2 text-xs font-bold text-red-600">
      Las contraseñas no coinciden.
    </div>
  ) : confirmPassword.length > 0 && passwordsMatch ? (
    <div className="mt-2 text-xs font-bold text-emerald-600">
      Contraseñas coinciden correctamente.
    </div>
  ) : null}
</div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
              {error}
            </div>
          ) : null}

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
  <label className="flex items-start gap-3 cursor-pointer">
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
      {showTermsModal ? (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 px-4 py-5 backdrop-blur-[2px]">
    <div className="relative flex max-h-[88dvh] w-[97%] max-w-[430px] flex-col overflow-hidden rounded-[26px] bg-white shadow-2xl ring-1 ring-white/60">
      <div className="relative overflow-hidden px-5 pb-12 pt-5 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-[#03102b] via-[#0b356d] via-55% to-white" />

        <div className="pointer-events-none absolute inset-0">
          <span className="absolute left-[14%] top-[24%] h-1 w-1 rounded-full bg-white/90" />
          <span className="absolute left-[34%] top-[38%] h-[3px] w-[3px] rounded-full bg-white/80" />
          <span className="absolute left-[64%] top-[22%] h-1 w-1 rounded-full bg-white/90" />
          <span className="absolute left-[82%] top-[36%] h-[3px] w-[3px] rounded-full bg-white/80" />
        </div>

        <div className="relative z-10 mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/45" />

        <button
          type="button"
          onClick={() => setShowTermsModal(false)}
          className="absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full bg-white/15 text-xl font-black text-white ring-1 ring-white/30 backdrop-blur hover:bg-white/25"
          aria-label="Cerrar términos"
        >
          ×
        </button>

        <div className="relative z-10 text-[15px] font-black leading-none text-white drop-shadow">
          Términos y Condiciones
        </div>
      </div>

      <div className="terms-scroll -mt-9 flex-1 overflow-y-auto rounded-t-[26px] bg-white px-5 pb-4 pt-5 text-slate-700">
        <div className="mb-4 flex items-center gap-3 rounded-[18px] border border-amber-200 bg-gradient-to-br from-amber-50 to-white px-3 py-3 shadow-sm">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-100 text-[22px] text-amber-600">
            ⚜
          </div>
          <div className="text-[12px] font-medium leading-5 text-amber-900">
            Al crear tu cuenta aceptas el uso de KroniX como plataforma tecnológica
            para conectar clientes, comercios y conductores aliados.
          </div>
        </div>

        <div className="divide-y divide-slate-200">
          {[
            {
              icon: "👥",
              title: "1. Naturaleza de la plataforma",
              text: "KroniX actúa como intermediario tecnológico para facilitar domicilios, compras, envíos, diligencias y servicios courier.",
              tone: "bg-blue-50 text-blue-600",
            },
            {
              icon: "🛡️",
              title: "2. Uso permitido",
              text: "El usuario se compromete a usar la plataforma de manera legal, segura y respetuosa, suministrando información real y actualizada.",
              tone: "bg-emerald-50 text-blue-600",
            },
            {
              icon: "🚙",
              title: "3. Transporte de personas",
              text: "Los servicios courier de KroniX están destinados al transporte de productos, paquetes, compras y diligencias. KroniX no autoriza el uso de estos servicios para transporte de pasajeros.",
              tone: "bg-sky-50 text-blue-600",
            },
            {
              icon: "💳",
              title: "4. Pagos, pedidos y cancelaciones",
              text: "Las tarifas pueden variar según ciudad, distancia, demanda, clima, disponibilidad operativa y tipo de servicio. Los pagos podrán procesarse mediante métodos autorizados por la plataforma.",
              tone: "bg-orange-50 text-orange-500",
            },
            {
              icon: "📍",
              title: "5. Geolocalización y notificaciones",
              text: "KroniX podrá usar ubicación GPS y notificaciones push para seguimiento de pedidos, seguridad, comunicación operativa y mejora del servicio.",
              tone: "bg-blue-50 text-blue-600",
            },
            {
              icon: "⚖️",
              title: "6. Responsabilidad",
              text: "KroniX no será responsable por actuaciones independientes de usuarios, comercios o conductores realizadas por fuera de las finalidades autorizadas en la plataforma.",
              tone: "bg-rose-50 text-rose-500",
            },
            {
              icon: "📄",
              title: "7. Actualizaciones",
              text: "KroniX podrá actualizar estos términos en cualquier momento. El uso continuo de la plataforma implica aceptación de las versiones vigentes.",
              tone: "bg-cyan-50 text-blue-600",
            },
          ].map((item) => (
            <section key={item.title} className="flex gap-3 py-4">
              <div
                className={[
                  "grid h-12 w-12 shrink-0 place-items-center rounded-[16px] text-[22px] ring-1 ring-black/5",
                  item.tone,
                ].join(" ")}
              >
                {item.icon}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-[14px] font-black leading-5 text-slate-950">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-[12.5px] font-medium leading-5 text-slate-600">
                  {item.text}
                </p>
              </div>
            </section>
          ))}
        </div>
      </div>

      <div className="bg-white px-5 pb-5 pt-3">
        <button
          type="button"
          onClick={() => {
            setTermsAccepted(true);
            setShowTermsModal(false);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-[18px] bg-gradient-to-r from-green-500 to-emerald-600 py-3.5 text-[14px] font-black text-white shadow-lg shadow-emerald-500/25 active:scale-[0.98]"
        >
          <span className="grid h-5 w-5 place-items-center rounded-full bg-white/20 text-xs">
            ✓
          </span>
          Aceptar y cerrar
        </button>
      </div>
    </div>
  </div>
) : null}
    </div>
  );
}
