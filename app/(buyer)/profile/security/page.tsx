"use client";
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {getMe} from '@/lib/authClient';
import {apiFetch} from '@/lib/api';
import {clearBuyerDeviceData} from '@/lib/buyerDevice';
import {registerBuyerPush} from '@/app/pwa-register';
export default function Security(){
 const [notice,N]=useState(''),[busy,B]=useState(false),[confirm,C]=useState(''),[open,O]=useState(false),[permission,P]=useState('consultando…'),[enabled,E]=useState(true);
 useEffect(()=>{const refresh=()=>{P('Notification' in window?Notification.permission:'no disponible');E(localStorage.getItem('kronix:buyer:notifications')!=='off');};refresh();window.addEventListener('focus',refresh);return()=>window.removeEventListener('focus',refresh);},[]);
 async function unsubscribe(){
  if(!('serviceWorker' in navigator))return;
  const registration=await navigator.serviceWorker.getRegistration('/');
  const subscription=await registration?.pushManager?.getSubscription();
  if(subscription){const me=await getMe();if(me?.user?.sub)await apiFetch('/push/unsubscribe',{method:'DELETE',json:{endpoint:subscription.endpoint}});await subscription.unsubscribe();}
 }
 async function notifications(on:boolean){B(true);N('');try{
  if(on){localStorage.setItem('kronix:buyer:notifications','on');if(!await registerBuyerPush(true))throw new Error('No se pudieron activar los avisos. Revisa los permisos del sitio y que la PWA esté instalada.');E(true);N('Avisos activados. Se asociarán a tus pedidos cuando solicites.');}
  else {await unsubscribe();localStorage.setItem('kronix:buyer:notifications','off');E(false);N('Avisos desactivados en este navegador.');}
  P('Notification' in window?Notification.permission:'no disponible');window.dispatchEvent(new Event('buyer:notifications-changed'));
 }catch(error:any){N(error.message||'No pudimos cambiar los avisos. Reintenta.');}finally{B(false);}}
 async function act(){if(busy)return;B(true);N('');try{
  // Keep access and notifications intact if deletion is refused by active orders.
  if(confirm==='delete'){
   const me=await getMe();
   if(me?.user?.sub&&!me.user.isDeviceCustomer){await apiFetch('/customer/web/legacy-profile',{method:'DELETE'});const response=await fetch('/api/buyer-device',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'forget'})});if(!response.ok)throw new Error('No pudimos limpiar el acceso local. Reintenta.');}
   else {const response=await fetch('/api/buyer-device',{method:'DELETE',credentials:'include'});if(!response.ok){const data=await response.json();throw new Error(data.message||'No pudimos eliminar el perfil.');}}
  }else{
   await unsubscribe();const response=await fetch('/api/buyer/auth/logout',{method:'POST',credentials:'include'});if(!response.ok)throw new Error('No pudimos desconectar. Revisa la conexión y reintenta.');
   const forgotten=await fetch('/api/buyer-device',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'forget'})});if(!forgotten.ok)throw new Error('No pudimos olvidar el acceso de este navegador.');
  }
  if(confirm==='delete' && 'serviceWorker' in navigator){try{const registration=await navigator.serviceWorker.getRegistration('/');await (await registration?.pushManager?.getSubscription())?.unsubscribe();}catch{}}
  clearBuyerDeviceData();window.dispatchEvent(new Event('buyer:contact-changed'));N(confirm==='delete'?'Tu perfil fue eliminado.':'Este navegador ya no recuerda tus datos ni conserva el acceso a tus pedidos.');C('');
 }catch(error:any){N(error.message||'No pudimos completar el cambio.');}finally{B(false);}}
 return <main className="min-h-full space-y-3 bg-white p-4 text-[#15546a]"><Link href="/profile" className="inline-flex items-center gap-2 py-2 font-bold">← Perfil</Link><header className="flex items-center gap-3 pb-2"><img src="/branding/profile/seguridad.png" alt="" className="h-14 w-14 object-contain"/><div><h1 className="text-xl font-extrabold">Seguridad y Notificaciones</h1><p className="text-sm text-slate-600">Cuida tus datos y el acceso desde este navegador.</p></div></header>
 <section className="space-y-2 rounded-2xl border border-slate-200 p-4"><h2 className="font-extrabold">Tu dispositivo es tu acceso</h2><p className="text-sm leading-6 text-slate-600">KroniX no te pide contraseña. Protege tu teléfono con PIN, huella o reconocimiento facial para cuidar tus pedidos y datos.</p></section>
 <section className="space-y-2 rounded-2xl border border-slate-200 p-4"><h2 className="font-extrabold">Tú decides qué guardar</h2><p className="text-sm leading-6 text-slate-600">Puedes solicitar sin guardar un perfil permanente. Al autorizar recordar tus datos, se completarán tus próximas solicitudes.</p><Link href="/profile/info" className="block rounded-xl bg-slate-50 p-3 text-center text-sm font-bold">Revisar mis datos</Link></section>
 <section className="rounded-2xl border border-slate-200 p-4"><button aria-expanded={open} onClick={()=>O(!open)} className="flex w-full items-center justify-between text-left font-extrabold"><span>Notificaciones</span><span aria-hidden="true">{open?'−':'+'}</span></button>{open&&<div className="mt-3 space-y-3 text-sm text-slate-600"><p>Recibe novedades de tus pedidos. Permiso del navegador: {permission==='granted'?'autorizado':permission==='denied'?'bloqueado':permission==='default'?'sin solicitar':permission}.</p><p>Preferencia de avisos: {enabled?'activados':'desactivados'}. Para cambiar un permiso bloqueado, abre la configuración del sitio en tu navegador.</p><button disabled={busy} onClick={()=>notifications(true)} className="w-full rounded-xl bg-[#087f9d] p-3 font-bold text-white disabled:opacity-40">Activar avisos</button><button disabled={busy} onClick={()=>notifications(false)} className="w-full rounded-xl border p-3 font-bold disabled:opacity-40">Desactivar avisos</button></div>}</section>
 <section className="grid gap-3"><button disabled={busy} onClick={()=>{N('');C('forget');}} className="rounded-2xl border border-red-100 p-4 text-left text-sm font-bold text-red-700">Olvidar datos de este navegador</button><button disabled={busy} onClick={()=>{N('');C('delete');}} className="rounded-2xl border border-red-100 p-4 text-left text-sm font-bold text-red-700">Eliminar mi perfil e historial personal</button></section>
 {confirm&&<section role="dialog" aria-modal="false" aria-labelledby="confirm-profile-action" className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4"><h2 id="confirm-profile-action" className="font-bold">¿Confirmas este cambio?</h2><p className="text-sm text-slate-700">{confirm==='delete'?'Primero debes finalizar o cancelar tus pedidos activos. Los registros operativos finalizados se conservan anonimizados.':'Perderás el acceso local a tu historial. No se recupera escribiendo un número celular.'}</p><button disabled={busy} onClick={act} className="w-full rounded-xl bg-red-700 p-3 font-bold text-white">{busy?'Procesando…':confirm==='delete'?'Eliminar perfil':'Olvidar acceso local'}</button><button disabled={busy} onClick={()=>C('')} className="w-full rounded-xl border p-3 font-bold">Conservar mis datos</button></section>}
 {notice&&<p role="status" className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">{notice}</p>}</main>;
}
