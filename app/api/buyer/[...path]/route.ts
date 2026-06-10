//app\api\buyer\[...path]\route.ts
import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API || "http://localhost:3004";

function buildTargetUrl(req: NextRequest, pathParts: string[]) {
  const path = pathParts.join("/");
  const url = new URL(req.url);
  const target = new URL(`${API_BASE.replace(/\/$/, "")}/${path}`);

  url.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });

  return target.toString();
}

function buildProxyHeaders(sourceHeaders: Headers) {
  const headers = new Headers(sourceHeaders);

  headers.delete("content-encoding");
  headers.delete("content-length");
  headers.delete("transfer-encoding");
  headers.delete("connection");
  headers.delete("keep-alive");
  headers.delete("proxy-authenticate");
  headers.delete("proxy-authorization");
  headers.delete("te");
  headers.delete("trailer");
  headers.delete("upgrade");

  // Vercel/Next puede combinar Set-Cookie si se copia como un header normal.
  // Lo eliminamos aquí y lo agregamos cookie por cookie más abajo.
  headers.delete("set-cookie");

  return headers;
}

function splitSetCookieHeader(raw: string) {
  return String(raw || "")
    .split(/,(?=\s*[^;,]+=)/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

function getSetCookieHeaders(headers: Headers) {
  const h = headers as Headers & { getSetCookie?: () => string[] };

  if (typeof h.getSetCookie === "function") {
    return h.getSetCookie();
  }

  const raw = headers.get("set-cookie");
  if (!raw) return [];

  return splitSetCookieHeader(raw);
}

async function proxy(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const targetUrl = buildTargetUrl(req, path || []);

  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("content-length");
  headers.set("x-ct-app", "buyer");

  const method = req.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";
  const body = hasBody ? await req.arrayBuffer() : undefined;

  const upstream = await fetch(targetUrl, {
    method,
    headers,
    body,
    cache: "no-store",
  });

  const responseHeaders = buildProxyHeaders(upstream.headers);
  const responseBody = await upstream.arrayBuffer();

  const response = new NextResponse(responseBody, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });

  for (const cookie of getSetCookieHeaders(upstream.headers)) {
    response.headers.append("set-cookie", cookie);
  }

  return response;
}

export async function GET(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(req, context);
}

export async function POST(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(req, context);
}

export async function PUT(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(req, context);
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(req, context);
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(req, context);
}

export async function OPTIONS(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(req, context);
}
