'use client';
import {useEffect,useRef} from 'react';
import styles from './BoutiqueMenu.module.css';

type Props={boutique?:boolean;open:boolean;busy:boolean;name:string;phone:string;address:string;pickup:boolean;count:number;total:string;primary:string;buttonText:string;onEdit:()=>void;onConfirm:()=>void};
export default function ConfirmCustomerDetails(p:Props){
 const dialog=useRef<HTMLDialogElement>(null),confirm=useRef<HTMLButtonElement>(null);
 useEffect(()=>{const d=dialog.current;if(!d)return;if(!p.open){if(d.open)d.close();return;}const previous=document.activeElement as HTMLElement|null;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';d.showModal();confirm.current?.focus();return()=>{if(d.open)d.close();document.body.style.overflow=overflow;previous?.focus();};},[p.open]);
 return <dialog ref={dialog} aria-labelledby="confirm-contact-title" aria-describedby="confirm-contact-description" onCancel={e=>{e.preventDefault();if(!p.busy)p.onEdit();}} onClick={e=>{if(e.target===dialog.current&&!p.busy)p.onEdit();}} className={`${p.boutique?styles.contactDialog:''} fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-[440px] overflow-hidden rounded-[28px] border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/65 backdrop:backdrop-blur-sm`}>
  <div className="max-h-[90dvh] overflow-y-auto">
   <header className={p.boutique?"relative overflow-hidden px-5 py-4 text-white":"relative overflow-hidden px-6 pb-6 pt-7 text-white"} style={{background:p.boutique?'#211A14':`linear-gradient(135deg, ${p.primary}, #18152f)`}}>
    <div aria-hidden className="absolute -right-6 -top-8 h-36 w-36 rounded-full border-[20px] border-white/10"/>
    <span aria-hidden className={p.boutique?"hidden":"mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-white/15"}><svg width="25" height="25" viewBox="0 0 24 24" fill="none"><path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
    <p className="text-[10px] font-bold uppercase tracking-[.2em] text-white/75">Un último vistazo</p>
    <h2 id="confirm-contact-title" className="mt-1 text-[25px] font-black leading-tight">¿Tus datos están bien?</h2>
    <p id="confirm-contact-description" className={p.boutique?"mt-2 text-xs leading-relaxed text-white/85":"mt-2 text-sm leading-relaxed text-white/85"}>Así podremos contactarte y {p.pickup?'coordinar la recogida de tu pedido.':'entregar tu pedido en el lugar correcto.'}</p>
   </header>
   <div className={p.boutique?"space-y-2 bg-[#FBF5EB] p-4":"space-y-4 p-5 sm:p-6"}>
    <dl className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70">
     {[['Nombre',p.name],['Teléfono',p.phone],[p.pickup?'Entrega':'Dirección',p.pickup?'Recoger en el establecimiento':p.address]].map(([label,value])=><div key={label} className="px-4 py-3"><dt className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-[15px] font-bold leading-relaxed">{value}</dd></div>)}
    </dl>
    <div className="flex items-center justify-between gap-3 px-1"><span className="text-sm text-slate-500">{p.count} {p.count===1?'producto':'productos'}</span><strong className="text-xl font-black" style={{color:p.primary}}>{p.total}</strong></div>
    <p className="text-xs leading-relaxed text-slate-500">Si necesitas corregir algo, puedes volver sin perder tu pedido ni el comprobante.</p>
    <button ref={confirm} type="button" disabled={p.busy} onClick={p.onConfirm} className="w-full rounded-2xl px-4 py-4 text-sm font-black shadow-lg transition hover:brightness-110 disabled:opacity-60" style={{background:p.primary,color:p.buttonText}}>{p.busy?'Enviando pedido…':'Sí, confirmar y enviar'}</button>
    <button type="button" disabled={p.busy} onClick={p.onEdit} className="w-full rounded-xl px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50">Revisar mis datos</button>
   </div>
  </div>
 </dialog>;
}
