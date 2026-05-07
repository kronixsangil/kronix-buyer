//components/buyer/StoreCartCta.tsx
"use client";

import Link from "next/link";
import { useCart } from "@/components/buyer/CartContext";

function formatCOP(value: number) {
  return value.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

/**
 * CTA fijo dentro del detalle de tienda:
 * - Solo aparece si hay items en carrito
 * - Muestra subtotal de productos para no confundir al cliente
 * - El total final con domicilio/servicio se ve en el carrito
 */
export default function StoreCartCta() {
  const { items, subtotal, total } = useCart();

  const count = items.reduce((acc, it) => acc + it.qty, 0);

  if (count === 0) return null;

  return (
    <div className="mt-4 p-3">
      <div className="rounded-2xl bg-green-600 px-4 py-3 text-white shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold opacity-90">
              {count} producto(s)
            </div>

            <div className="text-sm font-extrabold">
              Productos: {formatCOP(subtotal)}
            </div>

            
          </div>

          <Link
            href="/cart"
            className="shrink-0 rounded-xl bg-white px-4 py-2 text-xs font-extrabold text-green-700"
          >
            Ver carrito
          </Link>
        </div>
      </div>
    </div>
  );
}