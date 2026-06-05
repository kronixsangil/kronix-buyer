// app/(buyer)/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useBuyerCity } from "@/components/buyer/CityContext";
import { logout } from "@/lib/authActions";
import { useCart } from "@/components/buyer/CartContext";

type MeResponse =
  | {
      user: {
        sub?: string;
        name?: string;
        email?: string;
        phone?: string;
      };
    }
  | { user?: any };


type KronixPlusStatusResponse = {
  ok?: boolean;
  approved?: boolean;
  status?: "NONE" | "PENDING" | "APPROVED" | "REJECTED" | string;
  approvedAt?: string | null;
  application?: {
    id: string;
    status: string;
    businessName?: string | null;
    businessType?: string | null;
    contactName?: string | null;
    phone?: string | null;
    email?: string | null;
    citySlug?: string | null;
    cityName?: string | null;
    expectedShipmentsPerMonth?: number | null;
    notes?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  } | null;
};

type KronixPlusApplicationForm = {
  businessName: string;
  businessType: string;
  contactName: string;
  phone: string;
  email: string;
  expectedShipmentsPerMonth: string;
  notes: string;
};

type KronixOption = {
  href: string;
  title: string;
  subtitle: string;
  featured?: boolean;
  iconEmoji?: string;
  useMotoArt?: boolean;
};

const options: KronixOption[] = [
  {
    href: "/comprar",
    title: "Tienda en Línea",
    subtitle: "Compra en nuestras tiendas afiliadas y te lo llevamos a donde quieras",
    featured: true,
  },
  {
  href: "/kronix/recoger",
  title: "Domicilio Express",
  subtitle: "Pide un motorizado rápido para una tarea simple",
  useMotoArt: true,
  iconEmoji: "/branding/kronix/recoger-llevar.png",
},
{
  href: "/kronix/enviar",
  title: "KroniX Envíos",
  subtitle: "Envíos para negocios, tiendas y clientes frecuentes",
  useMotoArt: true,
  iconEmoji: "/branding/kronix/Enviar-Paquete1.png",
},
  {
    href: "/kronix/diligencia",
    title: "Domicilios y Diligencias",
    subtitle: "Pagos, compras, trámites... lo que necesites",
    useMotoArt: false,
    iconEmoji: "/branding/kronix/check-list.png",
  },
];

function getInitials(input?: string) {
  const s = String(input ?? "").trim();
  if (!s) return "BU";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "B";
  const b =
    parts.length > 1
      ? parts[parts.length - 1]?.[0] ?? ""
      : parts[0]?.[1] ?? "";
  return (a + b).toUpperCase();
}

function HeaderCut() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[92px] overflow-hidden">
      <svg
        viewBox="0 0 400 120"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <path
          d="M0,18 C70,28 110,96 200,96 C290,96 330,28 400,18 L400,120 L0,120 Z"
          fill="#ffffff"
        />
      </svg>
    </div>
  );
}

function LeftMiniIcon({ src }: { src: string }) {
  return (
    <div className="relative h-[54px] w-[54px] shrink-0">
      <Image
        src={src}
        alt="icon"
        fill
        className="object-contain scale-150"
        sizes="54px"
      />
    </div>
  );
}

function IconChevron() {
  return <span className="text-gray-400">›</span>;
}

type KronixMenuImageIconProps = {
  src: string;
  alt: string;
  scale?: number;
  tx?: number;
  ty?: number;
};

function KronixMenuImageIcon({
  src,
  alt,
  scale = 1,
  tx = 0,
  ty = 0,
}: KronixMenuImageIconProps) {
  return (
    <div className="relative h-10 w-10 overflow-hidden rounded-2xl bg-gray-50 ring-1 ring-gray-200">
      <div
        className="relative h-full w-full"
        style={{
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transformOrigin: "center",
        }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          className="object-contain"
          sizes="40px"
        />
      </div>
    </div>
  );
}

function MenuRow({
  href,
  label,
  subtitle,
  icon,
  onClick,
  badge,
}: {
  href?: string;
  label: string;
  subtitle?: string;
  icon: React.ReactNode;
  onClick?: () => void;
  badge?: string | null;
}) {
  const content = (
    <div className="flex items-center gap-3 px-4 py-4 transition hover:bg-gray-50">
      {icon}

      <div className="min-w-0 flex-1">
        <div className="text-sm font-extrabold text-gray-900">{label}</div>
        {subtitle ? <div className="text-xs text-gray-600">{subtitle}</div> : null}
      </div>

      {badge ? (
        <span className="rounded-full bg-green-600 px-2 py-1 text-[10px] font-extrabold text-white">
          {badge}
        </span>
      ) : (
        <IconChevron />
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} onClick={onClick} className="block border-b border-gray-100 last:border-b-0">
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full border-b border-gray-100 text-left last:border-b-0"
    >
      {content}
    </button>
  );
}

function FeaturedCard({ item }: { item: KronixOption }) {
  return (
    <Link
      href={item.href}
      className="group block min-h-[104px] overflow-hidden rounded-[24px] border border-blue-600/20 bg-white shadow-[0_10px_22px_rgba(10,32,78,0.14)] transition hover:shadow-[0_12px_24px_rgba(10,32,78,0.18)] active:scale-[0.995]"
    >
      <div className="relative flex min-h-[104px] items-center overflow-hidden rounded-[24px] bg-gradient-to-br from-[#03102b] via-[#082b63] to-gray-800 px-2 py-1 text-white">
        <div className="absolute -left-8 top-3 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-white/12 blur-2xl" />

        <div className="relative flex w-full items-center gap-2">
          <div className="relative h-[50px] w-[50px] shrink-0">
            <Image
              src="/branding/kronix/card-comprar6.png"
              alt="Comprar algo"
              fill
              className="object-contain drop-shadow-sm scale-140 translate-y-[-5px]"
              sizes="60px"
              priority
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-[24px] font-black leading-tight">{item.title}</div>
            <div className="mt-1 text-[14px] font-semibold text-white/90">{item.subtitle}</div>
          </div>

          <div className="text-[30px] font-black text-white/75 transition group-hover:translate-x-0.5">
            ›
          </div>
        </div>
      </div>
    </Link>
  );
}

function StandardCard({
  item,
  onClick,
}: {
  item: KronixOption;
  onClick?: () => void;
}) {
  const content = (
    <div className="flex h-full items-center gap-3">
      {/* ICONO IZQUIERDO */}
      <div className="shrink-0">
        <LeftMiniIcon src={item.iconEmoji || ""} />
      </div>

      {/* TEXTO */}
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        {/* TITULO */}
        <div
          className={[
            "ml-1 font-black text-slate-900 leading-tight whitespace-nowrap",
            item.title === "Domicilios y Diligencias"
              ? "text-[18px]"
              : "text-[22px]",
          ].join(" ")}
        >
          {item.title}
        </div>

        {/* SUBTITULO */}
        <div
          className={[
            "ml-4 mt-1 font-medium text-slate-500",
            "text-[13px] leading-[16px]",
            "line-clamp-3",
            item.title === "Domicilio Express"
              ? "max-w-[220px]"
              : "",
            item.title === "KroniX Envíos"
              ? "max-w-[220px]"
              : "",
            item.title === "Domicilios y Diligencias"
              ? "max-w-[220px]"
              : "",
          ].join(" ")}
        >
          {item.subtitle}
        </div>
      </div>

      {/* MOTO / IMAGEN DERECHA */}
      {item.useMotoArt ? (
        <div className="relative h-[62px] w-[102px] shrink-0">
          <Image
            src={
              item.title === "KroniX Envíos"
                ? "/branding/kronix/enviar-Paquete2.png"
                : "/branding/kronix/card-moto.png"
            }
            alt={item.title}
            fill
            className="object-contain opacity-95 scale-[1.65] translate-x-2"
            sizes="102px"
          />
        </div>
      ) : null}

      {/* CHEVRON */}
      <div className="shrink-0 text-[28px] font-black text-slate-300 transition group-hover:translate-x-0.5">
        ›
      </div>
    </div>
  );

  const cls =
    "group block h-[110px] w-full overflow-hidden rounded-[24px] border border-slate-200 bg-white px-4 py-1 text-left shadow-[0_8px_18px_rgba(15,23,42,0.08)] transition hover:shadow-[0_10px_20px_rgba(15,23,42,0.11)] active:scale-[0.995]";

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls}>
        {content}
      </button>
    );
  }

  return (
    <Link href={item.href} className={cls}>
      {content}
    </Link>
  );
}

function KronixPlusApplicationPanel({
  status,
  form,
  saving,
  error,
  success,
  onBack,
  onChange,
  onSubmit,
}: {
  status: KronixPlusStatusResponse | null;
  form: KronixPlusApplicationForm;
  saving: boolean;
  error: string | null;
  success: string | null;
  onBack: () => void;
  onChange: (field: keyof KronixPlusApplicationForm, value: string) => void;
  onSubmit: () => void | Promise<void>;
}) {
  const currentStatus = String(status?.status ?? "NONE").toUpperCase();
  const isPending = currentStatus === "PENDING";
  const isRejected = currentStatus === "REJECTED";

  return (
    <div className="space-y-2 pb-4">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
        <div className="relative overflow-hidden px-4 pb-5 pt-4 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.28),transparent_32%),linear-gradient(135deg,#03102b_0%,#082b63_54%,#0f172a_100%)]" />
          <div className="pointer-events-none absolute inset-0 opacity-80">
            <span className="absolute left-[10%] top-[20%] h-1 w-1 rounded-full bg-white" />
            <span className="absolute left-[34%] top-[12%] h-[3px] w-[3px] rounded-full bg-white" />
            <span className="absolute right-[18%] top-[22%] h-1 w-1 rounded-full bg-white" />
            <span className="absolute right-[38%] bottom-[26%] h-[3px] w-[3px] rounded-full bg-white" />
          </div>

          <div className="relative z-10">
            <button
              type="button"
              onClick={onBack}
              className="mb-4 inline-flex h-6 items-center gap-2 rounded-full bg-white/12 px-4 text-[13px] font-black text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/18"
            >
              SALIR
            </button>

            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                
                <h2 className="mt-3 text-[25px] font-black leading-tight text-white">
                  Activa KroniX Envíos para tu negocio
                </h2>
                
              </div>

              <div className="relative hidden h-[104px] w-[120px] shrink-0 sm:block">
                <Image
                  src="/branding/kronix/enviar-Paquete2.png"
                  alt="KroniX Envíos"
                  fill
                  className="object-contain scale-[1.25] drop-shadow-[0_18px_28px_rgba(0,0,0,0.35)]"
                  sizes="120px"
                />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-[18px] bg-white/12 px-2 py-3 ring-1 ring-white/15">
                <div className="text-[18px] font-black">$0</div>
                <div className="mt-1 text-[10px] font-bold leading-tight text-white/75">Aplicación</div>
              </div>
              <div className="rounded-[18px] bg-white/12 px-2 py-3 ring-1 ring-white/15">
                <div className="text-[18px] font-black">24-48h</div>
                <div className="mt-1 text-[10px] font-bold leading-tight text-white/75">Validación inicial</div>
              </div>
              <div className="rounded-[18px] bg-white/12 px-2 py-3 ring-1 ring-white/15">
                <div className="text-[18px] font-black">Plus</div>
                <div className="mt-1 text-[10px] font-bold leading-tight text-white/75">Acceso aprobado</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-1 bg-white p-0">          
          {isPending ? (
            <div className="rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-bold leading-5 text-amber-900">
              Ya tienes una solicitud pendiente. Puedes actualizar los datos y volver a enviarla.
            </div>
          ) : null}

          {isRejected ? (
            <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-bold leading-5 text-rose-900">
              Tu solicitud anterior fue marcada para revisión. Puedes enviar datos actualizados para una nueva validación.
            </div>
          ) : null}

          <div className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.055)]">
            <div className="mb-4">
              <div className="text-[19px] font-black leading-tight text-slate-950">
                Solicitud KroniX Plus
              </div>
              <div className="mt-1 text-[13px] font-semibold leading-5 text-slate-500">
                Déjanos tus datos y nuestro equipo validará si tu volumen aplica para KroniX Envíos.
              </div>
            </div>

            <div className="grid gap-3">
              <input
                value={form.businessName}
                onChange={(e) => onChange("businessName", e.target.value)}
                placeholder="Nombre del negocio o actividad *"
                className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] font-semibold text-slate-900 outline-none focus:border-blue-300 focus:bg-white"
                maxLength={120}
              />

              <input
                value={form.businessType}
                onChange={(e) => onChange("businessType", e.target.value)}
                placeholder="Tipo de cliente: tienda, negocio, emprendedor..."
                className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] font-semibold text-slate-900 outline-none focus:border-blue-300 focus:bg-white"
                maxLength={80}
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  value={form.contactName}
                  onChange={(e) => onChange("contactName", e.target.value)}
                  placeholder="Nombre de contacto *"
                  className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] font-semibold text-slate-900 outline-none focus:border-blue-300 focus:bg-white"
                  maxLength={80}
                />

                <input
                  value={form.phone}
                  onChange={(e) =>
                    onChange("phone", e.target.value.replace(/\D/g, "").slice(0, 15))
                  }
                  placeholder="Teléfono *"
                  inputMode="numeric"
                  className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] font-semibold text-slate-900 outline-none focus:border-blue-300 focus:bg-white"
                  maxLength={15}
                />
              </div>

              <input
                value={form.email}
                onChange={(e) => onChange("email", e.target.value)}
                placeholder="Correo electrónico"
                type="email"
                className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] font-semibold text-slate-900 outline-none focus:border-blue-300 focus:bg-white"
                maxLength={120}
              />

              <input
                value={form.expectedShipmentsPerMonth}
                onChange={(e) =>
                  onChange(
                    "expectedShipmentsPerMonth",
                    e.target.value.replace(/\D/g, "").slice(0, 5)
                  )
                }
                placeholder="Envíos estimados al mes *"
                inputMode="numeric"
                className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] font-semibold text-slate-900 outline-none focus:border-blue-300 focus:bg-white"
                maxLength={5}
              />

              <textarea
                value={form.notes}
                onChange={(e) => onChange("notes", e.target.value)}
                placeholder="Cuéntanos qué envías, desde dónde despachas y cualquier detalle importante."
                rows={4}
                className="w-full resize-none rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] font-semibold text-slate-900 outline-none focus:border-blue-300 focus:bg-white"
                maxLength={700}
              />
            </div>

            {error ? (
              <div className="mt-4 rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-700">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="mt-4 rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] font-bold text-emerald-800">
                {success}
              </div>
            ) : null}

            <button
              type="button"
              onClick={onSubmit}
              disabled={saving}
              className="mt-5 w-full rounded-[22px] bg-[linear-gradient(90deg,#0c45ff_0%,#0b8bdf_50%,#1fd09a_100%)] px-4 py-4 text-[15px] font-black text-white shadow-[0_12px_22px_rgba(12,69,255,0.22)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Enviando solicitud..." : "Solicitar acceso KroniX Plus"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { city } = useBuyerCity();
  const { items } = useCart();

  const [me, setMe] = useState<MeResponse["user"] | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [kronixPlusStatus, setKronixPlusStatus] =
    useState<KronixPlusStatusResponse | null>(null);
  const [kronixPlusModalOpen, setKronixPlusModalOpen] = useState(false);
  const [kronixPlusSaving, setKronixPlusSaving] = useState(false);
  const [kronixPlusError, setKronixPlusError] = useState<string | null>(null);
  const [kronixPlusSuccess, setKronixPlusSuccess] = useState<string | null>(null);
  const [kronixPlusForm, setKronixPlusForm] =
    useState<KronixPlusApplicationForm>({
      businessName: "",
      businessType: "",
      contactName: "",
      phone: "",
      email: "",
      expectedShipmentsPerMonth: "",
      notes: "",
    });

  const cartCount = items.reduce((acc, it) => acc + it.qty, 0);

  useEffect(() => {
    let alive = true;

    apiFetch<MeResponse>("/auth/me", {
      method: "GET",
      cache: "no-store",
    })
      .then((data) => {
        if (!alive) return;
        const user = (data as any)?.user ?? null;
        setMe(user && typeof user === "object" ? user : null);
      })
      .catch(() => {
        if (!alive) return;
        setMe(null);
      });

    return () => {
      alive = false;
    };
  }, []);


  useEffect(() => {
    let alive = true;

    if (!me || !(me as any)?.sub) {
      setKronixPlusStatus(null);
      return () => {
        alive = false;
      };
    }

    apiFetch<KronixPlusStatusResponse>("/users/me/kronix-plus/status", {
      method: "GET",
      suppressSessionExpiredEvent: true,
    } as any)
      .then((data) => {
        if (!alive) return;
        setKronixPlusStatus(data);

        const app = data?.application;
        setKronixPlusForm((prev) => ({
          ...prev,
          businessName: prev.businessName || String(app?.businessName ?? ""),
          businessType: prev.businessType || String(app?.businessType ?? ""),
          contactName: prev.contactName || String(app?.contactName ?? ""),
phone:
  prev.phone ||
  String(app?.phone ?? "")
    .replace(/\D/g, "")
    .slice(0, 15),
email: prev.email || String(app?.email ?? ""),
          expectedShipmentsPerMonth:
            prev.expectedShipmentsPerMonth ||
            String(app?.expectedShipmentsPerMonth ?? ""),
          notes: prev.notes || String(app?.notes ?? ""),
        }));
      })
      .catch(() => {
        if (!alive) return;
        setKronixPlusStatus(null);
      });

    return () => {
      alive = false;
    };
  }, [me]);

  const displayName = useMemo(() => {
    const n = String((me as any)?.name ?? "").trim();
    if (n) return n;
    const e = String((me as any)?.email ?? "").trim();
    if (e) return e.split("@")[0].replace(/[._-]/g, " ").trim();
    const p = String((me as any)?.phone ?? "").trim();
    if (p) return p;
    return "Usuario";
  }, [me]);

  const initials = useMemo(() => getInitials(displayName), [displayName]);

  const cityName = String(city?.name ?? "").trim() || "Tu ciudad";
  const cityDepartment = String(city?.department ?? "").trim();

  const isLoggedIn = !!(me && (me as any)?.sub);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      await logout();
    } finally {
      setLoggingOut(false);
      setMenuOpen(false);
      window.dispatchEvent(new Event("ct-auth-changed"));
      window.dispatchEvent(new Event("auth:changed"));
      window.location.href = "/";
    }
  }


  function updateKronixPlusForm(
    field: keyof KronixPlusApplicationForm,
    value: string
  ) {
    setKronixPlusForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    setKronixPlusError(null);
    setKronixPlusSuccess(null);
  }

  async function handleKronixEnviosClick() {
    setMenuOpen(false);

    if (!isLoggedIn) {
      router.push("/login?next=/");
      return;
    }

    if (kronixPlusStatus?.approved) {
      router.push("/kronix/enviar");
      return;
    }

    
    setKronixPlusError(null);
    setKronixPlusSuccess(null);
    setKronixPlusModalOpen(true);
    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch {}
  }

  async function submitKronixPlusApplication() {
    if (kronixPlusSaving) return;

    const expectedShipments = Number(
      kronixPlusForm.expectedShipmentsPerMonth || 0
    );

    if (kronixPlusForm.businessName.trim().length < 2) {
      setKronixPlusError("Escribe el nombre de tu negocio o actividad.");
      return;
    }

    if (kronixPlusForm.contactName.trim().length < 3) {
      setKronixPlusError("Escribe el nombre de la persona de contacto.");
      return;
    }

    if (kronixPlusForm.phone.replace(/\D/g, "").length < 7) {
      setKronixPlusError("Escribe un teléfono válido para contactarte.");
      return;
    }

    if (!Number.isFinite(expectedShipments) || expectedShipments < 1) {
      setKronixPlusError("Indica cuántos envíos estimas hacer al mes.");
      return;
    }

    setKronixPlusSaving(true);
    setKronixPlusError(null);
    setKronixPlusSuccess(null);

    try {
      const res = await apiFetch<KronixPlusStatusResponse>(
        "/users/me/kronix-plus/apply",
        {
          method: "POST",
          json: {
            businessName: kronixPlusForm.businessName.trim(),
            businessType: kronixPlusForm.businessType.trim() || null,
            contactName: kronixPlusForm.contactName.trim(),
            phone: kronixPlusForm.phone.replace(/\D/g, "").slice(0, 15),
            email: kronixPlusForm.email.trim() || null,
            citySlug: String(city?.slug ?? "").trim() || null,
            cityName:
              `${cityName}${cityDepartment ? `, ${cityDepartment}` : ""}`.trim() ||
              null,
            expectedShipmentsPerMonth: expectedShipments,
            notes: kronixPlusForm.notes.trim() || null,
          },
        }
      );

      setKronixPlusStatus(res);
      setKronixPlusSuccess(
        "Solicitud enviada. KroniX revisará tu volumen y te contactará para validar el acceso."
      );
    } catch (e: any) {
      setKronixPlusError(
        String(e?.message ?? "No pudimos enviar la solicitud. Intenta nuevamente.")
      );
    } finally {
      setKronixPlusSaving(false);
    }
  }

  return (
    <>
      <div className="min-h-full bg-white">
      <section
        className="relative overflow-visible px-4 pb-[72px] pt-4 text-white"
        style={{
          background:
            "linear-gradient(180deg, #03102b 0%, #082b63 34%, #0a5f9c 66%, black 100%)",
        }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent_32%,transparent)]" />

        <div className="pointer-events-none absolute inset-0 opacity-90">
          <div className="absolute left-[22px] top-[18px] h-[4px] w-[4px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)]" />
          <div className="absolute left-[56px] top-[34px] h-[3px] w-[3px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)]" />
          <div className="absolute left-[132px] top-[24px] h-[4px] w-[4px] rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,1)]" />
          <div className="absolute left-[184px] top-[18px] h-[3px] w-[3px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)]" />
          <div className="absolute right-[40px] top-[24px] h-[4px] w-[4px] rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,1)]" />
          <div className="absolute right-[82px] top-[42px] h-[3px] w-[3px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)]" />
          <div className="absolute right-[122px] top-[18px] h-[3px] w-[3px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)]" />
          <div className="absolute left-[88px] top-[62px] h-[3px] w-[3px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)]" />
          <div className="absolute right-[158px] top-[62px] h-[4px] w-[4px] rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,1)]" />
          <div className="absolute left-[220px] top-[50px] h-[3px] w-[3px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)]" />
        </div>

        <div className="absolute -left-14 top-14 h-28 w-28 rounded-full bg-cyan-300/10 blur-2xl" />
        <div className="absolute right-[-18px] bottom-4 h-28 w-28 rounded-full bg-emerald-200/14 blur-2xl" />
        <div className="absolute left-1/2 top-10 h-24 w-44 -translate-x-1/2 rounded-full bg-white/8 blur-2xl" />

        <div className="relative z-10 flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="grid h-12 w-12 place-items-center rounded-full border border-white/20 bg-white/10 shadow-sm backdrop-blur"
            aria-label="Abrir menú"
          >
            <span className="flex h-5 w-5 flex-col items-center justify-center gap-[4px]">
              <span
                className={`block h-[2.5px] w-5 rounded-full bg-white transition-all duration-200 ${
                  menuOpen ? "translate-y-[6px] rotate-45" : ""
                }`}
              />
              <span
                className={`block h-[2.5px] w-5 rounded-full bg-white transition-all duration-200 ${
                  menuOpen ? "opacity-0" : ""
                }`}
              />
              <span
                className={`block h-[2.5px] w-5 rounded-full bg-white transition-all duration-200 ${
                  menuOpen ? "-translate-y-[6px] -rotate-45" : ""
                }`}
              />
            </span>
          </button>

          <div className="flex flex-1 items-center justify-center px-1">
            <div className="relative h-[96px] w-[274px] sm:w-[292px]">
              <Image
                src="/branding/kronix/header-logo.png"
                alt="KroniX"
                fill
                className="object-contain drop-shadow-[0_10px_26px_rgba(0,0,0,0.45)] scale-110"
                sizes="292px"
                priority
              />
            </div>
          </div>

          <Link
            href="/profile"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 text-sm font-black text-white shadow-sm backdrop-blur"
            aria-label="Perfil"
          >
            {initials}
          </Link>
        </div>

        <div className="relative z-10 -mt-1 flex items-center justify-center gap-2 text-cyan-100">
          <span className="text-[14px]">📍</span>
          <span className="text-[14px] font-semibold">
            {cityName}
            {cityDepartment ? ` - ${cityDepartment}` : ""}
          </span>
        </div>

        {menuOpen ? (
          <div className="absolute left-4 right-4 top-[96px] z-[120] overflow-hidden rounded-[26px] border border-gray-200 bg-white shadow-2xl">
            <div className="no-scrollbar max-h-[calc(100dvh-11.5rem)] overflow-y-auto">
              <div className="relative overflow-hidden border-b border-white/10 px-4 py-4 text-white">
                <div className="absolute inset-0 bg-gradient-to-br from-[#0a1f44] via-[#0b5ed7] to-black" />

                <div className="absolute inset-0 pointer-events-none opacity-95">
                  <span className="absolute left-[8%] top-[18%] h-[3px] w-[3px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)]" />
                  <span className="absolute left-[18%] top-[30%] h-[2px] w-[2px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)]" />
                  <span className="absolute left-[30%] top-[12%] h-[3px] w-[3px] rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,1)]" />
                  <span className="absolute left-[44%] top-[24%] h-[2px] w-[2px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)]" />
                  <span className="absolute left-[56%] top-[14%] h-[3px] w-[3px] rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,1)]" />
                  <span className="absolute left-[72%] top-[22%] h-[2px] w-[2px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)]" />
                  <span className="absolute right-[10%] top-[16%] h-[3px] w-[3px] rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,1)]" />
                  <span className="absolute right-[18%] top-[34%] h-[2px] w-[2px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)]" />
                  <span className="absolute left-[22%] top-[58%] h-[2px] w-[2px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)]" />
                  <span className="absolute right-[28%] top-[56%] h-[3px] w-[3px] rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,1)]" />
                </div>

                <div className="absolute -left-10 top-6 h-24 w-24 rounded-full bg-cyan-300/10 blur-2xl" />
                <div className="absolute right-[-8px] bottom-2 h-24 w-24 rounded-full bg-emerald-200/10 blur-2xl" />
                <div className="absolute left-1/2 top-4 h-20 w-40 -translate-x-1/2 rounded-full bg-white/8 blur-2xl" />

                <div className="relative flex items-center gap-3">
                  <div className="grid h-14 w-14 place-items-center rounded-full bg-white/15 font-extrabold ring-1 ring-white/20 backdrop-blur-sm">
                    {isLoggedIn ? initials : "KR"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-lg font-extrabold text-white">
                      {isLoggedIn ? `¡Hola ${displayName}!` : "KroniX"}
                    </div>
                    <div className="truncate text-sm text-white/90">
                      {isLoggedIn
                        ? String(
                            (me as any)?.email ??
                              (me as any)?.phone ??
                              `${cityName}${cityDepartment ? `, ${cityDepartment}` : ""}`
                          )
                        : `${cityName}${cityDepartment ? `, ${cityDepartment}` : ""}`}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white">
                <MenuRow
                  href="/"
                  onClick={() => setMenuOpen(false)}
                  label="Inicio"
                  subtitle="Menú principal"
                  icon={
                    <KronixMenuImageIcon
                      src="/icons/inicio.png"
                      alt="Inicio"
                      scale={1.12}
                      tx={0}
                      ty={0}
                    />
                  }
                />
                <MenuRow
                  href="/comprar"
                  onClick={() => setMenuOpen(false)}
                  label="Comprar algo"
                  subtitle="Negocios y productos"
                  icon={
                    <KronixMenuImageIcon
                      src="/icons/compraralgo.png"
                      alt="Comprar algo"
                      scale={1.12}
                      tx={0}
                      ty={0}
                    />
                  }
                />
                <MenuRow
                  href="/orders"
                  onClick={() => setMenuOpen(false)}
                  label="Pedidos"
                  subtitle="Tus órdenes y estados"
                  icon={
                    <KronixMenuImageIcon
                      src="/icons/pedidos.png"
                      alt="Pedidos"
                      scale={1.12}
                      tx={0}
                      ty={0}
                    />
                  }
                />
                <MenuRow
                  href="/cart"
                  onClick={() => setMenuOpen(false)}
                  label="Carrito"
                  subtitle="Productos agregados"
                  icon={
                    <KronixMenuImageIcon
                      src="/icons/carrito.png"
                      alt="Carrito"
                      scale={1.12}
                      tx={0}
                      ty={0}
                    />
                  }
                  badge={cartCount > 0 ? String(cartCount) : null}
                />
                <MenuRow
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  label="Perfil"
                  subtitle="Cuenta y configuración"
                  icon={
                    <KronixMenuImageIcon
                      src="/icons/perfil.png"
                      alt="Perfil"
                      scale={1.12}
                      tx={0}
                      ty={0}
                    />
                  }
                />
                <MenuRow
                  href="/profile/info"
                  onClick={() => setMenuOpen(false)}
                  label="Tu información"
                  subtitle="Datos personales básicos"
                  icon={
                    <KronixMenuImageIcon
                      src="/icons/informacion.png"
                      alt="Tu información"
                      scale={1.12}
                      tx={0}
                      ty={0}
                    />
                  }
                />
                <MenuRow
                  href="/profile/security"
                  onClick={() => setMenuOpen(false)}
                  label="Seguridad"
                  subtitle="Contraseña y sesiones"
                  icon={
                    <KronixMenuImageIcon
                      src="/icons/seguridad.png"
                      alt="Seguridad"
                      scale={1.12}
                      tx={0}
                      ty={0}
                    />
                  }
                />
                <MenuRow
                  href="/profile/cards"
                  onClick={() => setMenuOpen(false)}
                  label="Tarjetas"
                  subtitle="Tus métodos de pago"
                  icon={
                    <KronixMenuImageIcon
                      src="/icons/tarjetas.png"
                      alt="Tarjetas"
                      scale={1.1}
                      tx={0}
                      ty={0}
                    />
                  }
                />
                <MenuRow
                  href="/profile/addresses"
                  onClick={() => setMenuOpen(false)}
                  label="Direcciones"
                  subtitle="Se guardan con tus pedidos"
                  icon={
                    <KronixMenuImageIcon
                      src="/icons/direcciones.png"
                      alt="Direcciones"
                      scale={1.12}
                      tx={0}
                      ty={0}
                    />
                  }
                />
                <MenuRow
                  href="/profile/privacy"
                  onClick={() => setMenuOpen(false)}
                  label="Privacidad"
                  subtitle="Controla tu cuenta y datos"
                  icon={
                    <KronixMenuImageIcon
                      src="/icons/privacidad.png"
                      alt="Privacidad"
                      scale={1.12}
                      tx={0}
                      ty={0}
                    />
                  }
                />
                <MenuRow
                  href="/profile/support"
                  onClick={() => setMenuOpen(false)}
                  label="Soporte"
                  subtitle="Ayuda y contacto"
                  icon={
                    <KronixMenuImageIcon
                      src="/icons/soporte.png"
                      alt="Soporte"
                      scale={1.12}
                      tx={0}
                      ty={0}
                    />
                  }
                />

                {isLoggedIn ? (
                  <MenuRow
                    onClick={handleLogout}
                    label={loggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
                    subtitle="Salir de tu cuenta actual"
                    icon={
                    <KronixMenuImageIcon
                      src="/icons/cerrarsesion.png"
                      alt="Soporte"
                      scale={1.12}
                      tx={0}
                      ty={0}
                    />
                  }
                  />
                ) : (
                  <MenuRow
                    href="/login?next=/"
                    onClick={() => setMenuOpen(false)}
                    label="Iniciar sesión"
                    subtitle="Accede a tu cuenta"
                    icon={
                      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gray-50 text-gray-700 ring-1 ring-gray-200">
                        <span aria-hidden="true">👤</span>
                      </div>
                    }
                  />
                )}
              </div>
            </div>

            <style jsx>{`
              .no-scrollbar {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
              .no-scrollbar::-webkit-scrollbar {
                display: none;
              }
            `}</style>
          </div>
        ) : null}

        <HeaderCut />
      </section>

      <section className="relative z-0 -mt-[2px] bg-white px-4 pb-5 pt-1">
        {kronixPlusModalOpen ? (
          <KronixPlusApplicationPanel
            status={kronixPlusStatus}
            form={kronixPlusForm}
            saving={kronixPlusSaving}
            error={kronixPlusError}
            success={kronixPlusSuccess}
            onBack={() => {
              setKronixPlusModalOpen(false);
              setKronixPlusError(null);
              setKronixPlusSuccess(null);
            }}
            onChange={updateKronixPlusForm}
            onSubmit={submitKronixPlusApplication}
          />
        ) : (
          <>
            <div className="text-center">
              <h1 className="text-[31px] font-black leading-none tracking-tight text-[#06153a]">
                ¿Qué necesitas hoy?
              </h1>
              <p className="mt-3 text-[15px] font-medium text-slate-500">
                Elige un servicio y lo resolvemos por ti
              </p>
            </div>

            <div className="mt-5 space-y-3">
              {options.map((item) =>
                item.featured ? (
                  <FeaturedCard key={item.title} item={item} />
                ) : (
                  <StandardCard
                    key={item.title}
                    item={item}
                    onClick={
                      item.title === "KroniX Envíos"
                        ? handleKronixEnviosClick
                        : undefined
                    }
                  />
                )
              )}
            </div>
          </>
        )}
      </section>
      </div>
    </>
  );
}