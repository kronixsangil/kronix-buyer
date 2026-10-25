'use client';
import {usePathname} from 'next/navigation';
import {restaurantAssets} from '@/lib/restaurant-assets';
export default function RestaurantLoading({slug}:{slug?:string}){
 const pathname=usePathname();const current=slug||pathname?.split('/r/')[1]?.split('/')[0]||'';const assets=restaurantAssets(current);
 return <div role="status" aria-live="polite" className="relative flex min-h-[100dvh] flex-col items-center justify-end overflow-hidden px-8 pb-[12dvh]" style={{background:assets?.background||'#ffffff',color:assets?'#211A14':'#334155'}}>
 {assets?<img src={assets.splash} alt="3AM Café" fetchPriority="high" className="absolute inset-0 h-full w-full object-contain"/>:null}
 <div className="relative flex flex-col items-center"><span aria-hidden="true" className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent opacity-60"/><p className="mt-3 text-sm font-semibold">Preparando tu menú…</p></div>
 </div>;
}
