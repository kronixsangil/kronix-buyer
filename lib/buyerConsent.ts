export type BuyerDocument={documentType:string;version:string};
/** Consent is looked up for the authenticated account and exact current versions.
 * Browser caches and phone numbers do not establish another person's consent. */
export async function buyerHasCurrentConsent(userId:string|undefined,documents:BuyerDocument[],load:(path:string)=>Promise<{accepted?:boolean}>) {
 if(!userId || documents.length!==2 || !documents.some(d=>d.documentType==='BUYER_TERMS') || !documents.some(d=>d.documentType==='BUYER_PRIVACY'))return false;
 try {const status=await Promise.all(documents.map(d=>load(`/legal/status?documentType=${encodeURIComponent(d.documentType)}&version=${encodeURIComponent(d.version)}`)));return status.every(s=>s.accepted===true);}catch{return false;}
}
