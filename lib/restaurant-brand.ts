import {restaurantAssets} from './restaurant-assets';
// Se ejecuta solamente en el servidor. Usa la misma API que /api/buyer.
export async function restaurantBrand(slug:string){
 const assets=restaurantAssets(slug);
 const fallback={name:assets?'3AM Café':slug.split('-').filter(Boolean).map(s=>s[0]?.toUpperCase()+s.slice(1)).join(' ')||'Establecimiento',description:'Consulta el menú y haz tu pedido.',color:assets?'#211A14':'#008c99',background:assets?.background||'#ffffff',image:null as string|null};
 try{
  const api=(process.env.NEXT_PUBLIC_API||'http://localhost:3004').replace(/\/$/,'');
  const response=await fetch(`${api}/commerce/public/restaurants/${encodeURIComponent(slug)}?channel=PUBLIC_LINK`,{cache:'no-store',signal:AbortSignal.timeout(5000)});
  if(!response.ok)return fallback;
  const data=await response.json(),c=data.config,p=c?.appPresentation??{};
  if(!c)return fallback;
  const color=(v:any,f:string)=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)?v:f;
  return {name:c.serviceTitle||c.store.name,description:c.serviceSubtitle||fallback.description,color:color(p.primaryColor||c.store.primaryColor,fallback.color),background:color(p.backgroundColor,fallback.background),image:c.store.image||null};
 }catch{return fallback;}
}
