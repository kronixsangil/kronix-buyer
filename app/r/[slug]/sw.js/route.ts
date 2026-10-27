// Each restaurant keeps its own worker scope and push registration.
export function GET(){return new Response(`
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{if(e.request.method==='GET'&&new URL(e.request.url).origin===self.location.origin)e.respondWith(fetch(e.request));});
self.addEventListener('push',event=>{
 event.waitUntil((async()=>{
  let data={};try{data=event.data.json();}catch{}
  if(data.type!=='commerce.order')return;
  const scope=new URL(self.registration.scope),target=new URL(data.url||scope.pathname,self.location.origin);
  if(target.origin!==scope.origin||!(target.pathname===scope.pathname||target.pathname.startsWith(scope.pathname+'/')))return;
  await self.registration.showNotification(data.title||'Tu pedido',{body:data.body||'Hay una actualización de tu pedido.',icon:data.icon,tag:data.tag,renotify:true,silent:false,vibrate:[200,100,200],data:{url:target.href,orderId:data.orderId}});
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const client of windows){const u=new URL(client.url);if(u.origin===scope.origin&&(u.pathname===scope.pathname||u.pathname.startsWith(scope.pathname+'/')))client.postMessage(data);}
 })());
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();event.waitUntil((async()=>{
  const scope=new URL(self.registration.scope),url=new URL(event.notification.data?.url||scope.href);
  if(url.origin!==scope.origin||!(url.pathname===scope.pathname||url.pathname.startsWith(scope.pathname+'/')))return;
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const client of windows){const u=new URL(client.url);if(u.origin===scope.origin&&(u.pathname===scope.pathname||u.pathname.startsWith(scope.pathname+'/'))){await client.navigate(url.href);return client.focus();}}
  return self.clients.openWindow(url.href);
 })());
});
`,{headers:{'Content-Type':'application/javascript','Cache-Control':'no-cache','Service-Worker-Allowed':'/r/'}});}
