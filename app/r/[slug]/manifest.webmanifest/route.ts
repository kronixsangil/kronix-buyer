import {restaurantBrand} from '@/lib/restaurant-brand';
export async function GET(_req:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params,b=await restaurantBrand(slug),path=`/r/${encodeURIComponent(slug)}`;
 return Response.json({id:`${path}/`,name:b.name,short_name:b.name.slice(0,24),start_url:path,scope:path,display:'standalone',background_color:b.background,theme_color:b.color,icons:[{src:`${path}/icon`,sizes:'512x512',type:'image/png',purpose:'any'}]},{headers:{'Content-Type':'application/manifest+json','Cache-Control':'no-store'}});
}
