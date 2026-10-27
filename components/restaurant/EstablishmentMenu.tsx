'use client';
import {readBuyerContact,saveBuyerContact} from '@/lib/buyerDevice';
import ConfirmCustomerDetails from './ConfirmCustomerDetails';
import BoutiqueMenu from './BoutiqueMenu';
import {checkoutPaymentMethods} from '@/lib/payment-methods';
import {establishmentAppearance} from '@/lib/establishment-appearance';
import {useEffect, useRef, useState} from 'react';
import {bestPromotion} from '@/lib/establishment-promotions';
import {apiFetch,getApiBase} from '@/lib/api';
const money=(n:number)=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(n);
export function restaurantError(e:any){
 let message=e?.message||'No pudimos conectar con el establecimiento.';
 try{const parsed=JSON.parse(message);message=Array.isArray(parsed.message)?parsed.message.join('. '):parsed.message||message;}catch{}
 return message;
}
export default function EstablishmentMenu({data,session,onOrdered,installControl}:{data:any;session:any;onOrdered:(id:string)=>Promise<void>;installControl?:import("react").ReactNode}){
 const config=data.config, presentation=config.appPresentation??{}, dine=session.channel==='DINE_IN';
 const transfer=!dine&&presentation.paymentMode!=='DIRECT';
 const items:any[]=data.menu?.items??[];
 const [cart,setCart]=useState<Record<string,number>>({}),[selections,setSelections]=useState<Record<string,Record<string,string[]>>>({});
 const [receiptId,setReceiptId]=useState(''),[receiptPreview,setReceiptPreview]=useState(''),[paymentKind,setPaymentKind]=useState(checkoutPaymentMethods(config)[0]?.kind??'');
 const receiptInput=useRef<HTMLInputElement>(null);
 const methods=checkoutPaymentMethods(config),selectedMethod=methods.find(m=>m.kind===paymentKind)??methods[0];
 const [payment,setPayment]=useState(false);
 const [category,setCategory]=useState(''),[checkout,setCheckout]=useState(false),[name,setName]=useState(''),[phone,setPhone]=useState(''),[address,setAddress]=useState(''),[note,setNote]=useState('');
 const allowed:string[]=presentation.fulfillments??['DELIVERY','PICKUP'];
 const [fulfillment,setFulfillment]=useState(allowed[0]??'PICKUP'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const requestId=useRef('');
 const [remember,setRemember]=useState(false),[savedRemember,setSavedRemember]=useState(false);
 const [copyNotice,setCopyNotice]=useState('');
 useEffect(()=>{if(!copyNotice)return;const id=window.setTimeout(()=>setCopyNotice(''),1800);return()=>window.clearTimeout(id);},[copyNotice]);
 useEffect(()=>{const saved=readBuyerContact();if(saved.remember){setSavedRemember(true);setName(saved.name);setPhone(saved.phone);setAddress(saved.address);setRemember(true);}},[]);
 const [confirmOpen,setConfirmOpen]=useState(false);
 const color=(v:any,f:string)=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)?v:f;
 const appearance=establishmentAppearance(presentation),kronix=appearance.kronix,boutique=presentation.style==='CAFE_BOUTIQUE';
 const primary=appearance.primary, bg=appearance.background, text=appearance.text;
 const title=config.serviceTitle||config.store.name;
 const categoryLabel=appearance.categoryLabel;
 const categories=(Array.from(new Set(items.map(i=>i.category))) as string[]).sort((a,b)=>{const order:string[]=presentation.categoryOrder??[];const ai=order.indexOf(a),bi=order.indexOf(b);return (ai<0?999:ai)-(bi<0?999:bi);});
 useEffect(()=>{if(!appearance.showCategories)setCategory('');else if(kronix&&categories.length)setCategory(categories.find(c=>c!==appearance.specials)||categories[0]);},[config.id,presentation.showCategories,presentation.style,categories.join('|')]);
 const extra=(item:any)=>(item.options??[]).reduce((sum:number,g:any)=>sum+g.choices.filter((c:any)=>(selections[item.id]?.[g.id]??[]).includes(c.id)).reduce((s:number,c:any)=>s+c.priceCOP,0),0);
 const selected=items.filter(i=>cart[i.id]>0), count=selected.reduce((s,i)=>s+cart[i.id],0);
 const packaging=dine?0:count*(config.packagingUnitCOP??0);
 const foodTotal=selected.reduce((s,i)=>s+cart[i.id]*(i.priceCOP+extra(i)),0);
 const offer=bestPromotion(presentation.promotions,foodTotal),total=foodTotal+packaging-offer.discountCOP;
 const key=`restaurant-cart:${session.slug}:${session.channel}:${session.locationLabel??''}`;
 const [restored,setRestored]=useState(false);
 useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved&&Date.now()-saved.at<86400000){setCart(saved.cart??{});setSelections(saved.selections??{});setName(saved.name??'');setPhone(saved.phone??'');setAddress(saved.address??'');setNote(saved.note??'');setReceiptId(saved.receiptId??'');if(methods.some(m=>m.kind===saved.paymentKind))setPaymentKind(saved.paymentKind);if(allowed.includes(saved.fulfillment))setFulfillment(saved.fulfillment);setCheckout(!!saved.checkout);setPayment(!!saved.payment&&(transfer||presentation.style==='CAFE_BOUTIQUE'));if(typeof saved.requestId==='string')requestId.current=saved.requestId;}}catch{}setRestored(true);},[key]);
 useEffect(()=>{if(restored)try{localStorage.setItem(key,JSON.stringify({at:Date.now(),cart,selections,name,phone,address,note,receiptId,paymentKind,fulfillment,checkout,payment,requestId:requestId.current}));}catch{}},[cart,selections,name,phone,address,note,receiptId,paymentKind,fulfillment,checkout,payment,restored,key]);
 function toggle(itemId:string,g:any,id:string){setSelections(old=>{const prev=old[itemId]?.[g.id]??[];const next=prev.includes(id)?prev.filter(x=>x!==id):g.max===1?[id]:[...prev,id];if(next.length>g.max)return old;return {...old,[itemId]:{...old[itemId],[g.id]:next}};});requestId.current='';}
 function change(id:string,d:number){setReceiptId('');setReceiptPreview('');setCart(c=>({...c,[id]:Math.max(0,Math.min(20,(c[id]??0)+d))}));requestId.current='';}
 async function send(confirmed=false){
  if(busy||!count)return;setError('');
  if(!dine&&(name.trim().length<2||phone.replace(/\D/g,'').length<10)){setError('Escribe tu nombre y un teléfono válido.');return;}
  for(const i of selected)for(const g of i.options??[]){const ids=selections[i.id]?.[g.id]??[];if(ids.length<g.min||ids.length>g.max){setError(`Revisa ${g.label} en ${i.name}.`);return;}}
  if(!dine&&presentation.paymentMode!=='DIRECT'&&!receiptId){setError('Adjunta el comprobante de pago.');return;}
  if(!dine&&fulfillment==='DELIVERY'&&!address.trim()){setError('Escribe la dirección de entrega.');return;}
  if(!dine&&!confirmed){setConfirmOpen(true);return;}
  setBusy(true);
  try{
   if(!dine&&fulfillment==='DELIVERY'){
    if(!address.trim())throw new Error('Escribe la dirección de entrega.');
   }
   if(!requestId.current)requestId.current=crypto.randomUUID();
   try{localStorage.setItem(key,JSON.stringify({at:Date.now(),cart,selections,name,phone,address,note,receiptId,paymentKind,fulfillment,checkout,payment,requestId:requestId.current}));}catch{}
   const result=await apiFetch<any>(`/commerce/public/restaurants/${encodeURIComponent(session.slug)}/orders`,{method:'POST',headers:{'x-commerce-session':session.token},suppressSessionExpiredEvent:true,suppressActivityRefresh:true,json:{requestId:requestId.current,contactName:name.trim(),contactPhone:phone,items:selected.map(i=>({itemId:i.id,qty:cart[i.id],selections:selections[i.id]??{}})),fulfillment:dine?'DINE_IN':fulfillment,deliveryAddress:!dine&&fulfillment==='DELIVERY'?address.trim():undefined,paymentReceiptId:transfer?receiptId:undefined,paymentMethod:transfer?selectedMethod?.kind:undefined,customerNote:note.trim()}});
   if(!result?.id)throw new Error('No recibimos la confirmación. Inténtalo nuevamente.');
   if(!dine)saveBuyerContact({name:name.trim(),phone:phone.trim(),address:address.trim(),remember});
   await onOrdered(result.id);setCart({});setSelections({});setCheckout(false);setPayment(false);setReceiptId('');setReceiptPreview('');requestId.current='';localStorage.removeItem(key);
  }catch(e){setError(restaurantError(e));}finally{setBusy(false);setConfirmOpen(false);}
 }
 async function attachReceipt(file:File){if(busy)return;setError('');if(file.size>3*1024*1024){setError('La captura debe pesar máximo 3 MB.');return;}if(!selectedMethod){setError('Selecciona un medio de pago.');return;}setBusy(true);try{const form=new FormData();form.append('proof',file);form.append('method',selectedMethod.kind);const response=await fetch(`${getApiBase()}/commerce/public/restaurants/${encodeURIComponent(session.slug)}/receipts`,{method:'POST',headers:{'x-commerce-session':session.token},body:form});const result=await response.json();if(!response.ok||!result.receiptId)throw new Error(Array.isArray(result.message)?result.message.join('. '):result.message||'No pudimos adjuntar el comprobante.');setReceiptId(result.receiptId);if(receiptPreview.startsWith('blob:'))URL.revokeObjectURL(receiptPreview);setReceiptPreview(URL.createObjectURL(file));}catch(e:any){setError(e.message);}finally{setBusy(false);if(receiptInput.current)receiptInput.current.value='';}}
 function selectPayment(kind:'NEQUI'|'BREB'){if(kind===paymentKind||busy)return;setPaymentKind(kind);setReceiptId('');setReceiptPreview('');}
 const brightness=parseInt(primary.slice(1,3),16)*0.299+parseInt(primary.slice(3,5),16)*0.587+parseInt(primary.slice(5,7),16)*0.114;
 const action={background:primary,color:brightness>160?'#111827':'#fff'};
 const scrollTop=()=>{document.getElementById('buyer-scroll-container')?.scrollTo({top:0});document.querySelector('[data-restaurant-scroll]')?.scrollTo({top:0});};
 if(boutique)return <BoutiqueMenu v={{config,presentation,appearance,items,selected,cart,count,total,foodTotal,packaging,offer,category,categories,categoryLabel,checkout,payment,dine,session,busy,error,methods,selectedMethod,receiptId,receiptPreview,receiptInput,allowed,fulfillment,name,phone,address,note,remember,savedRemember,selections,extra,change,toggle,send,attachReceipt,selectPayment,setCategory,setCheckout,setPayment,setName,setPhone,setAddress,setNote,setRemember,setFulfillment,setError,transfer,isOpen:data.isOpen,copyNotice,setCopyNotice,scrollTop,installControl,confirmation:<ConfirmCustomerDetails boutique open={confirmOpen} busy={busy} name={name.trim()} phone={phone.trim()} address={address.trim()} pickup={fulfillment==='PICKUP'} count={count} total={money(total)} primary={primary} buttonText={String(action.color)} onEdit={()=>{setConfirmOpen(false);setPayment(false);}} onConfirm={()=>void send(true)}/>}}/>;
 return <main className="min-h-full p-4 pb-28" style={{background:bg,color:text}}>
  {kronix?<>
   <header className="relative -mx-4 -mt-4 overflow-hidden px-4 pb-3 pt-8" style={{background:`linear-gradient(180deg, ${appearance.secondary} 0%, ${primary} 48%, ${bg} 100%)`}}>
    {checkout||payment?<button aria-label="Volver" onClick={()=>{if(payment)setPayment(false);else if(checkout)setCheckout(false);}} className="absolute left-3 top-4 grid h-9 w-9 place-items-center rounded-full bg-black/20 text-xl text-white">‹</button>:null}
    <div className="grid min-h-[106px] grid-cols-[1.08fr_.70fr_.95fr] items-center gap-1 pl-8">
     <div className="flex h-[106px] min-w-0 items-center">{config.store.image?<img src={config.store.image} alt={config.store.name} className="h-full w-full object-contain object-left"/>:<b className="text-xl text-white">{config.store.name}</b>}</div>
     <p className="px-1 text-center text-[22px] font-black leading-tight" style={{color:appearance.accent}}>{appearance.headline === "Haz tu pedido" ? <><span className="text-[18px] text-white">Haz tu<br/></span>pedido</> : appearance.headline}</p>
     <div className="min-w-0 px-1 text-center"><b className="text-[17px] uppercase" style={{color:appearance.accent}}>{appearance.announcementLabel}</b><p className="mt-1 text-[16px] font-black leading-tight text-white">{presentation.announcementText||data.menu?.includedText||config.dailyIncludedText||config.serviceSubtitle||config.store.name}</p></div>
    </div>
   </header>
   {!checkout?<div className="mb-4 flex items-start justify-between gap-3"><div className="min-w-0"><h1 className="text-[26px] font-black leading-tight">{appearance.title||data.menu?.title||'La carta'}</h1><div className="mt-2 text-xs font-black" style={{color:primary}}>{appearance.instruction1?<p>{appearance.instruction1}</p>:null}{appearance.instruction2?<p>{appearance.instruction2}</p>:null}</div></div>
    {appearance.showCategories&&categories.includes(appearance.specials)?<button onClick={()=>setCategory(appearance.specials)} className="shrink-0 rounded-2xl border px-4 py-4 font-black shadow-sm" style={category===appearance.specials?action:{color:primary,borderColor:primary+'33',background:primary+'10'}}>➤ {categoryLabel(appearance.specials)}</button>:null}
   </div>:null}
   {data.isOpen===false?<p className="my-4 font-bold">Estamos cerrados. Horario: {config.openTime} – {config.closeTime}</p>:null}
  </>:<>
  <header className="mb-5 rounded-2xl border border-current/10 p-5 pt-12">
   {config.store.image?<img src={config.store.image} alt={title} className="mb-3 h-20 w-20 rounded-xl object-cover"/>:null}
   <h1 className="text-2xl font-black">{title}</h1><p className="mt-1 text-sm opacity-80">{config.serviceSubtitle}</p>
   <p className="mt-3 text-sm">{config.store.address}</p><p className="text-sm">{config.openTime} – {config.closeTime}</p>
   {data.isOpen===false?<p className="mt-3 font-bold">Estamos cerrados. Te esperamos en nuestro horario de atención.</p>:null}
  </header>
  </>}
  {data.isOpen!==false?<>
   {!checkout?<>{appearance.showCategories?<nav className={kronix?'mb-3 grid grid-cols-4 gap-2':'mb-4 flex gap-2 overflow-x-auto'} aria-label="Categorías">{(kronix?categories.filter(c=>c!==appearance.specials):['',...categories]).map(c=><button key={c} aria-pressed={category===c} className={kronix?'min-w-0 rounded-t-xl rounded-b-md border px-1 py-3 text-sm font-black shadow-sm':'whitespace-nowrap rounded-full border px-4 py-2 text-sm'} style={category===c?action:{color:primary,background:'#fff',borderColor:primary+'22'}} onClick={()=>setCategory(category===c?'':c)}>{categoryLabel(c)||'Todo'}</button>)}</nav>:null}
   {!items.length?<p>El menú aún no tiene productos disponibles.</p>:null}
   <div className={kronix||presentation.template==='COMPACT_MENU'?'space-y-2':'grid gap-3 sm:grid-cols-2'}>{items.filter(i=>!category||i.category===category).map(i=><article key={i.id} className={kronix?"relative min-h-[92px] rounded-2xl border border-current/5 bg-white py-2 pl-[102px] pr-[66px] shadow-sm":"rounded-2xl border border-current/10 p-4"} style={{borderColor:cart[i.id]?primary:undefined,borderWidth:cart[i.id]?2:1}}>
    {i.image&&(kronix||presentation.template!=='COMPACT_MENU')?<img src={i.image} alt={i.name} className={kronix?"absolute left-2 top-2 h-[78px] w-[78px] rounded-xl object-contain":"mb-3 h-36 w-full rounded-xl object-cover"} loading="lazy"/>:null}
    {cart[i.id]>0?<span aria-label={`${cart[i.id]} unidades seleccionadas`} className="absolute left-[70px] top-1 grid h-6 min-w-6 place-items-center rounded-full px-1 text-xs font-black" style={action}>{cart[i.id]}</span>:null}
    <h2 className={kronix?"text-[18px] font-black leading-tight":"font-bold"}>{i.name}</h2><p className="mt-1 text-sm opacity-80">{i.description}</p><p className="mt-2 text-lg font-black" style={{color:primary}}>{money(i.priceCOP+extra(i))}</p>
    {(i.options??[]).map((g:any)=><fieldset key={g.id} className="mt-3"><legend className="text-sm font-semibold">{g.label} {g.min>0?'(obligatorio)':''}</legend>{g.choices.filter((c:any)=>c.isActive!==false).map((c:any)=><label key={c.id} className="mt-1 flex items-center gap-2 text-sm"><input type="checkbox" checked={(selections[i.id]?.[g.id]??[]).includes(c.id)} onChange={()=>toggle(i.id,g,c.id)}/>{c.label}{c.priceCOP?` + ${money(c.priceCOP)}`:''}</label>)}</fieldset>)}
    <div className={kronix?"absolute right-2 top-3 flex flex-col-reverse items-center gap-1":"mt-4 flex items-center justify-between gap-3"}><button aria-label={`Quitar ${i.name}`} className={kronix?"rounded-full border px-2 py-0 text-xs":"rounded-lg border px-4 py-2"} onClick={()=>change(i.id,-1)} hidden={kronix&&!cart[i.id]} disabled={!cart[i.id]}>−</button><span className={kronix?"text-xs font-bold":""} hidden={kronix&&!cart[i.id]}>{cart[i.id]??0}</span><button aria-label={`Agregar ${i.name}`} className={kronix?"grid h-10 w-10 place-items-center rounded-full text-2xl font-black":"rounded-lg px-4 py-2"} style={action} onClick={()=>change(i.id,1)} disabled={cart[i.id]>=20}>+</button></div>
   </article>)}</div></>:<section className="space-y-2"><button className="text-sm underline" onClick={()=>{if(payment)setPayment(false);else setCheckout(false);setError('');}}>← {payment?'Volver a ver pedido':'Volver a seleccionar productos'}</button>
    <h2 className="text-xl font-black">{payment?'Pago al establecimiento':'Tu pedido'}</h2>
    {!payment?<>
     <p className="text-xs opacity-80">{config.store.name} · {dine?session.locationLabel:fulfillment==='DELIVERY'?'Domicilio':'Recoger'}</p>
     <div className="space-y-2 rounded-2xl bg-white p-3 shadow-sm">{selected.map(i=><div key={i.id} className="flex items-center gap-2 border-b pb-2">{i.image?<img src={i.image} alt="" className="h-12 w-12 rounded-lg object-contain"/>:null}<div className="min-w-0 flex-1"><b className="text-sm">{i.name}</b><p className="text-xs opacity-80">{money(i.priceCOP+extra(i))} por unidad</p></div><button aria-label={`Quitar ${i.name}`} className="rounded-lg px-2 py-1" onClick={()=>change(i.id,-1)} style={{color:primary,background:primary+'15'}}>−</button><b className="text-xs">{cart[i.id]}</b><button aria-label={`Agregar ${i.name}`} className="rounded-lg px-2 py-1" onClick={()=>change(i.id,1)} style={{color:primary,background:primary+'15'}} disabled={cart[i.id]>=20}>+</button></div>)}
      <p className="flex justify-between text-sm"><span>Productos</span><span>{money(foodTotal)}</span></p>{packaging>0?<p className="flex justify-between text-sm"><span>Empaques</span><span>{money(packaging)}</span></p>:null}{offer.discountCOP>0?<p className="flex justify-between text-sm"><span>Descuento</span><span>−{money(offer.discountCOP)}</span></p>:null}<p className="flex justify-between border-t pt-2 text-lg font-black"><span>Total del pedido</span><span>{money(total)}</span></p>{!dine&&fulfillment==='DELIVERY'?<p className="text-xs opacity-80">El domicilio no está incluido; se acuerda y paga por separado.</p>:null}
     </div>
     {!dine?<>
      {allowed.length>1?<label className="block text-sm">Entrega<select className="ml-2 rounded-lg border bg-white p-1 text-slate-900" value={fulfillment} onChange={e=>setFulfillment(e.target.value)}>{allowed.map(f=><option key={f} value={f}>{f==='DELIVERY'?'Domicilio':'Recoger'}</option>)}</select></label>:null}
      {fulfillment==='DELIVERY'?<label className="block rounded-xl bg-white p-3 text-sm font-bold">Ubicación<input className="mt-1 block w-full rounded-xl border bg-white p-2 text-slate-900" value={address} onChange={e=>setAddress(e.target.value)} placeholder={`Dirección en ${config.store.city?.name||'tu ciudad'}`}/></label>:null}
      <label className="flex gap-2 rounded-xl bg-white p-3 text-sm"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/>Recordar mis datos en este navegador</label>
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-white p-3"><label className="text-sm font-bold">Tu nombre<input className="mt-1 block w-full rounded-xl border bg-white p-2 text-slate-900" value={name} onChange={e=>setName(e.target.value)} autoComplete="name"/></label><label className="text-sm font-bold">Celular<input type="tel" className="mt-1 block w-full rounded-xl border bg-white p-2 text-slate-900" value={phone} onChange={e=>setPhone(e.target.value)} autoComplete="tel"/></label></div>
     </>:null}
     <label className="block rounded-xl bg-white p-3 text-sm font-bold">Nota (opcional)<textarea className="mt-1 block w-full rounded-xl border bg-white p-2 text-slate-900" rows={2} maxLength={1000} value={note} onChange={e=>setNote(e.target.value)}/></label>
    </>:<>
     <p className="text-xs opacity-80">Transfiere directamente al negocio y adjunta la captura.</p>
     <div className="space-y-2 rounded-2xl bg-white p-3 shadow-sm"><div className="flex items-center gap-3">{config.store.image?<img src={config.store.image} alt={config.store.name} className="h-12 w-16 object-contain"/>:null}<div><b>{config.store.name}</b><p className="text-xs font-bold" style={{color:primary}}>{methods.map(m=>m.kind==='NEQUI'?'NEQUI':'LLAVE BRE-B').join(' / ')}</p></div></div>
      {methods.map(method=><div key={method.kind} className="flex items-center gap-2 rounded-xl border p-2" style={{background:primary+'12',borderColor:method.kind===selectedMethod?.kind?primary:primary+'22'}}><button aria-pressed={method.kind===selectedMethod?.kind} onClick={()=>selectPayment(method.kind)} className="flex min-w-0 flex-1 items-center gap-2 text-left">{methods.length>1?<span>{method.kind===selectedMethod?.kind?'●':'○'}</span>:null}<img src={method.kind==='NEQUI'?'/branding/payments/nequi.png':'/branding/payments/bre-b.png'} alt={method.kind==='NEQUI'?'Nequi':'Llave Bre-B'} className="h-8 w-20 object-contain"/><b className="min-w-0 break-all text-base">{method.destination}</b></button><button className="rounded-lg bg-white p-2 text-xs font-bold" onClick={()=>{selectPayment(method.kind);if(!navigator.clipboard){setError('Selecciona los datos para copiarlos.');return;}void navigator.clipboard.writeText(method.destination).catch(()=>setError('No pudimos copiar. Selecciona los datos para copiarlos.'));}}>Copiar</button></div>)}
      <p className="flex items-center justify-between rounded-xl p-3" style={{background:primary+'12',color:primary}}><b className="text-sm">Total a transferir</b><b className="text-xl">{money(total)}</b></p>
      {selectedMethod?.kind==='NEQUI'?<button className="block w-full text-center text-xs font-bold" style={{color:primary}} onClick={()=>{const storeUrl='https://play.google.com/store/apps/details?id=com.nequi.MobileApp';if(/Android/i.test(navigator.userAgent))window.location.href=`intent://#Intent;package=com.nequi.MobileApp;S.browser_fallback_url=${encodeURIComponent(storeUrl)};end`;else setError('Abre Nequi en tu teléfono y vuelve a este pedido.');}}>Abrir Nequi ↗</button>:<p className="text-center text-xs opacity-80">Paga con esta llave desde tu aplicación bancaria.</p>}
     </div>
     <div className="space-y-2 rounded-xl bg-white p-3"><b className="text-sm">Comprobante de pago</b>{receiptId?<><p className="text-xs font-bold" style={{color:primary}}>✓ Comprobante adjunto</p>{receiptPreview?<img src={receiptPreview} alt="Comprobante seleccionado" className="h-40 w-full rounded-xl object-contain"/>:null}</>:null}<input ref={receiptInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e=>{const file=e.target.files?.[0];if(file)void attachReceipt(file);}}/><button className="w-full rounded-xl border p-3 text-sm font-bold" style={{color:primary,borderColor:primary}} disabled={busy} onClick={()=>receiptInput.current?.click()}>{receiptId?'Cambiar comprobante':'Adjuntar captura del comprobante'}</button><p className="text-xs opacity-80">El negocio verificará la captura y confirmará el pedido.</p></div>
    </>}
    {error?<p role="alert" className="rounded-xl bg-amber-50 p-3 text-slate-900">{error}</p>:null}
    <button className="w-full rounded-xl p-3 font-black" style={action} disabled={busy||!count||(payment&&!receiptId)} onClick={()=>{if(!transfer||payment){void send();return;}setError('');if(name.trim().length<2||phone.replace(/\D/g,'').length<10){setError('Escribe tu nombre y un teléfono válido.');return;}if(fulfillment==='DELIVERY'&&!address.trim()){setError('Escribe la dirección de entrega.');return;}for(const i of selected)for(const g of i.options??[]){const ids=selections[i.id]?.[g.id]??[];if(ids.length<g.min||ids.length>g.max){setError(`Revisa ${g.label} en ${i.name}.`);return;}}if(!methods.length){setError('El negocio aún no tiene datos de transferencia.');return;}setPayment(true);}}>{busy?'Enviando…':transfer&&!payment?'Continuar con el pago ›':'Enviar pedido'}</button>
   </section>}
   {!checkout&&count>0?<div className="fixed bottom-4 left-1/2 z-20 w-[calc(100%-2rem)] max-w-[640px] -translate-x-1/2"><button className="w-full rounded-2xl p-4 text-lg font-black shadow-lg" style={action} onClick={()=>setCheckout(true)}>Ver pedido ({count}) · {money(total)}</button></div>:null}
  </>:null}
 <ConfirmCustomerDetails open={confirmOpen} busy={busy} name={name.trim()} phone={phone.trim()} address={address.trim()} pickup={fulfillment==='PICKUP'} count={count} total={money(total)} primary={primary} buttonText={String(action.color)} onEdit={()=>{setConfirmOpen(false);setPayment(false);}} onConfirm={()=>void send(true)}/>
 </main>;
}
