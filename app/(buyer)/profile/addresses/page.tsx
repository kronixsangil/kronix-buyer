//app/(buyer)/profile/addresses/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/components/buyer/useAuth";
import { useBuyerCity } from "@/components/buyer/CityContext";
import { geocodeAddressOSMInCity } from "@/lib/geocode";

import dynamic from "next/dynamic";

const LocationPickerMap = dynamic(
  () => import("@/components/buyer/maps/LocationPickerMap"),
  { ssr: false }
);

type AddressItem = {
  id: string;
  cityId?: string | null;
  label?: string | null;
  placeName?: string | null;
  address: string;
  reference?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  lat?: number | null;
  lng?: number | null;
  isDefault: boolean;
  isFavorite: boolean;
  usageCount?: number;
  lastUsedAt?: string;
  updatedAt: string;
  city?: {
    id: string;
    slug: string;
    name: string;
    department: string;
    country: string;
  } | null;
};

type AddressForm = {
  label: string;
  placeName: string;
  address: string;
  reference: string;
  contactName: string;
  contactPhone: string;
  isDefault: boolean;
  isFavorite: boolean;
  lat?: number | null;
  lng?: number | null;
};

const EMPTY_FORM: AddressForm = {
  label: "",
  placeName: "",
  address: "",
  reference: "",
  contactName: "",
  contactPhone: "",
  isDefault: false,
  isFavorite: false,
  lat: null,
  lng: null,
};

const inputClass =
  "w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-[15px] font-semibold text-slate-900 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-blue-300 focus:bg-white";

function formatDate(iso?: string) {
  const ms = Date.parse(String(iso ?? ""));
  return Number.isFinite(ms) ? new Date(ms).toLocaleString("es-CO") : "";
}

function formatPhone(value: string) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 15);
}

function formFromAddress(a: AddressItem): AddressForm {
  return {
    label: a.label ?? "",
    placeName: a.placeName ?? "",
    address: a.address ?? "",
    reference: a.reference ?? "",
    contactName: a.contactName ?? "",
    contactPhone: a.contactPhone ?? "",
    isDefault: Boolean(a.isDefault),
    isFavorite: Boolean(a.isFavorite || a.isDefault),
    lat: typeof a.lat === "number" ? a.lat : null,
    lng: typeof a.lng === "number" ? a.lng : null,
  };
}

function sortAddresses(items: AddressItem[]) {
  return [...items].sort((a, b) => {
    const aDefault = a.isDefault ? 1 : 0;
    const bDefault = b.isDefault ? 1 : 0;
    if (aDefault !== bDefault) return bDefault - aDefault;

    const aFav = a.isFavorite ? 1 : 0;
    const bFav = b.isFavorite ? 1 : 0;
    if (aFav !== bFav) return bFav - aFav;

    const aUsage = Number(a.usageCount ?? 0);
    const bUsage = Number(b.usageCount ?? 0);
    if (aUsage !== bUsage) return bUsage - aUsage;

    const aTime = Date.parse(String(a.lastUsedAt ?? a.updatedAt ?? ""));
    const bTime = Date.parse(String(b.lastUsedAt ?? b.updatedAt ?? ""));
    return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
  });
}

function addressTitle(a: AddressItem) {
  return `📍 ${a.label ? `${a.label}: ` : ""}${a.placeName ? `${a.placeName} · ` : ""}${a.address}`;
}

function FieldRow({
  label,
  children,
  align = "center",
}: {
  label: string;
  children: React.ReactNode;
  align?: "center" | "start";
}) {
  return (
    <div className={["grid grid-cols-[82px_1fr] gap-2", align === "start" ? "items-start" : "items-center"].join(" ")}>
      <label className={["text-xs font-extrabold text-slate-900", align === "start" ? "pt-3" : ""].join(" ")}>
        {label}
      </label>
      {children}
    </div>
  );
}

export default function AddressesPage() {
  const { isLoading: authLoading, isAuthed } = useAuth();
  const { citySlug, cityLabel, cityGeoLabel, cityReady } = useBuyerCity();

  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<AddressItem[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<AddressForm>(EMPTY_FORM);
  const [touched, setTouched] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<AddressForm>(EMPTY_FORM);
  const [editTouched, setEditTouched] = useState(false);

  const [showMap, setShowMap] = useState(false);
  const [mapTarget, setMapTarget] = useState<"create" | "edit" | null>(null);
  const [expandedAddressIds, setExpandedAddressIds] = useState<Set<string>>(() => new Set());

  const canSave = useMemo(() => form.address.trim().length >= 8, [form.address]);
  const canSaveEdit = useMemo(() => editForm.address.trim().length >= 8, [editForm.address]);

  const sortedItems = useMemo(() => sortAddresses(items), [items]);

  const favoritesCount = useMemo(
    () => items.filter((item) => item.isFavorite).length,
    [items]
  );

  function toggleAddress(id: string) {
    setExpandedAddressIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const load = async () => {
    if (!cityReady || !citySlug) return;

    setErr(null);
    setIsLoading(true);

    try {
      const list = await apiFetch<AddressItem[]>(
        `/users/me/addresses?citySlug=${encodeURIComponent(citySlug)}`
      );
      setItems(Array.isArray(list) ? sortAddresses(list) : []);
    } catch (e: any) {
      setErr(e?.message || "No se pudieron cargar direcciones");
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && isAuthed && cityReady && citySlug) load();
    if (!authLoading && !isAuthed) setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthed, cityReady, citySlug]);

  function updateField<K extends keyof AddressForm>(
    key: K,
    value: AddressForm[K]
  ) {
    setSuccess(null);
    setErr(null);

    setForm((prev) => {
      const next = { ...prev, [key]: value };

      if (key === "isDefault" && value === true) {
        next.isFavorite = true;
      }

      return next;
    });
  }

  function updateEditField<K extends keyof AddressForm>(
    key: K,
    value: AddressForm[K]
  ) {
    setSuccess(null);
    setErr(null);

    setEditForm((prev) => {
      const next = { ...prev, [key]: value };

      if (key === "isDefault" && value === true) {
        next.isFavorite = true;
      }

      return next;
    });
  }

  async function postAddress(payload: AddressForm) {
    if (!citySlug) throw new Error("No se encontró ciudad activa.");

    const addressText = payload.address.trim();

    let lat = payload.lat;
    let lng = payload.lng;

    if (!lat || !lng) {
      const geo = await geocodeAddressOSMInCity(addressText, cityGeoLabel);

      if (!geo) {
        throw new Error(
          `No pudimos ubicar esa dirección en ${cityLabel}. Revisa que esté bien escrita e intenta de nuevo.`
        );
      }

      lat = geo.lat;
      lng = geo.lng;
    }

    return apiFetch(`/users/me/addresses?citySlug=${encodeURIComponent(citySlug)}`, {
      method: "POST",
      json: {
        label: payload.label.trim() || null,
        placeName: payload.placeName.trim() || null,
        address: addressText,
        reference: payload.reference.trim() || null,
        contactName: payload.contactName.trim() || null,
        contactPhone: payload.contactPhone.trim() || null,
        lat,
        lng,
        isDefault: payload.isDefault,
        isFavorite: payload.isDefault ? true : payload.isFavorite,
      },
    });
  }

  const saveAddress = async () => {
    setTouched(true);
    setSuccess(null);
    setErr(null);

    if (!canSave) {
      setErr("Escribe una dirección más completa.");
      return;
    }

    setSaving(true);

    try {
      await postAddress(form);

      setForm(EMPTY_FORM);
      setTouched(false);
      setAddOpen(false);
      setSuccess("Dirección guardada correctamente.");
      await load();
    } catch (e: any) {
      setErr(e?.message || "No se pudo guardar la dirección");
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async (id: string) => {
    setEditTouched(true);
    setSuccess(null);
    setErr(null);

    if (!canSaveEdit) {
      setErr("Escribe una dirección más completa.");
      return;
    }

    setSaving(true);

    try {
      await apiFetch(`/users/me/addresses/${id}`, { method: "DELETE" });
      await postAddress(editForm);

      setEditingId(null);
      setEditForm(EMPTY_FORM);
      setEditTouched(false);
      setSuccess("Dirección editada correctamente.");
      await load();
    } catch (e: any) {
      setErr(e?.message || "No se pudo editar la dirección");
    } finally {
      setSaving(false);
    }
  };

  const setDefault = async (id: string) => {
    setErr(null);
    setSuccess(null);

    try {
      await apiFetch(`/users/me/addresses/${id}/default`, { method: "POST" });
      setSuccess("Dirección predeterminada actualizada.");
      await load();
    } catch (e: any) {
      setErr(e?.message || "No se pudo marcar como predeterminada");
    }
  };

  const toggleFavorite = async (id: string) => {
    setErr(null);
    setSuccess(null);

    try {
      await apiFetch(`/users/me/addresses/${id}/favorite`, { method: "POST" });
      await load();
    } catch (e: any) {
      setErr(e?.message || "No se pudo actualizar favorito");
    }
  };

  const remove = async (id: string) => {
    setErr(null);
    setSuccess(null);

    try {
      await apiFetch(`/users/me/addresses/${id}`, { method: "DELETE" });
      setSuccess("Dirección eliminada.");
      await load();
    } catch (e: any) {
      setErr(e?.message || "No se pudo eliminar");
    }
  };

  function openEdit(a: AddressItem) {
    setAddOpen(false);
    setSuccess(null);
    setErr(null);
    setExpandedAddressIds((prev) => new Set(prev).add(a.id));

    if (editingId === a.id) {
      setEditingId(null);
      setEditForm(EMPTY_FORM);
      setEditTouched(false);
      return;
    }

    setEditingId(a.id);
    setEditForm(formFromAddress(a));
    setEditTouched(false);
  }

  function renderAddressForm({
    value,
    touchedValue,
    onChange,
    onTouched,
    onSave,
    onCancel,
    saveLabel,
  }: {
    value: AddressForm;
    touchedValue: boolean;
    onChange: <K extends keyof AddressForm>(key: K, value: AddressForm[K]) => void;
    onTouched: () => void;
    onSave: () => void;
    onCancel: () => void;
    saveLabel: string;
  }) {
    const valid = value.address.trim().length >= 8;

    return (
      <div className="mt-2 space-y-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <FieldRow label="Etiqueta">
          <input
            value={value.label}
            onChange={(e) => onChange("label", e.target.value)}
            placeholder="Casa, Trabajo, Mamá..."
            className={inputClass}
            maxLength={30}
          />
        </FieldRow>

        <FieldRow label="Lugar">
          <input
            value={value.placeName}
            onChange={(e) => onChange("placeName", e.target.value)}
            placeholder="Edificio, local, conjunto..."
            className={inputClass}
            maxLength={80}
          />
        </FieldRow>

        <FieldRow label="Dirección" align="start">
          <textarea
            value={value.address}
            onChange={(e) => onChange("address", e.target.value)}
            onBlur={onTouched}
            placeholder="Dirección completa *"
            rows={2}
            className={[
              `${inputClass} resize-none`,
              touchedValue && !valid
                ? "border-red-300 focus:border-red-400"
                : "border-slate-200 focus:border-blue-300",
            ].join(" ")}
            maxLength={220}
          />
        </FieldRow>

        <button
          type="button"
          onClick={() => {
            setShowMap(true);
            setMapTarget(saveLabel.includes("Guardar dirección") ? "create" : "edit");
          }}
          className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-3 text-sm font-extrabold text-blue-800"
        >
          📍 Seleccionar en mapa
        </button>

        {showMap && (
          <div className="mt-2 overflow-hidden rounded-2xl border">
            <LocationPickerMap
              onSelect={({ lat, lng, address }) => {
                if (mapTarget === "create") {
                  setForm((prev) => ({
                    ...prev,
                    address,
                    lat,
                    lng,
                  }));
                } else {
                  setEditForm((prev) => ({
                    ...prev,
                    address,
                    lat,
                    lng,
                  }));
                }

                setShowMap(false);
                setMapTarget(null);
              }}
            />
          </div>
        )}

        <FieldRow label="Referencia" align="start">
          <textarea
            value={value.reference}
            onChange={(e) => onChange("reference", e.target.value)}
            placeholder="Portería, color, timbre..."
            rows={2}
            className={`${inputClass} resize-none`}
            maxLength={120}
          />
        </FieldRow>

        <FieldRow label="Contacto">
          <input
            value={value.contactName}
            onChange={(e) => onChange("contactName", e.target.value)}
            placeholder="Contacto opcional"
            className={inputClass}
            maxLength={80}
          />
        </FieldRow>

        <FieldRow label="Celular">
          <input
            value={value.contactPhone}
            onChange={(e) => onChange("contactPhone", formatPhone(e.target.value))}
            placeholder="Teléfono opcional"
            inputMode="numeric"
            className={inputClass}
            maxLength={15}
          />
        </FieldRow>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onChange("isFavorite", !value.isFavorite)}
            className={[
              "rounded-xl px-3 py-3 text-sm font-extrabold ring-1 transition",
              value.isFavorite
                ? "bg-rose-50 text-rose-700 ring-rose-200"
                : "bg-gray-50 text-gray-700 ring-gray-200",
            ].join(" ")}
          >
            {value.isFavorite ? "❤️ Favorita" : "♡ Favorita"}
          </button>

          <button
            type="button"
            onClick={() => onChange("isDefault", !value.isDefault)}
            className={[
              "rounded-xl px-3 py-3 text-sm font-extrabold ring-1 transition",
              value.isDefault
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                : "bg-gray-50 text-gray-700 ring-gray-200",
            ].join(" ")}
          >
            {value.isDefault ? "🏠 Predeterminada" : "⌂ Predeterminada"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-extrabold text-gray-700"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={saving || !valid}
            className={[
              "rounded-xl px-4 py-3 text-sm font-extrabold text-white",
              saving || !valid
                ? "cursor-not-allowed bg-gray-300"
                : "bg-emerald-600 hover:bg-emerald-700",
            ].join(" ")}
          >
            {saving ? "Guardando..." : saveLabel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-6 pt-2">
      <div className="text-lg font-extrabold text-gray-900">Direcciones</div>

      <div className="mt-1 text-xs text-gray-600">
        Guarda hasta 10 direcciones. Puedes tener 1 predeterminada y hasta 6 favoritas.
      </div>

      <div className="mt-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 shadow-sm">
        Ciudad activa: <span className="font-extrabold">{cityLabel}</span>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-3 text-center shadow-sm">
          <div className="text-lg font-black text-gray-900">{items.length}/10</div>
          <div className="text-[11px] font-bold text-gray-500">Guardadas</div>
        </div>

        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-center shadow-sm">
          <div className="text-lg font-black text-rose-700">{favoritesCount}/6</div>
          <div className="text-[11px] font-bold text-rose-600">Favoritas</div>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-center shadow-sm">
          <div className="text-lg font-black text-emerald-700">🏠</div>
          <div className="text-[11px] font-bold text-emerald-700">Default</div>
        </div>
      </div>

      {!authLoading && !isAuthed ? (
        <div className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          Inicia sesión para ver y guardar tus direcciones.
        </div>
      ) : null}

      {isAuthed ? (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => {
              setAddOpen((prev) => !prev);
              setEditingId(null);
              setSuccess(null);
              setErr(null);
            }}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-600 px-4 py-4 text-base font-black text-white shadow-sm transition hover:bg-emerald-700"
          >
            <span className="grid h-7 w-7 place-items-center rounded-full border border-white/60 text-xl leading-none">
              +
            </span>
            Agregar dirección
            <span className="ml-auto text-xl">{addOpen ? "⌃" : "⌄"}</span>
          </button>

          {addOpen
            ? renderAddressForm({
                value: form,
                touchedValue: touched,
                onChange: updateField,
                onTouched: () => setTouched(true),
                onSave: saveAddress,
                onCancel: () => {
                  setAddOpen(false);
                  setForm(EMPTY_FORM);
                  setTouched(false);
                },
                saveLabel: "Guardar dirección",
              })
            : null}
        </div>
      ) : null}

      {success ? (
        <div className="mt-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
          {success}
        </div>
      ) : null}

      {err ? (
        <div className="mt-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          {err}
        </div>
      ) : null}

      <div className="mt-2 space-y-2">
        {isLoading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600 shadow-sm">
            Cargando direcciones…
          </div>
        ) : sortedItems.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600 shadow-sm">
            Aún no tienes direcciones guardadas para <b>{cityLabel}</b>.
          </div>
        ) : (
          sortedItems.map((a, index) => {
            const open = expandedAddressIds.has(a.id) || editingId === a.id;

            return (
              <div
                key={a.id}
                className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => toggleAddress(a.id)}
                  className="block w-full text-left"
                  aria-expanded={open}
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-black text-gray-700">
                      #{index + 1}
                    </span>

                    {a.isDefault ? (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">
                        🏠 Predeterminada
                      </span>
                    ) : null}

                    {a.isFavorite ? (
                      <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-black text-rose-700">
                        ❤️ Favorita
                      </span>
                    ) : !a.isDefault ? (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-500">
                        Dinámica
                      </span>
                    ) : null}

                    <span className="ml-auto rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700">
                      {open ? "Ver menos" : "Ver más"}
                    </span>
                  </div>

                  <div className="line-clamp-2 text-sm font-extrabold leading-5 text-gray-900">
                    {addressTitle(a)}
                  </div>
                </button>

                {open ? (
                  <>
                    {a.reference ? (
                      <div className="mt-1 text-xs font-semibold text-gray-600">
                        Referencia: {a.reference}
                      </div>
                    ) : null}

                    {a.contactName || a.contactPhone ? (
                      <div className="mt-1 text-xs font-semibold text-gray-600">
                        Contacto: {a.contactName || "Sin nombre"}
                        {a.contactPhone ? ` · ${a.contactPhone}` : ""}
                      </div>
                    ) : null}

                    {a.city ? (
                      <div className="mt-1 text-xs font-semibold text-blue-700">
                        {a.city.name}, {a.city.department}
                      </div>
                    ) : null}

                    <div className="mt-1 text-xs text-gray-600">
                      Último uso: {formatDate(a.lastUsedAt || a.updatedAt)}
                      {typeof a.usageCount === "number" ? ` · Usos: ${a.usageCount}` : ""}
                    </div>

                    <div className="mt-2 grid grid-cols-[46px_46px_1fr_1fr] gap-2">
                      <button
                        type="button"
                        onClick={() => toggleFavorite(a.id)}
                        className={[
                          "h-10 rounded-xl text-xs font-extrabold ring-1",
                          a.isFavorite
                            ? "bg-rose-50 text-rose-700 ring-rose-200"
                            : "bg-white text-gray-700 ring-gray-200",
                        ].join(" ")}
                      >
                        {a.isFavorite ? "❤️" : "♡"}
                      </button>

                      <button
                        type="button"
                        onClick={() => setDefault(a.id)}
                        disabled={a.isDefault}
                        className={[
                          "h-10 rounded-xl text-xs font-extrabold ring-1",
                          a.isDefault
                            ? "cursor-not-allowed bg-emerald-50 text-emerald-700 ring-emerald-200"
                            : "bg-white text-blue-700 ring-gray-200",
                        ].join(" ")}
                      >
                        🏠
                      </button>

                      <button
                        type="button"
                        onClick={() => openEdit(a)}
                        className="h-10 rounded-xl bg-blue-50 px-3 text-xs font-extrabold text-blue-800 ring-1 ring-blue-200"
                      >
                        ✎ Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => remove(a.id)}
                        className="h-10 rounded-xl bg-gray-50 px-3 text-xs font-extrabold text-gray-900 ring-1 ring-gray-200"
                      >
                        Eliminar
                      </button>
                    </div>
                  </>
                ) : null}

                {editingId === a.id
                  ? renderAddressForm({
                      value: editForm,
                      touchedValue: editTouched,
                      onChange: updateEditField,
                      onTouched: () => setEditTouched(true),
                      onSave: () => saveEdit(a.id),
                      onCancel: () => {
                        setEditingId(null);
                        setEditForm(EMPTY_FORM);
                        setEditTouched(false);
                      },
                      saveLabel: "Guardar cambios",
                    })
                  : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
