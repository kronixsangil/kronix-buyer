const base='/establecimientos/3AM/app';
export function restaurantAssets(slug:string){
 if(slug.toLowerCase()!=='3am')return null;
 return {icon180:`${base}/icon-180.png`,icon192:`${base}/icon-192.png`,icon512:`${base}/icon-512.png`,splash:`${base}/splash.png`,background:'#FBF5EB',
 startupImages:([[375,667,2],[375,812,3],[390,844,3],[393,852,3],[414,896,3],[428,926,3],[430,932,3],[402,874,3],[440,956,3]] as const).map(([w,h,dpr])=>({url:`${base}/startup-${w}x${h}.png`,media:`(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)`}))};
}
