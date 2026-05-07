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
  const normRaw = cleanPart(raw);

  const queries: string[] = [];

  if (!parts.length) {
    return [];
  }

  // Detectar cola tipo: dirección, complemento, ciudad, departamento, país
  const country = parts.length >= 1 ? parts[parts.length - 1] : "";
  const department = parts.length >= 2 ? parts[parts.length - 2] : "";
  const city = parts.length >= 3 ? parts[parts.length - 3] : "";

  const head = parts.slice(0, Math.max(0, parts.length - 3));
  const mainAddress = head[0] ?? parts[0] ?? "";
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

  // normalizar separadores colombianos
  if (mainAddress && cityDeptCountry) {
    queries.push(`${mainAddress.replace(/\s*-\s*/g, " # ")}, ${cityDeptCountry}`);
    queries.push(
      `${mainAddress
        .replace(/\bCra\b/gi, "Carrera")
        .replace(/\bCl\b/gi, "Calle")
        .replace(/\bKr\b/gi, "Carrera")
        .replace(/\bAv\b/gi, "Avenida")}, ${cityDeptCountry}`
    );
  }

  // fallback por ciudad/departamento
  if (mainAddress && city) {
    queries.push(`${mainAddress}, ${city}, Colombia`);
  }

  if (mainAddress && department) {
    queries.push(`${mainAddress}, ${department}, Colombia`);
  }

  // por si la consulta ya viene rara
  queries.push(normRaw.replace(/\s*-\s*/g, " # "));

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

export async function GET(req: NextRequest) {
  try {
    const q = cleanPart(req.nextUrl.searchParams.get("q") || "");
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