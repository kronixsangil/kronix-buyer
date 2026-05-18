// app/(buyer)/register/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

export default function BuyerRegisterPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");

const [showPass, setShowPass] = useState(false);
const [showConfirmPass, setShowConfirmPass] = useState(false);
const [termsAccepted, setTermsAccepted] = useState(false);
const [showTermsModal, setShowTermsModal] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = useMemo(() => {
    const n = String(sp.get("next") ?? "").trim();
    if (!n || !n.startsWith("/")) return "/";
    return n;
  }, [sp]);

  const passwordsMatch =
  password.trim().length > 0 &&
  confirmPassword.trim().length > 0 &&
  password === confirmPassword;

const canSubmit =
  phone.trim().length >= 7 &&
  password.trim().length >= 4 &&
  passwordsMatch &&
  termsAccepted &&
  !loading;

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    if (password !== confirmPassword) {
  setError("Las contraseñas no coinciden.");
  setLoading(false);
  return;
}
    try {
      await apiFetch("/auth/register", {
        method: "POST",
        json: {
          name: name.trim() || "Usuario",
          phone: phone.trim(),
          email: email.trim() || null,
          password: password.trim(),
          termsAccepted: true,
          termsVersion: "v1.0",
        },
      });

      // ✅ importante: refresca header/profile
      window.dispatchEvent(new Event("ct-auth-changed"));

      router.replace(next);
    } catch (e: any) {
      const msg = String(e?.message ?? "").toLowerCase();
      if (msg.includes("phone_already_used") || msg.includes("phone") && msg.includes("used")) {
        setError("Este teléfono ya está registrado.");
      } else if (msg.includes("email_already_used")) {
        setError("Este email ya está registrado.");
      } else {
        setError("No pudimos crear tu cuenta. Revisa tus datos e intenta de nuevo.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="px-4 pt-6 pb-6">
      <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-gradient-to-b from-gray-50 to-white p-4 border-b border-gray-100">
          <div className="text-[11px] font-extrabold text-gray-500">KroniX</div>
          <div className="mt-1 text-lg font-extrabold text-gray-900">Crear cuenta</div>
          <div className="mt-1 text-xs text-gray-600">
            Regístrate para guardar pedidos, direcciones y tu historial.
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <div className="text-xs font-extrabold text-gray-800">Nombre</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Blass"
              className={cx(
                "mt-2 w-full rounded-2xl border px-3 py-3 text-sm outline-none bg-gray-50",
                "border-gray-200 focus:bg-white focus:border-gray-300"
              )}
            />
          </div>

          <div>
            <div className="text-xs font-extrabold text-gray-800">Teléfono (obligatorio)</div>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ej: 3112461059"
              inputMode="tel"
              className={cx(
                "mt-2 w-full rounded-2xl border px-3 py-3 text-sm outline-none bg-gray-50",
                "border-gray-200 focus:bg-white focus:border-gray-300"
              )}
            />
          </div>

          <div>
            <div className="text-xs font-extrabold text-gray-800">Email (opcional)</div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ej: tu@email.com"
              autoComplete="email"
              className={cx(
                "mt-2 w-full rounded-2xl border px-3 py-3 text-sm outline-none bg-gray-50",
                "border-gray-200 focus:bg-white focus:border-gray-300"
              )}
            />
          </div>

          <div>
  <div className="text-xs font-extrabold text-gray-800">Contraseña</div>

  <div className="mt-2 flex items-center gap-2">
    <input
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      placeholder="Mínimo 4 caracteres"
      autoComplete="new-password"
      type={showPass ? "text" : "password"}
      className={cx(
        "flex-1 rounded-2xl border px-3 py-3 text-sm outline-none bg-gray-50 transition",
        password.length > 0 && !passwordsMatch && confirmPassword.length > 0
          ? "border-red-300 bg-red-50 focus:border-red-400"
          : "border-gray-200 focus:bg-white focus:border-gray-300"
      )}
    />

  <button
      type="button"
      onClick={() => setShowPass((v) => !v)}
      className={cx(
        "shrink-0 rounded-2xl border px-3 py-3 text-xs font-extrabold",
        "border-gray-200 bg-white text-gray-800 hover:bg-gray-50"
      )}
    >
      {showPass ? "Ocultar" : "Ver"}
    </button>
  </div>

  <div className="mt-4 text-xs font-extrabold text-gray-800">
    Confirmar contraseña
  </div>

  <div className="mt-2 flex items-center gap-2">
    <input
      value={confirmPassword}
      onChange={(e) => setConfirmPassword(e.target.value)}
      placeholder="Escribe nuevamente tu contraseña"
      autoComplete="new-password"
      type={showConfirmPass ? "text" : "password"}
      className={cx(
        "flex-1 rounded-2xl border px-3 py-3 text-sm outline-none bg-gray-50 transition",
        confirmPassword.length > 0 && !passwordsMatch
          ? "border-red-300 bg-red-50 focus:border-red-400"
          : "border-gray-200 focus:bg-white focus:border-gray-300"
      )}
      onKeyDown={(e) => {
        if (e.key === "Enter" && canSubmit) handleSubmit();
      }}
    />

    <button
      type="button"
      onClick={() => setShowConfirmPass((v) => !v)}
      className={cx(
        "shrink-0 rounded-2xl border px-3 py-3 text-xs font-extrabold",
        "border-gray-200 bg-white text-gray-800 hover:bg-gray-50"
      )}
    >
      {showConfirmPass ? "Ocultar" : "Ver"}
    </button>
  </div>

  {confirmPassword.length > 0 && !passwordsMatch ? (
    <div className="mt-2 text-xs font-bold text-red-600">
      Las contraseñas no coinciden.
    </div>
  ) : confirmPassword.length > 0 && passwordsMatch ? (
    <div className="mt-2 text-xs font-bold text-emerald-600">
      Contraseñas coinciden correctamente.
    </div>
  ) : null}
</div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
              {error}
            </div>
          ) : null}

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
  <label className="flex items-start gap-3 cursor-pointer">
    <input
      type="checkbox"
      checked={termsAccepted}
      onChange={(e) => setTermsAccepted(e.target.checked)}
      className="mt-1 h-4 w-4 rounded border-gray-300"
    />

    <div className="text-[12px] leading-5 text-gray-700">
      Acepto los{" "}
      <button
  type="button"
  onClick={() => setShowTermsModal(true)}
  className="font-extrabold text-blue-700 hover:underline"
>
  Términos y Condiciones
</button>{" "}
      y autorizo el tratamiento de mis datos conforme a la política de privacidad de KroniX.
    </div>
  </label>
</div>

          <button
            disabled={!canSubmit}
            onClick={handleSubmit}
            className={cx(
              "w-full rounded-2xl py-3 text-sm font-extrabold text-white",
              "bg-green-600 hover:bg-green-700 disabled:opacity-50"
            )}
          >
            {loading ? "Creando…" : "CREAR CUENTA"}
          </button>

          <div className="text-center text-[12px] text-gray-600">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="font-extrabold text-blue-700 hover:underline">
              Inicia sesión
            </Link>
          </div>
        </div>
      </div>
      {showTermsModal ? (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 px-4 py-5 backdrop-blur-[2px]">
    <div className="relative flex max-h-[88dvh] w-[97%] max-w-[430px] flex-col overflow-hidden rounded-[26px] bg-white shadow-2xl ring-1 ring-white/60">
      <div className="relative overflow-hidden px-5 pb-14 pt-6 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-[#03102b] via-[#0b356d] via-55% to-white" />

        <div className="pointer-events-none absolute inset-0">
          <span className="absolute left-[14%] top-[24%] h-1 w-1 rounded-full bg-white/90" />
          <span className="absolute left-[34%] top-[38%] h-[3px] w-[3px] rounded-full bg-white/80" />
          <span className="absolute left-[64%] top-[22%] h-1 w-1 rounded-full bg-white/90" />
          <span className="absolute left-[82%] top-[36%] h-[3px] w-[3px] rounded-full bg-white/80" />
        </div>

        <div className="relative z-10 mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/45" />

        <button
          type="button"
          onClick={() => setShowTermsModal(false)}
          className="absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full bg-white/15 text-xl font-black text-white ring-1 ring-white/30 backdrop-blur hover:bg-white/25"
          aria-label="Cerrar términos"
        >
          ×
        </button>

        <div className="relative z-10 text-[24px] font-black leading-tight tracking-[-0.03em] text-white drop-shadow-[0_3px_12px_rgba(0,0,0,0.45)]">
  Términos y Condiciones
</div>
      </div>

      <div className="terms-scroll mt-2 flex-1 overflow-y-auto rounded-t-[28px] bg-white px-4 pb-4 pt-0.5 text-[13px] leading-6 text-slate-700 shadow-[0_-8px_24px_rgba(255,255,255,0.95)]">
        <div className="mb-5 rounded-[20px] border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-white px-4 py-4 shadow-[0_10px_24px_rgba(251,191,36,0.16)]">
  <div className="flex items-start gap-3">
    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-100 text-[22px] text-amber-600">
      ⚜
    </div>

    <div className="min-w-0 flex-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">
          Información legal
        </span>

        <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black text-amber-800">
          v1.0
        </span>
      </div>

      <p className="mt-2 text-[12.5px] font-medium leading-5 text-amber-950">
        Al crear tu cuenta aceptas el uso de KroniX como plataforma tecnológica
        para conectar clientes, comercios y conductores aliados.
      </p>
    </div>
  </div>
</div>

        <div className="divide-y divide-slate-200">
          {[
            {
  icon: "👥",
  title: "1. Naturaleza de la plataforma",
  text: (
    <>
      <p>
        KroniX es una plataforma tecnológica de intermediación digital que
        conecta usuarios, comercios y conductores independientes con el fin de
        facilitar servicios de domicilios, compras, envíos, diligencias y
        soluciones logísticas urbanas.
      </p>

      <p className="mt-4">
        KroniX opera exclusivamente como proveedor tecnológico y de software,
        permitiendo la interacción entre terceros mediante herramientas
        digitales, sistemas de geolocalización, procesamiento de información,
        notificaciones y medios de conexión operativa.
      </p>

      <p className="mt-4">
        KroniX no actúa como empresa transportadora, operador logístico
        tradicional, compañía de mensajería, empleador de conductores,
        fabricante, vendedor de productos ni propietario de los bienes
        transportados mediante la plataforma.
      </p>

      <p className="mt-4">
        Los conductores, comercios y usuarios actúan bajo su propia autonomía,
        responsabilidad y capacidad legal, siendo responsables del cumplimiento
        de las normas civiles, comerciales, administrativas, tributarias,
        laborales, de tránsito y de protección al consumidor que resulten
        aplicables.
      </p>

      <p className="mt-4">
        El uso de KroniX implica la aceptación de que la plataforma funciona
        como un ecosistema tecnológico de conexión entre partes independientes,
        sin generar relaciones laborales, societarias, de representación,
        mandato, asociación o subordinación entre KroniX y los usuarios,
        comercios o conductores.
      </p>

      <p className="mt-4">
        KroniX podrá implementar medidas tecnológicas, operativas y de
        seguridad destinadas a proteger la integridad de la plataforma, la
        experiencia de los usuarios y el cumplimiento de la legislación
        aplicable.
      </p>
    </>
  ),
  tone: "bg-violet-50 text-violet-700",
},
            {
  icon: "🛡️",
  title: "2. Uso permitido",
  text: (
    <>
      <p>
        El usuario se compromete a utilizar la plataforma KroniX de manera
        legal, ética, segura y respetuosa, conforme a la Constitución Política
        de Colombia, la legislación vigente y los presentes términos y
        condiciones.
      </p>

      <p className="mt-4">
        Toda persona que utilice la plataforma deberá suministrar información
        veraz, actualizada y legítima, evitando cualquier actuación que pueda
        inducir a error, fraude, suplantación, abuso de la plataforma o
        afectación a terceros.
      </p>

      <p className="mt-4">
        Se encuentra prohibido utilizar KroniX para actividades ilícitas,
        fraudulentas, engañosas, violentas, discriminatorias, intimidatorias o
        contrarias al orden público, la moral, las buenas costumbres o los
        derechos fundamentales de terceros.
      </p>

      <p className="mt-4">
        Los usuarios, comercios y conductores deberán actuar bajo principios de
        buena fe, respeto mutuo, convivencia, transparencia y responsabilidad,
        manteniendo conductas adecuadas dentro y fuera de la plataforma durante
        la prestación de los servicios.
      </p>

      <p className="mt-4">
        KroniX podrá restringir, suspender o cancelar cuentas que presenten
        comportamientos abusivos, lenguaje ofensivo, manipulación indebida del
        sistema, intentos de fraude, incumplimientos reiterados o actividades
        que comprometan la seguridad de la plataforma o de sus usuarios.
      </p>

      <p className="mt-4">
        Asimismo, KroniX podrá colaborar con autoridades judiciales,
        administrativas o de policía cuando existan indicios de actividades
        ilegales, conductas sospechosas o incumplimientos normativos
        relacionados con el uso de la plataforma.
      </p>
    </>
  ),
  tone: "bg-emerald-50 text-emerald-700",
},
            {
  icon: "🚙",
  title: "3. Objetos, Sustancias y Actividades Prohibidas",
  text: (
    <>
      <p>
        El usuario, comercio, conductor o cualquier persona que utilice la
        plataforma KroniX se obliga a no solicitar, transportar, almacenar,
        entregar, comercializar o facilitar mediante la plataforma cualquier
        elemento, sustancia, producto o actividad prohibida por la legislación
        colombiana o aplicable en la jurisdicción correspondiente.
      </p>

      <p className="mt-3">
        Se encuentra estrictamente prohibido el uso de KroniX para el
        transporte, movilización, distribución o manipulación de, entre otros:
      </p>

      <ul className="mt-3 list-disc space-y-2 pl-5">
        <li>
          Sustancias estupefacientes, narcóticos, drogas ilícitas o sustancias
          psicoactivas ilegales.
        </li>

        <li>
          Sustancias químicas peligrosas, tóxicas, inflamables, explosivas,
          corrosivas, radioactivas o de manejo restringido.
        </li>

        <li>
          Armas de fuego, municiones, explosivos, pólvora, detonantes o
          accesorios de armamento.
        </li>

        <li>
          Armas blancas prohibidas o elementos destinados a causar daño físico.
        </li>

        <li>
          Dinero falsificado, documentos fraudulentos o elementos relacionados
          con actividades ilícitas.
        </li>

        <li>
          Material pornográfico ilegal, explotación infantil o contenido
          prohibido por la ley.
        </li>

        <li>
          Mercancía robada, contrabando o productos obtenidos ilegalmente.
        </li>

        <li>
          Animales silvestres protegidos, especies restringidas o elementos que
          vulneren normas ambientales.
        </li>

        <li>
          Sustancias biológicas, agentes infecciosos o materiales considerados
          peligrosos para la salud pública.
        </li>

        <li>
          Cualquier objeto cuya posesión, transporte o comercialización se
          encuentre restringida o prohibida por las autoridades competentes.
        </li>
      </ul>

      <p className="mt-4">
        KroniX actúa exclusivamente como plataforma tecnológica intermediaria y
        no inspecciona físicamente el contenido de paquetes, pedidos, envíos o
        diligencias realizadas por usuarios, comercios o conductores.
      </p>

      <p className="mt-4">
        En consecuencia, el usuario que utilice la plataforma será el único y
        exclusivo responsable por el contenido transportado, así como por
        cualquier consecuencia legal, civil, administrativa o penal derivada
        del uso indebido de la plataforma.
      </p>

      <p className="mt-4">
        KroniX podrá suspender, bloquear o cancelar inmediatamente cualquier
        cuenta que presuntamente se encuentre vinculada a actividades ilegales,
        sin perjuicio de reportar la situación a las autoridades competentes
        cuando resulte necesario.
      </p>

      <p className="mt-4">
        Asimismo, KroniX se reserva el derecho de colaborar con autoridades
        judiciales, administrativas o de policía en investigaciones
        relacionadas con actividades ilícitas realizadas a través de la
        plataforma.
      </p>
    </>
  ),
  tone: "bg-sky-50 text-blue-600",
},
            {
  icon: "💳",
  title: "4. Pagos, pedidos y cancelaciones",
  text: (
    <>
      <p>
        Las tarifas publicadas dentro de KroniX podrán variar según ciudad,
        distancia, tráfico, demanda operativa, clima, disponibilidad de
        conductores, horarios, promociones, costos asociados y tipo de servicio
        solicitado.
      </p>

      <p className="mt-4">
        Los pagos realizados mediante la plataforma podrán procesarse a través
        de proveedores tecnológicos autorizados, pasarelas de pago, billeteras
        digitales, entidades financieras o mecanismos electrónicos habilitados
        por KroniX.
      </p>

      <p className="mt-4">
        El usuario acepta que determinados pedidos podrán generar costos
        adicionales relacionados con tiempos de espera, recargos operativos,
        cambios de dirección, peajes, parqueaderos, compras realizadas durante
        diligencias, propinas voluntarias u otros conceptos previamente
        informados.
      </p>

      <p className="mt-4">
        KroniX podrá rechazar, pausar, cancelar o limitar pedidos cuando
        existan razones operativas, riesgos de seguridad, sospechas de fraude,
        incumplimientos legales, información inconsistente o situaciones que
        afecten el correcto funcionamiento de la plataforma.
      </p>

      <p className="mt-4">
        Las cancelaciones realizadas por usuarios, comercios o conductores
        podrán generar restricciones temporales, cargos operativos o medidas
        internas destinadas a proteger la estabilidad del ecosistema y evitar
        usos abusivos de la plataforma.
      </p>

      <p className="mt-4">
        KroniX podrá conservar registros digitales, históricos de pedidos,
        comprobantes electrónicos y trazabilidad operativa como soporte de las
        transacciones realizadas dentro de la plataforma.
      </p>
    </>
  ),
  tone: "bg-sky-50 text-blue-600",
},
            {
  icon: "📍",
  title: "5. Geolocalización y notificaciones",
  text: (
    <>
      <p>
        KroniX podrá utilizar herramientas de geolocalización, posicionamiento
        GPS, mapas, direcciones, coordenadas y tecnologías de seguimiento con
        el fin de facilitar la operación de pedidos, optimizar rutas, mejorar
        la seguridad y fortalecer la experiencia de uso dentro de la
        plataforma.
      </p>

      <p className="mt-4">
        El usuario autoriza el tratamiento temporal y operativo de información
        relacionada con ubicación, trayectos, puntos de recogida, destinos,
        tiempos estimados y movimientos asociados al uso de los servicios.
      </p>

      <p className="mt-4">
        KroniX podrá enviar notificaciones push, mensajes operativos, alertas,
        recordatorios, actualizaciones de pedidos, avisos de seguridad,
        confirmaciones y comunicaciones relacionadas con la actividad de la
        cuenta o el funcionamiento de la plataforma.
      </p>

      <p className="mt-4">
        El usuario reconoce que ciertas funcionalidades pueden depender del
        acceso a internet, permisos del dispositivo, servicios de ubicación,
        notificaciones activas y correcto funcionamiento del equipo móvil.
      </p>

      <p className="mt-4">
        KroniX implementará medidas razonables de protección de la información;
        sin embargo, no garantiza precisión absoluta en servicios de mapas,
        coordenadas, cobertura GPS o disponibilidad continua de sistemas
        externos de geolocalización.
      </p>
    </>
  ),
  tone: "bg-rose-50 text-rose-600",
},
            {
  icon: "⚖️",
  title: "6. Responsabilidad",
  text: (
    <>
      <p>
        KroniX actúa exclusivamente como plataforma tecnológica de
        intermediación digital entre usuarios, comercios y conductores
        independientes.
      </p>

      <p className="mt-4">
        En consecuencia, cada usuario será responsable de sus actuaciones,
        decisiones, comportamientos, productos ofrecidos, contenidos
        transportados y obligaciones legales derivadas del uso de la
        plataforma.
      </p>

      <p className="mt-4">
        KroniX no será responsable por actuaciones independientes realizadas
        por usuarios, conductores o comercios por fuera de las finalidades,
        funcionalidades y usos autorizados dentro de la aplicación.
      </p>

      <p className="mt-4">
        Los conductores son terceros independientes y no empleados de KroniX,
        razón por la cual cada uno deberá cumplir las normas de tránsito,
        seguridad vial, documentación, licencias, seguros y requisitos legales
        aplicables.
      </p>

      <p className="mt-4">
        KroniX no garantiza disponibilidad permanente, funcionamiento
        ininterrumpido, ausencia absoluta de errores, cobertura total,
        compatibilidad universal ni continuidad ilimitada de los servicios
        tecnológicos ofrecidos.
      </p>

      <p className="mt-4">
        En ningún caso KroniX será responsable por daños indirectos, lucro
        cesante, pérdidas económicas, afectaciones derivadas de terceros,
        fallas de internet, eventos de fuerza mayor, hechos imprevisibles,
        actuaciones ilegales o usos indebidos realizados por los usuarios de la
        plataforma.
      </p>

      <p className="mt-4">
        Cualquier uso indebido de la plataforma para fines distintos a los 
        autorizados será responsabilidad exclusiva de los usuarios involucrados.  
        KroniX, como intermediario tecnológico, no presta servicios de transporte 
        de pasajeros ni asume responsabilidad por acuerdos, conductas o actividades 
        realizadas por fuera de las finalidades permitidas dentro de la aplicación.
      </p>
    </>
  ),
  tone: "bg-amber-50 text-amber-700",
},
            {
  icon: "📄",
  title: "7. Actualizaciones",
  text: (
    <>
      <p>
        KroniX podrá modificar, actualizar, reemplazar o ajustar en cualquier
        momento los presentes términos y condiciones, políticas operativas,
        funcionalidades, tarifas, servicios, métodos de pago o reglas de uso de
        la plataforma.
      </p>

      <p className="mt-4">
        Las nuevas versiones publicadas entrarán en vigencia desde su
        publicación dentro de la aplicación, sitio web o canales oficiales de
        comunicación de KroniX.
      </p>

      <p className="mt-4">
        El uso continuo de la plataforma después de publicadas las
        actualizaciones implicará aceptación expresa de las nuevas condiciones
        vigentes.
      </p>

      <p className="mt-4">
        KroniX podrá implementar mejoras tecnológicas, medidas de seguridad,
        cambios operativos, integraciones, restricciones temporales o ajustes
        funcionales orientados a optimizar la estabilidad y protección del
        ecosistema digital.
      </p>

      <p className="mt-4">
        En caso de que alguna disposición de estos términos sea considerada
        inválida o inaplicable por autoridad competente, las demás disposiciones
        conservarán plena validez y efecto jurídico.
      </p>
    </>
  ),
  tone: "bg-cyan-50 text-cyan-700",
},
          ].map((item) => (
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
                <p className="mt-1.5 text-[12.5px] font-medium leading-5 text-slate-600">
                  {item.text}
                </p>
              </div>
            </section>
          ))}
        </div>
      </div>

      <div className="bg-white px-5 pb-5 pt-3">
        <button
          type="button"
          onClick={() => {
            setTermsAccepted(true);
            setShowTermsModal(false);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-[18px] bg-gradient-to-r from-green-500 to-emerald-600 py-3.5 text-[14px] font-black text-white shadow-lg shadow-emerald-500/25 active:scale-[0.98]"
        >
          <span className="grid h-5 w-5 place-items-center rounded-full bg-white/20 text-xs">
            ✓
          </span>
          Aceptar y cerrar
        </button>
      </div>
    </div>
  </div>
) : null}
    </div>
  );
}
