"use client";
import Link from 'next/link';
import CityChangeButton from '@/components/buyer/CityChangeButton';
import {useEffect,useState} from 'react';
import {readBuyerContact} from '@/lib/buyerDevice';
const entries=[
 ['Mis datos','Tu nombre y celular','informacion','info'],
 ['Seguridad y Notificaciones','Protege tus datos y el acceso','seguridad','security'],
 ['Direcciones guardadas','Tus lugares frecuentes','direcciones','addresses'],
 ['Privacidad','Cómo usamos y guardamos tus datos','privacidad','privacy'],
 ['Términos y Condiciones','Condiciones de uso de KroniX','tyc','terms'],
 ['Soporte','Preguntas, ayuda y contacto','soporte','support'],
];
export default function Profile(){
 const [name,N]=useState('');
 useEffect(()=>{const refresh=()=>{const saved=readBuyerContact();N(saved.remember?saved.name.trim().split(/\s+/)[0]:'');};refresh();window.addEventListener('buyer:contact-changed',refresh);return()=>window.removeEventListener('buyer:contact-changed',refresh);},[]);
 return <div className="min-h-full space-y-3 bg-white px-4 pb-5 pt-3 text-[#15546a]">
 <header className="mb-4 flex items-center justify-between gap-3 py-1"><div className="min-w-0"><h1 className="text-[20px] font-extrabold leading-7">{name?`¡Hola, ${name}!`:'Tu espacio en KroniX'}</h1><p className="mt-0.5 text-[12px] leading-5 text-slate-600">Tus datos para pedir más fácil</p></div><CityChangeButton/></header>
 <nav aria-label="Opciones de perfil" className="space-y-3">{entries.map(([title,subtitle,image,route])=><Link key={route} href={`/profile/${route}`} className="flex min-h-[74px] items-center gap-3 rounded-[20px] border border-slate-200 bg-white px-4 py-3 shadow-[0_2px_4px_rgba(15,23,42,0.12)] transition hover:bg-slate-50"><img src={`/branding/profile/${image}.png`} alt="" className="h-12 w-12 shrink-0 object-contain"/><span className="min-w-0 flex-1"><span className="block text-[16px] font-extrabold leading-5">{title}</span><span className="mt-1 block text-[13px] leading-5 text-slate-600">{subtitle}</span></span><span aria-hidden="true" className="text-3xl font-light text-[#087c98]">›</span></Link>)}</nav>
 </div>;
}
