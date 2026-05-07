//app/(buyer)/profile/privacy/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { logout } from "@/lib/authActions";

function Row({
  title,
  desc,
  onClick,
  danger = false,
}: {
  title: string;
  desc: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-2xl border p-4 shadow-sm transition
      ${
        danger
          ? "border-red-200 bg-white hover:bg-red-50"
          : "border-gray-200 bg-white hover:bg-gray-50"
      }`}
    >
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-gray-50 ring-1 ring-gray-200">
        <span className="text-lg">⚙️</span>
      </div>

      <div className="min-w-0 flex-1 text-left">
        <div
          className={`text-sm font-extrabold ${
            danger ? "text-red-600" : "text-gray-900"
          }`}
        >
          {title}
        </div>
        <div className="mt-1 text-xs text-gray-600">{desc}</div>
      </div>

      <div className="text-gray-400">›</div>
    </button>
  );
}

export default function PrivacyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCancelAccount() {
    const confirm1 = confirm(
      "¿Estás seguro de que deseas cancelar tu cuenta?\n\nEsta acción eliminará tus datos y no se puede deshacer."
    );
    if (!confirm1) return;

    const confirm2 = confirm(
      "Confirmación final:\n\nTu cuenta será eliminada permanentemente.\n¿Continuar?"
    );
    if (!confirm2) return;

    try {
      setLoading(true);

      // ✅ IMPORTANTE: usar apiFetch para respetar x-ct-app + cookies
      await apiFetch("/users/me", { method: "DELETE" });

      // ✅ Cierra sesión bien (backend + limpia caches locales)
      await logout();

      // ✅ avisa a UI
      window.dispatchEvent(new Event("ct-auth-changed"));
      window.dispatchEvent(new Event("auth:changed"));

      router.replace("/");
    } catch (e: any) {
      alert(e?.message || "No pudimos cancelar la cuenta. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-4 pb-6 pt-4">
      <div className="text-lg font-extrabold text-gray-900">
        Gestiona la privacidad de tu cuenta
      </div>

      {/* PDF */}
      <a
        href="/privacy/KroniX-Politica-de-Privacidad-v1.pdf"
        target="_blank"
        rel="noreferrer"
        className="mt-4 block overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm hover:bg-gray-50"
      >
        <div className="p-4">
          <div className="text-sm font-extrabold text-gray-900">
            Política de Privacidad (PDF)
          </div>
          <div className="mt-1 text-xs text-gray-600">
            Consulta el documento oficial completo.
          </div>

          <div className="mt-3 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-emerald-500 p-4 text-white">
            <div className="text-lg font-extrabold">KroniX</div>
            <div className="text-xs opacity-90">
              Política de Privacidad • Versión v1
            </div>
            <div className="mt-3 inline-flex rounded-xl bg-white/20 px-3 py-2 text-xs font-extrabold">
              Abrir PDF
            </div>
          </div>
        </div>
      </a>

      {/* Cancel account */}
      <div className="mt-4">
        <Row
          title={loading ? "Cancelando cuenta..." : "Cancelar cuenta"}
          desc="Eliminar permanentemente tu cuenta y datos personales."
          onClick={loading ? undefined : handleCancelAccount}
          danger
        />
      </div>

      <div className="mt-6 text-center text-[11px] text-blue-700">
        <Link href="/" className="hover:underline">
          Conoce más sobre cómo cuidamos tu privacidad.
        </Link>
      </div>
    </div>
  );
}