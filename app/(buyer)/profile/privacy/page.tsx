//app/(buyer)/profile/privacy/page.tsx
"use client";

const PRIVACY = [
  {
    icon: "🛡️",
    title: "1. Responsable del tratamiento",
    text: (
      <>
        <p>
          KroniX Tecnología S.A.S., en adelante KroniX, actúa como responsable
          del tratamiento de los datos personales recolectados a través de la
          plataforma, aplicaciones, sitios web, canales de atención y demás
          herramientas tecnológicas asociadas a su operación.
        </p>

        <p>
          KroniX tratará la información personal conforme a la Constitución
          Política de Colombia, la Ley 1581 de 2012, sus decretos reglamentarios,
          normas complementarias y demás disposiciones aplicables en materia de
          protección de datos personales.
        </p>
      </>
    ),
    tone: "bg-blue-50 text-blue-700",
  },
  {
    icon: "📋",
    title: "2. Información que recopilamos",
    text: (
      <>
        <p>
          KroniX podrá recopilar datos como nombre, teléfono, correo electrónico,
          documento de identificación cuando aplique, dirección, ciudad,
          historial de pedidos, métodos de pago, información de soporte,
          calificaciones, comentarios, dispositivos utilizados, dirección IP,
          identificadores técnicos y actividad dentro de la plataforma.
        </p>

        <p>
          También podremos tratar información relacionada con direcciones de
          recogida y entrega, referencias, ubicación GPS, rutas, horarios,
          estados de pedidos, interacción con comercios, conductores y servicios
          solicitados.
        </p>
      </>
    ),
    tone: "bg-violet-50 text-violet-700",
  },
  {
    icon: "⚙️",
    title: "3. Finalidades del tratamiento",
    text: (
      <>
        <p>
          La información será utilizada para crear y administrar cuentas,
          autenticar usuarios, procesar pedidos, coordinar entregas, asignar
          conductores, gestionar pagos, generar soporte, prevenir fraude,
          mejorar la experiencia de usuario y mantener la seguridad operativa.
        </p>

        <p>
          KroniX también podrá usar los datos para análisis internos,
          estadísticas, control de calidad, auditoría, comunicaciones
          operativas, notificaciones, cumplimiento legal, atención de reclamos y
          mejora continua de productos y servicios.
        </p>
      </>
    ),
    tone: "bg-emerald-50 text-emerald-700",
  },
  {
    icon: "📍",
    title: "4. Geolocalización",
    text: (
      <>
        <p>
          KroniX podrá utilizar datos de ubicación GPS, coordenadas, mapas,
          direcciones y referencias con el fin de permitir el seguimiento de
          pedidos, calcular rutas, estimar tiempos, asignar servicios y mejorar
          la seguridad de la operación.
        </p>

        <p>
          Algunas funciones de la plataforma pueden depender de permisos de
          ubicación del dispositivo. Si el usuario desactiva dichos permisos,
          ciertas funcionalidades podrían verse limitadas o no estar disponibles.
        </p>
      </>
    ),
    tone: "bg-rose-50 text-rose-600",
  },
  {
    icon: "💳",
    title: "5. Pagos y datos financieros",
    text: (
      <>
        <p>
          KroniX podrá tratar información relacionada con transacciones, pagos,
          saldos, wallet, referencias de pago, comprobantes, valores cobrados,
          promociones, propinas y estados financieros asociados a los servicios.
        </p>

        <p>
          Cuando se utilicen pasarelas de pago o proveedores externos, estos
          podrán tratar información necesaria para procesar la transacción bajo
          sus propias políticas de seguridad y privacidad. KroniX no debe
          almacenar datos sensibles completos de tarjetas como CVV.
        </p>
      </>
    ),
    tone: "bg-sky-50 text-blue-600",
  },
  {
    icon: "🤝",
    title: "6. Compartición de información",
    text: (
      <>
        <p>
          KroniX no vende información personal de los usuarios. Sin embargo,
          podrá compartir datos estrictamente necesarios con comercios,
          conductores, proveedores tecnológicos, pasarelas de pago, aliados
          operativos, servicios de mapas, soporte técnico y autoridades
          competentes cuando sea necesario.
        </p>

        <p>
          Esta compartición se realizará únicamente para operar la plataforma,
          cumplir obligaciones legales, prevenir fraudes, atender solicitudes,
          proteger derechos o garantizar la correcta prestación de los servicios.
        </p>
      </>
    ),
    tone: "bg-amber-50 text-amber-700",
  },
  {
    icon: "🔐",
    title: "7. Seguridad de la información",
    text: (
      <>
        <p>
          KroniX implementará medidas razonables de seguridad administrativas,
          técnicas y operativas para proteger la información personal contra
          pérdida, acceso no autorizado, uso indebido, alteración, divulgación o
          destrucción no autorizada.
        </p>

        <p>
          No obstante, el usuario reconoce que ningún sistema tecnológico es
          absolutamente infalible. Por ello, también deberá proteger sus claves,
          dispositivos, sesiones y accesos personales.
        </p>
      </>
    ),
    tone: "bg-cyan-50 text-cyan-700",
  },
  {
    icon: "🍪",
    title: "8. Cookies y tecnologías similares",
    text: (
      <>
        <p>
          KroniX podrá usar cookies, almacenamiento local, identificadores de
          sesión y tecnologías similares para mantener sesiones activas,
          recordar preferencias, mejorar navegación, guardar información
          operativa y fortalecer la seguridad de la plataforma.
        </p>

        <p>
          El bloqueo o eliminación de estas tecnologías puede afectar funciones
          como inicio de sesión, carrito, ciudad seleccionada, historial,
          notificaciones o preferencias del usuario.
        </p>
      </>
    ),
    tone: "bg-orange-50 text-orange-600",
  },
  {
    icon: "👤",
    title: "9. Derechos del titular",
    text: (
      <>
        <p>
          El usuario podrá conocer, actualizar, rectificar, solicitar prueba de
          autorización, pedir información sobre el uso de sus datos, presentar
          reclamos, solicitar supresión cuando proceda y revocar la autorización
          conforme a la ley aplicable.
        </p>

        <p>
          Estos derechos podrán ejercerse mediante los canales oficiales de
          atención de KroniX. La solicitud deberá contener identificación del
          titular, descripción clara de la petición y datos de contacto para
          respuesta.
        </p>
      </>
    ),
    tone: "bg-indigo-50 text-indigo-700",
  },
  {
    icon: "⏳",
    title: "10. Conservación de datos",
    text: (
      <>
        <p>
          KroniX conservará los datos personales durante el tiempo necesario
          para cumplir las finalidades informadas, obligaciones legales,
          contables, contractuales, tributarias, operativas, de seguridad,
          auditoría y atención de reclamaciones.
        </p>

        <p>
          Cuando la información deje de ser necesaria, KroniX podrá eliminarla,
          anonimizarla, bloquearla o conservarla únicamente cuando exista deber
          legal o interés legítimo aplicable.
        </p>
      </>
    ),
    tone: "bg-slate-50 text-slate-700",
  },
  {
    icon: "🔔",
    title: "11. Comunicaciones y notificaciones",
    text: (
      <>
        <p>
          KroniX podrá enviar mensajes operativos, alertas de seguridad,
          notificaciones push, actualizaciones de pedidos, comunicaciones de
          soporte, información de pagos, promociones y avisos relacionados con
          la cuenta.
        </p>

        <p>
          El usuario podrá gestionar ciertos permisos desde su dispositivo o
          configuración de la aplicación, sin perjuicio de comunicaciones
          necesarias para la operación o seguridad del servicio.
        </p>
      </>
    ),
    tone: "bg-pink-50 text-pink-700",
  },
  {
    icon: "📄",
    title: "12. Cambios en la política",
    text: (
      <>
        <p>
          KroniX podrá actualizar esta Política de Privacidad para reflejar
          cambios legales, técnicos, operativos, comerciales o de seguridad.
        </p>

        <p>
          Las versiones actualizadas serán publicadas en la plataforma. El uso
          continuo de KroniX después de publicada una nueva versión implica
          conocimiento y aceptación de la política vigente.
        </p>
      </>
    ),
    tone: "bg-green-50 text-green-700",
  },
];

export default function ProfilePrivacyPage() {
  return (
    <div className="px-4 pb-8 pt-4">
      <div className="text-lg font-extrabold text-gray-900">
        Política de Privacidad
      </div>

      <div className="mt-1 text-xs text-gray-600">
        Tratamiento de datos personales · Versión v1.0 · Mayo 2026
      </div>

      <div className="mt-4 rounded-3xl border border-cyan-200 bg-cyan-50 p-4 text-xs leading-5 text-cyan-950">
        En KroniX protegemos tu información personal y la usamos únicamente para
        operar, mejorar y proteger la plataforma, conforme a la normativa
        colombiana de protección de datos personales.
      </div>

      <div className="mt-4 space-y-3">
        {PRIVACY.map((item) => (
          <section
            key={item.title}
            className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div
                className={[
                  "grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xl",
                  item.tone,
                ].join(" ")}
              >
                {item.icon}
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-[15px] font-black leading-5 text-gray-950">
                  {item.title}
                </h2>

                <div className="mt-2 space-y-3 text-[12.5px] font-medium leading-5 text-slate-600">
                  {item.text}
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}