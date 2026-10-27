'use client';
import type {CSSProperties,ReactNode} from 'react';
import {restaurantProgress} from '@/lib/restaurant-progress';
import styles from './OrderTracking.module.css';
export default function PublicOrderTracking({order,data,onMenu,notifications}:{order:any;data:any;onMenu:()=>void;notifications:ReactNode}){
 const progress=restaurantProgress(order),config=data.config,presentation=config.appPresentation??{};
 const color=(v:any,f:string)=>/^#[a-f0-9]{6}$/i.test(v??'')?v:f;
 const vars={'--ink':color(presentation.primaryColor,'#211a14'),'--paper':color(presentation.backgroundColor,'#fbf5eb')} as CSSProperties;
 const contact=String(config.store.cel1||config.store.cel2||'').replace(/\D/g,'');
 return <section className={styles.page} style={vars}>
  <header className={styles.brand}>{config.store.image?<img src={config.store.image} alt={config.store.name}/>:<strong>{config.store.name}</strong>}</header>
  <p className={styles.eyebrow}>PEDIDO #{order.id.slice(-6).toUpperCase()}</p>
  <h1 className={styles.title}>{progress.terminal?progress.label:'Así va tu pedido'}</h1>
  <p className={styles.subtitle}>{progress.state==='COMPLETED'?'Gracias por elegirnos.':progress.state==='REJECTED'?'Consulta con el establecimiento para resolverlo.':'Aquí te contamos cómo va tu pedido.'}</p>
  <div className={styles.panel}>
   <div className={styles.top}><span>{order.fulfillment==='DELIVERY'?'A domicilio':order.fulfillment==='DINE_IN'?order.locationLabel||'En mesa':'Para recoger'}</span><strong>{new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(order.subtotalCOP)}</strong></div>
   <div role="status" aria-live="polite"><p className={styles.live}>{progress.label}</p></div>
   {progress.state==='PENDING_PAYMENT_REVIEW'?<p className={styles.pending}>Recibimos tu comprobante. El establecimiento está validando el pago.</p>:null}
   {progress.state==='REJECTED'?<div className={styles.rejected}>Tu pedido no fue aceptado. Si realizaste una transferencia, comunícate con el establecimiento para revisar el pago.{contact?<a className={styles.link} href={`tel:${contact}`}>Llamar al establecimiento</a>:null}</div>:<ol className={styles.steps} aria-label="Seguimiento del pedido">{progress.steps.map((step,i)=><li key={step.state} data-done={i<progress.current} aria-current={i===progress.current?'step':undefined}><span aria-hidden="true">{i<progress.current?'✓':i+1}</span>{step.label}</li>)}</ol>}
   {order.fulfillment==='DELIVERY'&&order.deliveryAddress?<p className={styles.hint}>Entrega: {order.deliveryAddress}</p>:null}
   {order.fulfillment==='PICKUP'?<p className={styles.hint}>Recoge en {config.store.address} cuando el pedido esté listo.</p>:null}
   {progress.terminal&&!order.paymentVerifiedAt&&order.paymentMethod!=='AT_RESTAURANT'&&order.paymentMethod!=='DIRECT_TO_ESTABLISHMENT'?<p className={styles.hint}>La entrega finalizó. La validación del pago no aparece registrada.</p>:null}
  </div>
  {!progress.terminal?<div className={styles.panel}>{notifications}</div>:null}
  <div className={styles.panel}><button className={`${styles.button} ${styles.secondary}`} onClick={onMenu}>Volver a la carta</button></div>
  <footer className={styles.footer}>Tecnología KroniX</footer>
 </section>;
}
