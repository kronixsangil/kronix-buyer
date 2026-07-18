// lib/cache/twoLevelCatalogCache.ts

export type CatalogCacheRead<T> = {
  value: T;
  signature: string;
  savedAt: number;
  source: "memory" | "session";
};

export type CatalogRefreshResult<T> = {
  value: T;
  signature: string;
  changed: boolean;
  hadCachedValue: boolean;
};

type StoredEnvelope<T> = {
  version: number;
  savedAt: number;
  signature: string;
  value: T;
};

type CreateTwoLevelCatalogCacheOptions<T> = {
  namespace: string;
  version?: number;
  normalize?: (value: T) => T;
  signature?: (value: T) => string;
};

function canUseSessionStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`).join(",")}}`;
}

function normalizeCacheKey(value: string) {
  return String(value ?? "").trim().toLowerCase();
}

export function createTwoLevelCatalogCache<T>(options: CreateTwoLevelCatalogCacheOptions<T>) {
  const version = Number(options.version ?? 1);
  const namespace = String(options.namespace ?? "").trim();
  const memory = new Map<string, StoredEnvelope<T>>();
  const pending = new Map<string, Promise<CatalogRefreshResult<T>>>();

  if (!namespace) throw new Error("El caché de catálogo requiere un namespace.");

  const normalize = options.normalize ?? ((value: T) => value);
  const createSignature = options.signature ?? ((value: T) => stableSerialize(value));

  function storageKey(key: string) {
    return `${namespace}:v${version}:${normalizeCacheKey(key)}`;
  }

  function toRead(envelope: StoredEnvelope<T>, source: CatalogCacheRead<T>["source"]): CatalogCacheRead<T> {
    return { value: envelope.value, signature: envelope.signature, savedAt: envelope.savedAt, source };
  }

  function read(key: string): CatalogCacheRead<T> | null {
    const normalizedKey = normalizeCacheKey(key);
    if (!normalizedKey) return null;

    const memoryValue = memory.get(normalizedKey);
    if (memoryValue) return toRead(memoryValue, "memory");
    if (!canUseSessionStorage()) return null;

    try {
      const raw = window.sessionStorage.getItem(storageKey(normalizedKey));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StoredEnvelope<T>;
      if (!parsed || parsed.version !== version || typeof parsed.savedAt !== "number" || typeof parsed.signature !== "string") {
        window.sessionStorage.removeItem(storageKey(normalizedKey));
        return null;
      }

      const value = normalize(parsed.value);
      const envelope: StoredEnvelope<T> = {
        version,
        savedAt: parsed.savedAt,
        signature: createSignature(value),
        value,
      };
      memory.set(normalizedKey, envelope);
      return toRead(envelope, "session");
    } catch {
      try { window.sessionStorage.removeItem(storageKey(normalizedKey)); } catch {}
      return null;
    }
  }

  function writeValue(key: string, rawValue: T): CatalogCacheRead<T> {
    const normalizedKey = normalizeCacheKey(key);
    if (!normalizedKey) throw new Error("No se puede guardar un catálogo sin clave.");

    const value = normalize(rawValue);
    const envelope: StoredEnvelope<T> = {
      version,
      savedAt: Date.now(),
      signature: createSignature(value),
      value,
    };

    memory.set(normalizedKey, envelope);
    if (canUseSessionStorage()) {
      try { window.sessionStorage.setItem(storageKey(normalizedKey), JSON.stringify(envelope)); } catch {}
    }
    return toRead(envelope, "memory");
  }

  function invalidate(key: string) {
    const normalizedKey = normalizeCacheKey(key);
    if (!normalizedKey) return;
    memory.delete(normalizedKey);
    pending.delete(normalizedKey);
    if (canUseSessionStorage()) {
      try { window.sessionStorage.removeItem(storageKey(normalizedKey)); } catch {}
    }
  }

  function invalidateMemory(key: string) {
    const normalizedKey = normalizeCacheKey(key);
    if (!normalizedKey) return;
    memory.delete(normalizedKey);
  }

  function clearMemory() {
    memory.clear();
    pending.clear();
  }

  async function refresh(key: string, loader: () => Promise<T>): Promise<CatalogRefreshResult<T>> {
    const normalizedKey = normalizeCacheKey(key);
    if (!normalizedKey) {
      const value = normalize(await loader());
      return { value, signature: createSignature(value), changed: true, hadCachedValue: false };
    }

    const running = pending.get(normalizedKey);
    if (running) return running;

    const task = (async () => {
      const before = read(normalizedKey);
      const value = normalize(await loader());
      const signature = createSignature(value);
      const changed = !before || before.signature !== signature;
      if (changed) writeValue(normalizedKey, value);
      return {
        value: changed ? value : before!.value,
        signature,
        changed,
        hadCachedValue: Boolean(before),
      };
    })();

    pending.set(normalizedKey, task);
    try { return await task; }
    finally { if (pending.get(normalizedKey) === task) pending.delete(normalizedKey); }
  }

  async function getOrLoad(key: string, loader: () => Promise<T>): Promise<T> {
    const cached = read(key);
    if (cached) return cached.value;
    const result = await refresh(key, loader);
    return result.value;
  }

  return { read, write: writeValue, refresh, getOrLoad, invalidate, invalidateMemory, clearMemory };
}
