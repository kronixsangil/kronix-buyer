export type PaymentMethod = {kind:"NEQUI"|"BREB";destination:string};
export function checkoutPaymentMethods(config:any):PaymentMethod[]{
 const methods=config?.appPresentation?.paymentMethods;
 if(Array.isArray(methods))return methods.filter(m=>m&&["NEQUI","BREB"].includes(m.kind)&&typeof m.destination==="string"&&m.destination.trim());
 const destination=String(config?.paymentDestination??"").trim(),label=String(config?.paymentMethodLabel??"");
 if(!destination)return [];
 return /nequi/i.test(label)?[{kind:"NEQUI",destination}]:/llave|bre.?b/i.test(label)?[{kind:"BREB",destination}]:[];
}
