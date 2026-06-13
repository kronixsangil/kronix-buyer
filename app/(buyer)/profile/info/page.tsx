// app/(buyer)/profile/info/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "@/lib/authClient";
import { apiFetch } from "@/lib/api";

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
};

export default function InfoPage() {
  const router = useRouter();
  const chooseInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const [checking, setChecking] = useState(true);
  const [session, setSession] = useState<SessionMeShape | null>(null);
  const [profile, setProfile] = useState<ApiMe | null>(null);

  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");

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
          return;
        }

        setProfile(prof.data);
        setName(String(prof.data?.name ?? "").trim());
        setNickname(String(prof.data?.nickname ?? "").trim());
        setProfileImageUrl(String(prof.data?.profileImageUrl ?? "").trim());
      } finally {
        if (!alive) return;
        setChecking(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [router]);

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

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("auth:changed"));
        window.dispatchEvent(new Event("ct-auth-changed"));
      }

      setMsg({ kind: "ok", text: "Foto actualizada correctamente." });
    } catch (e: any) {
      const detail = String(e?.message ?? "").trim();
      setMsg({ kind: "err", text: detail || "No pudimos subir la foto. Intenta de nuevo." });
    } finally {
      setUploadingPhoto(false);
      if (chooseInputRef.current) chooseInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
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

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("auth:changed"));
        window.dispatchEvent(new Event("ct-auth-changed"));
      }

      setMsg({ kind: "ok", text: "Foto removida correctamente." });
    } catch (e: any) {
      const detail = String(e?.message ?? "").trim();
      setMsg({ kind: "err", text: detail || "No pudimos quitar la foto." });
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    if (!canSave) return;

    setMsg(null);
    setSaving(true);

    try {
      const updated = await apiFetch<Partial<ApiMe>>("/users/me", {
        method: "PATCH",
        cache: "no-store",
        json: {
          name: name.trim() || null,
          nickname: nickname.trim() || null,
        },
      });

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

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("auth:changed"));
        window.dispatchEvent(new Event("ct-auth-changed"));
      }

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
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gray-100 ring-1 ring-gray-200 animate-pulse" />
            <div className="min-w-0 flex-1">
              <div className="h-4 w-40 rounded bg-gray-100 animate-pulse" />
              <div className="mt-2 h-3 w-56 rounded bg-gray-100 animate-pulse" />
            </div>
          </div>

          <div className="mt-4 space-y-3">
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
    <div className="px-4 pb-6 pt-4">
      <div className="text-lg font-extrabold text-gray-900">Tu información</div>
      <div className="mt-1 text-xs text-gray-600">Datos personales y preferencias</div>

      <div className="mt-4 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
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

      <div className="mt-4 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="text-xs font-extrabold text-gray-800">Foto de perfil</div>

        <div className="mt-3 flex items-center gap-3">
          <AvatarBox size={64} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => chooseInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="rounded-2xl bg-slate-900 px-4 py-3 text-xs font-extrabold text-white active:scale-[0.99] disabled:opacity-60"
              >
                Elegir foto
              </button>

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="rounded-2xl bg-emerald-600 px-4 py-3 text-xs font-extrabold text-white active:scale-[0.99] disabled:opacity-60"
              >
                Tomar foto
              </button>

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

            <input
              ref={chooseInputRef}
              type="file"
              accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif"
              className="hidden"
              onChange={(e) => handlePhotoFile(e.currentTarget.files?.[0] ?? null)}
            />

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif"
              capture="user"
              className="hidden"
              onChange={(e) => handlePhotoFile(e.currentTarget.files?.[0] ?? null)}
            />

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
            "mt-3 rounded-2xl border p-3 text-xs font-bold",
            msg.kind === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          )}
        >
          {msg.text}
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-extrabold text-gray-800">Nombre</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Blass Murillo"
            className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm outline-none focus:bg-white focus:border-gray-300"
          />
          <div className="mt-1 text-[11px] text-gray-500">Este nombre se mostrará en tu perfil.</div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-extrabold text-gray-800">Apodo (opcional)</div>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Ej: Chucho"
            className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm outline-none focus:bg-white focus:border-gray-300"
          />
          <div className="mt-1 text-[11px] text-gray-500">Útil para que te identifiquen más rápido.</div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-extrabold text-gray-800">Email</div>
          <input
            value={email ?? ""}
            readOnly
            placeholder="—"
            className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700 outline-none"
          />
          <div className="mt-1 text-[11px] text-gray-500">Por ahora este dato se cambia desde Soporte.</div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-extrabold text-gray-800">Teléfono</div>
          <input
            value={phone ?? ""}
            readOnly
            placeholder="—"
            className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700 outline-none"
          />
          <div className="mt-1 text-[11px] text-gray-500">Se usa para seguridad y confirmaciones.</div>
        </div>

        <button
          type="button"
          disabled={!canSave}
          onClick={handleSave}
          className={cx(
            "w-full rounded-2xl py-3 text-sm font-extrabold text-white",
            "bg-green-600 hover:bg-green-700 disabled:opacity-50"
          )}
        >
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}
