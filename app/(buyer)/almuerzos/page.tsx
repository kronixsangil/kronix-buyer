//app\(buyer)\almuerzos\page.tsx
"use client";
import Image from "next/image";
import {
  useEffect, useMemo, useRef, useState
}
from "react";
import {
  useRouter
}
from "next/navigation";
import {
  useBuyerCity
}
from "@/components/buyer/CityContext";
import {
  apiFetch, type ApiError
}
from "@/lib/api";
import { useAuth } from "@/components/buyer/useAuth";
import { geocodeAddressOSMInCity } from "@/lib/geocode";
const ICOPOR_PRICE_COP = 1500;
const LUNCH_DRAFT_KEY = "kronix:lunch:draft:v1";
const LUNCH_DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

type LunchDraft = {
  savedAt:number;
  citySlug:string;
  configId?:string;
  step:Step;
  cart:Record<string,number>;
  fulfillment:"DELIVERY"|"PICKUP";
  address:string;
  reference:string;
  deliveryLat:number|null;
  deliveryLng:number|null;
  selectedSavedAddressId:string;
  payRef:string;
  note:string;
};
type LunchItem = {
  id: string;
  category: string;
  name: string;
  description?: string | null;
  priceCOP: number
}
;
type LunchData = {
  available: boolean;
  isOpen?: boolean;
  closedPeriod?: "BEFORE_OPEN" | "AFTER_CLOSE" | null;
  config?: {
    id:string;
    serviceTitle?:string;
    serviceSubtitle?:string;
    dailyIncludedText?:string|null;
    openTime:string;
    closeTime:string;
    paymentMethodLabel:string;
    paymentDestination?:string|null;
    store:{
      name:string
    }
  }
  ;
  menu?:{
    title?:string;
    includedText?:string|null;
    items?:LunchItem[]
  }
}
;
type SavedAddressItem = { id:string; label?:string|null; placeName?:string|null; reference?:string|null; address:string; lat?:number|null; lng?:number|null; isDefault?:boolean; isFavorite?:boolean; };
type Step = "MENU" | "ORDER" | "PAYMENT";
const money=(v:number)=>`$ ${Number(v||0).toLocaleString("es-CO")}`;
const categoryLabel=(c:string)=>c==="ESPECIALES"?"Especiales":money(Number(c));
const plateDayNames=[
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado"
];

function LunchFlowHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
}) {
  return (
    <header className="relative overflow-hidden bg-gradient-to-b from-[#350071] via-[#5410b3] to-[#F8EBFF] px-4 pb-8 pt-4 text-white">
      <button
        type="button"
        onClick={onBack}
        className="absolute left-4 top-5 z-20 grid h-9 w-9 place-items-center rounded-full bg-black/20 text-2xl font-black"
        aria-label="Volver"
      >
        ‹
      </button>

      <div className="mx-auto flex min-h-[104px] max-w-[400px] items-center justify-center gap-3 pl-8">
        <div className="relative h-[82px] w-[126px] shrink-0">
          <Image
            src="/lunch/Header/header.png"
            alt="La Fortuna"
            fill
            className="object-contain"
            sizes="126px"
          />
        </div>

        <div className="min-w-0 text-left">
          <div className="text-[22px] font-black leading-tight tracking-tight">
            {title}
          </div>
          {subtitle ? (
            <div className="mt-1 max-w-[190px] text-[12px] font-bold leading-snug text-white/85">
              {subtitle}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export default function LunchPage(){
  const router=useRouter();
  const {
    citySlug,cityLabel,cityReady,cityGeoLabel
  }
  =useBuyerCity();
  const { isAuthed }=useAuth();
  const [data,setData]=useState<LunchData|null>(null);
  const [loading,setLoading]=useState(true);
  const [msg,setMsg]=useState("");
  const [cat,setCat]=useState("");
  const [cart,setCart]=useState<Record<string,number>>({
  }
  );
  const [step,setStep]=useState<Step>("MENU");
  const [fulfillment,setFulfillment]=useState<"DELIVERY"|"PICKUP">("DELIVERY");
  const [address,setAddress]=useState("");
  const [reference,setReference]=useState("");
  const [deliveryLat,setDeliveryLat]=useState<number|null>(null);
  const [deliveryLng,setDeliveryLng]=useState<number|null>(null);
  const [savedAddresses,setSavedAddresses]=useState<SavedAddressItem[]>([]);
  const [savedAddressesLoading,setSavedAddressesLoading]=useState(false);
  const [selectedSavedAddressId,setSelectedSavedAddressId]=useState("");
  const [showSavedAddressModal,setShowSavedAddressModal]=useState(false);
  const [payRef,setPayRef]=useState("");
  const [note,setNote]=useState("");
  const [sending,setSending]=useState(false);
  const draftRestoredRef=useRef(false);

  // Conserva el pedido aunque el navegador/PWA pase a segundo plano o el cliente
  // salga temporalmente a Nequi/DaviPlata. El borrador expira a las 24 horas.
  useEffect(()=>{
    if(!cityReady||!citySlug||draftRestoredRef.current)return;
    draftRestoredRef.current=true;
    try{
      const raw=window.localStorage.getItem(LUNCH_DRAFT_KEY);
      if(!raw)return;
      const draft=JSON.parse(raw) as LunchDraft;
      const expired=!draft?.savedAt||Date.now()-Number(draft.savedAt)>LUNCH_DRAFT_MAX_AGE_MS;
      const wrongCity=String(draft?.citySlug??"")!==String(citySlug);
      if(expired||wrongCity){window.localStorage.removeItem(LUNCH_DRAFT_KEY);return;}
      setCart(draft.cart&&typeof draft.cart==="object"?draft.cart:{});
      setFulfillment(draft.fulfillment==="PICKUP"?"PICKUP":"DELIVERY");
      setAddress(String(draft.address??""));
      setReference(String(draft.reference??""));
      setDeliveryLat(draft.deliveryLat!=null&&Number.isFinite(Number(draft.deliveryLat))?Number(draft.deliveryLat):null);
      setDeliveryLng(draft.deliveryLng!=null&&Number.isFinite(Number(draft.deliveryLng))?Number(draft.deliveryLng):null);
      setSelectedSavedAddressId(String(draft.selectedSavedAddressId??""));
      setPayRef(String(draft.payRef??""));
      setNote(String(draft.note??""));
      setStep(draft.step==="PAYMENT"?"PAYMENT":draft.step==="ORDER"?"ORDER":"MENU");
    }catch{window.localStorage.removeItem(LUNCH_DRAFT_KEY);}
  },[cityReady,citySlug]);

  useEffect(()=>{
    if(!draftRestoredRef.current||!citySlug)return;
    const hasProgress=Object.values(cart).some(q=>Number(q)>0)||step!=="MENU"||Boolean(address.trim())||Boolean(reference.trim())||Boolean(payRef.trim())||Boolean(note.trim());
    if(!hasProgress){window.localStorage.removeItem(LUNCH_DRAFT_KEY);return;}
    const draft:LunchDraft={
      savedAt:Date.now(),citySlug:String(citySlug),configId:data?.config?.id,step,cart,fulfillment,
      address,reference,deliveryLat,deliveryLng,selectedSavedAddressId,payRef,note
    };
    try{window.localStorage.setItem(LUNCH_DRAFT_KEY,JSON.stringify(draft));}catch{}
  },[citySlug,data?.config?.id,step,cart,fulfillment,address,reference,deliveryLat,deliveryLng,selectedSavedAddressId,payRef,note]);

  useEffect(()=>{
    const persistNow=()=>{
      if(!draftRestoredRef.current||!citySlug)return;
      const draft:LunchDraft={savedAt:Date.now(),citySlug:String(citySlug),configId:data?.config?.id,step,cart,fulfillment,address,reference,deliveryLat,deliveryLng,selectedSavedAddressId,payRef,note};
      try{window.localStorage.setItem(LUNCH_DRAFT_KEY,JSON.stringify(draft));}catch{}
    };
    const onVisibility=()=>{if(document.visibilityState==="hidden")persistNow();};
    window.addEventListener("pagehide",persistNow);
    document.addEventListener("visibilitychange",onVisibility);
    return()=>{window.removeEventListener("pagehide",persistNow);document.removeEventListener("visibilitychange",onVisibility);};
  },[citySlug,data?.config?.id,step,cart,fulfillment,address,reference,deliveryLat,deliveryLng,selectedSavedAddressId,payRef,note]);

  function openPaymentApp(app:"NEQUI"|"DAVIPLATA"){
    // Android permite dirigir el intent a la app exacta. Si no está instalada,
    // el navegador abre su ficha oficial en Google Play.
    const isAndroid=/Android/i.test(navigator.userAgent);
    const packageName=app==="NEQUI"?"com.nequi.MobileApp":"com.davivienda.daviplataapp";
    const storeUrl=`https://play.google.com/store/apps/details?id=${packageName}`;
    if(isAndroid){
      const fallback=encodeURIComponent(storeUrl);
      window.location.href=`intent://#Intent;package=${packageName};S.browser_fallback_url=${fallback};end`;
      return;
    }
    // En iPhone/escritorio no asumimos un esquema privado no documentado.
    // Abrimos la ficha oficial; al volver, el borrador conserva exactamente el flujo.
    window.open(storeUrl,"_blank","noopener,noreferrer");
  }
  useEffect(()=>{
    let alive=true;
    async function loadSavedAddresses(){
      if(!cityReady||!citySlug||!isAuthed){setSavedAddresses([]);return;}
      setSavedAddressesLoading(true);
      try{const rows=await apiFetch<SavedAddressItem[]>(`/users/me/addresses?citySlug=${encodeURIComponent(citySlug)}`,{suppressSessionExpiredEvent:true} as any);if(alive)setSavedAddresses(Array.isArray(rows)?rows:[]);}
      catch{if(alive)setSavedAddresses([]);}
      finally{if(alive)setSavedAddressesLoading(false);}
    }
    void loadSavedAddresses();
    return()=>{alive=false};
  },[cityReady,citySlug,isAuthed]);

  function applySavedAddress(item:SavedAddressItem){
    setAddress(String(item.address??"").trim());setReference(String(item.reference??"").trim());
    setDeliveryLat(item.lat!=null&&Number.isFinite(Number(item.lat))?Number(item.lat):null);setDeliveryLng(item.lng!=null&&Number.isFinite(Number(item.lng))?Number(item.lng):null);
    setSelectedSavedAddressId(item.id);setShowSavedAddressModal(false);setMsg("");
  }
  async function resolveDeliveryGeo(){
    if(deliveryLat!=null&&deliveryLng!=null&&Number.isFinite(deliveryLat)&&Number.isFinite(deliveryLng))return {lat:deliveryLat,lng:deliveryLng};
    return await geocodeAddressOSMInCity(address,cityGeoLabel);
  }
  async function saveUsedDeliveryAddress(geo:{lat:number;lng:number}){
    if(!isAuthed||!citySlug||selectedSavedAddressId||address.trim().length<6)return;
    try{await apiFetch(`/users/me/addresses?citySlug=${encodeURIComponent(citySlug)}`,{method:"POST",suppressSessionExpiredEvent:true,json:{label:null,placeName:"Pide un Almuerzo",address:address.trim(),reference:reference.trim()||null,contactName:null,contactPhone:null,lat:geo.lat,lng:geo.lng,isDefault:false,isFavorite:false}} as any);}catch{}
  }

  useEffect(()=>{
    let alive=true;
    const slug=String(citySlug??"").trim();
    if(!slug)return;
    setLoading(true);
    apiFetch<LunchData>(`/lunch/public/menu?citySlug=${encodeURIComponent(slug)}`,{
      suppressSessionExpiredEvent:true,suppressActivityRefresh:true
    }
    ).then(r=>alive&&setData(r)).catch((e:Error)=>alive&&setMsg(e.message||"No pudimos cargar el menú.")).finally(()=>alive&&setLoading(false));
    return()=>{
      alive=false
    }
  }
  ,[citySlug]);
  const items=data?.menu?.items??[];
  const categories=useMemo(()=>Array.from(new Set(items.map(x=>String(x.category).toUpperCase()))).sort((a,b)=>
    a==="ESPECIALES"?1:b==="ESPECIALES"?-1:Number(a)-Number(b)),[items]);
  useEffect(()=>{
    if(categories.length&&(!cat||!categories.includes(cat)))setCat(categories[0])
  }
  ,[categories,cat]);
  const shown=items.filter(x=>String(x.category).toUpperCase()===cat);
  const count=Object.values(cart).reduce((a,q)=>a+Math.max(0,q||0),0);
  const food=items.reduce((a,x)=>a+(cart[x.id]||0)*Number(x.priceCOP||0),0);
  const pack=count*ICOPOR_PRICE_COP;
  const total=food+pack;
  const selected=items.filter(x=>(cart[x.id]||0)>0);
  const change=(id:string,d:number)=>setCart(c=>({
    ...c,[id]:Math.max(0,(c[id]||0)+d)
  }
  ));
  const today=new Date();
  const menuTitle=String(data?.menu?.title??"").toLowerCase();
  const plateDayFolder=menuTitle.includes("festivo")
    ?"Festivo"
    :plateDayNames[today.getDay()];
  const dailyInfo=useMemo(()=>{
    const included=String(
      data?.menu?.includedText??data?.config?.dailyIncludedText??""
    ).trim();

    const soupMatch=included.match(/sopa(?:\s+de)?\s+([^,+|/]+)/i);
    const principleMatch=included.match(/(?:principio|acompañado de|con)\s*:?\s*([^,+|/]+)/i);

    const fallback:Record<string,{soup:string;principle:string}>={
      Viernes:{soup:"Sopa de Mute",principle:"Garbanzos"},
      Domingo:{soup:"Sopa de Mute",principle:"Frijol"},
      Jueves:{soup:"Sancocho",principle:"Frijol"},
      Festivo:{soup:"Sopa de Fideos",principle:"Frijol"},
    };

    const known=fallback[plateDayFolder]??{
      soup:"Sopa del día",
      principle:"Principio del día"
    };

    const soup=soupMatch?.[1]
      ?`Sopa de ${soupMatch[1].trim().replace(/^de\s+/i,"")}`
      :known.soup;

    const principle=principleMatch?.[1]
      ?principleMatch[1].trim()
      :known.principle;

    return {soup,principle};
  },[
    data?.menu?.includedText,
    data?.config?.dailyIncludedText,
    plateDayFolder
  ]);

  async function order(){
    if(!data?.config?.id||!count)return;
    if(fulfillment==="DELIVERY"&&!address.trim()){
      setMsg("Escribe la dirección de entrega.");
      setStep("ORDER");
      return
    }
    if(!payRef.trim()){
      setMsg("Escribe la referencia de la transferencia.");
      return
    }
    setSending(true);
    setMsg("");
    try{
      let geo:{lat:number;lng:number}|null=null;
      if(fulfillment==="DELIVERY"){geo=await resolveDeliveryGeo();if(!geo){setMsg(`No pudimos ubicar con precisión la dirección en ${cityLabel}. Revisa la dirección e inténtalo de nuevo.`);setStep("ORDER");return;}}
      const r=await apiFetch<any>("/lunch/orders",{
        method:"POST",json:{
          configId:data.config.id,items:Object.entries(cart).filter(([,q])=>q>0).map(([itemId,qty])=>({
            itemId,qty
          }
          )),fulfillment,deliveryAddress:fulfillment==="DELIVERY"?address.trim():undefined,deliveryReference:fulfillment==="DELIVERY"?reference.trim():undefined,deliveryLat:fulfillment==="DELIVERY"?geo?.lat:undefined,deliveryLng:fulfillment==="DELIVERY"?geo?.lng:undefined,paymentMethod:data.config.paymentMethodLabel,paymentReference:payRef.trim(),customerNote:note.trim()
        }
      }
      );
      if(r?.id){
        if(fulfillment==="DELIVERY"&&geo)await saveUsedDeliveryAddress(geo);
        try{window.localStorage.removeItem(LUNCH_DRAFT_KEY);}catch{}
        router.push(`/almuerzos/pedidos/${encodeURIComponent(String(r.id))}`)
      }
    } catch(e){
      const err=e as ApiError;
      if(err.status===401||err.status===403){
        router.push(`/login?next=${encodeURIComponent("/almuerzos")}`);
        return
      }
      setMsg(err.message||"No pudimos enviar el pedido.")
    } finally{
      setSending(false)
    }
  }
  if(loading)return <div className="grid min-h-[70vh] place-items-center font-bold text-slate-500">Cargando almuerzos…</div>;
  if(!data?.available||!data.config)return <div className="p-6 text-center font-black">Almuerzos no disponible actualmente en {
    cityLabel
  }
  .</div>;

  if(data.isOpen===false){
    const beforeOpen=data.closedPeriod==="BEFORE_OPEN";
    const closedImage=beforeOpen?"/lunch/Closed/Morning.png":"/lunch/Closed/Afternoon.png";
    const closedAlt=beforeOpen?"Ya casi abrimos":"Te esperamos mañana";
    return <div className="min-h-full bg-[#F8EBFF] text-[#11142d]">
      <section className="relative overflow-hidden bg-gradient-to-b from-[#350071] via-[#5410b3] to-[#F8EBFF] px-3 pb-5 pt-3 text-white">
        <button
          type="button"
          onClick={()=>router.back()}
          className="absolute left-3 top-4 z-20 grid h-9 w-9 place-items-center rounded-full bg-black/20 text-xl"
          aria-label="Volver"
        >
          ‹
        </button>
        <div className="mx-auto flex min-h-[116px] max-w-[400px] items-center justify-center">
          <div className="relative h-[106px] w-[190px]">
            <Image src="/lunch/Header/header.png" alt="La Fortuna" fill priority className="object-contain" sizes="190px"/>
          </div>
        </div>
      </section>

      <section className="bg-[#F8EBFF] px-3 pb-28 pt-1">
        <div className="mx-auto max-w-[430px] overflow-hidden rounded-[24px] border border-violet-200/70 bg-white shadow-[0_16px_40px_rgba(73,20,140,0.14)]">
          <div className="relative aspect-[4/5] w-full bg-white">
            <Image
              src={closedImage}
              alt={closedAlt}
              fill
              priority
              className="object-contain"
              sizes="(max-width: 480px) 94vw, 430px"
            />
          </div>
          <div className="border-t border-violet-100 bg-white px-5 py-4 text-center">
            <div className="text-lg font-black text-[#3d0878]">{closedAlt}</div>
            <div className="mt-1 text-sm font-bold text-slate-600">
              Horario de atención: {data.config.openTime} a {data.config.closeTime}
            </div>
          </div>
        </div>
      </section>
    </div>;
  }

  const back=()=>step==="MENU"?router.back():setStep(step==="PAYMENT"?"ORDER":"MENU");
  return <div className="min-h-full bg-[#F8EBFF] text-[#11142d]">
  {
    step==="MENU"?<>
    <section className="relative overflow-hidden bg-gradient-to-b from-[#350071] via-[#5410b3] to-[#F8EBFF] px-3 pb-5 pt-3 text-white">
      <button
        onClick={back}
        className="absolute left-3 top-4 z-20 grid h-9 w-9 place-items-center rounded-full bg-black/20 text-xl"
      >
        ‹
      </button>

      <div className="grid min-h-[116px] grid-cols-[1.08fr_.70fr_.95fr] items-center gap-1 pl-8">
        <div className="relative h-[106px] min-w-0">
          <Image
            src="/lunch/Header/header.png"
            alt="La Fortuna"
            fill
            priority
            className="object-contain object-left"
            sizes="150px"
          />
        </div>

        <div className="flex items-center justify-center px-1 text-center">
          <div className="leading-tight">
            <div className="text-[18px] font-black tracking-tight text-white">
              Haz tu
            </div>
            <div className="text-[22px] font-black tracking-tight text-yellow-300">
              pedido
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col items-center justify-center px-1 text-center">
          <span className="text-[17px] font-black uppercase tracking-[0.10em] text-yellow-300 drop-shadow-sm">
            Hoy
          </span>

          <span className="mt-1 max-w-[126px] text-[16px] font-black leading-[1.08] text-white drop-shadow-sm">
            {dailyInfo.soup}
          </span>
        </div>
      </div>
    </section>
    <section className="bg-[#F8EBFF] px-4 pb-40 pt-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[26px] font-black leading-none">
            {data.menu?.title||"Menú de hoy"}
          </h1>
          <div className="mt-2 space-y-0.5 text-[12px] font-black leading-tight text-[#4a167e]">
            <p>1. Selecciona el precio o Especiales</p>
            <p>2. Selecciona los platos que desees</p>
          </div>
        </div>

        {categories.includes("ESPECIALES") ? (
          <button
            type="button"
            onClick={()=>setCat("ESPECIALES")}
            className={`relative shrink-0 rounded-t-2xl rounded-b-lg border px-4 pb-2.5 pt-3 text-[14px] font-black shadow-md transition active:translate-y-[1px] ${
              cat==="ESPECIALES"
                ?"border-[#5b18c7] bg-gradient-to-b from-[#7a2be2] to-[#4c0aa5] text-white shadow-violet-200"
                :"border-violet-300 bg-gradient-to-b from-[#f5edff] to-[#e8d8ff] text-[#5514bd] shadow-violet-100"
            }`}
          >
            <span className="mr-1.5 inline-block -rotate-12 text-[17px]">➤</span>
            Especiales
            <span className={`absolute -bottom-[5px] left-4 h-[6px] w-10 rounded-b-md ${
              cat==="ESPECIALES"?"bg-[#4c0aa5]":"bg-[#d8c0ff]"
            }`} />
          </button>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {categories
          .filter(c=>c!=="ESPECIALES")
          .map(c=>(
            <button
              key={c}
              type="button"
              onClick={()=>setCat(c)}
              className={`relative min-w-0 rounded-t-xl rounded-b-md border px-1 pb-2.5 pt-3 text-[13px] font-black shadow-sm transition active:translate-y-[1px] ${
                cat===c
                  ?"border-[#5b18c7] bg-gradient-to-b from-[#6d20d5] to-[#5514bd] text-white shadow-violet-200"
                  :"border-violet-200 bg-gradient-to-b from-white to-violet-50 text-[#4a167e]"
              }`}
            >
              {categoryLabel(c)}
              <span className={`absolute -bottom-[4px] left-1/2 h-[5px] w-7 -translate-x-1/2 rounded-b ${
                cat===c?"bg-[#5514bd]":"bg-violet-200"
              }`} />
            </button>
          ))}
      </div>
    <div className="space-y-2">{
      shown.map(x=>{
        const idx=items.findIndex(i=>i.id===x.id)+1;
        return <div key={
          x.id
        }
        className="flex min-h-[88px] items-center gap-3 rounded-2xl border border-violet-100 bg-white p-2 shadow-sm">
          <div className="relative h-[72px] w-[78px] shrink-0 overflow-hidden rounded-xl bg-amber-50">
          <Image src={
          `/lunch/Plates/${plateDayFolder}/${idx}.png`
        }
        alt={
          x.name
        }
        fill className="object-contain p-0.5" sizes="78px"/></div><div className="min-w-0 flex-1"><div className="text-[19px] font-black leading-[1.06] tracking-[-0.015em]">{
          x.name
        }
        </div><div className="mt-2 font-black text-[#5b18c7]">{
          money(x.priceCOP)
        }
        </div></div>{
          cart[x.id]?<div className="flex items-center gap-1"><button onClick={
            ()=>change(x.id,-1)
          }
          className="grid h-8 w-8 place-items-center rounded-full bg-violet-50 font-black text-[#5b18c7]">−</button><b>{
            cart[x.id]
          }
          </b><button onClick={
            ()=>change(x.id,1)
          }
          className="grid h-8 w-8 place-items-center rounded-full bg-[#5b18c7] font-black text-white">+</button></div>:<button onClick={
            ()=>change(x.id,1)
          }
          className="grid h-10 w-10 place-items-center rounded-full bg-[#5b18c7] text-2xl font-black text-white shadow">+</button>
        }
        </div>
      }
      )
    }
    </div>
    <div className="mt-3 flex items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-2">
      <div className="relative h-14 w-16 shrink-0"><Image src={`/lunch/Plates/${plateDayFolder}/sopa.png`} alt="Sopa del día" fill className="object-contain" sizes="64px"/>
      </div><div className="flex-1"><b className="text-orange-700">{
      data.menu?.includedText||data.config.dailyIncludedText||"Sopa y principio del día"
    }
    </b><div className="text-[11px] text-slate-600">Incluido con los almuerzos del día</div></div></div>
    </section>
    {
      count>0?<button onClick={
        ()=>setStep("ORDER")
      }
      className="fixed bottom-[112px] left-1/2 z-40 flex w-[calc(100%-32px)] max-w-[400px] -translate-x-1/2 items-center justify-between rounded-2xl bg-gradient-to-r from-[#42108d] to-[#6b19d1] px-5 py-4 text-white shadow-xl">
        <span className="font-black">🛒 {
        count
      }
      </span><span className="font-black">Ver pedido</span><span className="font-black">{
        money(total)
      }
      ›</span></button>:null
    }
    </>:null
  }
  {
    step==="ORDER"?<>
      <LunchFlowHeader
        title="Tu pedido"
        subtitle="Revisa tu almuerzo y elige cómo quieres recibirlo."
        onBack={back}
      />

      <section className="-mt-5 px-4 pb-32">
        <div className="relative z-10 rounded-[24px] border border-violet-100 bg-white p-4 shadow-[0_12px_32px_rgba(75,15,135,0.12)]">
          <div className="flex items-center gap-3">
            <div className="relative h-16 w-24 shrink-0">
              <Image
                src="/lunch/Header/header.png"
                alt="La Fortuna"
                fill
                className="object-contain"
                sizes="96px"
              />
            </div>

            <div className="min-w-0">
              <div className="text-[16px] font-black leading-tight">
                {data.config.store.name}
              </div>
              <div className="mt-1 text-[11px] font-bold text-[#6b19d1]">
                🍽️ Almuerzos · {cityLabel}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 overflow-hidden rounded-[24px] border border-violet-100 bg-white shadow-sm">
          {selected.map((x,index)=>(
            <div
              key={x.id}
              className={`flex items-center gap-3 px-3 py-3 ${
                index<selected.length-1?"border-b border-violet-100":""
              }`}
            >
              <div className="relative h-16 w-[72px] shrink-0 overflow-hidden rounded-xl bg-[#fffaf0]">
                <Image
                  src={`/lunch/Plates/${plateDayFolder}/${items.findIndex(i=>i.id===x.id)+1}.png`}
                  alt={x.name}
                  fill
                  className="object-contain p-0.5"
                  sizes="72px"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-[16px] font-black leading-[1.08]">
                  {x.name}
                </div>
                <div className="mt-1 text-[14px] font-black text-[#5b18c7]">
                  {money(x.priceCOP)}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={()=>change(x.id,-1)}
                  className="grid h-8 w-8 place-items-center rounded-full bg-violet-50 font-black text-[#5b18c7]"
                >
                  −
                </button>
                <b className="min-w-4 text-center">{cart[x.id]}</b>
                <button
                  type="button"
                  onClick={()=>change(x.id,1)}
                  className="grid h-8 w-8 place-items-center rounded-full bg-[#5b18c7] font-black text-white shadow"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <h2 className="text-[17px] font-black">¿Cómo lo quieres?</h2>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={()=>setFulfillment("DELIVERY")}
              className={`rounded-2xl border p-3 text-left transition ${
                fulfillment==="DELIVERY"
                  ?"border-[#6b19d1] bg-gradient-to-br from-[#f4e8ff] to-white shadow-sm"
                  :"border-violet-100 bg-white"
              }`}
            >
              <div className="text-[15px] font-black">🛵 A domicilio</div>
              <div className="mt-1 text-[11px] font-semibold leading-snug text-slate-500">
                Te lo llevamos a tu dirección.
              </div>
            </button>

            <button
              type="button"
              onClick={()=>setFulfillment("PICKUP")}
              className={`rounded-2xl border p-3 text-left transition ${
                fulfillment==="PICKUP"
                  ?"border-[#6b19d1] bg-gradient-to-br from-[#f4e8ff] to-white shadow-sm"
                  :"border-violet-100 bg-white"
              }`}
            >
              <div className="text-[15px] font-black">🏪 Paso a recoger</div>
              <div className="mt-1 text-[11px] font-semibold leading-snug text-slate-500">
                Yo paso al restaurante.
              </div>
            </button>
          </div>
        </div>

        {fulfillment==="DELIVERY"?(
          <div className="mt-4">
            <h2 className="text-[17px] font-black">Dirección de entrega</h2>
            {isAuthed&&(savedAddresses.length>0||savedAddressesLoading)?(
              <div className="mt-2 rounded-[16px] border border-violet-100 bg-gradient-to-r from-violet-50 to-fuchsia-50 p-2">
                <div className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#5b18c7]">Usar dirección guardada</div>
                <button type="button" disabled={savedAddressesLoading} onClick={()=>setShowSavedAddressModal(true)} className="flex h-11 w-full items-center justify-between rounded-[14px] border border-violet-100 bg-white px-3 text-left shadow-sm disabled:opacity-60">
                  <span className="flex min-w-0 items-center gap-2"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-violet-50">📍</span><span className="truncate text-[13px] font-bold text-slate-700">{savedAddressesLoading?"Cargando direcciones...":"Seleccionar dirección"}</span></span><span className="text-lg font-black text-[#5b18c7]">›</span>
                </button>
              </div>
            ):null}
            <input value={address} onChange={e=>{setAddress(e.target.value);setSelectedSavedAddressId("");setDeliveryLat(null);setDeliveryLng(null)}} placeholder="Dirección de entrega" className="mt-2 w-full rounded-2xl border border-violet-100 bg-white p-3.5 outline-none transition focus:border-[#6b19d1]"/>
            <input value={reference} onChange={e=>{setReference(e.target.value);setSelectedSavedAddressId("")}} placeholder="Referencia (opcional)" className="mt-2 w-full rounded-2xl border border-violet-100 bg-white p-3.5 outline-none transition focus:border-[#6b19d1]"/>
            {!selectedSavedAddressId&&address.trim().length>=6?<div className="mt-1 px-1 text-[10px] font-semibold text-violet-700">Esta dirección se guardará automáticamente para futuros pedidos.</div>:null}
          </div>
        ):null}

        <textarea
          value={note}
          onChange={e=>setNote(e.target.value)}
          placeholder="Notas para el restaurante (opcional)"
          className="mt-3 min-h-[84px] w-full rounded-2xl border border-violet-100 bg-white p-3.5 outline-none transition focus:border-[#6b19d1]"
        />

        <div className="mt-4 rounded-[22px] border border-violet-100 bg-white p-4 shadow-sm">
          <div className="flex justify-between text-sm">
            <span>Subtotal de alimentos</span>
            <b>{money(food)}</b>
          </div>
          <div className="mt-2 flex justify-between text-sm">
            <span>Icopor</span>
            <b>{money(pack)}</b>
          </div>
          <div className="mt-3 flex justify-between border-t border-violet-100 pt-3 text-[18px] text-[#5b18c7]">
            <b>Total alimentos</b>
            <b>{money(total)}</b>
          </div>
          <div className="mt-1 text-[10px] font-semibold text-slate-500">
            {fulfillment==="DELIVERY"
              ?"El domicilio se paga directamente al domiciliario al momento de la entrega."
              :"Recogerás tu pedido directamente en el restaurante."}
          </div>
        </div>

        <button
          type="button"
          onClick={()=>{
            if(fulfillment==="DELIVERY"&&!address.trim()){
              setMsg("Escribe la dirección de entrega.");
              return;
            }
            setMsg("");
            setStep("PAYMENT");
          }}
          className="mt-4 w-full rounded-2xl bg-gradient-to-r from-[#42108d] to-[#6b19d1] py-4 text-[16px] font-black text-white shadow-lg shadow-violet-200 active:translate-y-[1px]"
        >
          Continuar con el pago ›
        </button>

        {msg?(
          <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
            {msg}
          </div>
        ):null}
      </section>
    </>:null
  }

  {
    step==="PAYMENT"?<>
      <LunchFlowHeader
        title="Pago al restaurante"
        subtitle="Último paso: registra tu transferencia para que La Fortuna confirme el pedido."
        onBack={back}
      />

      <section className="-mt-5 px-4 pb-32">
        <div className="relative z-10 rounded-[24px] border border-violet-100 bg-white p-4 shadow-[0_12px_32px_rgba(75,15,135,0.12)]">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-100 text-xl">
              💳
            </div>
            <div>
              <div className="text-[15px] font-black">
                Transfiere directamente al restaurante
              </div>
              <div className="mt-1 text-[11px] font-semibold leading-snug text-slate-500">
                El valor de los alimentos va directamente a La Fortuna.
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-[24px] border border-violet-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative h-16 w-24 shrink-0">
              <Image
                src="/lunch/Header/header.png"
                alt="La Fortuna"
                fill
                className="object-contain"
                sizes="96px"
              />
            </div>

            <div className="min-w-0">
              <div className="font-black">{data.config.store.name}</div>
              <div className="mt-1 text-[11px] font-bold text-[#6b19d1]">
                {data.config.paymentMethodLabel} · {cityLabel}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-[#F8EBFF] p-3">
            <div className="text-[10px] font-black uppercase tracking-[0.08em] text-[#6d4b85]">
              Cuenta / Llave / Nequi
            </div>

            <div className="mt-1 flex items-center gap-2">
              <div className="min-w-0 flex-1 break-all text-[18px] font-black text-[#241037]">
                {data.config.paymentDestination||"Cuenta indicada por el restaurante"}
              </div>

              <button
                type="button"
                onClick={()=>navigator.clipboard?.writeText(data.config?.paymentDestination||"")}
                className="shrink-0 rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs font-black text-[#5b18c7]"
              >
                Copiar
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#efe2ff] to-[#faf4ff] p-3 text-[#5b18c7]">
            <span className="text-[12px] font-black">Total a transferir</span>
            <span className="text-[21px] font-black">{money(total)}</span>
          </div>

          <div className="mt-4">
            <div className="mb-2 text-center text-[11px] font-bold text-slate-500">
              Abre tu app de pago sin perder este pedido
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={()=>openPaymentApp("NEQUI")}
                className="flex min-h-[58px] items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-white px-3 py-2 shadow-sm transition active:scale-[0.98]"
              >
                <span className="relative h-8 w-[74px]">
                  <Image src="/branding/payments/nequi.png" alt="Nequi" fill className="object-contain" sizes="74px" />
                </span>
                <span className="text-[11px] font-black text-[#35104f]">Abrir</span>
              </button>

              <button
                type="button"
                onClick={()=>openPaymentApp("DAVIPLATA")}
                className="flex min-h-[58px] items-center justify-center gap-2 rounded-2xl border border-red-100 bg-white px-3 py-2 shadow-sm transition active:scale-[0.98]"
              >
                <span className="relative h-10 w-10 shrink-0">
                  <Image src="/branding/payments/logo-daviplata.png" alt="DaviPlata" fill className="object-contain" sizes="40px" />
                </span>
                <span className="text-[11px] font-black text-[#7f1018]">Abrir DaviPlata</span>
              </button>
            </div>
            <div className="mt-2 text-center text-[10px] font-semibold leading-relaxed text-slate-400">
              Al regresar a KroniX encontrarás el pedido exactamente donde lo dejaste.
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-[24px] border border-violet-100 bg-white p-4 shadow-sm">
          <label className="block text-[14px] font-black">
            Número de referencia / Comprobante
          </label>
          <div className="mt-1 text-[11px] font-semibold text-slate-500">
            Escribe el número que aparece en tu transferencia.
          </div>

          <input
            value={payRef}
            onChange={e=>setPayRef(e.target.value)}
            placeholder="Ej. 839271"
            inputMode="numeric"
            className="mt-3 w-full rounded-2xl border border-violet-100 bg-[#fffaff] p-3.5 outline-none transition focus:border-[#6b19d1]"
          />

          <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-[11px] font-semibold leading-relaxed text-emerald-800">
            ✓ El restaurante revisará el pago y confirmará tu pedido una vez lo verifique en su cuenta.
          </div>
        </div>

        <button
          type="button"
          disabled={!payRef.trim()||sending}
          onClick={order}
          className="mt-4 w-full rounded-2xl bg-gradient-to-r from-[#42108d] to-[#6b19d1] py-4 text-[16px] font-black text-white shadow-lg shadow-violet-200 disabled:opacity-40 active:translate-y-[1px]"
        >
          {sending?"Enviando…":"Enviar pedido ›"}
        </button>

        {msg?(
          <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
            {msg}
          </div>
        ):null}

        <div className="mt-5 rounded-[24px] border border-violet-100 bg-white p-4">
          <div className="text-[15px] font-black">¿Qué sigue?</div>
          <ol className="mt-3 space-y-3 text-[12px] font-semibold leading-snug text-slate-600">
            <li className="flex gap-2"><b className="text-[#6b19d1]">1.</b><span>Envías tu pedido con la referencia de pago.</span></li>
            <li className="flex gap-2"><b className="text-[#6b19d1]">2.</b><span>La Fortuna verifica el pago y confirma el pedido.</span></li>
            <li className="flex gap-2"><b className="text-[#6b19d1]">3.</b><span>Te avisaremos cuando tu almuerzo entre en preparación.</span></li>
            <li className="flex gap-2"><b className="text-[#6b19d1]">4.</b><span>Si elegiste domicilio, podrás seguir el proceso de entrega desde Pedidos.</span></li>
          </ol>
        </div>
      </section>
    </>:null
  }
  {showSavedAddressModal?(
    <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]">
      <button type="button" aria-label="Cerrar selector de direcciones" className="absolute inset-0" onClick={()=>setShowSavedAddressModal(false)}/>
      <div className="relative z-10 flex max-h-[84dvh] w-full max-w-md flex-col overflow-hidden rounded-[26px] border border-white/70 bg-[#f8fafc] shadow-[0_24px_70px_rgba(15,23,42,0.30)]">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3"><div><div className="text-[17px] font-black text-slate-950">Selecciona una dirección</div><div className="mt-0.5 text-[11px] font-semibold text-slate-500">Tus direcciones guardadas en {cityLabel}</div></div><button type="button" onClick={()=>setShowSavedAddressModal(false)} className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-xl font-black text-slate-600">×</button></div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">{savedAddresses.map(item=>(
          <button key={item.id} type="button" onClick={()=>applySavedAddress(item)} className="flex w-full items-start gap-3 rounded-[18px] border border-slate-200 bg-white px-3 py-3 text-left shadow-sm transition hover:border-violet-300 active:scale-[0.995]">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[14px] text-lg ${item.isDefault?"bg-emerald-50 ring-1 ring-emerald-200":item.isFavorite?"bg-rose-50 ring-1 ring-rose-200":"bg-violet-50 ring-1 ring-violet-100"}`}>{item.isDefault?"🏠":item.isFavorite?"❤️":"📍"}</span>
            <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-1.5"><span className="text-[14px] font-extrabold text-slate-900">{String(item.placeName??item.label??"Dirección guardada")}</span>{item.isDefault?<span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-extrabold text-emerald-700 ring-1 ring-emerald-200">PRINCIPAL</span>:item.isFavorite?<span className="rounded-full bg-rose-50 px-2 py-0.5 text-[9px] font-extrabold text-rose-700 ring-1 ring-rose-200">FAVORITA</span>:null}</span><span className="mt-1 block break-words text-[13px] font-semibold leading-5 text-slate-700">{item.address}</span>{item.reference?<span className="mt-1 block text-[11px] leading-4 text-slate-500">Ref.: {item.reference}</span>:null}</span><span className="mt-2 text-lg font-black text-[#5b18c7]">›</span>
          </button>))}</div>
      </div>
    </div>
  ):null}
  </div>
}