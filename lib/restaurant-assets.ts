export function restaurantAssets(slug:string){
 const known:Record<string,{base:string;name:string;color:string;background:string}>={
  '3am':{base:'/establecimientos/3AM/app',name:'3AM Café',color:'#211A14',background:'#FBF5EB'},
  'caseritos':{base:'/establecimientos/caseritos/app',name:'Caseritos de la 30',color:'#A6071B',background:'#FFF3D9'},
 };
 const data=known[slug.toLowerCase()];if(!data)return null;const {base,...brand}=data;
 return {...brand,icon180:`${base}/icon-180.png`,icon192:`${base}/icon-192.png`,icon512:`${base}/icon-512.png`,splash:`${base}/splash.png`,
 startupImages:([[375,667,2],[375,812,3],[390,844,3],[393,852,3],[414,896,3],[428,926,3],[430,932,3],[402,874,3],[440,956,3]] as const).map(([w,h,dpr])=>({url:`${base}/startup-${w}x${h}.png`,media:`(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)`}))};
}
