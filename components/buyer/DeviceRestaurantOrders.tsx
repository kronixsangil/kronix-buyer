"use client";
import {useEffect,useState} from 'react';
import {apiFetch} from '@/lib/api';
import {useBuyerCity} from './CityContext';
export default function DeviceRestaurantOrders(){const {citySlug}=useBuyerCity();const [rows,R]=useState<any[]>([]);
 useEffect(()=>{let alive=true;async function load(){let saved:any[]=[];try{saved=JSON.parse(localStorage.getItem('kronix:buyer:restaurant-orders:v2')||'[]');}catch{}const local=saved.filter(x=>x.citySlug===citySlug);const next=await Promise.all(local.map(async x=>{try{const o=await apiFetch<any>(`/commerce/public/restaurants/${encodeURIComponent(x.slug)}/orders/${encodeURIComponent(x.id)}`,{headers:{'x-commerce-session':x.token},suppressActivityRefresh:true,suppressSessionExpiredEvent:true});return {...x,status:o.status};}catch{return {...x,status:'Consulta el establecimiento'};}}));if(alive)R(next);}void load();const t=setInterval(()=>void load(),30000);return()=>{alive=false;clearInterval(t);};},[citySlug]);
 if(!rows.length)return null;
 const labels:any={PENDING_PAYMENT_REVIEW:'Verificando pago',CONFIRMED:'Recibido',PREPARING:'En preparación',READY:'Listo',COMPLETED:'Finalizado',REJECTED:'Rechazado'};
 return <section className="my-4 space-y-2"><h2 className="font-black">Pedidos a establecimientos</h2>{rows.map(x=><a key={x.id} href={`/r/${encodeURIComponent(x.slug)}?pedido=${encodeURIComponent(x.id)}${x.channel==='DINE_IN'?`&mode=dine-in&mesa=${encodeURIComponent(x.qrToken||'')}`:''}`} className="block rounded-2xl border bg-white p-4"><b>{x.title||'Establecimiento'}</b><p className="text-sm">#{x.id.slice(-6)} · {labels[x.status]||x.status}</p></a>)}</section>;
}
