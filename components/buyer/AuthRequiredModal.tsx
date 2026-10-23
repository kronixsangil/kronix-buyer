// components/buyer/AuthRequiredModal.tsx
"use client";

export default function AuthRequiredModal(props: {
  open: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  onConfirm: () => void;
  onClose?: () => void;
}) {
  const {
    open,
    title = "Revisa el acceso a tu pedido",
    message = "Los pedidos están vinculados a este navegador. Puedes revisar tus datos y el acceso desde Configuración, sin contraseña.",
    confirmText = "Ir a Configuración",
    onConfirm,
    onClose,
  } = props;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/40 p-4 pt-24 overflow-auto">
      <div className="w-full max-w-md mt-2 rounded-2xl bg-white shadow-lg ring-1 ring-gray-200">
        <div className="p-4">
          <div className="text-sm font-extrabold text-gray-900">{title}</div>
          <div className="mt-2 text-sm text-gray-700">{message}</div>

          <div className="mt-4 flex gap-2">
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="w-1/2 rounded-2xl border border-gray-200 bg-white py-3 text-sm font-extrabold text-gray-800 hover:bg-gray-50"
              >
                Cancelar
              </button>
            ) : null}

            <button
              type="button"
              onClick={onConfirm}
              className={(onClose ? "w-1/2 " : "w-full ") + "rounded-2xl bg-green-600 py-3 text-sm font-extrabold text-white hover:bg-green-700"}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}