export function restaurantAssets(slug:string){
 const known:Record<string,{base:string;name:string;color:string;background:string}>={
  '3am':{base:'/establecimientos/3AM/app',name:'3AM Café',color:'#211A14',background:'#FBF5EB'},
  'caseritos':{base:'/establecimientos/caseritos/app',name:'Caseritos',color:'#A6071B',background:'#FFF3D9'},
  'fortuna':{base:'/establecimientos/la-fortuna/app',name:'La Fortuna',color:'#701A9C',background:'#FFF8EE'},
 };
 const data=known[slug.toLowerCase()];if(!data)return null;const {base,...brand}=data;
 const version=slug.toLowerCase()==='3am'?'':'?v=brand3';
 return {...brand,icon180:`${base}/icon-180.png${version}`,icon192:`${base}/icon-192.png${version}`,icon512:`${base}/icon-512.png${version}`,splash:`${base}/splash.png${version}`,iconMask512:version?`${base}/icon-maskable-512.png${version}`:null,
 startupImages:([[375,667,2],[375,812,3],[390,844,3],[393,852,3],[414,896,3],[428,926,3],[430,932,3],[402,874,3],[440,956,3]] as const).map(([w,h,dpr])=>({url:`${base}/startup-${w}x${h}.png${version}`,media:`(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)`}))};
}
