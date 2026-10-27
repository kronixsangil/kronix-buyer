export function restaurantProgress(order: any) {
  const delivery = order.fulfillment === 'DELIVERY', dine = order.fulfillment === 'DINE_IN';
  const status = String(order.status ?? ''), courier = order.courier;
  const completed = status === 'COMPLETED' || courier?.status === 'DELIVERED';
  const sent = delivery && !!(courier?.serviceSnapshot?.storeDispatch?.sentAt || courier?.status === 'EN_ROUTE');
  const state = status === 'REJECTED' ? status : completed ? 'COMPLETED' : sent ? 'SENT' : status;
  const steps = [
    {state:'CONFIRMED', label: order.paymentVerifiedAt ? 'Pago validado' : dine ? 'Pedido recibido' : 'Pedido confirmado'},
    {state:'PREPARING', label:'En preparación'},
    {state:'READY', label:delivery ? 'Listo para enviar' : dine ? 'Listo para servir' : 'Listo para recoger'},
    ...(delivery ? [{state:'SENT',label:'Enviado'}] : []),
    {state:'COMPLETED',label:'Finalizado'},
  ];
  const current = steps.findIndex(step=>step.state===state);
  const label = state === 'PENDING_PAYMENT_REVIEW' ? 'Validando tu pago' : state === 'REJECTED' ? 'Pedido no aceptado' : steps[current]?.label || 'Pedido recibido';
  return {steps,current,state,label,terminal:completed || status==='REJECTED'};
}
