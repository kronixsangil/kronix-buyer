'use client';
import {useEffect,useState} from 'react';
import {LunchExperience} from '@/components/restaurant/LunchExperience';
import {BuyerCityProvider} from '@/components/buyer/CityContext';
import {apiFetch} from '@/lib/api';
const labels:any={PENDING_PAYMENT_REVIEW:'Verificando pago',CONFIRMED:'Pedido recibido',PREPARING:'En preparación',READY:'Listo',COMPLETED:'Finalizado',REJECTED:'Rechazado'};
export default function PublicRestaurant({slug}:{slug:string}){
 const [session,setSession]=useState<any>(null),[locations,setLocations]=useState<any[]>([]),[error,setError]=useState(''),[order,setOrder]=useState<any>(null),[install,setInstall]=useState<any>(null);
 const [channel,setChannel]=useState('PUBLIC_LINK');
 async function start(channel:string,qrToken?:string){
  try{const s=await apiFetch<any>(`/lunch/public/restaurants/${slug}/sessions`,{method:'POST',json:{channel,qrToken},suppressSessionExpiredEvent:true,suppressActivityRefresh:true});localStorage.setItem(`restaurant:${slug}:${channel}`,JSON.stringify({...s,qrToken}));setSession({...s,slug});setError('');}catch(e:any){setError(e.message);}
 }
 useEffect(()=>{
  if('serviceWorker' in navigator)void navigator.serviceWorker.register(`/r/${slug}/sw.js`,{scope:`/r/${slug}`});
  const q=new URLSearchParams(window.location.search),c=q.get('mode')==='dine-in'?'DINE_IN':'PUBLIC_LINK';setChannel(c);
  const raw=localStorage.getItem(`restaurant:${slug}:${c}`);let saved:any;try{saved=raw?JSON.parse(raw):null;}catch{}
  if(saved&&new Date(saved.expiresAt).getTime()>Date.now()&&(c==='PUBLIC_LINK'||!q.get('mesa')||saved.qrToken===q.get('mesa')))setSession({...saved,slug});
  else if(c==='PUBLIC_LINK')void start(c);
  else if(q.get('mesa'))void start(c,q.get('mesa')!);
  if(c==='DINE_IN')apiFetch<any[]>(`/lunch/public/restaurants/${slug}/locations`,{suppressSessionExpiredEvent:true,suppressActivityRefresh:true}).then(setLocations).catch((e:any)=>setError(e.message));
  const handler=(e:any)=>{e.preventDefault();setInstall(e);};window.addEventListener('beforeinstallprompt',handler);return()=>window.removeEventListener('beforeinstallprompt',handler);
 },[slug]);
 async function loadOrder(id:string){try{setOrder(await apiFetch(`/lunch/public/restaurants/${slug}/orders/${id}`,{headers:{'x-lunch-session':session.token},suppressSessionExpiredEvent:true,suppressActivityRefresh:true,cache:'no-store'}));}catch(e:any){setError(e.message);}}
 useEffect(()=>{if(!order||channel==='DINE_IN'||['COMPLETED','REJECTED'].includes(order.status))return;const t=setInterval(()=>void loadOrder(order.id),15000);return()=>clearInterval(t);},[order?.id,order?.status,channel]);
 return <BuyerCityProvider><div className="relative mx-auto h-[100dvh] max-w-2xl overflow-y-auto overscroll-contain bg-white text-slate-900" style={{WebkitOverflowScrolling:"touch",paddingBottom:"env(safe-area-inset-bottom)"}}>
 <div className="absolute right-3 top-2 z-30 flex max-w-[75%] items-center gap-2 rounded-full bg-violet-950/90 px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
 {channel==='PUBLIC_LINK'?<button onClick={async()=>{if(install){await install.prompt();setInstall(null);}else setError('En iPhone: Compartir → Añadir a pantalla de inicio. En Android: menú del navegador → Instalar aplicación.');}}>Instalar La Fortuna</button>:<><span className="truncate">{session?.locationLabel ? (/^\d+$/.test(session.locationLabel) ? `Mesa ${session.locationLabel}` : session.locationLabel) : 'Elige tu mesa'}</span>{session?<button className="shrink-0 border-l border-white/30 pl-2 text-violet-100 underline underline-offset-2" aria-label="Cambiar mesa" onClick={()=>{setSession(null);setOrder(null);localStorage.removeItem(`restaurant:${slug}:${channel}`);}}>Cambiar</button>:null}</>}
 </div>
 {error?<p role="alert" className="m-3 rounded-xl bg-amber-50 p-3">{error}</p>:null}
 {!session?(channel==='DINE_IN'?<div className="p-5 pt-14"><h1 className="mb-4 text-xl font-black">¿Dónde estás?</h1>{locations.map(l=><button key={l.qrToken} className="m-1 rounded-xl border p-4" onClick={()=>void start(channel,l.qrToken)}>{l.label}</button>)}</div>:<p className="p-5">Preparando el menú…</p>):order?<div className="p-5 pt-14"><h1 className="text-2xl font-black">Pedido recibido</h1><p className="mt-3">#{order.id.slice(-6)} · {session.locationLabel}</p>{channel==='PUBLIC_LINK'?<p className="mt-3">{labels[order.status]??order.status}</p>:<p className="mt-3">El restaurante recibió tu pedido. El pago se realiza en el negocio.</p>}<p className="mt-3 font-bold">{new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(order.subtotalCOP)}</p><button className="mt-5 rounded-xl bg-violet-700 p-3 text-white" onClick={()=>setOrder(null)}>Volver al menú</button></div>:<LunchExperience publicContext={{...session,channel,onOrdered:loadOrder}}/>}
 </div></BuyerCityProvider>;
}
