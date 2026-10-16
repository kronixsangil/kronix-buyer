"use client";
import {useEffect,useState} from "react";
import {useParams,useRouter} from "next/navigation";
import {apiFetch} from "@/lib/api";
import {useBuyerCity} from "@/components/buyer/CityContext";
export default function StoreEntry(){
 const {id}=useParams<{id:string}>(),router=useRouter(),{citySlug,cityReady}=useBuyerCity(),[error,setError]=useState("");
 useEffect(()=>{if(!cityReady||!id)return;let alive=true;setError("");apiFetch<any>(`/commerce/public/by-store/${encodeURIComponent(id)}?citySlug=${encodeURIComponent(citySlug??"")}`,{suppressSessionExpiredEvent:true}).then(d=>{if(alive)router.replace(`/r/${encodeURIComponent(d.publicSlug)}`)}).catch(e=>{if(alive)setError(e.message)});return()=>{alive=false}},[id,citySlug,cityReady,router]);
 return <main className="p-6">{error?<p role="alert">{error}</p>:<p>Abriendo establecimiento…</p>}</main>;
}
