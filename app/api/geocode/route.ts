// app/api/geocode/route.ts
import { NextRequest, NextResponse } from "next/server";

type NominatimItem = {
  lat: string;
  lon: string;
  display_name?: string;
  importance?: number;
  address?: {
    country?: string;
    country_code?: string;
    state?: string;
    county?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    suburb?: string;
    neighbourhood?: string;
    quarter?: string;
    hamlet?: string;
    residential?: string;
    pedestrian?: string;
    path?: string;
    footway?: string;
    house_number?: string;
    building?: string;
    amenity?: string;
    shop?: string;
    road?: string;
  };
};

type GeocodeResult = {
  lat: number;
  lng: number;
};

function normalizeText(input: string) {
  return String(input ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanPart(input: string) {
  return String(input ?? "").replace(/\s+/g, " ").trim();
}


function normalizeColombianAddress(input: string) {
  let value = String(input ?? "")
    .replace(/[\u00A0\t\r\n]+/g, " ")
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/[º°]/g, "°")
    .replace(/\s+/g, " ")
    .trim();

  if (!value) return "";

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

  value = value
    .replace(/\s+(?:no\.?|nro\.?|núm\.?|num\.?|n[º°])\s*/gi, " # ")
    .replace(/\s*#\s*/g, " # ")
    .replace(/\s+/g, " ")
    .trim();

  if (!value.includes("#")) {
    value = value.replace(
      /^(Carrera|Calle|Diagonal|Transversal|Avenida(?: Carrera| Calle)?)(\s+\d+[A-Za-z]?\s*(?:Bis)?(?:\s+(?:Sur|Norte|Este|Oeste))?)\s+(\d+[A-Za-z]?)\s+(\d+[A-Za-z]?)(\b.*)$/i,
      "$1$2 # $3-$4$5"
    );
  }

  return value
    .replace(/#\s*(\d+[A-Za-z]?)\s*-\s*(\d+[A-Za-z]?)/gi, "# $1-$2")
    .replace(/#\s*(\d+[A-Za-z]?)\s+(\d+[A-Za-z]?)(?=\b|,|$)/gi, "# $1-$2")
    .replace(/\s*#\s*/g, " # ")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\bbis\b/gi, "Bis")
    .replace(/\bsur\b/gi, "Sur")
    .replace(/\bnorte\b/gi, "Norte")
    .replace(/\beste\b/gi, "Este")
    .replace(/\boeste\b/gi, "Oeste")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((x) => cleanPart(x)).filter(Boolean)));
}

function splitAddress(raw: string) {
  const parts = String(raw)
    .split(",")
    .map((x) => cleanPart(x))
    .filter(Boolean);

  return parts;
}

function buildCandidateQueries(raw: string) {
  const parts = splitAddress(raw);
  const normRaw = normalizeColombianAddress(raw);

  const queries: string[] = [];

  if (!parts.length) {
    return [];
  }

  // Detectar cola tipo: dirección, complemento, ciudad, departamento, país
  const country = parts.length >= 1 ? parts[parts.length - 1] : "";
  const department = parts.length >= 2 ? parts[parts.length - 2] : "";
  const city = parts.length >= 3 ? parts[parts.length - 3] : "";

  const head = parts.slice(0, Math.max(0, parts.length - 3));
  const mainAddress = normalizeColombianAddress(head[0] ?? parts[0] ?? "");
  const secondPart = head[1] ?? "";

  const cityDeptCountry = [city, department, country].filter(Boolean).join(", ");

  // original
  queries.push(normRaw);

  // dirección principal + ciudad + depto + país
  if (mainAddress && cityDeptCountry) {
    queries.push(`${mainAddress}, ${cityDeptCountry}`);
  }

  // dirección + complemento + ciudad + depto + país
  if (mainAddress && secondPart && cityDeptCountry) {
    queries.push(`${mainAddress}, ${secondPart}, ${cityDeptCountry}`);
  }

  // Variantes útiles para Nominatim conservando primero el formato colombiano normalizado.
  if (mainAddress && cityDeptCountry) {
    queries.push(`${mainAddress.replace(/\s*#\s*/g, " ")}, ${cityDeptCountry}`);
    queries.push(`${mainAddress.replace(/\s*#\s*/g, " No. ")}, ${cityDeptCountry}`);
    queries.push(`${mainAddress.replace(/\bCarrera\b/gi, "Cra")}, ${cityDeptCountry}`);
    queries.push(`${mainAddress.replace(/\bCalle\b/gi, "Cl")}, ${cityDeptCountry}`);
  }

  // fallback por ciudad/departamento
  if (mainAddress && city) {
    queries.push(`${mainAddress}, ${city}, Colombia`);
  }

  if (mainAddress && department) {
    queries.push(`${mainAddress}, ${department}, Colombia`);
  }

  // por si la consulta ya viene rara
  queries.push(normRaw.replace(/\s*#\s*/g, " "));

  return uniqueStrings(queries);
}

function getAddressLocality(item: NominatimItem) {
  const addr = item.address ?? {};
  return cleanPart(
    addr.city ||
      addr.town ||
      addr.village ||
      addr.municipality ||
      ""
  );
}

function getAddressDepartment(item: NominatimItem) {
  const addr = item.address ?? {};
  return cleanPart(addr.state || addr.county || "");
}

function scoreCandidate(
  item: NominatimItem,
  expectedCity: string,
  expectedDepartment: string
) {
  const city = normalizeText(getAddressLocality(item));
  const department = normalizeText(getAddressDepartment(item));
  const display = normalizeText(item.display_name || "");
  const countryCode = normalizeText(item.address?.country_code || "");

  let score = 0;

  if (countryCode === "co") score += 100;

  if (expectedCity) {
    if (city === expectedCity) score += 80;
    else if (display.includes(expectedCity)) score += 40;
  }

  if (expectedDepartment) {
    if (department === expectedDepartment) score += 50;
    else if (display.includes(expectedDepartment)) score += 20;
  }

  score += Math.round(Number(item.importance ?? 0) * 10);

  return score;
}

async function fetchNominatim(query: string) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");
  url.searchParams.set("countrycodes", "co");
  url.searchParams.set("accept-language", "es");

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "KroniX/1.0 (Buyer Geocoder)",
      "Accept-Language": "es",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Nominatim HTTP ${res.status}`);
  }

  return (await res.json()) as NominatimItem[];
}


type NominatimReverseItem = NominatimItem & {
  name?: string;
};

type ReverseGeocodeResult = {
  address: string;
  placeName: string | null;
  lat: number;
  lng: number;
  hasHouseNumber: boolean;
  neighbourhood: string | null;
};

function buildKronixReverseAddress(item: NominatimReverseItem) {
  const a = item.address ?? {};
  const road = cleanPart(
    a.road || a.pedestrian || a.residential || a.path || a.footway || ""
  );
  const houseNumber = cleanPart(a.house_number || "");
  const neighbourhood = cleanPart(
    a.neighbourhood || a.suburb || a.quarter || a.hamlet || ""
  );

  // Para Colombia mostramos una dirección operativa corta:
  // "Calle 35 # 26-41" y, si aporta valor, el barrio.
  const street = houseNumber
    ? cleanPart(`${road} # ${houseNumber}`)
    : road;

  const address = uniqueStrings([
    street,
    neighbourhood ? `Barrio ${neighbourhood}` : "",
  ]).join(", ");

  return {
    address: normalizeColombianAddress(address || cleanPart(item.display_name || "")),
    hasHouseNumber: Boolean(houseNumber),
    neighbourhood: neighbourhood || null,
  };
}

async function fetchNominatimReverse(lat: number, lng: number) {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("zoom", "18");
  url.searchParams.set("accept-language", "es");

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "KroniX/1.0 (Buyer Reverse Geocoder)",
      "Accept-Language": "es",
    },
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Nominatim reverse HTTP ${res.status}`);
  return (await res.json()) as NominatimReverseItem;
}

export async function GET(req: NextRequest) {
  try {
    const latRaw = req.nextUrl.searchParams.get("lat");
    const lngRaw = req.nextUrl.searchParams.get("lng");

    if (latRaw !== null || lngRaw !== null) {
      const lat = Number(latRaw);
      const lng = Number(lngRaw);

      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        Math.abs(lat) > 90 ||
        Math.abs(lng) > 180 ||
        (lat === 0 && lng === 0)
      ) {
        return NextResponse.json(
          { ok: false, result: null, error: "Coordenadas inválidas" },
          { status: 400 }
        );
      }

      const item = await fetchNominatimReverse(lat, lng);
      const readable = buildKronixReverseAddress(item);

      if (!readable.address) {
        return NextResponse.json({
          ok: false,
          result: null,
          error: "No se pudo identificar una dirección para estas coordenadas",
        });
      }

      const a = item.address ?? {};
      const placeName = cleanPart(
        item.name ||
          a.amenity ||
          a.shop ||
          a.building ||
          a.neighbourhood ||
          a.suburb ||
          "Mi ubicación actual"
      );

      const result: ReverseGeocodeResult = {
        address: readable.address,
        placeName: placeName || null,
        // IMPORTANTE: conservar exactamente el GPS enviado por el teléfono.
        lat,
        lng,
        hasHouseNumber: readable.hasHouseNumber,
        neighbourhood: readable.neighbourhood,
      };

      return NextResponse.json({ ok: true, result });
    }

    const q = normalizeColombianAddress(req.nextUrl.searchParams.get("q") || "");
    if (q.length < 6) {
      return NextResponse.json(
        { ok: false, result: null, error: "Dirección demasiado corta" },
        { status: 400 }
      );
    }

    const parts = splitAddress(q);
    const expectedCountry = normalizeText(parts[parts.length - 1] || "");
    const expectedDepartment = normalizeText(parts[parts.length - 2] || "");
    const expectedCity = normalizeText(parts[parts.length - 3] || "");

    const queries = buildCandidateQueries(q);

    let best: { item: NominatimItem; score: number } | null = null;

    for (const candidate of queries) {
      let items: NominatimItem[] = [];

      try {
        items = await fetchNominatim(candidate);
      } catch {
        continue;
      }

      for (const item of items) {
        const score = scoreCandidate(item, expectedCity, expectedDepartment);

        // Solo aceptamos Colombia si venía Colombia esperado
        if (expectedCountry === "colombia") {
          const cc = normalizeText(item.address?.country_code || "");
          if (cc !== "co") continue;
        }

        if (!best || score > best.score) {
          best = { item, score };
        }
      }

      // Si ya conseguimos una coincidencia muy buena, paramos
      if (best && best.score >= 180) {
        break;
      }
    }

    if (!best) {
      return NextResponse.json({
        ok: false,
        result: null,
        error: "No se encontró una coincidencia confiable",
      });
    }

    const lat = Number(best.item.lat);
    const lng = Number(best.item.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({
        ok: false,
        result: null,
        error: "Respuesta inválida del geocoder",
      });
    }

    const result: GeocodeResult = { lat, lng };

    return NextResponse.json({
      ok: true,
      result,
      meta: {
        displayName: best.item.display_name ?? "",
        matchedCity: getAddressLocality(best.item),
        matchedDepartment: getAddressDepartment(best.item),
        score: best.score,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        result: null,
        error: String(error?.message || "Geocoding failed"),
      },
      { status: 500 }
    );
  }
}