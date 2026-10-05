import PublicRestaurant from '@/components/restaurant/PublicRestaurant';
export default async function Page({params}:{params:Promise<{slug:string}>}){const {slug}=await params;return <PublicRestaurant slug={slug}/>;}
