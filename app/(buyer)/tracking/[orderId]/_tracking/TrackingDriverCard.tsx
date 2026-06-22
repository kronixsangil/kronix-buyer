//app\(buyer)\tracking\[orderId]\_tracking\TrackingDriverCard.tsx
"use client";

import type { TrackingViewModel } from "./types";
import { buildWhatsAppUrl, normalizePhoneAny } from "./utils";

function encodePathFileName(fileName: string) {
  return fileName
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function buildOfficialDriverPhotoSrc(
  profileImageUrl?: string | null,
  driverName?: string | null
) {
  const raw = String(profileImageUrl ?? "").trim();

  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("data:")
  ) {
    return raw;
  }

  if (raw.startsWith("/branding/Driver_Pictures/")) {
    return encodePathFileName(raw);
  }

  const name = String(driverName ?? "").trim();
  if (!name) return "";

  return `/branding/Driver_Pictures/${encodeURIComponent(name)}.jpg`;
}

function normalizeTierCode(value?: string | null) {
  return String(value ?? "BRONCE").trim().toUpperCase() || "BRONCE";
}

function getTierBadgeImageFromCode(tierCode?: string | null) {
  const code = normalizeTierCode(tierCode);

  if (code === "PIONERO") return "/branding/Insignias/Pionero.png";
  if (code === "ELITE" || code === "ÉLITE") return "/branding/Insignias/Élite.png";
  if (code === "ORO") return "/branding/Insignias/Oro.png";
  if (code === "PLATA") return "/branding/Insignias/Plata.png";
  return "/branding/Insignias/Bronce.png";
}

function prettyTierName(value?: string | null, code?: string | null) {
  const clean = String(value ?? "").trim();
  if (clean) return clean;

  const tierCode = normalizeTierCode(code);
  if (tierCode === "PIONERO") return "Pionero";
  if (tierCode === "ELITE" || tierCode === "ÉLITE") return "Élite";
  if (tierCode === "ORO") return "Oro";
  if (tierCode === "PLATA") return "Plata";
  return "Bronce";
}

function formatPercent(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${Math.max(0, Math.min(100, Math.round(n)))}%`;
}

function formatRating(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${Math.max(0, Math.min(5, n)).toFixed(1)} ⭐`;
}

function formatPoints(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return String(Math.max(0, Math.round(n)));
}

function DriverPublicStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-black text-slate-950">{value}</div>
    </div>
  );
}

export function TrackingDriverCard({ vm }: { vm: TrackingViewModel }) {
  if (!vm.fromApi) return null;

  const prof = vm.tracking?.driver?.profile ?? null;
  const rewards = prof?.rewards ?? null;

  const name = String(prof?.name ?? "").trim();
  const phone = normalizePhoneAny(prof?.phone ?? null);
  const profileImageUrl = buildOfficialDriverPhotoSrc(
    (prof as any)?.profileImageUrl ?? null,
    name
  );

  const brand = String(prof?.vehicle?.brand ?? "").trim();
  const plate = String(prof?.vehicle?.plate ?? "").trim();

  const tierCode = normalizeTierCode(rewards?.tierCode ?? rewards?.badgeLabel);
  const tierName = prettyTierName(rewards?.tierName, tierCode);
  const tierBadgeSrc =
    String(rewards?.badgeImageUrl ?? "").trim() ||
    getTierBadgeImageFromCode(tierCode);

  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0]?.toUpperCase())
      .join("") || "CT";

  const hasPhone = Boolean(phone);
  const waMsg = `Hola ${name || "conductor"}, soy el cliente de KroniX. Estoy siguiendo mi pedido ${vm.order!.id}.`;
  const waUrl = hasPhone ? buildWhatsAppUrl(phone, waMsg) : "";
  const callUrl = hasPhone ? `tel:${phone}` : "";

  return (
    <div className={`${vm.CARD_PAD} mt-4`}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-extrabold text-gray-900">
          Conductor asignado
        </div>

        <button
          type="button"
          onClick={() => vm.setDriverOpen((v) => !v)}
          className="rounded-xl bg-slate-100 px-3 py-1.5 text-[11px] font-extrabold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-200"
        >
          {vm.driverOpen ? "Ocultar" : "Ver"}
        </button>
      </div>

      {!prof ? (
        <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs text-slate-700 ring-1 ring-slate-200">
          Aún no hay conductor asignado. Te notificaremos apenas se asigne uno.
        </div>
      ) : (
        <div className="mt-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 overflow-hidden rounded-2xl bg-emerald-600 text-sm font-extrabold text-white shadow-sm">
              {profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt="Foto oficial del conductor"
                  className="block h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : null}
              <div className="flex h-full w-full items-center justify-center">
                {initials}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-extrabold text-slate-900">
                {name || "Conductor"}
              </div>
              <div className="mt-0.5 text-[11px] font-semibold text-slate-600">
                {brand || plate ? (
                  <>
                    {brand ? brand : "Vehículo"}{" "}
                    {plate ? (
                      <span className="rounded-lg bg-white px-2 py-0.5 font-extrabold text-slate-800 ring-1 ring-slate-200">
                        {plate}
                      </span>
                    ) : null}
                  </>
                ) : (
                  "Vehículo no disponible"
                )}
              </div>
            </div>

            <span className="rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-extrabold text-green-700 ring-1 ring-green-200">
              En línea
            </span>
          </div>

          {vm.driverOpen ? (
            <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
              {rewards ? (
                <div className="flex items-center gap-3 rounded-2xl border border-white bg-white p-0">
                  <div className="relative h-16 w-16 shrink-0">
                    <img
                      src={tierBadgeSrc}
                      alt={`Insignia ${tierName}`}
                      className="h-full w-full object-contain drop-shadow-sm"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        
                        <div className="mt-0.5 text-base font-black text-slate-950">
                          {tierName}
                        </div>
                      </div>                      
                    </div>

                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <DriverPublicStat
                        label="Conf."
                        value={formatPercent(rewards.reliabilityPercent)}
                      />
                      <DriverPublicStat
                        label="Calif."
                        value={formatRating(rewards.averageRating)}
                      />
                      <DriverPublicStat
                        label="Puntos"
                        value={formatPoints(rewards.currentMonthPoints)}
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              <div className={rewards ? "mt-3 grid grid-cols-1 gap-2 text-sm text-slate-700" : "grid grid-cols-1 gap-2 text-sm text-slate-700"}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500">
                    Nombre
                  </span>
                  <span className="font-extrabold text-slate-900">
                    {name || "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500">
                    Teléfono
                  </span>
                  <span className="font-extrabold text-slate-900">
                    {phone || "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500">
                    Vehículo
                  </span>
                  <span className="font-extrabold text-slate-900">
                    {(brand || "—") + (plate ? ` · ${plate}` : "")}
                  </span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!hasPhone}
                  onClick={() => window.open(waUrl, "_blank", "noopener,noreferrer")}
                  className={[
                    "w-full rounded-2xl py-3 text-sm font-extrabold text-white transition",
                    "bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99]",
                    !hasPhone ? "opacity-50 cursor-not-allowed" : "",
                  ].join(" ")}
                >
                  WhatsApp
                </button>

                <a
                  href={callUrl}
                  className={[
                    "inline-flex items-center justify-center w-full rounded-2xl py-3 text-sm font-extrabold transition",
                    "bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.99]",
                    !hasPhone ? "pointer-events-none opacity-50" : "",
                  ].join(" ")}
                >
                  Llamar
                </a>
              </div>

              <div className="mt-2 text-center text-[11px] text-slate-500">
                Usa WhatsApp para coordinar la entrega sin perder el seguimiento.
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
