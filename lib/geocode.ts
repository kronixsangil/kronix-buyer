//lib/geocode.ts
export type GeocodeResult = {
  lat: number;
  lng: number;
};

type GeocodeApiResponse = {
  ok: boolean;
  result: GeocodeResult | null;
};

function normalizeWhitespace(input: string) {
  return String(input ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((v) => normalizeWhitespace(v)).filter(Boolean)));
}

function expandColombianAddress(address: string): string[] {
  const raw = normalizeWhitespace(address);
  if (raw.length < 3) return [];

  return uniqueStrings([
    raw,
    raw.replace(/\s*-\s*/g, " # "),
    raw.replace(/\s+#\s*/g, " # "),
    raw.replace(/\s*#\s*/g, " # "),
    raw
      .replace(/\bCra\b/gi, "Carrera")
      .replace(/\bCr\b/gi, "Carrera")
      .replace(/\bKr\b/gi, "Carrera")
      .replace(/\bCl\b/gi, "Calle")
      .replace(/\bCll\b/gi, "Calle")
      .replace(/\bAv\b/gi, "Avenida"),
    raw
      .replace(/\s*-\s*/g, " # ")
      .replace(/\bCra\b/gi, "Carrera")
      .replace(/\bCr\b/gi, "Carrera")
      .replace(/\bKr\b/gi, "Carrera")
      .replace(/\bCl\b/gi, "Calle")
      .replace(/\bCll\b/gi, "Calle")
      .replace(/\bAv\b/gi, "Avenida"),
  ]);
}

function buildCityLockedVariants(address: string, cityGeoLabel?: string) {
  const cleanAddress = normalizeWhitespace(address);
  const cleanCity = normalizeWhitespace(cityGeoLabel ?? "");

  if (cleanAddress.length < 3) return [];

  const addressVariants = expandColombianAddress(cleanAddress);

  if (!cleanCity) {
    return addressVariants;
  }

  return uniqueStrings(
    addressVariants.flatMap((variant) => {
      const normalizedVariant = variant.toLowerCase();
      const normalizedCity = cleanCity.toLowerCase();

      if (normalizedVariant.includes(normalizedCity)) {
        return [variant];
      }

      return [
        `${variant}, ${cleanCity}`,
        `${variant}, ${cleanCity}, Colombia`,
      ];
    })
  );
}

async function trySingleQuery(query: string): Promise<GeocodeResult | null> {
  const q = normalizeWhitespace(query);
  if (q.length < 6) return null;

  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, {
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = (await res.json()) as GeocodeApiResponse;
    if (!data?.ok) return null;
    return data.result ?? null;
  } catch {
    return null;
  }
}

export async function geocodeAddressOSM(address: string): Promise<GeocodeResult | null> {
  const variants = buildCityLockedVariants(address);

  for (const candidate of variants) {
    const result = await trySingleQuery(candidate);
    if (result) return result;
  }

  return null;
}

export async function geocodeAddressOSMInCity(
  address: string,
  cityGeoLabel: string
): Promise<GeocodeResult | null> {
  const variants = buildCityLockedVariants(address, cityGeoLabel);

  for (const candidate of variants) {
    const result = await trySingleQuery(candidate);
    if (result) return result;
  }

  return null;
}
