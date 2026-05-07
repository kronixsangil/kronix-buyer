// components/buyer/SessionExpiredModal.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/lib/authActions";

function isAuthRoute(pathname: string) {
  return (
    pathname === "/login" ||
    pathname.startsWith("/login?") ||
    pathname === "/register" ||
    pathname.startsWith("/register?") ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/forgot-password?")
  );
}

export default function SessionExpiredModal() {
  const router = useRouter();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onExpired = () => {
      if (isAuthRoute(pathname)) return;
      setOpen(true);
    };

    window.addEventListener("auth:session-expired", onExpired as EventListener);

    return () => {
      window.removeEventListener("auth:session-expired", onExpired as EventListener);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pathname]);

  useEffect(() => {
    if (!open || busy) return;

    timerRef.current = setTimeout(() => {
      handleAccept();
    }, 1200);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [open, busy]);

  async function handleAccept() {
    if (busy) return;
    setBusy(true);

    try {
      await logout();
    } finally {
      setOpen(false);
      setBusy(false);

      const next = pathname || "/";
      router.replace(`/login?reason=session-expired&next=${encodeURIComponent(next)}`);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl ring-1 ring-gray-200">
        <div className="text-base font-extrabold text-gray-900">Sesión expirada</div>
        <div className="mt-2 text-sm text-gray-700">
          Tu sesión se venció por seguridad. Serás redirigido para iniciar sesión nuevamente.
        </div>

        <button
          type="button"
          onClick={handleAccept}
          disabled={busy}
          className="mt-4 w-full rounded-2xl bg-green-600 py-3 text-sm font-extrabold text-white hover:bg-green-700 disabled:opacity-60"
        >
          {busy ? "Cerrando sesión…" : "Aceptar"}
        </button>
      </div>
    </div>
  );
}