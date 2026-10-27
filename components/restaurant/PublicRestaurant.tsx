'use client';
import RestaurantLoading from './RestaurantLoading';
import boutiqueStyles from './BoutiqueMenu.module.css';
import {establishmentAppearance} from '@/lib/establishment-appearance';
import {useEffect,useState,useRef} from 'react';
import {apiFetch} from '@/lib/api';
import PublicOrderTracking from './PublicOrderTracking';
import usePublicOrderAlerts from './usePublicOrderAlerts';
import trackingStyles from './OrderTracking.module.css';
import {restaurantProgress} from '@/lib/restaurant-progress';
import EstablishmentMenu,{restaurantError} from './EstablishmentMenu';
const labels:Record<string,string>={PENDING_PAYMENT_REVIEW:'Verificando pago',CONFIRMED:'Pedido recibido',PREPARING:'En preparación',READY:'Listo',COMPLETED:'Finalizado',REJECTED:'Rechazado'};
const opts={suppressSessionExpiredEvent:true,suppressActivityRefresh:true};
export default function PublicRestaurant({slug}:{slug:string}){
 const [session,setSession]=useState<any>(null),[locations,setLocations]=useState<any[]>([]),[error,setError]=useState(''),[order,setOrder]=useState<any>(null),[install,setInstall]=useState<any>(null),[data,setData]=useState<any>(null);
 const [channel,setChannel]=useState('PUBLIC_LINK'),[loading,setLoading]=useState(true),[starting,setStarting]=useState(false),[retry,setRetry]=useState(0);
 const [tracking,setTracking]=useState(true),[trackingError,setTrackingError]=useState('');
 const alerts=usePublicOrderAlerts(slug,session,order,()=>{if(order?.id)void loadOrder(order.id).catch(()=>{});});
 const [installed,setInstalled]=useState(true),[installHelp,setInstallHelp]=useState(false);
 const installDialog=useRef<HTMLDialogElement>(null),installClose=useRef<HTMLButtonElement>(null);
 useEffect(()=>{const d=installDialog.current;if(!installHelp||!d)return;const previous=document.activeElement as HTMLElement|null;d.showModal();installClose.current?.focus();return()=>{if(d.open)d.close();previous?.focus();};},[installHelp]);
 async function requestInstall(){if(install){try{await install.prompt();setInstall(null);return;}catch{setInstall(null);}}setInstallHelp(true);}
 const boutique=data?.config?.appPresentation?.style==='CAFE_BOUTIQUE';
 const title=data?.config?.serviceTitle||data?.config?.store?.name||'Establecimiento';
 const primary=data?.config?.appPresentation?.primaryColor||data?.config?.store?.primaryColor;
 const color=establishmentAppearance(data?.config?.appPresentation).primary;
 useEffect(()=>{const media=window.matchMedia('(display-mode: standalone)');const sync=()=>setInstalled(media.matches||!!(navigator as any).standalone);sync();media.addEventListener('change',sync);const done=()=>{setInstalled(true);setInstall(null);setInstallHelp(false);};window.addEventListener('appinstalled',done);const prompt=(e:any)=>{e.preventDefault();setInstall(e);};window.addEventListener('beforeinstallprompt',prompt);return()=>{media.removeEventListener('change',sync);window.removeEventListener('appinstalled',done);window.removeEventListener('beforeinstallprompt',prompt);};},[]);
 useEffect(()=>{if(data?.config){document.title=title;document.querySelector('meta[name="theme-color"]')?.setAttribute('content',color);}},[title,color,data]);
 async function start(c:string,qrToken?:string){
  setStarting(true);setError('');
  try{const s=await apiFetch<any>(`/commerce/public/restaurants/${encodeURIComponent(slug)}/sessions`,{...opts,method:'POST',json:{channel:c,qrToken}});try{localStorage.setItem(`restaurant:${slug}:${c}`,JSON.stringify({...s,qrToken}));}catch{}setSession({...s,slug,channel:c});}catch(e){setError(restaurantError(e));}finally{setStarting(false);}
 }
 useEffect(()=>{
  let alive=true;setLoading(true);setError('');setSession(null);setData(null);setOrder(null);
  if('serviceWorker' in navigator)void navigator.serviceWorker.register(`/r/${encodeURIComponent(slug)}/sw.js`,{scope:`/r/${encodeURIComponent(slug)}`}).catch(()=>{});
  const q=new URLSearchParams(window.location.search),c=q.get('mode')==='dine-in'?'DINE_IN':'PUBLIC_LINK';setChannel(c);
  async function load(){
   try{
    const menu=await apiFetch<any>(`/commerce/public/restaurants/${encodeURIComponent(slug)}?channel=${c}`,{...opts,cache:'no-store'});
    if(!alive)return;
    if(!menu?.available||!menu.config)throw new Error('Este establecimiento no está disponible actualmente.');
    setData(menu);
    if(c==='DINE_IN'){const rows=await apiFetch<any[]>(`/commerce/public/restaurants/${encodeURIComponent(slug)}/locations`,opts);if(!alive)return;setLocations(rows);}
    let saved:any;try{saved=JSON.parse(localStorage.getItem(`restaurant:${slug}:${c}`)||'null');}catch{}
    if(saved&&new Date(saved.expiresAt).getTime()>Date.now()&&(c==='PUBLIC_LINK'||(q.get('mesa')&&saved.qrToken===q.get('mesa'))))setSession({...saved,slug,channel:c});
    else if(c==='PUBLIC_LINK')await start(c);
    else if(q.get('mesa'))await start(c,q.get('mesa')!);
   }catch(e){if(alive)setError(restaurantError(e));}finally{if(alive)setLoading(false);}
  }
  void load();return()=>{alive=false;};
 },[slug,retry]);
 async function loadOrder(id:string){
  try{const result=await apiFetch<any>(`/commerce/public/restaurants/${encodeURIComponent(slug)}/orders/${encodeURIComponent(id)}`,{...opts,headers:{'x-commerce-session':session.token},cache:'no-store'});setOrder(result);setTrackingError('');try{localStorage.setItem(`restaurant:${slug}:${session.channel}:order`,JSON.stringify({id,token:session.token}));}catch{}
   try{const key='kronix:buyer:restaurant-orders:v2';const rows=JSON.parse(localStorage.getItem(key)||'[]');const local=new Date(Date.now()-5*3600000);const cutoff=Date.UTC(local.getUTCFullYear(),local.getUTCMonth()-1,1,5);localStorage.setItem(key,JSON.stringify([{id,slug,token:session.token,title,citySlug:data?.config?.store?.city?.slug,channel:session.channel,qrToken:session.qrToken,at:Date.now()},...rows.filter((x:any)=>x.id!==id&&x.at>=cutoff)].slice(0,100)));}catch{}}catch(e){setTrackingError('No pudimos actualizar el pedido. Reintentaremos automáticamente.');throw e;}
 }
 useEffect(()=>{if(!order||restaurantProgress(order).terminal)return;let active=true;const update=()=>{if(active)void loadOrder(order.id).catch(()=>{});};const t=setInterval(update,8000);window.addEventListener('focus',update);document.addEventListener('visibilitychange',update);return()=>{active=false;clearInterval(t);window.removeEventListener('focus',update);document.removeEventListener('visibilitychange',update);};},[order?.id,order?.status,session?.token]);
 useEffect(()=>{if(!session?.token)return;let id=new URLSearchParams(window.location.search).get('pedido');try{const saved=JSON.parse(localStorage.getItem(`restaurant:${slug}:${session.channel}:order`)||'null');if(!id&&saved?.token===session.token)id=saved.id;}catch{}if(id){setTracking(true);void loadOrder(id).catch(()=>{});}},[session?.token,slug]);
 async function ordered(id:string){setTracking(true);await loadOrder(id);const url=new URL(window.location.href);url.searchParams.set('pedido',id);window.history.replaceState(window.history.state,'',url);document.querySelector('[data-restaurant-scroll]')?.scrollTo({top:0});}
 const notifications=<><button className={trackingStyles.button} disabled={alerts.busy} onClick={alerts.enabled?alerts.deactivate:alerts.activate}>{alerts.busy?'Conectando…':alerts.enabled?'Desactivar avisos':'Activar avisos del pedido'}</button><p className={trackingStyles.hint}>Recibe avisos aunque cierres la app. El sonido depende de tu teléfono. En iPhone, ábrela desde el ícono instalado.</p>{alerts.message?<p role="status" className={trackingStyles.hint}>{alerts.message}</p>:null}</>;
 return <div data-restaurant-scroll className="relative mx-auto h-[100dvh] max-w-2xl overflow-y-auto overscroll-contain bg-white text-slate-900" style={{WebkitOverflowScrolling:'touch',paddingBottom:'env(safe-area-inset-bottom)'}}>
  {data&&data.config?.appPresentation?.style!=='CAFE_BOUTIQUE'&&(channel==='DINE_IN'||!installed)?<div className="absolute right-3 top-2 z-30 flex max-w-[85%] items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-white shadow-sm" style={{background:color}}>
   {channel==='PUBLIC_LINK'?<button onClick={requestInstall}>Instalar {title}</button>:<><span className="truncate">{session?.locationLabel||'Elige tu mesa'}</span>{session?<button className="shrink-0 border-l border-white/30 pl-2 underline" onClick={()=>setError('Para cambiar de mesa, escanea el QR de la nueva ubicación.')}>Cambiar</button>:null}</>}
  </div>:null}
  <dialog ref={installDialog} className={boutiqueStyles.installDialog} aria-labelledby="restaurant-install-title" onCancel={e=>{e.preventDefault();setInstallHelp(false);}} onClick={e=>{if(e.target===installDialog.current)setInstallHelp(false);}}><h2 id="restaurant-install-title">{title} en tu celular</h2><p><strong>iPhone o iPad:</strong> abre este enlace en Safari. Toca Compartir (puede estar dentro del menú ···), luego Añadir a pantalla de inicio y Añadir. Si aparece “Abrir como app web”, déjalo activado.</p><p><strong>Android:</strong> abre el enlace en Chrome y busca Instalar aplicación o Añadir a pantalla de inicio en el menú ···.</p><p>Después abre {title} desde su nuevo ícono.</p><button ref={installClose} className={boutiqueStyles.send} style={{background:color}} onClick={()=>setInstallHelp(false)}>Entendido</button></dialog>
  {trackingError&&!order?<p role="status" className="m-4 rounded-xl bg-amber-50 p-3 text-sm">No pudimos recuperar ese pedido. Su sesión puede haber vencido. Puedes seguir usando la carta.</p>:null}
  {error?<section role="alert" className="m-4 rounded-xl bg-amber-50 p-4 pt-12"><h1 className="font-bold">No pudimos completar la solicitud</h1><p className="mt-2">{error}</p><button className="mt-3 underline" onClick={()=>setRetry(n=>n+1)}>Volver a intentar</button></section>:null}
  {loading?<RestaurantLoading slug={slug}/>:data?(!session?(channel==='DINE_IN'?<section className="p-5 pt-16"><h1 className="text-xl font-bold">{title}</h1><h2 className="my-4">¿Dónde estás?</h2><p className="mb-3">Escanea el QR de tu mesa o posición en la barra para abrir su menú.</p>{locations.map(l=><span key={l.label} className="m-1 inline-block rounded-xl border p-4">{l.label}</span>)}{!locations.length?<p>No hay mesas disponibles. Consulta con el negocio.</p>:null}</section>:!error?<button disabled={starting} className="m-5 rounded-xl border p-3" onClick={()=>void start(channel)}>{starting?'Conectando…':'Abrir menú'}</button>:null):order&&tracking?session.channel!=='PUBLIC_LINK'?(boutique?<section className={boutiqueStyles.received}><div className={boutiqueStyles.brand}>{data.config.store.image?<img src={data.config.store.image} alt={data.config.store.name}/>:<strong>{title}</strong>}</div><div className={boutiqueStyles.receivedMark} aria-hidden="true">✓</div><p className={boutiqueStyles.receivedEyebrow}>Gracias por elegirnos</p><h1>Pedido recibido</h1><p>Tu próxima pausa ya está en camino.</p><div className={boutiqueStyles.panel}><div className={boutiqueStyles.panelLabel}><span>#{order.id.slice(-6)}</span><b>{session.locationLabel||title}</b></div><strong>{labels[order.status]??order.status}</strong><div className={boutiqueStyles.totals}><p className={boutiqueStyles.total}><span>Total del pedido</span><strong>{new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(order.subtotalCOP)}</strong></p></div></div><p className={boutiqueStyles.smallText}>Aquí verás las actualizaciones de tu pedido.</p><button className={boutiqueStyles.send} style={{background:color}} onClick={()=>setTracking(false)}>Volver al menú <span aria-hidden="true">→</span></button><footer className={boutiqueStyles.footer}>Tecnología KroniX</footer></section>:<section className="p-5 pt-16"><h1 className="text-2xl font-black">Pedido recibido</h1><p className="mt-3">#{order.id.slice(-6)} {session.locationLabel?`· ${session.locationLabel}`:''}</p><p className="mt-3">{labels[order.status]??order.status}</p><p className="mt-3 font-bold">{new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(order.subtotalCOP)}</p><button className="mt-5 rounded-xl p-3 text-white" style={{background:color}} onClick={()=>setTracking(false)}>Volver al menú</button></section>):<><PublicOrderTracking order={order} data={data} onMenu={()=>setTracking(false)} notifications={session.channel==='PUBLIC_LINK'?notifications:<p>Tu pedido se actualiza automáticamente.</p>}/>{trackingError?<p role="status" className="p-3 text-center text-sm">{trackingError}</p>:null}</>:<>{order?<button className="m-3 rounded-xl px-4 py-2 font-bold text-white" style={{background:color}} onClick={()=>setTracking(true)}>Ver seguimiento de mi pedido</button>:null}<EstablishmentMenu key={`${slug}:${channel}:${session.locationLabel??''}`} data={data} session={session} onOrdered={ordered} installControl={channel==='PUBLIC_LINK'&&!installed?<button onClick={requestInstall}>Instalar {title}</button>:null}/></>):null}
 </div>;
}
