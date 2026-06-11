// components/buyer/useAuth.ts
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { logout } from "@/lib/authActions";

export type MeUser = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  nickname?: string | null;
  profileImageUrl?: string | null;
  role: "BUYER" | "STORE" | "DRIVER" | "ADMIN";
  isKronixPlusApproved?: boolean;
  kronixPlusStatus?: "NONE" | "PENDING" | "APPROVED" | "REJECTED" | string;
  kronixPlusApprovedAt?: string | null;
  defaultAddress?: string | null;
  defaultLat?: number | null;
  defaultLng?: number | null;
  mustChangePassword?: boolean;
};

function buildInitials(nameOrEmailOrPhone: string) {
  const s = String(nameOrEmailOrPhone || "").trim();
  if (!s) return "CT";
  const clean = s.replace(/[_\-.@]/g, " ").replace(/\s+/g, " ").trim();
  const parts = clean.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function useAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<MeUser | null>(null);

  const loadMe = useCallback(async () => {
    setIsLoading(true);
    try {
      const me = await apiFetch<MeUser>("/users/me", {
  method: "GET",
  suppressSessionExpiredEvent: true,
});
            const role = String(me?.role ?? "").toUpperCase();

      if (role !== "BUYER") {
        await logout();
        setUser(null);
        return;
      }

      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();

    const onChanged = () => loadMe();
    window.addEventListener("auth:changed", onChanged);

    const onFocus = () => loadMe();
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("auth:changed", onChanged);
      window.removeEventListener("focus", onFocus);
    };
  }, [loadMe]);

  const isAuthed = !!user?.id;

  const initials = useMemo(() => {
    if (!user) return "CT";
    const key =
      user.name ||
      (user.email ? user.email.split("@")[0] : "") ||
      user.phone ||
      "CT";
    return buildInitials(key);
  }, [user]);

  return { isLoading, isAuthed, user, initials, reload: loadMe };
}