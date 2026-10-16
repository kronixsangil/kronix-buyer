import {ImageResponse} from 'next/og';
import {restaurantBrand} from '@/lib/restaurant-brand';
export async function GET(_req:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params,b=await restaurantBrand(slug);
 const brightness=parseInt(b.color.slice(1,3),16)*0.299+parseInt(b.color.slice(3,5),16)*0.587+parseInt(b.color.slice(5,7),16)*0.114;
 const initials=b.name.split(/\s+/).filter(Boolean).slice(0,2).map((s:string)=>s[0]).join('').toUpperCase();
 return new ImageResponse(<div style={{display:'flex',width:'100%',height:'100%',alignItems:'center',justifyContent:'center',background:b.color,color:brightness>160?'#111827':'white',fontSize:180,fontWeight:800}}>{initials}</div>,{width:512,height:512,headers:{'Cache-Control':'no-store'}});
}
