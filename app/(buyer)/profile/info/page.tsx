// app/(buyer)/profile/info/page.tsx
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

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result ?? "");
      if (!result.startsWith("data:")) {
        reject(new Error("No pudimos leer la foto."));
        return;
      }

      resolve(result);
    };

    reader.onerror = () => reject(new Error("No pudimos leer la foto."));
    reader.readAsDataURL(file);
  });
}

async function compressDataUrlForDatabase(file: File): Promise<string> {
  const rawDataUrl = await fileToDataUrl(file);

  const isProbablyImage =
    rawDataUrl.startsWith("data:image/") ||
    String(file.type || "").startsWith("image/") ||
    /\.(jpg|jpeg|png|webp|heic|heif)$/i.test(String(file.name || ""));

  if (!isProbablyImage) {
    throw new Error("Selecciona una imagen válida.");
  }

  if (rawDataUrl.length <= 700_000) return rawDataUrl;

  const objectUrl = URL.createObjectURL(file);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = document.createElement("img");
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("No pudimos procesar la foto. Intenta con una imagen JPG o PNG."));
      el.src = objectUrl;
    });

    const srcW = img.naturalWidth || img.width;
    const srcH = img.naturalHeight || img.height;

    if (!srcW || !srcH) {
      throw new Error("La foto no tiene dimensiones válidas.");
    }

    const cropSize = Math.min(srcW, srcH);
    const sx = Math.max(0, Math.floor((srcW - cropSize) / 2));
    const sy = Math.max(0, Math.floor((srcH - cropSize) / 2));

    const outputSize = 420;
    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Tu navegador no permitió procesar la foto.");
    }

    ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, outputSize, outputSize);

    let quality = 0.7;
    let dataUrl = canvas.toDataURL("image/jpeg", quality);

    while (dataUrl.length > 700_000 && quality > 0.35) {
      quality -= 0.08;
      dataUrl = canvas.toDataURL("image/jpeg", quality);
    }

    if (dataUrl.length > 800_000) {
      throw new Error("La foto quedó muy pesada. Intenta con otra imagen.");
    }

    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function InfoPage() {
  const router = useRouter();
  const chooseInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const previewObjectUrlRef = useRef<string>("");

  const [checking, setChecking] = useState(true);
  const [session, setSession] = useState<SessionMeShape | null>(null);
  const [profile, setProfile] = useState<ApiMe | null>(null);

  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");

  // Valor que se guarda en API / Neon.
  const [profileImageUrl, setProfileImageUrl] = useState("");

  // Valor que se ve en pantalla inmediatamente. Para fotos nuevas usamos objectURL.
  const [previewSrc, setPreviewSrc] = useState("");

  const [saving, setSaving] = useState(false);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const email = profile?.email ?? session?.user?.email ?? null;
  const phone = profile?.phone ?? session?.user?.phone ?? null;

  const avatar = useMemo(
    () => initialsOf(profile?.name ?? session?.user?.name, email),
    [profile?.name, session?.user?.name, email]
  );

  useEffect(() => {
    return () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
        previewObjectUrlRef.current = "";
      }
    };
  }, []);

  function clearPreviewObjectUrl() {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = "";
    }
  }

  function setPreviewFromSaved(value: string) {
    clearPreviewObjectUrl();
    setPreviewSrc(value);
  }

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
          const fallbackImage = String((out.user as any)?.profileImageUrl ?? "").trim();

          setMsg({ kind: "err", text: String(prof.data ?? "No pudimos cargar tu información.") });
          setProfile(null);
          setName(String(out.user?.name ?? "").trim());
          setNickname(String(out.user?.nickname ?? "").trim());
          setProfileImageUrl(fallbackImage);
          setPreviewFromSaved(fallbackImage);
          return;
        }

        const savedImage = String(prof.data?.profileImageUrl ?? "").trim();

        setProfile(prof.data);
        setName(String(prof.data?.name ?? "").trim());
        setNickname(String(prof.data?.nickname ?? "").trim());
        setProfileImageUrl(savedImage);
        setPreviewFromSaved(savedImage);
      } finally {
        if (!alive) return;
        setChecking(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  const canSave = !saving && !checking && !processingPhoto;

  async function handlePhotoInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0] ?? null;

    setMsg(null);

    if (!file) {
      input.value = "";
      return;
    }

    const isProbablyImage =
      String(file.type || "").startsWith("image/") ||
      /\.(jpg|jpeg|png|webp|heic|heif)$/i.test(String(file.name || ""));

    if (!isProbablyImage) {
      setMsg({ kind: "err", text: "Selecciona una imagen válida." });
      input.value = "";
      return;
    }

    clearPreviewObjectUrl();

    const objectUrl = URL.createObjectURL(file);
    previewObjectUrlRef.current = objectUrl;

    // Primero mostramos la foto real inmediatamente, sin esperar canvas/base64.
    setPreviewSrc(objectUrl);
    setMsg({
      kind: "ok",
      text: `Foto recibida: ${file.name || "cámara"} (${Math.round(file.size / 1024)} KB). Procesando...`,
    });

    setProcessingPhoto(true);

    try {
      const dataUrl = await compressDataUrlForDatabase(file);

      // Este es el valor que se enviará al PATCH /users/me.
      setProfileImageUrl(dataUrl);
      setProfile((prev) => (prev ? { ...prev, profileImageUrl: dataUrl } : prev));

      setMsg({ kind: "ok", text: "Foto cargada y visible. Ahora toca Guardar cambios." });
    } catch (e: any) {
      setProfileImageUrl("");
      setMsg({ kind: "err", text: e?.message || "No pudimos cargar la foto." });
    } finally {
      setProcessingPhoto(false);
      input.value = "";
      if (chooseInputRef.current) chooseInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  }

  async function handleSave() {
    if (!canSave) return;

    setMsg(null);
    setSaving(true);

    try {
      const payloadImage = String(profileImageUrl || "").trim();

      const updated = await apiFetch<Partial<ApiMe>>("/users/me", {
        method: "PATCH",
        cache: "no-store",
        json: {
          name: name.trim() || null,
          nickname: nickname.trim() || null,
          profileImageUrl: payloadImage || null,
        },
      });

      const savedImage = String(
        updated?.profileImageUrl !== undefined ? updated.profileImageUrl ?? "" : payloadImage
      ).trim();

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              name: updated.name ?? prev.name,
              nickname: updated.nickname ?? prev.nickname,
              email: updated.email ?? prev.email,
              phone: updated.phone ?? prev.phone,
              profileImageUrl: savedImage || null,
            }
          : (updated as ApiMe)
      );

      setName(String(updated?.name ?? name).trim());
      setNickname(String(updated?.nickname ?? nickname).trim());
      setProfileImageUrl(savedImage);
      setPreviewFromSaved(savedImage);

      const prof = await fetchProfile();
      if (prof.ok) {
        const freshImage = String(prof.data?.profileImageUrl ?? "").trim();

        setProfile(prof.data);
        setName(String(prof.data?.name ?? "").trim());
        setNickname(String(prof.data?.nickname ?? "").trim());
        setProfileImageUrl(freshImage);
        setPreviewFromSaved(freshImage);
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
    const src = String(previewSrc || profileImageUrl || "").trim();

    return (
      <div
        className="overflow-hidden rounded-2xl bg-gray-900 text-white font-extrabold"
        style={{ width: size, height: size }}
      >
        {src ? (
          <img
            key={src}
            src={src}
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
              <label className="relative inline-flex cursor-pointer overflow-hidden rounded-2xl bg-slate-900 px-4 py-3 text-xs font-extrabold text-white active:scale-[0.99]">
                Elegir foto
                <input
                  ref={chooseInputRef}
                  type="file"
                  accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif"
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  onChange={handlePhotoInputChange}
                />
              </label>

              <label className="relative inline-flex cursor-pointer overflow-hidden rounded-2xl bg-emerald-600 px-4 py-3 text-xs font-extrabold text-white active:scale-[0.99]">
                Tomar foto
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif"
                  capture="user"
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  onChange={handlePhotoInputChange}
                />
              </label>

              {previewSrc || profileImageUrl ? (
                <button
                  type="button"
                  onClick={() => {
                    clearPreviewObjectUrl();
                    setPreviewSrc("");
                    setProfileImageUrl("");
                    setProfile((prev) => (prev ? { ...prev, profileImageUrl: "" } : prev));
                    setMsg({ kind: "ok", text: "Foto removida. Toca Guardar cambios para confirmar." });
                  }}
                  disabled={processingPhoto}
                  className="rounded-2xl border border-gray-200 px-4 py-3 text-xs font-extrabold text-gray-700 disabled:opacity-60"
                >
                  Quitar
                </button>
              ) : null}
            </div>

            <div className="mt-2 text-[11px] text-gray-500">
              {processingPhoto
                ? "Procesando foto…"
                : "Primero debe verse aquí. Luego toca Guardar cambios."}
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
          {saving ? "Guardando…" : processingPhoto ? "Procesando foto…" : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}
