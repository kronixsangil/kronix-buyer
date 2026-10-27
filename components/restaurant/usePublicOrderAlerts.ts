'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {apiFetch} from '@/lib/api';
import {restaurantProgress} from '@/lib/restaurant-progress';
const opts={suppressSessionExpiredEvent:true,suppressActivityRefresh:true};
function keyBytes(key:string){const raw=atob(key.replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(raw,c=>c.charCodeAt(0));}
async function registration(slug:string){
 const reg=await navigator.serviceWorker.register(`/r/${encodeURIComponent(slug)}/sw.js`,{scope:`/r/${encodeURIComponent(slug)}`});
 if(reg.active)return reg;
 await new Promise<void>((resolve,reject)=>{const w=reg.installing||reg.waiting;if(!w)return reject(new Error('Vuelve a intentar en unos segundos.'));const timer=setTimeout(()=>{w.removeEventListener('statechange',check);reject(new Error('Vuelve a intentar en unos segundos.'));},12000);function check(){if(w!.state==='activated'){clearTimeout(timer);w!.removeEventListener('statechange',check);resolve();}}w.addEventListener('statechange',check);check();});
 return reg;
}
export default function usePublicOrderAlerts(slug:string,session:any,order:any,onUpdate:()=>void){
 const [enabled,setEnabled]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const audio=useRef<AudioContext|null>(null),last=useRef<{id:string;state:string}|null>(null),refresh=useRef(onUpdate);
 refresh.current=onUpdate;
 const pref=`restaurant:${slug}:alerts`;
 const base=`/commerce/public/restaurants/${encodeURIComponent(slug)}/orders/${encodeURIComponent(order?.id||'')}/notifications`;
 const headers={'x-commerce-session':session?.token||''};
 function chime(){const ctx=audio.current;if(!ctx||ctx.state!=='running'||document.visibilityState!=='visible')return;[660,880].forEach((hz,i)=>{const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime+i*.18;o.frequency.value=hz;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.08,t+.02);g.gain.exponentialRampToValueAtTime(.001,t+.3);o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+.32);});}
 const subscribe=useCallback(async()=>{
  const key=await apiFetch<any>('/commerce/public/notifications/key',opts);
  if(!key.publicKey)throw new Error('Los avisos aún no están disponibles. Puedes seguir tu pedido aquí.');
  const reg=await registration(slug);
  const sub=await reg.pushManager.getSubscription()||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(key.publicKey)});
  await apiFetch(base,{...opts,method:'POST',headers,json:{subscription:sub.toJSON()}});
 },[slug,base,session?.token]);
 async function activate(){
  setBusy(true);setMessage('');
  try{
   const Audio=window.AudioContext||(window as any).webkitAudioContext;if(Audio){audio.current??=new Audio();await audio.current!.resume();}
   if(!('Notification'in window)||!('serviceWorker'in navigator)||!('PushManager'in window))throw new Error('Este navegador no permite avisos push. En iPhone, instala la app en la pantalla de inicio y ábrela desde su ícono.');
   const permission=await Notification.requestPermission();
   if(permission!=='granted')throw new Error('No se autorizaron las notificaciones. Puedes habilitarlas en los ajustes del navegador.');
   await subscribe();try{localStorage.setItem(pref,'on');}catch{}setEnabled(true);setMessage('Avisos activados para este pedido.');chime();
  }catch(e:any){setMessage(e?.message||'No pudimos activar los avisos. Vuelve a intentarlo.');}finally{setBusy(false);}
 }
 async function deactivate(){setBusy(true);try{const reg=await navigator.serviceWorker.getRegistration(`/r/${encodeURIComponent(slug)}`),sub=await reg?.pushManager.getSubscription();if(sub)await apiFetch(base+'/off',{...opts,method:'POST',headers,json:{subscription:sub.toJSON()}});try{localStorage.removeItem(pref);}catch{}setEnabled(false);setMessage('Avisos desactivados para este pedido.');}catch{setMessage('No pudimos desactivar los avisos. Vuelve a intentarlo.');}finally{setBusy(false);}}
 useEffect(()=>{let live=true;setEnabled(false);if(!order?.id||!session?.token||restaurantProgress(order).terminal||session.channel!=='PUBLIC_LINK')return;let saved=false;try{saved=localStorage.getItem(pref)==='on';}catch{}if(saved&&'Notification'in window&&Notification.permission==='granted')void subscribe().then(()=>{if(live)setEnabled(true);}).catch(()=>{if(live)setMessage('Toca Activar avisos para volver a conectarlos.');});return()=>{live=false;};},[order?.id,session?.token,subscribe]);
 useEffect(()=>{if(!order)return;const state=restaurantProgress(order).state;if(last.current&&last.current.id===order.id&&last.current.state!==state&&enabled)chime();last.current={id:order.id,state};},[order,enabled]);
 useEffect(()=>{if(!('serviceWorker'in navigator))return;const update=(event:MessageEvent)=>{if(event.data?.type==='commerce.order'&&event.data.orderId===order?.id)refresh.current();};navigator.serviceWorker.addEventListener('message',update);return()=>navigator.serviceWorker.removeEventListener('message',update);},[order?.id]);
 useEffect(()=>{const unlock=()=>{if(enabled&&!audio.current){const Audio=window.AudioContext||(window as any).webkitAudioContext;if(Audio)audio.current=new Audio();}if(audio.current?.state==='suspended')void audio.current.resume();};document.addEventListener('pointerdown',unlock);return()=>document.removeEventListener('pointerdown',unlock);},[enabled]);
 useEffect(()=>()=>{void audio.current?.close();},[]);
 return {enabled,busy,message,activate,deactivate};
}
