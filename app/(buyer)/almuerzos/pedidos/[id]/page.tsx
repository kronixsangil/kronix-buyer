"use client";
import {useEffect,useState} from "react";
import {useParams} from "next/navigation";
import Link from "next/link";
import {apiFetch} from "@/lib/api";

const labels:any={PENDING_PAYMENT_REVIEW:"Verificando pago",CONFIRMED:"Confirmado",PREPARING:"En preparación",READY:"Listo / esperando domiciliario",COMPLETED:"Finalizado",REJECTED:"Rechazado"};
function wa(phone:string,msg:string){let d=String(phone||"").replace(/\D/g,"");if(d.length===10)d="57"+d;return `https://wa.me/${d}?text=${encodeURIComponent(msg)}`}
export default function Page(){const p=useParams();const id=String((p as any)?.id||"");const [o,setO]=useState<any>(null);const [err,setErr]=useState("");
 async function load(){try{setO(await apiFetch(`/lunch/orders/${encodeURIComponent(id)}`,{cache:"no-store"} as any));}catch(e:any){setErr(e?.message||"No pudimos cargar el pedido");}}
 useEffect(()=>{if(id)void load();},[id]);
 if(err)return <main className="p-5"><Link href="/orders" className="font-bold">← Pedidos</Link><div className="mt-4 rounded-2xl bg-red-50 p-4 text-red-700">{err}</div></main>;
 if(!o)return <main className="p-5 font-bold text-slate-500">Cargando pedido…</main>;
 const phone=String(o.store?.cel1||o.store?.cel2||""); const driverPhone=String(o.courier?.driver?.phone||"");
 return <main className="mx-auto max-w-2xl p-5"><Link href="/orders" className="font-bold text-emerald-700">← Mis pedidos</Link><div className="mt-4 rounded-3xl bg-white p-5 shadow-sm"><div className="text-xs font-black uppercase text-violet-600">🍽️ Pedido de Almuerzo</div><h1 className="mt-1 text-xl font-black">Pedido ...{id.slice(-6)}</h1><div className="mt-3 inline-flex rounded-full bg-violet-50 px-3 py-2 text-sm font-black text-violet-800">{labels[o.status]||o.status}</div><div className="mt-4 rounded-2xl bg-slate-50 p-4"><div className="font-black">{o.store?.name||"Restaurante"}</div><div className="mt-1 text-sm text-slate-600">{o.store?.address||""}</div>{phone?<div className="mt-3 grid grid-cols-2 gap-2"><a href={`tel:${phone}`} className="rounded-xl bg-slate-900 p-3 text-center text-sm font-black text-white">📞 Llamar</a><a href={wa(phone,`Hola, te contacto por mi pedido de almuerzo KroniX ...${id.slice(-6)}.`)} target="_blank" rel="noreferrer" className="rounded-xl bg-emerald-600 p-3 text-center text-sm font-black text-white">WhatsApp</a></div>:null}</div>{driverPhone?<div className="mt-3 rounded-2xl border border-blue-100 p-4"><div className="font-black">🛵 Domiciliario: {o.courier?.driver?.name||"Asignado"}</div><div className="mt-3 grid grid-cols-2 gap-2"><a href={`tel:${driverPhone}`} className="rounded-xl bg-blue-700 p-3 text-center text-sm font-black text-white">📞 Llamar</a><a href={wa(driverPhone,`Hola, te contacto por mi pedido KroniX ...${id.slice(-6)}.`)} target="_blank" rel="noreferrer" className="rounded-xl bg-emerald-600 p-3 text-center text-sm font-black text-white">WhatsApp</a></div></div>:null}</div></main>}
