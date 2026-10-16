import type {Metadata} from 'next';
import {restaurantBrand} from '@/lib/restaurant-brand';
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
 const {slug}=await params,b=await restaurantBrand(slug),path=`/r/${encodeURIComponent(slug)}`;
 return {title:{absolute:b.name},description:b.description,applicationName:b.name,manifest:`${path}/manifest.webmanifest`,appleWebApp:{capable:true,title:b.name,statusBarStyle:'default'},icons:{icon:`${path}/icon`,apple:`${path}/icon`},openGraph:{title:b.name,description:b.description,type:'website',siteName:b.name},twitter:{card:'summary',title:b.name,description:b.description}};
}
export default function Layout({children}:{children:React.ReactNode}){return children;}
