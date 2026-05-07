//app\api\buyer\[...path]\route.ts
import { NextRequest } from "next/server";

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

async function proxy(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const targetUrl = buildTargetUrl(req, path || []);

  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.set("x-ct-app", "buyer");

  const method = req.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";

  const body = hasBody ? await req.arrayBuffer() : undefined;

  const res = await fetch(targetUrl, {
    method,
    headers,
    body,
    cache: "no-store",
  });

  const responseHeaders = new Headers(res.headers);

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: responseHeaders,
  });
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