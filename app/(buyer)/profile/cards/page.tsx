// app/(buyer)/profile/cards/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Brand = "VISA" | "MASTERCARD" | "AMEX" | "DINERS" | "DISCOVER" | "OTRA";

type SavedCard = {
  id: string;
  label: string; // "Personal", "Negocio", etc.
  brand: Brand;
  last4: string; // 4 dígitos
  exp: string; // "MM/AA"
  holder?: string;
  isDefault?: boolean;
  createdAt: number;
  updatedAt: number;
};

const LS_KEY = "kronix:cards:v1";

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

function brandBadge(brand: Brand) {
  const map: Record<Brand, { text: string; bg: string; ring: string; fg: string }> = {
    VISA: { text: "VISA", bg: "bg-blue-50", ring: "ring-blue-100", fg: "text-blue-700" },
    MASTERCARD: { text: "Mastercard", bg: "bg-orange-50", ring: "ring-orange-100", fg: "text-orange-700" },
    AMEX: { text: "AMEX", bg: "bg-sky-50", ring: "ring-sky-100", fg: "text-sky-700" },
    DINERS: { text: "Diners", bg: "bg-indigo-50", ring: "ring-indigo-100", fg: "text-indigo-700" },
    DISCOVER: { text: "Discover", bg: "bg-amber-50", ring: "ring-amber-100", fg: "text-amber-800" },
    OTRA: { text: "Tarjeta", bg: "bg-gray-50", ring: "ring-gray-200", fg: "text-gray-700" },
  };
  return map[brand] ?? map.OTRA;
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function uid() {
  // suficiente para client-side
  return `card_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

function normalizeExp(input: string) {
  const digits = (input ?? "").replace(/[^\d]/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function isValidExp(exp: string) {
  const m = exp.match(/^(\d{2})\/(\d{2})$/);
  if (!m) return false;
  const mm = Number(m[1]);
  const yy = Number(m[2]);
  if (!(mm >= 1 && mm <= 12)) return false;
  if (!(yy >= 0 && yy <= 99)) return false;
  return true;
}

function isValidLast4(v: string) {
  return /^\d{4}$/.test(v);
}

export default function CardsPage() {
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [open, setOpen] = useState(false);

  // Form
  const [label, setLabel] = useState("");
  const [brand, setBrand] = useState<Brand>("VISA");
  const [last4, setLast4] = useState("");
  const [exp, setExp] = useState("");
  const [holder, setHolder] = useState("");
  const [makeDefault, setMakeDefault] = useState(true);

  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    const stored = safeParse<SavedCard[]>(typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null) ?? [];
    const cleaned = Array.isArray(stored) ? stored : [];

    // Orden: default primero, luego updatedAt desc
    cleaned.sort((a, b) => Number(!!b.isDefault) - Number(!!a.isDefault) || (b.updatedAt ?? 0) - (a.updatedAt ?? 0));

    if (!alive) return;
    setCards(cleaned);
    setLoading(false);

    return () => {
      alive = false;
    };
  }, []);

  function persist(next: SavedCard[]) {
    const sorted = [...next].sort(
      (a, b) => Number(!!b.isDefault) - Number(!!a.isDefault) || (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
    );
    setCards(sorted);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(sorted));
    } catch {}
  }

  const hasCards = cards.length > 0;

  const canSave = useMemo(() => {
    if (!label.trim()) return false;
    if (!isValidLast4(last4.trim())) return false;
    if (!isValidExp(exp.trim())) return false;
    return true;
  }, [label, last4, exp]);

  function resetForm() {
    setLabel("");
    setBrand("VISA");
    setLast4("");
    setExp("");
    setHolder("");
    setMakeDefault(true);
  }

  function openAdd() {
    setMsg(null);
    resetForm();
    setOpen(true);
  }

  function closeAdd() {
    setOpen(false);
  }

  function setDefault(id: string) {
    const now = Date.now();
    const next = cards.map((c) => ({
      ...c,
      isDefault: c.id === id,
      updatedAt: c.id === id ? now : c.updatedAt,
    }));
    persist(next);
    setMsg({ kind: "ok", text: "Tarjeta predeterminada actualizada." });
  }

  function removeCard(id: string) {
    const wasDefault = cards.find((c) => c.id === id)?.isDefault;
    let next = cards.filter((c) => c.id !== id);

    // si borró la default, asignamos otra (la más reciente)
    if (wasDefault && next.length) {
      const now = Date.now();
      next = next
        .map((c, idx) => (idx === 0 ? { ...c, isDefault: true, updatedAt: now } : c))
        .sort((a, b) => Number(!!b.isDefault) - Number(!!a.isDefault) || (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
    }

    persist(next);
    setMsg({ kind: "ok", text: "Tarjeta eliminada." });
  }

  function handleAdd() {
    setMsg(null);

    const l = label.trim().slice(0, 30);
    const l4 = last4.trim();
    const ex = exp.trim();
    const h = holder.trim().slice(0, 50);

    if (!l) return setMsg({ kind: "err", text: "Ponle un nombre a la tarjeta (ej: Personal)." });
    if (!isValidLast4(l4)) return setMsg({ kind: "err", text: "Los últimos 4 deben ser 4 dígitos." });
    if (!isValidExp(ex)) return setMsg({ kind: "err", text: "Vencimiento inválido (usa MM/AA)." });

    const now = Date.now();
    const item: SavedCard = {
      id: uid(),
      label: l,
      brand,
      last4: l4,
      exp: ex,
      holder: h || undefined,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
    };

    let next = [...cards];

    if (!next.length) {
      item.isDefault = true;
    } else if (makeDefault) {
      next = next.map((c) => ({ ...c, isDefault: false }));
      item.isDefault = true;
    }

    persist([item, ...next]);
    setOpen(false);
    setMsg({ kind: "ok", text: "Tarjeta guardada. ✅" });
  }

  return (
    <div className="px-4 pb-6 pt-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-extrabold text-gray-900">Tarjetas</div>
          <div className="mt-1 text-xs text-gray-600">
            Guarda métodos de pago para usar más rápido.
          </div>
        </div>

        <button
          type="button"
          onClick={openAdd}
          className="shrink-0 rounded-xl bg-green-600 px-3 py-2 text-xs font-extrabold text-white hover:bg-green-700"
        >
          + Agregar
        </button>
      </div>

      {/* Mensajes */}
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

      {/* Aviso seguridad (premium) */}
      <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-4 text-xs text-gray-600 shadow-sm">
        <div className="font-extrabold text-gray-900">🔒 Seguridad</div>
        <div className="mt-1">
          En este MVP <span className="font-bold">NO guardamos</span> número completo ni CVV.
          Solo almacenamos <span className="font-bold">marca</span>, <span className="font-bold">últimos 4</span> y{" "}
          <span className="font-bold">vencimiento</span> (para mostrarlo en la app).
        </div>
      </div>

      {/* Lista / Empty */}
      <div className="mt-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="h-4 w-40 rounded bg-gray-100 animate-pulse" />
                <div className="mt-3 h-3 w-64 rounded bg-gray-100 animate-pulse" />
                <div className="mt-4 h-10 w-full rounded-2xl bg-gray-100 animate-pulse" />
              </div>
            ))}
          </div>
        ) : !hasCards ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-200">
                💳
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-extrabold text-gray-900">Aún no tienes tarjetas</div>
                <div className="mt-1 text-xs text-gray-600">
                  Agrega una tarjeta para pagar más rápido cuando elijas tu pedido.
                </div>

                <button
                  type="button"
                  onClick={openAdd}
                  className="mt-4 inline-flex rounded-2xl bg-green-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-green-700"
                >
                  Agregar mi primera tarjeta
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {cards.map((c) => {
              const b = brandBadge(c.brand);
              return (
                <div
                  key={c.id}
                  className={cx(
                    "rounded-3xl border bg-white p-4 shadow-sm",
                    c.isDefault ? "border-emerald-200" : "border-gray-200"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cx("inline-flex rounded-xl px-2 py-1 text-[11px] font-extrabold ring-1", b.bg, b.ring, b.fg)}
                        >
                          {b.text}
                        </span>

                        {c.isDefault ? (
                          <span className="inline-flex rounded-xl bg-emerald-50 px-2 py-1 text-[11px] font-extrabold text-emerald-700 ring-1 ring-emerald-200">
                            Predeterminada
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-2 truncate text-sm font-extrabold text-gray-900">
                        {c.label} • •••• {c.last4}
                      </div>

                      <div className="mt-1 text-xs text-gray-600">
                        Vence {c.exp}
                        {c.holder ? <span className="text-gray-400"> • {c.holder}</span> : null}
                      </div>
                    </div>

                    <div className="text-gray-300" aria-hidden="true">
                      ‹›
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDefault(c.id)}
                      disabled={c.isDefault}
                      className={cx(
                        "flex-1 rounded-2xl px-3 py-3 text-xs font-extrabold ring-1",
                        c.isDefault
                          ? "bg-gray-50 text-gray-400 ring-gray-200"
                          : "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100"
                      )}
                    >
                      {c.isDefault ? "Predeterminada" : "Hacer predeterminada"}
                    </button>

                    <button
                      type="button"
                      onClick={() => removeCard(c.id)}
                      className="rounded-2xl bg-red-50 px-4 py-3 text-xs font-extrabold text-red-700 ring-1 ring-red-100 hover:bg-red-100"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sheet inline (sin modal gigante) */}
      {open ? (
        <div className="mt-4 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-sm font-extrabold text-gray-900">Agregar tarjeta</div>
            <button
              type="button"
              onClick={closeAdd}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-extrabold text-gray-700 hover:bg-gray-50"
            >
              Cerrar
            </button>
          </div>

          <div className="mt-3 grid gap-3">
            <div>
              <div className="text-xs font-extrabold text-gray-800">Nombre (para identificarla)</div>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ej: Personal / Negocio"
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm outline-none focus:bg-white focus:border-gray-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-extrabold text-gray-800">Marca</div>
                <select
                  value={brand}
                  onChange={(e) => setBrand(e.target.value as Brand)}
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm outline-none focus:bg-white focus:border-gray-300"
                >
                  <option value="VISA">VISA</option>
                  <option value="MASTERCARD">Mastercard</option>
                  <option value="AMEX">AMEX</option>
                  <option value="DINERS">Diners</option>
                  <option value="DISCOVER">Discover</option>
                  <option value="OTRA">Otra</option>
                </select>
              </div>

              <div>
                <div className="text-xs font-extrabold text-gray-800">Últimos 4</div>
                <input
                  value={last4}
                  onChange={(e) => setLast4(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
                  inputMode="numeric"
                  placeholder="1234"
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm outline-none focus:bg-white focus:border-gray-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-extrabold text-gray-800">Vencimiento</div>
                <input
                  value={exp}
                  onChange={(e) => setExp(normalizeExp(e.target.value))}
                  inputMode="numeric"
                  placeholder="MM/AA"
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm outline-none focus:bg-white focus:border-gray-300"
                />
              </div>

              <div>
                <div className="text-xs font-extrabold text-gray-800">Titular (opcional)</div>
                <input
                  value={holder}
                  onChange={(e) => setHolder(e.target.value)}
                  placeholder="Ej: Blass Murillo"
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm outline-none focus:bg-white focus:border-gray-300"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={makeDefault}
                onChange={(e) => setMakeDefault(e.target.checked)}
              />
              Usar como predeterminada
            </label>

            <button
              type="button"
              disabled={!canSave}
              onClick={handleAdd}
              className={cx(
                "w-full rounded-2xl py-3 text-sm font-extrabold text-white",
                "bg-green-600 hover:bg-green-700 disabled:opacity-50"
              )}
            >
              Guardar tarjeta
            </button>

            <div className="text-[11px] text-gray-500">
              Nota: este MVP guarda solo datos de referencia para mostrar en la app.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
