// app/(buyer)/profile/info/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "@/lib/authClient";
import { apiFetch } from "@/lib/api";
import { geocodeAddressOSMInCity } from "@/lib/geocode";
import { useBuyerCity } from "@/components/buyer/CityContext";

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

function initialsOf(name?: string | null, email?: string | null) {
  const base = String(name || "").trim() || String(email || "").split("@")[0] || "";
  const parts = base
    .replace(/[._-]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const a = parts[0]?.[0] ?? "U";
  const b = parts.length > 1 ? parts[1]?.[0] : parts[0]?.[1];
  return (a + (b ?? "")).toUpperCase();
}

function normalizeProfileImageUrl(value?: string | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) return raw;
  if (raw.startsWith("/api/")) return raw;
  if (raw.startsWith("/")) return `/api/buyer${raw}`;
  return raw;
}

type SessionMeShape = {
  user?: {
    sub?: string;
    role?: string;
    email?: string | null;
    phone?: string | null;
    name?: string | null;
    nickname?: string | null;
    profileImageUrl?: string | null;
  };
};

type CustomerBehaviorIndicator = {
  totalEvaluatedServices: number;
  completedServices: number;
  customerCancelledServices: number;
  pointsEarned: number;
  pointsPossible: number;
  reliabilityPct: number | null;
  rating: number | null;
  level: "NEW" | "DEVELOPING" | "RELIABLE" | "VERY_RELIABLE";
  levelLabel: string;
  hasEnoughHistory: boolean;
};

type ApiMe = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  nickname: string | null;
  profileImageUrl?: string | null;
  role?: string | null;
  defaultAddress?: string | null;
  defaultLat?: number | null;
  defaultLng?: number | null;
  createdAt?: string | Date | null;
  storeId?: string | null;
  store?: { id: string; storeCode: string; name: string } | null;
  customerBehavior?: CustomerBehaviorIndicator | null;
};

type SavedAddressItem = {
  id: string;
  label?: string | null;
  placeName?: string | null;
  address: string;
  reference?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  lat?: number | null;
  lng?: number | null;
  isDefault: boolean;
  isFavorite?: boolean;
  updatedAt: string;
};

const inputClass =
  "w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-[15px] font-semibold text-slate-900 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-blue-300 focus:bg-white";

function HelpTip({ text }: { text: string }) {
  return (
    <button
      type="button"
      title={text}
      onClick={() => window.alert(text)}
      className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-blue-100 bg-blue-50 text-[12px] font-black text-blue-700"
      aria-label="Ayuda"
    >
      ?
    </button>
  );
}

function FieldRow({
  label,
  help,
  children,
  align = "center",
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
  align?: "center" | "start";
}) {
  return (
    <div className={cx("grid grid-cols-[82px_1fr_28px] gap-2", align === "start" ? "items-start" : "items-center")}>
      <label className={cx("text-xs font-extrabold text-slate-900", align === "start" ? "pt-3" : "")}>{label}</label>
      {children}
      {help ? <HelpTip text={help} /> : <span />}
    </div>
  );
}

function formatPhone(value: string) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 15);
}

export default function InfoPage() {
  const router = useRouter();
  const { citySlug, cityLabel, cityGeoLabel, cityReady } = useBuyerCity();

  const [checking, setChecking] = useState(true);
  const [session, setSession] = useState<SessionMeShape | null>(null);
  const [profile, setProfile] = useState<ApiMe | null>(null);

  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [primaryAddress, setPrimaryAddress] = useState("");
  const [primaryReference, setPrimaryReference] = useState("");
  const [primaryAddressId, setPrimaryAddressId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const email = profile?.email ?? session?.user?.email ?? null;
  const phone = profile?.phone ?? session?.user?.phone ?? null;

  const avatar = useMemo(
    () => initialsOf(profile?.name ?? session?.user?.name, email),
    [profile?.name, session?.user?.name, email]
  );

  const avatarSrc = normalizeProfileImageUrl(profileImageUrl);

  async function fetchProfile() {
    try {
      const j = await apiFetch<ApiMe>("/users/me", { method: "GET", cache: "no-store" });
      return { ok: true as const, kind: "OK" as const, data: j };
    } catch (e: any) {
      const status = Number(e?.status ?? 0);

      if (status === 401 || status === 403) {
        return { ok: false as const, kind: "AUTH" as const, data: null as any };
      }

      const detail = String(e?.message ?? "").trim();
      return {
        ok: false as const,
        kind: "ERR" as const,
        data: detail ? detail : "No pudimos cargar tu información. Intenta de nuevo.",
      };
    }
  }

  async function fetchPrimaryAddress() {
    if (!citySlug) return null;

    try {
      const list = await apiFetch<SavedAddressItem[]>(
        `/users/me/addresses?citySlug=${encodeURIComponent(citySlug)}`,
        { method: "GET", cache: "no-store", suppressSessionExpiredEvent: true }
      );

      const rows = Array.isArray(list) ? list : [];
      return (
        rows.find((x) => x.isDefault) ??
        rows.find((x) => x.isFavorite) ??
        rows[0] ??
        null
      );
    } catch {
      return null;
    }
  }

  useEffect(() => {
    let alive = true;
    setChecking(true);

    (async () => {
      try {
        const out = (await getMe()) as SessionMeShape | null;
        if (!alive) return;

        if (!out?.user?.sub) {
          router.replace(`/login?next=${encodeURIComponent("/profile/info")}`);
          return;
        }

        setSession(out);

        const prof = await fetchProfile();
        if (!alive) return;

        if (!prof.ok && prof.kind === "AUTH") {
          router.replace(`/login?next=${encodeURIComponent("/profile/info")}`);
          return;
        }

        if (!prof.ok) {
          setMsg({ kind: "err", text: String(prof.data ?? "No pudimos cargar tu información.") });
          setProfile(null);
          setName(String(out.user?.name ?? "").trim());
          setNickname(String(out.user?.nickname ?? "").trim());
          setProfileImageUrl(String((out.user as any)?.profileImageUrl ?? "").trim());
        } else {
          setProfile(prof.data);
          setName(String(prof.data?.name ?? "").trim());
          setNickname(String(prof.data?.nickname ?? "").trim());
          setProfileImageUrl(String(prof.data?.profileImageUrl ?? "").trim());
        }

        if (cityReady && citySlug) {
          const primary = await fetchPrimaryAddress();
          if (!alive) return;

          if (primary) {
            setPrimaryAddressId(primary.id);
            setPrimaryAddress(String(primary.address ?? "").trim());
            setPrimaryReference(String(primary.reference ?? "").trim());
          } else {
            setPrimaryAddressId(null);
            setPrimaryAddress("");
          }
        }
      } finally {
        if (!alive) return;
        setChecking(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, cityReady, citySlug]);

  const canSave = !saving && !checking && !uploadingPhoto;

  async function handlePhotoFile(file: File | null) {
    if (!file) return;

    setMsg(null);

    const isImage =
      String(file.type || "").startsWith("image/") ||
      /\.(jpg|jpeg|png|webp|heic|heif)$/i.test(String(file.name || ""));

    if (!isImage) {
      setMsg({ kind: "err", text: "Selecciona una imagen válida." });
      return;
    }

    const maxMb = 5;
    if (file.size > maxMb * 1024 * 1024) {
      setMsg({ kind: "err", text: `La foto no puede pesar más de ${maxMb} MB.` });
      return;
    }

    setUploadingPhoto(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploaded = await apiFetch<{ ok: boolean; profileImageUrl: string }>("/users/me/profile-photo", {
        method: "POST",
        body: formData,
        cache: "no-store",
      });

      const nextUrl = String(uploaded?.profileImageUrl ?? "").trim();

      setProfileImageUrl(nextUrl);
      setProfile((prev) => (prev ? { ...prev, profileImageUrl: nextUrl } : prev));

      window.dispatchEvent(new Event("auth:changed"));
      window.dispatchEvent(new Event("ct-auth-changed"));

      setMsg({ kind: "ok", text: "Foto actualizada correctamente." });
    } catch (e: any) {
      const detail = String(e?.message ?? "").trim();
      setMsg({ kind: "err", text: detail || "No pudimos subir la foto. Intenta de nuevo." });
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function removePhoto() {
    if (uploadingPhoto || saving) return;

    setMsg(null);
    setSaving(true);

    try {
      const updated = await apiFetch<Partial<ApiMe>>("/users/me", {
        method: "PATCH",
        cache: "no-store",
        json: {
          name: name.trim() || null,
          nickname: nickname.trim() || null,
          profileImageUrl: null,
        },
      });

      setProfileImageUrl("");
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              name: updated.name ?? prev.name,
              nickname: updated.nickname ?? prev.nickname,
              profileImageUrl: null,
            }
          : prev
      );

      window.dispatchEvent(new Event("auth:changed"));
      window.dispatchEvent(new Event("ct-auth-changed"));

      setMsg({ kind: "ok", text: "Foto removida correctamente." });
    } catch (e: any) {
      const detail = String(e?.message ?? "").trim();
      setMsg({ kind: "err", text: detail || "No pudimos quitar la foto." });
    } finally {
      setSaving(false);
    }
  }

  async function upsertPrimaryAddress() {
    if (!citySlug) throw new Error("No se encontró ciudad activa.");

    const cleanAddress = primaryAddress.trim();
    if (cleanAddress.length < 8) {
      throw new Error("La dirección principal es obligatoria y debe estar más completa.");
    }

    const geo = await geocodeAddressOSMInCity(cleanAddress, cityGeoLabel);

    if (!geo) {
      throw new Error(
        `No pudimos ubicar tu dirección principal en ${cityLabel}. Revisa que esté bien escrita e intenta de nuevo.`
      );
    }

    if (primaryAddressId) {
      try {
        await apiFetch(`/users/me/addresses/${primaryAddressId}`, {
          method: "DELETE",
          suppressSessionExpiredEvent: true,
        });
      } catch {}
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
        contactPhone: formatPhone(String(phone ?? "")) || null,
        lat: geo.lat,
        lng: geo.lng,
        isDefault: true,
        isFavorite: true,
      },
    } as any);

    const freshPrimary = await fetchPrimaryAddress();
    setPrimaryAddressId(freshPrimary?.id ?? null);
    setPrimaryAddress(String(freshPrimary?.address ?? cleanAddress).trim());
  }

  async function handleSave() {
    if (!canSave) return;

    setMsg(null);
    setSaving(true);

    try {
      if (!cityReady || !citySlug) {
        throw new Error("La ciudad actual aún no está lista. Intenta de nuevo en un momento.");
      }

      const updated = await apiFetch<Partial<ApiMe>>("/users/me", {
        method: "PATCH",
        cache: "no-store",
        json: {
          name: name.trim() || null,
          nickname: nickname.trim() || null,
        },
      });

      await upsertPrimaryAddress();

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              name: updated.name ?? prev.name,
              nickname: updated.nickname ?? prev.nickname,
              email: updated.email ?? prev.email,
              phone: updated.phone ?? prev.phone,
              profileImageUrl:
                updated.profileImageUrl !== undefined ? updated.profileImageUrl : prev.profileImageUrl,
            }
          : (updated as ApiMe)
      );

      setName(String(updated?.name ?? name).trim());
      setNickname(String(updated?.nickname ?? nickname).trim());

      const prof = await fetchProfile();
      if (prof.ok) {
        setProfile(prof.data);
        setName(String(prof.data?.name ?? "").trim());
        setNickname(String(prof.data?.nickname ?? "").trim());
        setProfileImageUrl(String(prof.data?.profileImageUrl ?? "").trim());
      }

      window.dispatchEvent(new Event("auth:changed"));
      window.dispatchEvent(new Event("ct-auth-changed"));

      setMsg({ kind: "ok", text: "Cambios guardados." });
      setSaving(false);
    } catch (e: any) {
      const status = Number(e?.status ?? 0);

      if (status === 401 || status === 403) {
        setMsg({ kind: "err", text: "Tu sesión expiró. Por favor inicia sesión de nuevo." });
        setSaving(false);
        router.replace(`/login?next=${encodeURIComponent("/profile/info")}`);
        return;
      }

      const detail = String(e?.message ?? "").trim();
      setMsg({
        kind: "err",
        text: detail ? `No pudimos guardar: ${detail}` : "No pudimos guardar cambios. Intenta de nuevo.",
      });
      setSaving(false);
    }
  }

  const customerBehavior = profile?.customerBehavior ?? null;

  const reliabilityText =
    customerBehavior?.reliabilityPct != null
      ? `${customerBehavior.reliabilityPct.toFixed(1)}%`
      : "Sin historial";

  const ratingText =
    customerBehavior?.rating != null
      ? `${customerBehavior.rating.toFixed(2)} / 5`
      : "Sin historial";

  function behaviorTone() {
    if (customerBehavior?.level === "VERY_RELIABLE") return "border-emerald-200 bg-emerald-50 text-emerald-800";
    if (customerBehavior?.level === "RELIABLE") return "border-blue-200 bg-blue-50 text-blue-800";
    if (customerBehavior?.level === "DEVELOPING") return "border-amber-200 bg-amber-50 text-amber-800";
    return "border-slate-200 bg-slate-50 text-slate-700";
  }

  function AvatarBox({ size = 48 }: { size?: number }) {
    return (
      <div
        className="overflow-hidden rounded-2xl bg-gray-900 text-white font-extrabold"
        style={{ width: size, height: size }}
      >
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt="Foto de perfil"
            className="block h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center">{avatar}</div>
        )}
      </div>
    );
  }

  if (checking) {
    return (
      <div className="px-4 pb-6 pt-4">
        <div className="text-lg font-extrabold text-gray-900">Tu información</div>

        <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3 ">
            <div className="h-12 w-12 rounded-2xl bg-gray-100 ring-1 ring-gray-200 animate-pulse" />
            <div className="min-w-0 flex-1">
              <div className="h-4 w-40 rounded bg-gray-100 animate-pulse" />
              <div className="mt-2 h-3 w-56 rounded bg-gray-100 animate-pulse" />
            </div>
          </div>

          <div className="mt-4 space-y-1.5">
            <div className="h-11 w-full rounded-2xl bg-gray-100 animate-pulse" />
            <div className="h-11 w-full rounded-2xl bg-gray-100 animate-pulse" />
            <div className="h-11 w-full rounded-2xl bg-gray-100 animate-pulse" />
            <div className="h-11 w-full rounded-2xl bg-gray-100 animate-pulse" />
          </div>

          <div className="mt-4 h-11 w-full rounded-2xl bg-gray-100 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-6 pt-2">
      <div className="text-lg font-extrabold text-gray-900">Tu información</div>
      <div className="mt-1 text-xs text-gray-600">Datos personales y preferencias</div>

      <div className="mt-3 rounded-3xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="flex items-center gap-3">
          <AvatarBox size={48} />

          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-extrabold text-gray-900">
              {name.trim() ? name.trim() : "Tu nombre"}
            </div>
            <div className="truncate text-xs text-gray-600">
              {email ? email : phone ? phone : "Cuenta"}
            </div>
          </div>

          <div className="shrink-0 text-xs font-extrabold text-emerald-700">En línea</div>
        </div>
      </div>

      <div className="mt-2 rounded-3xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-extrabold text-slate-900">Indicador de comportamiento</div>
            <div className="mt-1 text-[11px] leading-4 text-slate-500">
              Se calcula automáticamente con servicios finalizados y cancelaciones hechas por el cliente.
            </div>
          </div>
          <span className={cx("shrink-0 rounded-full border px-3 py-1 text-[11px] font-extrabold", behaviorTone())}>
            {customerBehavior?.levelLabel ?? "Cliente nuevo"}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
            <div className="text-[10px] font-bold uppercase text-emerald-700">Confiabilidad</div>
            <div className="mt-1 text-2xl font-black text-emerald-900">{reliabilityText}</div>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
            <div className="text-[10px] font-bold uppercase text-amber-700">Calificación</div>
            <div className="mt-1 text-2xl font-black text-amber-900">⭐ {ratingText}</div>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
            <div className="text-lg font-black">{customerBehavior?.totalEvaluatedServices ?? 0}</div>
            <div className="text-[10px] font-bold text-slate-500">Contabilizados</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
            <div className="text-lg font-black text-emerald-700">{customerBehavior?.completedServices ?? 0}</div>
            <div className="text-[10px] font-bold text-slate-500">Efectivos</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
            <div className="text-lg font-black text-amber-700">{customerBehavior?.customerCancelledServices ?? 0}</div>
            <div className="text-[10px] font-bold text-slate-500">Cancelados</div>
          </div>
        </div>

        <div className="mt-2 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] leading-4 text-blue-800">
          Puntos: <b>{customerBehavior?.pointsEarned ?? 0}</b> de{" "}
          <b>{customerBehavior?.pointsPossible ?? 0}</b>. Cada servicio efectivo suma 5 puntos y cada cancelación del cliente suma 3.
        </div>
      </div>

      <div className="mt-2 rounded-3xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="text-xs font-extrabold text-gray-800">Foto de perfil</div>

        <div className="mt-2 flex items-center gap-3">
          <AvatarBox size={64} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-2">
              <label
                className={cx(
                  "relative inline-flex cursor-pointer overflow-hidden rounded-2xl px-4 py-3 text-xs font-extrabold text-white active:scale-[0.99]",
                  uploadingPhoto ? "pointer-events-none bg-slate-900 opacity-60" : "bg-slate-900"
                )}
              >
                Elegir foto
                <input
                  type="file"
                  accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif"
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  onChange={(e) => handlePhotoFile(e.currentTarget.files?.[0] ?? null)}
                />
              </label>

              <label
                className={cx(
                  "relative inline-flex cursor-pointer overflow-hidden rounded-2xl px-4 py-3 text-xs font-extrabold text-white active:scale-[0.99]",
                  uploadingPhoto ? "pointer-events-none bg-emerald-600 opacity-60" : "bg-emerald-600"
                )}
              >
                Tomar foto
                <input
                  type="file"
                  accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif"
                  capture="user"
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  onChange={(e) => handlePhotoFile(e.currentTarget.files?.[0] ?? null)}
                />
              </label>

              {profileImageUrl ? (
                <button
                  type="button"
                  onClick={removePhoto}
                  disabled={uploadingPhoto || saving}
                  className="rounded-2xl border border-gray-200 px-4 py-3 text-xs font-extrabold text-gray-700 disabled:opacity-60"
                >
                  Quitar
                </button>
              ) : null}
            </div>

            <div className="mt-2 text-[11px] text-gray-500">
              {uploadingPhoto
                ? "Subiendo foto…"
                : "La foto se guarda automáticamente al elegirla o tomarla."}
            </div>
          </div>
        </div>
      </div>

      {msg ? (
        <div
          className={cx(
            "mt-2 rounded-2xl border p-3 text-xs font-bold",
            msg.kind === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          )}
        >
          {msg.text}
        </div>
      ) : null}

      <div className="mt-2 rounded-3xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="space-y-2">
          <FieldRow label="Nombre" help="Este nombre se mostrará en tu perfil.">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Blass Murillo"
              className={inputClass}
            />
          </FieldRow>

          <FieldRow label="Apodo" help="Útil para que te identifiquen más rápido.">
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Opcional"
              className={inputClass}
            />
          </FieldRow>

          <FieldRow label="Email" help="Por ahora este dato se cambia desde Soporte.">
            <input
              value={email ?? ""}
              readOnly
              placeholder="—"
              className={inputClass}
            />
          </FieldRow>

          <FieldRow label="Teléfono" help="Se usa para seguridad y confirmaciones.">
            <input
              value={phone ?? ""}
              readOnly
              placeholder="—"
              className={inputClass}
            />
          </FieldRow>

          <FieldRow
            label="Dirección"
            help="Esta dirección quedará como predeterminada y favorita en tus direcciones guardadas."
            align="start"
          >
            <textarea
              value={primaryAddress}
              onChange={(e) => setPrimaryAddress(e.target.value)}
              placeholder={`Dirección principal en ${cityLabel || "tu ciudad"} *`}
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </FieldRow>

          <FieldRow
  label="Referencia"
  help="Ayuda al repartidor a encontrarte más fácilmente."
  align="start"
>
  <textarea
    value={primaryReference}
    onChange={(e) => setPrimaryReference(e.target.value)}
    placeholder="Ej: Frente al parque, portón negro, apto 302..."
    rows={2}
    className={`${inputClass} resize-none`}
  />
</FieldRow>

        </div>
      </div>

      <button
        type="button"
        disabled={!canSave}
        onClick={handleSave}
        className={cx(
          "mt-2 w-full rounded-2xl py-3 text-sm font-extrabold text-white",
          "bg-green-600 hover:bg-green-700 disabled:opacity-50"
        )}
      >
        {saving ? "Guardando…" : "Guardar cambios"}
      </button>
    </div>
  );
}
