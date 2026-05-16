//app\(buyer)\legal\privacy
"use client";

import Link from "next/link";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-[20px] font-black text-slate-900">
        {title}
      </h2>

      <div className="mt-3 space-y-4 text-[14px] leading-7 text-slate-700">
        {children}
      </div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-[#0f172a] via-[#111827] to-[#1e293b] px-6 py-8 text-white">
            <div className="text-[12px] font-black uppercase tracking-[0.25em] text-cyan-300">
              KroniX
            </div>

            <h1 className="mt-2 text-[34px] font-black leading-tight">
              Términos y Condiciones
            </h1>

            <p className="mt-3 max-w-2xl text-[15px] leading-7 text-slate-300">
              Última actualización: Mayo 2026
            </p>
          </div>

          <div className="px-6 py-8">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[14px] leading-6 text-amber-900">
              Al utilizar KroniX, aceptas estos términos y condiciones,
              nuestra política de privacidad y las normas de uso de la
              plataforma.
            </div>

            <Section title="1. Naturaleza de la Plataforma">
              <p>
                KroniX es una plataforma tecnológica intermediaria que
                conecta usuarios, comercios y conductores independientes
                para facilitar solicitudes de domicilios, envíos,
                diligencias y servicios courier.
              </p>

              <p>
                KroniX no actúa como empresa transportadora tradicional,
                operador logístico ni empleador de los conductores.
              </p>
            </Section>

            <Section title="2. Uso Adecuado de la Plataforma">
              <p>
                El usuario se compromete a utilizar la plataforma de forma
                legal, segura y respetuosa.
              </p>

              <p>
                Está prohibido utilizar KroniX para actividades ilícitas,
                fraudulentas o que vulneren normas locales o nacionales.
              </p>
            </Section>

            <Section title="3. Restricción sobre Transporte de Personas">
              <p>
                Los servicios ofrecidos mediante KroniX están destinados
                exclusivamente al transporte de productos, paquetes,
                diligencias y mercancías.
              </p>

              <p>
                KroniX no autoriza ni promueve el transporte de pasajeros
                utilizando los servicios courier o de domicilios.
              </p>

              <p>
                En caso de que usuarios y conductores decidan realizar
                transporte de personas por fuera de las finalidades
                autorizadas de la plataforma, dicha conducta será
                considerada una actuación independiente y ajena a KroniX,
                exonerando a la plataforma de cualquier responsabilidad
                derivada.
              </p>
            </Section>

            <Section title="4. Conductores Independientes">
              <p>
                Los conductores registrados en KroniX actúan como
                colaboradores independientes.
              </p>

              <p>
                Cada conductor es responsable de cumplir las normas de
                tránsito, seguros, documentación y requisitos legales
                aplicables.
              </p>
            </Section>

            <Section title="5. Pagos y Wallet">
              <p>
                KroniX podrá ofrecer métodos de pago digitales, billetera
                virtual (Wallet), recargas y promociones.
              </p>

              <p>
                Los saldos promocionales o bonos podrán tener restricciones,
                expiración o limitaciones definidas por la plataforma.
              </p>
            </Section>

            <Section title="6. Geolocalización">
              <p>
                La plataforma puede utilizar información de ubicación GPS
                para mejorar la experiencia operativa, seguimiento de
                pedidos y seguridad.
              </p>
            </Section>

            <Section title="7. Notificaciones">
              <p>
                El usuario acepta recibir notificaciones push, mensajes
                operativos y alertas relacionadas con pedidos, pagos,
                conductores y actividad de la cuenta.
              </p>
            </Section>

            <Section title="8. Suspensión de Cuenta">
              <p>
                KroniX podrá suspender temporal o permanentemente cuentas
                involucradas en fraude, abuso, uso indebido, actividades
                ilícitas o incumplimiento de estos términos.
              </p>
            </Section>

            <Section title="9. Limitación de Responsabilidad">
              <p>
                KroniX actúa únicamente como plataforma tecnológica de
                intermediación.
              </p>

              <p>
                KroniX no garantiza disponibilidad continua,
                funcionamiento ininterrumpido o ausencia total de errores.
              </p>

              <p>
                En ningún caso KroniX será responsable por daños indirectos,
                lucro cesante, pérdidas económicas o actuaciones
                independientes de terceros.
              </p>
            </Section>

            <Section title="10. Modificaciones">
              <p>
                KroniX podrá actualizar estos términos y condiciones en
                cualquier momento.
              </p>

              <p>
                El uso continuado de la plataforma implica aceptación de
                las nuevas versiones publicadas.
              </p>
            </Section>

            <div className="mt-10 border-t border-slate-200 pt-6 text-center">
              <Link
                href="/"
                className="inline-flex rounded-2xl bg-slate-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-slate-800"
              >
                Volver a KroniX
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}