//app\(buyer)\legal\privacy\page.tsx
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

export default function PrivacyPage() {
  return (
    <div className="bg-slate-50 min-h-full">
      <div className="w-full px-4 py-4">
        <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-cyan-700 via-sky-700 to-blue-900 px-6 py-8 text-white">
            <div className="text-[12px] font-black uppercase tracking-[0.25em] text-cyan-100">
              KroniX
            </div>

            <h1 className="mt-2 text-[34px] font-black leading-tight">
              Política de Privacidad
            </h1>

            <p className="mt-3 text-[15px] leading-7 text-slate-100">
              Última actualización: Mayo 2026
            </p>
          </div>

          <div className="px-6 py-8">
            <Section title="1. Información que recopilamos">
              <p>
                KroniX puede recopilar información como nombre, teléfono,
                correo electrónico, direcciones, ubicación GPS,
                información de pedidos y actividad dentro de la plataforma.
              </p>
            </Section>

            <Section title="2. Uso de la Información">
              <p>
                Utilizamos la información para operar la plataforma,
                procesar pedidos, mejorar servicios, prevenir fraude y
                brindar soporte.
              </p>
            </Section>

            <Section title="3. Geolocalización">
              <p>
                La ubicación GPS puede utilizarse para seguimiento de
                pedidos, asignación de conductores y funciones operativas.
              </p>
            </Section>

            <Section title="4. Seguridad">
              <p>
                KroniX implementa medidas razonables de seguridad para
                proteger la información de los usuarios.
              </p>
            </Section>

            <Section title="5. Compartición de Datos">
              <p>
                KroniX no vende información personal a terceros.
              </p>

              <p>
                Algunos datos podrán compartirse únicamente cuando sea
                necesario para operar la plataforma o cumplir obligaciones
                legales.
              </p>
            </Section>

            <Section title="6. Cookies y Tecnologías">
              <p>
                La plataforma puede utilizar cookies, almacenamiento local
                y tecnologías similares para autenticación, sesiones y
                experiencia de usuario.
              </p>
            </Section>

            <Section title="7. Derechos del Usuario">
              <p>
                El usuario podrá solicitar actualización, corrección o
                eliminación de sus datos conforme a la legislación
                aplicable.
              </p>
            </Section>

            <Section title="8. Cambios en la Política">
              <p>
                KroniX podrá actualizar esta política de privacidad en
                cualquier momento.
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