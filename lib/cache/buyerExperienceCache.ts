// lib/cache/buyerExperienceCache.ts

import { createTwoLevelCatalogCache } from "@/lib/cache/twoLevelCatalogCache";

export type BuyerTrackingCacheEntry<TOrder = unknown, TTracking = unknown> = {
  order: TOrder | null;
  tracking: TTracking | null;
};

export type BuyerWalletCacheEntry<TWallet = unknown, TTransaction = unknown, TRecharge = unknown> = {
  wallet: TWallet | null;
  transactions: TTransaction[];
  recharges: TRecharge[];
};

const profileCache = createTwoLevelCatalogCache<any>({
  namespace: "kronix:buyer:profile",
  version: 1,
});

const ordersCache = createTwoLevelCatalogCache<any[]>({
  namespace: "kronix:buyer:orders",
  version: 1,
  normalize: (value) => (Array.isArray(value) ? value : []),
});

const trackingCache = createTwoLevelCatalogCache<BuyerTrackingCacheEntry>({
  namespace: "kronix:buyer:tracking",
  version: 1,
  normalize: (value) => ({
    order: value?.order ?? null,
    tracking: value?.tracking ?? null,
  }),
});

const walletCache = createTwoLevelCatalogCache<BuyerWalletCacheEntry>({
  namespace: "kronix:buyer:wallet",
  version: 1,
  normalize: (value) => ({
    wallet: value?.wallet ?? null,
    transactions: Array.isArray(value?.transactions) ? value.transactions : [],
    recharges: Array.isArray(value?.recharges) ? value.recharges : [],
  }),
});

function cleanKey(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

// Perfil ----------------------------------------------------------------

export function getCachedBuyerProfile() {
  return profileCache.read("current");
}

export function writeCachedBuyerProfile(value: any) {
  return profileCache.write("current", value);
}

export function revalidateBuyerProfile(loader: () => Promise<any>) {
  return profileCache.refresh("current", loader);
}

export function invalidateBuyerProfile() {
  profileCache.invalidate("current");
}

// Historial -------------------------------------------------------------

export function getCachedBuyerOrders(buyerId: string) {
  const key = cleanKey(buyerId);
  return key ? ordersCache.read(key) : null;
}

export function writeCachedBuyerOrders(buyerId: string, value: any[]) {
  const key = cleanKey(buyerId);
  if (!key) return null;
  return ordersCache.write(key, value);
}

export function revalidateBuyerOrders(buyerId: string, loader: () => Promise<any[]>) {
  const key = cleanKey(buyerId);
  if (!key) return Promise.resolve({
    value: [] as any[],
    signature: "[]",
    changed: false,
    hadCachedValue: false,
  });
  return ordersCache.refresh(key, loader);
}

export function invalidateBuyerOrders(buyerId: string) {
  const key = cleanKey(buyerId);
  if (key) ordersCache.invalidate(key);
}

// Tracking --------------------------------------------------------------

export function getCachedBuyerTracking(orderId: string) {
  const key = cleanKey(orderId);
  return key ? trackingCache.read(key) : null;
}

export function writeCachedBuyerTracking(
  orderId: string,
  value: BuyerTrackingCacheEntry
) {
  const key = cleanKey(orderId);
  if (!key) return null;
  return trackingCache.write(key, value);
}

export function revalidateBuyerTracking(
  orderId: string,
  loader: () => Promise<BuyerTrackingCacheEntry>
) {
  const key = cleanKey(orderId);
  if (!key) {
    return Promise.resolve({
      value: { order: null, tracking: null },
      signature: "{}",
      changed: false,
      hadCachedValue: false,
    });
  }
  return trackingCache.refresh(key, loader);
}

export async function primeBuyerTracking(
  orderId: string,
  loader: () => Promise<BuyerTrackingCacheEntry>
) {
  const key = cleanKey(orderId);
  if (!key) return null;
  const cached = trackingCache.read(key);
  if (cached) return cached.value;
  return trackingCache.getOrLoad(key, loader);
}

export function invalidateBuyerTracking(orderId: string) {
  const key = cleanKey(orderId);
  if (key) trackingCache.invalidate(key);
}

// Wallet ----------------------------------------------------------------

export function getCachedBuyerWallet(cityId: string) {
  const key = cleanKey(cityId);
  return key ? walletCache.read(key) : null;
}

export function writeCachedBuyerWallet(
  cityId: string,
  value: BuyerWalletCacheEntry
) {
  const key = cleanKey(cityId);
  if (!key) return null;
  return walletCache.write(key, value);
}

export function revalidateBuyerWallet(
  cityId: string,
  loader: () => Promise<BuyerWalletCacheEntry>
) {
  const key = cleanKey(cityId);
  if (!key) {
    return Promise.resolve({
      value: { wallet: null, transactions: [], recharges: [] },
      signature: "{}",
      changed: false,
      hadCachedValue: false,
    });
  }
  return walletCache.refresh(key, loader);
}

export function invalidateBuyerWallet(cityId: string) {
  const key = cleanKey(cityId);
  if (key) walletCache.invalidate(key);
}

export function clearBuyerExperienceMemory() {
  profileCache.clearMemory();
  ordersCache.clearMemory();
  trackingCache.clearMemory();
  walletCache.clearMemory();
}
