"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {apiFetch} from "@/lib/api";
import {useBuyerCity} from "@/components/buyer/CityContext";
export default function EstablishmentDirectory(){
 const {citySlug,cityReady}=useBuyerCity(),[rows,setRows]=useState<any[]>([]),[error,setError]=useState("");
 useEffect(()=>{if(!cityReady||!citySlug)return;let alive=true;setError("");apiFetch<any>(`/customer/establishments?citySlug=${encodeURIComponent(citySlug)}`,{suppressSessionExpiredEvent:true}).then(d=>{if(alive)setRows(d.items??[])}).catch(e=>{if(alive)setError(e.message)});return()=>{alive=false}},[citySlug,cityReady]);
 return <main className="mx-auto max-w-5xl p-5"><h1 className="text-2xl font-bold">Establecimientos</h1>{error&&<p role="alert">{error}</p>}<div className="mt-5 grid gap-4 sm:grid-cols-2">{rows.filter(r=>r.publicSlug).map(r=><Link key={r.id} href={`/r/${encodeURIComponent(r.publicSlug)}`} className="rounded-2xl border bg-white p-5"><h2 className="font-bold">{r.store.name}</h2><p>{r.store.address}</p><p>{r.openTime} – {r.closeTime}</p><span>Ver catálogo →</span></Link>)}</div>{cityReady&&!rows.length&&!error&&<p className="mt-4">No hay establecimientos disponibles en esta ciudad.</p>}</main>
}
