export function bestPromotion(promotions:any[],subtotal:number,now=Date.now()) {
 let best:any=null,discountCOP=0;
 for(const p of promotions??[]){
  if(!p.isActive||(p.startsAt&&Date.parse(p.startsAt)>now)||(p.endsAt&&Date.parse(p.endsAt)<now)||subtotal<(p.minOrderCOP??0))continue;
  let amount=p.discountType==='PERCENT'?Math.floor(subtotal*p.discountValue/100):p.discountValue;
  if(p.maxDiscountCOP!=null)amount=Math.min(amount,p.maxDiscountCOP);
  amount=Math.max(0,Math.min(subtotal,amount));
  if(amount>discountCOP){discountCOP=amount;best=p;}
 }
 return {discountCOP,promotion:best};
}
