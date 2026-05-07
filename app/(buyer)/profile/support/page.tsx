//app/(buyer)/profile/support/page.tsx
"use client";

export default function SupportPage() {
  const phone = "+573112461059";
  const wa = "https://wa.me/573112461059";

  return (
    <div className="px-4 pb-6 pt-4">
      <div className="text-lg font-extrabold text-gray-900">Soporte</div>
      <div className="mt-1 text-xs text-gray-600">Ayuda y contacto</div>

      <div className="mt-4 space-y-3">
        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:bg-gray-50"
        >
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-green-50 ring-1 ring-green-200">
            🟢
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-extrabold text-gray-900">WhatsApp</div>
            <div className="text-xs text-gray-600">Escríbenos al {phone}</div>
          </div>
          <div className="text-gray-400">›</div>
        </a>

        <a
          href={`tel:${phone}`}
          className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:bg-gray-50"
        >
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 ring-1 ring-blue-200">
            📞
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-extrabold text-gray-900">Llamada</div>
            <div className="text-xs text-gray-600">Llámanos al {phone}</div>
          </div>
          <div className="text-gray-400">›</div>
        </a>
      </div>

      <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 text-xs text-gray-600 shadow-sm">
        Horario sugerido: 8:00 a.m. – 6:00 p.m. (hora Colombia)
      </div>
    </div>
  );
}
