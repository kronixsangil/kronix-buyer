// lib/geocode.ts
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

function titleCaseAddressWord(value: string) {
  if (!value) return value;
  if (/^[A-ZÁÉÍÓÚÑ]+$/.test(value) && value.length <= 3) return value;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

/**
 * Normalizador Colombiano de Direcciones KRONIX.
 *
 * Objetivo: convertir las formas comunes que escribe un usuario colombiano
 * en una representación consistente y amigable para geocodificación, sin
 * inventar datos que el usuario no haya suministrado.
 *
 * Ejemplos:
 *   cra 26 #35-41       -> Carrera 26 # 35-41
 *   cr 26 35 41         -> Carrera 26 # 35-41
 *   cll 12 no 7 25      -> Calle 12 # 7-25
 *   carrera 9 n° 10-20  -> Carrera 9 # 10-20
 *   dg 15 bis # 8-40    -> Diagonal 15 Bis # 8-40
 */
export function normalizeColombianAddress(input: string): string {
  let value = String(input ?? "")
    .replace(/[\u00A0\t\r\n]+/g, " ")
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/[º°]/g, "°")
    .replace(/\s+/g, " ")
    .trim();

  if (!value) return "";

  // Normalizar prefijos viales habituales en Colombia.
  const streetTypes: Array<[RegExp, string]> = [
    [/^\s*(?:cra|cr|kra|kr|carrera)\.?\s+/i, "Carrera "],
    [/^\s*(?:cll|cl|calle)\.?\s+/i, "Calle "],
    [/^\s*(?:av\s*cra|av\.?\s*carrera|avenida\s+carrera)\.?\s+/i, "Avenida Carrera "],
    [/^\s*(?:av\s*cll|av\.?\s*calle|avenida\s+calle)\.?\s+/i, "Avenida Calle "],
    [/^\s*(?:av|avenida)\.?\s+/i, "Avenida "],
    [/^\s*(?:dg|diag|diagonal)\.?\s+/i, "Diagonal "],
    [/^\s*(?:tv|trv|transv|transversal)\.?\s+/i, "Transversal "],
    [/^\s*(?:aut|autop|autopista)\.?\s+/i, "Autopista "],
    [/^\s*(?:km|kilometro|kilómetro)\.?\s+/i, "Kilómetro "],
    [/^\s*(?:via|vía)\s+/i, "Vía "],
  ];

  for (const [pattern, replacement] of streetTypes) {
    if (pattern.test(value)) {
      value = value.replace(pattern, replacement);
      break;
    }
  }

  // Unificar formas de número: No, Nro, Nº, N°, Num, #.
  value = value
    .replace(/\s+(?:no\.?|nro\.?|núm\.?|num\.?|n[º°])\s*/gi, " # ")
    .replace(/\s*#\s*/g, " # ")
    .replace(/\s+/g, " ")
    .trim();

  // Si no hay # y después del número de vía vienen dos grupos numéricos,
  // interpretar la notación colombiana compacta: "Carrera 26 35 41".
  if (!value.includes("#")) {
    value = value.replace(
      /^(Carrera|Calle|Diagonal|Transversal|Avenida(?: Carrera| Calle)?)(\s+\d+[A-Za-z]?\s*(?:Bis)?(?:\s+(?:Sur|Norte|Este|Oeste))?)\s+(\d+[A-Za-z]?)\s+(\d+[A-Za-z]?)(\b.*)$/i,
      "$1$2 # $3-$4$5"
    );
  }

  // Con # presente, convertir "# 35 41" o "# 35 - 41" a "# 35-41".
  value = value
    .replace(/#\s*(\d+[A-Za-z]?)\s*-\s*(\d+[A-Za-z]?)/gi, "# $1-$2")
    .replace(/#\s*(\d+[A-Za-z]?)\s+(\d+[A-Za-z]?)(?=\b|,|$)/gi, "# $1-$2")
    .replace(/\s*#\s*/g, " # ")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();

  // Capitalización operativa de modificadores viales frecuentes.
  value = value
    .replace(/\bbis\b/gi, "Bis")
    .replace(/\bsur\b/gi, "Sur")
    .replace(/\bnorte\b/gi, "Norte")
    .replace(/\beste\b/gi, "Este")
    .replace(/\boeste\b/gi, "Oeste");

  // Mantener el tipo vial bien presentado aun si el usuario lo escribió todo en mayúsculas.
  value = value.replace(
    /^(Carrera|Calle|Diagonal|Transversal|Avenida|Autopista|Kilómetro|Vía)(?:\s+(Carrera|Calle))?/i,
    (full) => full.split(" ").map(titleCaseAddressWord).join(" ")
  );

  return value;
}

function expandColombianAddress(address: string): string[] {
  const raw = normalizeColombianAddress(address);
  if (raw.length < 3) return [];

  // Nominatim suele entender tanto la forma colombiana con # como algunas
  // variantes expandidas. El normalizado va primero para favorecerlo.
  return uniqueStrings([
    raw,
    raw.replace(/\s*#\s*/g, " "),
    raw.replace(/\s*#\s*/g, " No. "),
    raw.replace(/\bCarrera\b/gi, "Cra"),
    raw.replace(/\bCalle\b/gi, "Cl"),
    raw.replace(/\bDiagonal\b/gi, "Dg"),
    raw.replace(/\bTransversal\b/gi, "Tv"),
  ]);
}

function buildCityLockedVariants(address: string, cityGeoLabel?: string) {
  const cleanAddress = normalizeColombianAddress(address);
  const cleanCity = normalizeWhitespace(cityGeoLabel ?? "");

  if (cleanAddress.length < 3) return [];

  const addressVariants = expandColombianAddress(cleanAddress);

  if (!cleanCity) return addressVariants;

  return uniqueStrings(
    addressVariants.flatMap((variant) => {
      if (variant.toLowerCase().includes(cleanCity.toLowerCase())) return [variant];
      return [`${variant}, ${cleanCity}`, `${variant}, ${cleanCity}, Colombia`];
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
  for (const candidate of buildCityLockedVariants(address)) {
    const result = await trySingleQuery(candidate);
    if (result) return result;
  }
  return null;
}

export async function geocodeAddressOSMInCity(
  address: string,
  cityGeoLabel: string
): Promise<GeocodeResult | null> {
  for (const candidate of buildCityLockedVariants(address, cityGeoLabel)) {
    const result = await trySingleQuery(candidate);
    if (result) return result;
  }
  return null;
}

export type ReverseGeocodeResult = {
  address: string;
  placeName: string | null;
  lat: number;
  lng: number;
  hasHouseNumber: boolean;
  neighbourhood: string | null;
};

type ReverseGeocodeApiResponse = {
  ok: boolean;
  result: ReverseGeocodeResult | null;
};

export async function reverseGeocodeOSM(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult | null> {
  const safeLat = Number(lat);
  const safeLng = Number(lng);

  if (
    !Number.isFinite(safeLat) ||
    !Number.isFinite(safeLng) ||
    Math.abs(safeLat) > 90 ||
    Math.abs(safeLng) > 180 ||
    (safeLat === 0 && safeLng === 0)
  ) {
    return null;
  }

  try {
    const params = new URLSearchParams({
      lat: String(safeLat),
      lng: String(safeLng),
    });

    const res = await fetch(`/api/geocode?${params.toString()}`, {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = (await res.json()) as ReverseGeocodeApiResponse;
    if (!data?.ok || !data.result?.address) return null;

    // Las coordenadas que devuelve esta función son SIEMPRE las originales del GPS.
    // La respuesta del geocodificador solo propone el texto visible.
    return {
      ...data.result,
      address: normalizeColombianAddress(data.result.address),
      lat: safeLat,
      lng: safeLng,
    };
  } catch {
    return null;
  }
}
