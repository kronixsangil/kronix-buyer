//components\buyer\legal\BuyerTermsModal.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";    
import {
  acceptBuyerTermsBackend,
  BUYER_TERMS_VERSION,
  saveBuyerTermsLocal,
} from "./buyerLegal";



type Props = {
  open: boolean;
  force?: boolean;
  authenticated?: boolean;
  onClose: () => void;
  onAccepted: () => void;
};

const TERMS = [
  {
    icon: "👥",
    title: "1. Naturaleza de la plataforma",
    tone: "bg-blue-50 text-blue-700",
    text: [
      "KroniX es una plataforma tecnológica de intermediación digital que conecta usuarios, comercios y conductores independientes con el fin de facilitar servicios de domicilios, compras, envíos, diligencias y soluciones logísticas urbanas.",
      "KroniX opera exclusivamente como proveedor tecnológico y de software, permitiendo la interacción entre terceros mediante herramientas digitales, sistemas de geolocalización, procesamiento de información, notificaciones y medios de conexión operativa.",
      "KroniX no actúa como empresa transportadora, operador logístico tradicional, compañía de mensajería, empleador de conductores, fabricante, vendedor de productos ni propietario de los bienes transportados mediante la plataforma.",
      "Los conductores, comercios y usuarios actúan bajo su propia autonomía, responsabilidad y capacidad legal, siendo responsables del cumplimiento de las normas civiles, comerciales, administrativas, tributarias, laborales, de tránsito y de protección al consumidor que resulten aplicables.",
      "El uso de KroniX implica la aceptación de que la plataforma funciona como un ecosistema tecnológico de conexión entre partes independientes, sin generar relaciones laborales, societarias, de representación, mandato, asociación o subordinación entre KroniX y los usuarios, comercios o conductores.",
      "KroniX podrá implementar medidas tecnológicas, operativas y de seguridad destinadas a proteger la integridad de la plataforma, la experiencia de los usuarios y el cumplimiento de la legislación aplicable.",
    ],
  },
  {
    icon: "🛡️",
    title: "2. Uso permitido",
    tone: "bg-emerald-50 text-emerald-700",
    text: [
      "El usuario se compromete a utilizar la plataforma KroniX de manera legal, ética, segura y respetuosa, conforme a la Constitución Política de Colombia, la legislación vigente y los presentes términos y condiciones.",
      "Toda persona que utilice la plataforma deberá suministrar información veraz, actualizada y legítima, evitando cualquier actuación que pueda inducir a error, fraude, suplantación, abuso de la plataforma o afectación a terceros.",
      "Se encuentra prohibido utilizar KroniX para actividades ilícitas, fraudulentas, engañosas, violentas, discriminatorias, intimidatorias o contrarias al orden público, la moral, las buenas costumbres o los derechos fundamentales de terceros.",
      "Los usuarios, comercios y conductores deberán actuar bajo principios de buena fe, respeto mutuo, convivencia, transparencia y responsabilidad, manteniendo conductas adecuadas dentro y fuera de la plataforma durante la prestación de los servicios.",
      "KroniX podrá restringir, suspender o cancelar cuentas que presenten comportamientos abusivos, lenguaje ofensivo, manipulación indebida del sistema, intentos de fraude, incumplimientos reiterados o actividades que comprometan la seguridad de la plataforma o de sus usuarios.",
      "Asimismo, KroniX podrá colaborar con autoridades judiciales, administrativas o de policía cuando existan indicios de actividades ilegales, conductas sospechosas o incumplimientos normativos relacionados con el uso de la plataforma.",
    ],
  },
  {
    icon: "🚙",
    title: "3. Objetos, Sustancias y Actividades Prohibidas",
    tone: "bg-sky-50 text-blue-600",
    text: [
      "El usuario, comercio, conductor o cualquier persona que utilice la plataforma KroniX se obliga a no solicitar, transportar, almacenar, entregar, comercializar o facilitar mediante la plataforma cualquier elemento, sustancia, producto o actividad prohibida por la legislación colombiana o aplicable en la jurisdicción correspondiente.",
      "Se encuentra estrictamente prohibido el uso de KroniX para transportar o manipular sustancias ilícitas, armas, explosivos, documentos fraudulentos, mercancía robada, contrabando, animales silvestres protegidos, sustancias biológicas peligrosas o cualquier objeto restringido por las autoridades competentes.",
      "KroniX actúa exclusivamente como plataforma tecnológica intermediaria y no inspecciona físicamente el contenido de paquetes, pedidos, envíos o diligencias realizadas por usuarios, comercios o conductores.",
      "El usuario será el único responsable por el contenido transportado y por cualquier consecuencia legal, civil, administrativa o penal derivada del uso indebido de la plataforma.",
      "KroniX podrá suspender, bloquear o cancelar cualquier cuenta presuntamente vinculada a actividades ilegales y colaborar con autoridades competentes cuando resulte necesario.",
    ],
  },
  {
    icon: "💳",
    title: "4. Pagos, pedidos y cancelaciones",
    tone: "bg-blue-50 text-blue-700",
    text: [
      "Las tarifas publicadas dentro de KroniX podrán variar según ciudad, distancia, tráfico, demanda operativa, clima, disponibilidad de conductores, horarios, promociones, costos asociados y tipo de servicio solicitado.",
      "Los pagos realizados mediante la plataforma podrán procesarse a través de proveedores tecnológicos autorizados, pasarelas de pago, billeteras digitales, entidades financieras o mecanismos electrónicos habilitados por KroniX.",
      "El usuario acepta que determinados pedidos podrán generar costos adicionales relacionados con tiempos de espera, recargos operativos, cambios de dirección, peajes, parqueaderos, compras realizadas durante diligencias, propinas voluntarias u otros conceptos previamente informados.",
      "KroniX podrá rechazar, pausar, cancelar o limitar pedidos cuando existan razones operativas, riesgos de seguridad, sospechas de fraude, incumplimientos legales, información inconsistente o situaciones que afecten el correcto funcionamiento de la plataforma.",
      "KroniX podrá conservar registros digitales, históricos de pedidos, comprobantes electrónicos y trazabilidad operativa como soporte de las transacciones realizadas dentro de la plataforma.",
    ],
  },
  {
    icon: "📍",
    title: "5. Geolocalización y notificaciones",
    tone: "bg-emerald-50 text-emerald-700",
    text: [
      "KroniX podrá utilizar herramientas de geolocalización, posicionamiento GPS, mapas, direcciones, coordenadas y tecnologías de seguimiento con el fin de facilitar la operación de pedidos, optimizar rutas, mejorar la seguridad y fortalecer la experiencia de uso dentro de la plataforma.",
      "El usuario autoriza el tratamiento temporal y operativo de información relacionada con ubicación, trayectos, puntos de recogida, destinos, tiempos estimados y movimientos asociados al uso de los servicios.",
      "KroniX podrá enviar notificaciones push, mensajes operativos, alertas, recordatorios, actualizaciones de pedidos, avisos de seguridad, confirmaciones y comunicaciones relacionadas con la actividad de la cuenta o el funcionamiento de la plataforma.",
      "El usuario reconoce que ciertas funcionalidades pueden depender del acceso a internet, permisos del dispositivo, servicios de ubicación, notificaciones activas y correcto funcionamiento del equipo móvil.",
      "KroniX implementará medidas razonables de protección de la información; sin embargo, no garantiza precisión absoluta en servicios de mapas, coordenadas, cobertura GPS o disponibilidad continua de sistemas externos de geolocalización.",
    ],
  },
  {
    icon: "⚖️",
    title: "6. Responsabilidad",
    tone: "bg-slate-100 text-slate-700",
    text: [
      "KroniX actúa exclusivamente como plataforma tecnológica de intermediación digital entre usuarios, comercios y conductores independientes.",
      "Cada usuario será responsable de sus actuaciones, decisiones, comportamientos, productos ofrecidos, contenidos transportados y obligaciones legales derivadas del uso de la plataforma.",
      "KroniX no será responsable por actuaciones independientes realizadas por usuarios, conductores o comercios por fuera de las finalidades, funcionalidades y usos autorizados dentro de la aplicación.",
      "Los conductores son terceros independientes y no empleados de KroniX, razón por la cual cada uno deberá cumplir las normas de tránsito, seguridad vial, documentación, licencias, seguros y requisitos legales aplicables.",
      "KroniX no garantiza disponibilidad permanente, funcionamiento ininterrumpido, ausencia absoluta de errores, cobertura total, compatibilidad universal ni continuidad ilimitada de los servicios tecnológicos ofrecidos.",
      "En ningún caso KroniX será responsable por daños indirectos, lucro cesante, pérdidas económicas, afectaciones derivadas de terceros, fallas de internet, eventos de fuerza mayor, hechos imprevisibles, actuaciones ilegales o usos indebidos realizados por los usuarios de la plataforma.",
      "KroniX, como intermediario tecnológico, no presta servicios de transporte de pasajeros ni asume responsabilidad por acuerdos, conductas o actividades realizadas por fuera de las finalidades permitidas dentro de la aplicación.",
    ],
  },
  {
    icon: "📄",
    title: "7. Actualizaciones",
    tone: "bg-cyan-50 text-cyan-700",
    text: [
      "KroniX podrá modificar, actualizar, reemplazar o ajustar en cualquier momento los presentes términos y condiciones, políticas operativas, funcionalidades, tarifas, servicios, métodos de pago o reglas de uso de la plataforma.",
      "Las nuevas versiones publicadas entrarán en vigencia desde su publicación dentro de la aplicación, sitio web o canales oficiales de comunicación de KroniX.",
      "El uso continuo de la plataforma después de publicadas las actualizaciones implicará aceptación expresa de las nuevas condiciones vigentes.",
      "KroniX podrá implementar mejoras tecnológicas, medidas de seguridad, cambios operativos, integraciones, restricciones temporales o ajustes funcionales orientados a optimizar la estabilidad y protección del ecosistema digital.",
      "En caso de que alguna disposición de estos términos sea considerada inválida o inaplicable por autoridad competente, las demás disposiciones conservarán plena validez y efecto jurídico.",
    ],
  },
];

export default function BuyerTermsModal({
  open,
  force = false,
  authenticated = false,
  onClose,
  onAccepted,
}: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [reachedBottom, setReachedBottom] = useState(false);
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    setReachedBottom(false);
    setChecked(false);
    setSaving(false);
  }, [open]);

  if (!open) return null;

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;

    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;

    if (distanceToBottom <= 18) {
      setReachedBottom(true);
    }
  }

  async function handleAccept() {
    if (!reachedBottom || !checked || saving) return;

    setSaving(true);

    try {
      if (authenticated) {
        await acceptBuyerTermsBackend();
      } else {
        saveBuyerTermsLocal();
      }

      onAccepted();
onClose();

alert("Gracias por aceptar los Términos y Condiciones de KroniX.");

router.replace("/");
    } catch {
      alert("No fue posible registrar la aceptación. Inténtalo nuevamente.");
    } finally {
      setSaving(false);
    }
  }

  const canCheck = reachedBottom;
  const canAccept = reachedBottom && checked && !saving;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 px-2 py-3 backdrop-blur-[2px]">
      <div className="relative flex max-h-[82dvh] w-[98%] max-w-[430px] flex-col overflow-hidden rounded-[26px] bg-white shadow-2xl ring-1 ring-white/60">
        <div className="relative border-b border-slate-100 bg-white px-5 pb-3 pt-4 text-center">
          <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-slate-200" />

          {!force ? (
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-xl font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-200"
              aria-label="Cerrar términos"
            >
              ×
            </button>
          ) : null}

          <div className="text-[24px] font-black leading-tight tracking-[-0.03em] text-slate-950">
            Términos y Condiciones
          </div>
        </div>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="terms-scroll flex-1 overflow-y-auto bg-white px-3 pb-4 pt-3 text-[13px] leading-6 text-slate-700 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="mb-4 rounded-[20px] border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-blue-50 px-4 py-4 shadow-[0_10px_24px_rgba(16,185,129,0.12)]">
            <div className="flex items-start gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-[22px] text-emerald-700">
                🛡️
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
                    Información legal
                  </span>

                  <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-800">
                    {BUYER_TERMS_VERSION}
                  </span>
                </div>

                <p className="mt-2 text-[12.5px] font-medium leading-5 text-slate-800">
                  Al crear tu cuenta aceptas el uso de KroniX como plataforma
                  tecnológica para conectar clientes, comercios y conductores aliados.
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-200">
            {TERMS.map((item) => (
              <section key={item.title} className="flex gap-3 py-4">
                <div
                  className={[
                    "grid h-12 w-12 shrink-0 place-items-center rounded-[16px] text-[22px] ring-1 ring-black/5",
                    item.tone,
                  ].join(" ")}
                >
                  {item.icon}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-[14px] font-black leading-5 text-slate-950">
                    {item.title}
                  </h3>

                  <div className="mt-1.5 space-y-4 text-[12.5px] font-medium leading-5 text-slate-600">
                    {item.text.map((p) => (
                      <p key={p}>{p}</p>
                    ))}
                  </div>
                </div>
              </section>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
            Has llegado al final del documento.
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white px-5 pb-4 pt-3">
          {!reachedBottom ? (
            <div className="mb-2 text-center text-[11px] font-bold text-slate-500">
              Lee el documento completo para habilitar la aceptación.
            </div>
          ) : null}

          <label
            className={[
              "mb-3 flex items-start gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200",
              canCheck ? "cursor-pointer" : "cursor-not-allowed opacity-60",
            ].join(" ")}
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={!canCheck}
              onChange={(e) => {
                if (!canCheck) return;
                setChecked(e.target.checked);
              }}
              className="mt-1 h-4 w-4 accent-emerald-600 disabled:cursor-not-allowed"
            />

            <span className="text-[12px] font-semibold leading-5 text-slate-700">
              Declaro que he leído, comprendido y acepto los Términos y
              Condiciones de KroniX.
            </span>
          </label>

          <button
            type="button"
            disabled={!canAccept}
            onClick={handleAccept}
            className={[
              "flex w-full items-center justify-center gap-2 rounded-[18px] py-3.5 text-[14px] font-black text-white shadow-lg active:scale-[0.98]",
              canAccept
                ? "bg-gradient-to-r from-green-500 to-emerald-600 shadow-emerald-500/25"
                : "bg-slate-300 shadow-none",
            ].join(" ")}
          >
            <span className="grid h-5 w-5 place-items-center rounded-full bg-white/20 text-xs">
              ✓
            </span>
            {saving ? "Guardando..." : "Aceptar y cerrar"}
          </button>
        </div>
      </div>
    </div>
  );
}