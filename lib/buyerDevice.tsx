"use client";
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {buyerHasCurrentConsent} from './buyerConsent';
import { apiFetch } from './api';
import { getMe, writeCachedUserId } from './authClient';
import { getCurrentBuyerLegalDocument } from '@/components/buyer/legal/buyerLegal';
export type BuyerContact={name:string;phone:string;address:string;remember?:boolean};
const CONTACT='kronix:buyer:contact:v2', DEVICE='kronix:buyer:device:v2';
export function readBuyerContact():BuyerContact {
 try{return JSON.parse(localStorage.getItem(CONTACT)||'null')||{name:'',phone:'',address:'',remember:false};}catch{return {name:'',phone:'',address:'',remember:false};}
}
export function saveBuyerContact(contact:BuyerContact) {try{if(contact.remember)localStorage.setItem(CONTACT,JSON.stringify(contact));else localStorage.removeItem(CONTACT);}catch{}}
export function clearBuyerDeviceData(){
 for(const storage of [localStorage,sessionStorage])for(const key of Object.keys(storage))if(key.startsWith('kronix:')||key.startsWith('restaurant:')||key.startsWith('restaurant-cart:')||key.startsWith('buyer:'))storage.removeItem(key);
 window.dispatchEvent(new Event('auth:changed'));
}
function FieldIcon({kind}:{kind:string}) {
 const common={width:20,height:20,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.7,strokeLinecap:'round' as const,strokeLinejoin:'round' as const};
 return <svg {...common} aria-hidden="true">{kind==='name'?<><circle cx="12" cy="8" r="3.3"/><path d="M5 20v-2c0-6 14-6 14 0v2"/></>:kind==='phone'?<><rect x="6.5" y="2" width="11" height="20" rx="3"/><path d="M10 18h4"/></>:<><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="9" r="2.5"/></>}</svg>;
}
export function Confirmation({seed,documents,done,legalAccepted=false}:{seed:BuyerContact;documents:any[];done:(value:BuyerContact|null)=>void;legalAccepted?:boolean}){
 const [name,N]=useState(seed.name),[phone,P]=useState(seed.phone),[address,A]=useState(seed.address),[remember,R]=useState(seed.remember===true),[accepted,S]=useState(legalAccepted),[view,V]=useState<any>(null);
 const remembered=seed.remember===true;
 const valid=name.trim().length>=2&&/^\+?[0-9]{10,15}$/.test(phone.replace(/\s/g,''))&&address.trim().length>=3&&accepted;
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;const oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';document.getElementById('buyer-confirm-name')?.focus();const key=(e:KeyboardEvent)=>{if(e.key==='Escape')done(null);if(e.key==='Tab'){const dialog=document.getElementById('buyer-confirm-dialog');const controls=Array.from(dialog?.querySelectorAll<HTMLElement>('input:not([disabled]),button:not([disabled]),a[href]')||[]);const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};window.addEventListener('keydown',key);return()=>{document.body.style.overflow=oldOverflow;window.removeEventListener('keydown',key);previous?.focus();};},[]);
 const fields=[{key:'name',label:'Tu nombre',value:name,set:N,complete:'name',max:100},{key:'phone',label:'Celular de contacto',value:phone,set:P,complete:'tel',max:16},{key:'address',label:'Dirección del servicio',value:address,set:A,complete:'street-address',max:300}];
 return <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#071d3d]/40 p-4 backdrop-blur-[3px]">
 <form id="buyer-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="buyer-confirm-title" className="max-h-[90dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-[30px] bg-white text-[#10264b]" style={{boxShadow:'none'}} onSubmit={e=>{e.preventDefault();if(valid)done({name:name.trim(),phone:phone.replace(/\s/g,''),address:address.trim(),remember});}}>
 <header className="relative overflow-hidden bg-gradient-to-br from-[#edfaf7] via-[#eff9ff] to-white px-6 pb-5 pt-6"><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#17847d]"><span aria-hidden="true">✓</span> Un paso y listo</div><button aria-label="Cerrar confirmación" type="button" onClick={()=>done(null)} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-white/80 text-lg text-slate-500">×</button><h2 id="buyer-confirm-title" className="text-[23px] font-black leading-7 tracking-tight">Confirma tus datos</h2><p className="mt-2 text-[13px] leading-5 text-slate-500">Todo listo para atender tu solicitud.</p></header>
 <div className="space-y-4 px-6 pb-6">{fields.map(field=><label key={field.key} className="block"><span className="mb-2 ml-1 block text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#526781]">{field.label}</span><span className="flex items-center gap-3 rounded-2xl bg-[#f1f7fb] px-4 py-1 ring-1 ring-[#e5eff6]"><span className="text-[#28a399]"><FieldIcon kind={field.key}/></span><input id={field.key==='name'?'buyer-confirm-name':undefined} autoComplete={field.complete} inputMode={field.key==='phone'?'tel':'text'} readOnly={field.key==='address'&&!!seed.address} maxLength={field.max} required value={field.value} onChange={e=>field.set(e.target.value)} className="min-w-0 flex-1 border-0 bg-transparent py-3 text-[14px] font-semibold text-[#173453] outline-none ring-0 focus:outline-none focus:ring-0" style={{border:'none',outline:'none',boxShadow:'none'}}/></span></label>)}
 {(!remembered||!legalAccepted)&&<div className="space-y-3 rounded-2xl bg-[#f5faf9] p-3.5">{!remembered&&<label className="flex items-start gap-2.5 text-[12px] leading-5 text-slate-600"><input type="checkbox" checked={remember} onChange={e=>R(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#159f94]"/>Recordar mis datos en este navegador</label>}{!legalAccepted&&<label className="flex items-start gap-2.5 text-[12px] leading-5 text-slate-600"><input required type="checkbox" checked={accepted} onChange={e=>S(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#159f94]"/>Acepto los términos y la política de privacidad para solicitar.</label>}</div>}
 {remembered&&legalAccepted&&<p className="flex items-center gap-2 text-[12px] font-medium text-[#218b7e]"><span aria-hidden="true">✓</span>Tus preferencias ya están guardadas</p>}
 <div className="flex justify-center gap-4 text-[11px] text-slate-500">{documents.map(d=><button key={d.documentType} type="button" onClick={()=>V(d)} className="underline decoration-slate-200 underline-offset-4 hover:text-[#13998e]">{d.documentType==='BUYER_TERMS'?'Términos':'Privacidad'}</button>)}</div>
 {view&&<section className="rounded-2xl bg-[#f3f8fb] p-4"><h3 className="text-sm font-bold">{view.title}</h3><div className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap text-xs leading-5 text-slate-600">{view.content||view.description}</div><button type="button" onClick={()=>V(null)} className="mt-3 text-xs font-bold text-[#168f88]">Cerrar documento</button></section>}
 <div className="flex gap-3 pt-1"><button type="button" onClick={()=>done(null)} className="rounded-2xl bg-[#edf3f8] px-5 py-3.5 text-[13px] font-bold text-[#4a6585]">Volver</button><button disabled={!valid} type="submit" className="flex-1 rounded-2xl bg-gradient-to-r from-[#12a59b] to-[#167fc7] px-3 py-3.5 text-[13px] font-extrabold text-white transition disabled:opacity-40">Confirmar solicitud <span aria-hidden="true">→</span></button></div>
 </div></form></div>;
}
let flight:Promise<any>|null=null;
export async function submitBuyerOrder(order:any,seed:Partial<BuyerContact>={}) {
 if(flight)throw new Error('Ya estamos enviando tu solicitud.');
 flight=(async()=>{
 const documents=await Promise.all(['BUYER_TERMS','BUYER_PRIVACY'].map(type=>getCurrentBuyerLegalDocument(type as any)));
 if(documents.some(d=>!d))throw new Error('No pudimos cargar los documentos legales. Intenta de nuevo.');
 const known=await getMe();const saved=readBuyerContact();
 const legalAccepted=await buyerHasCurrentConsent(known?.user?.sub,documents as any[],path=>apiFetch(path,{method:"GET",suppressSessionExpiredEvent:true,suppressActivityRefresh:true}));
 const contact=await new Promise<BuyerContact|null>(resolve=>{const host=document.createElement('div');document.body.append(host);const root=createRoot(host);let ended=false;const done=(value:BuyerContact|null)=>{if(ended)return;ended=true;resolve(value);setTimeout(()=>{root.unmount();host.remove();},0);};root.render(<Confirmation seed={{...saved,...Object.fromEntries(Object.entries(seed).filter(([,v])=>!!v))}} documents={documents} legalAccepted={legalAccepted} done={done}/>);});
 if(!contact)throw new Error('Solicitud sin enviar.');
 const signature=JSON.stringify({...order,customerId:undefined});let pending:any;try{pending=JSON.parse(sessionStorage.getItem('kronix:buyer:pending-order')||'null');}catch{}
 const requestId=pending?.signature===signature?pending.requestId:crypto.randomUUID();
 sessionStorage.setItem('kronix:buyer:pending-order',JSON.stringify({signature,requestId}));
 const data={order:{...order,requestId},contact:{name:contact.name,phone:contact.phone,address:contact.address,accepted:!!contact.remember},acceptedLegal:true,legalVersions:Object.fromEntries(documents.map(d=>[d!.documentType,d!.version]))};
 const useLegacy=!!known?.user?.sub&&!known.user.isDeviceCustomer;
 let result:any;
 if(useLegacy)result=await apiFetch('/customer/web/legacy-orders',{method:'POST',json:data,suppressActivityRefresh:true});
 else {const prepared=await fetch('/api/buyer-device',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'prepare'})});if(!prepared.ok)throw new Error('No pudimos preparar el acceso del navegador. Reintenta.');const res=await fetch('/api/buyer-device',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});result=await res.json();if(!res.ok)throw new Error(Array.isArray(result.message)?result.message.join('. '):result.message||'No pudimos enviar tu solicitud.');localStorage.setItem(DEVICE,'1');}
 saveBuyerContact(contact);window.dispatchEvent(new Event('buyer:contact-changed'));sessionStorage.removeItem('kronix:buyer:pending-order');
 if(result.user?.id)writeCachedUserId(result.user.id);
 window.dispatchEvent(new Event('auth:changed'));
 return result.order;
 })();try{return await flight;}finally{flight=null;}
}
