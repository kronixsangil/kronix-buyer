import Image from 'next/image';
export default function RestaurantLoading(){
 return <div role="status" aria-live="polite" className="flex min-h-[100dvh] flex-col items-center justify-center bg-gradient-to-b from-violet-50 to-white px-8 py-12">
  <Image src="/lunch/iconos/fondo.png" alt="La Fortuna del Sabor" width={1374} height={1145} priority sizes="(max-width: 480px) 80vw, 340px" className="h-auto w-full max-w-[340px] object-contain"/>
  <span aria-hidden="true" className="mt-6 h-6 w-6 animate-spin rounded-full border-2 border-violet-200 border-t-violet-700"/>
  <p className="mt-3 text-sm font-semibold text-violet-900">Preparando tu menú…</p>
 </div>;
}
