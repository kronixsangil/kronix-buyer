import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
const base=(process.env.NEXT_PUBLIC_API || 'http://localhost:3004').replace(/\/$/,'');
const keyName='kx_buyer_device';
const names=[keyName,'ct_at_buyer','ct_sid_buyer','ct_rt_buyer'];
function sameOrigin(req:NextRequest) {const origin=req.headers.get('origin');return !origin || origin===new URL(req.url).origin;}
function cookiesFrom(headers:Headers) {return (headers as any).getSetCookie?.() ?? (headers.get('set-cookie')||'').split(/,(?=\s*[^;,]+=)/g).filter(Boolean);}
export async function POST(req:NextRequest) {
 if(!sameOrigin(req))return NextResponse.json({message:'Origen inválido.'},{status:403});
 const input=await req.json();
 if(input.action==='forget') {const res=NextResponse.json({ok:true});for(const n of names)res.cookies.set(n,'',{path:'/',maxAge:0});return res;}
 const previous=req.cookies.get(keyName)?.value;
 const key=previous && /^[a-f0-9]{64}$/.test(previous) ? previous : randomBytes(32).toString('hex');
 if(input.action==='prepare') {const res=NextResponse.json({ok:true});res.cookies.set(keyName,key,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:60*86400});return res;}
 if(!previous)return NextResponse.json({message:'Permite las cookies de este sitio para conservar el acceso a tus pedidos.'},{status:401});
 const endpoint=input.action==='restore' ? '/customer/web/session' : '/customer/web/orders';
 const response=await fetch(base+endpoint,{method:'POST',headers:{'Content-Type':'application/json','x-buyer-device-key':key},body:JSON.stringify(input),cache:'no-store'});
 const res=new NextResponse(await response.arrayBuffer(),{status:response.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 // Retain the random key even if a response is lost or submission fails. No user exists until submission.
 res.cookies.set(keyName,key,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:60*86400});
 if(response.status===401)res.cookies.set(keyName,'',{path:'/',maxAge:0});
 for(const cookie of cookiesFrom(response.headers))res.headers.append('set-cookie',cookie);
 return res;
}
export async function DELETE(req:NextRequest) {
 if(!sameOrigin(req))return NextResponse.json({message:'Origen inválido.'},{status:403});
 const key=req.cookies.get(keyName)?.value;
 if(!key)return NextResponse.json({message:'Este navegador no tiene un perfil de dispositivo.'},{status:400});
 const upstream=await fetch(base+'/customer/web/profile',{method:'DELETE',headers:{'x-buyer-device-key':key},cache:'no-store'});
 const res=new NextResponse(await upstream.arrayBuffer(),{status:upstream.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(upstream.ok)for(const n of names)res.cookies.set(n,'',{path:'/',maxAge:0});
 return res;
}
