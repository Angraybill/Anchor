export const allowedLandmarks = [
  "North Campus Library entrance",
  "Campus Core transit stop",
  "Downtown transit plaza",
  "Airport terminal public pickup"
] as const;

export const allowedLandmarksByPickupZone: Readonly<Record<string, readonly string[]>> = {
  "north-campus": ["North Campus Library entrance"],
  "campus-core": ["Campus Core transit stop"],
  downtown: ["Downtown transit plaza"],
  "public-transit-hub": ["Campus Core transit stop", "Downtown transit plaza"],
  "airport-terminal": ["Airport terminal public pickup"]
};

const maxJsonBodyBytes = 1024;

export class HttpInputError extends Error {}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function readJsonBody<T>(request: Request): Promise<T> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) throw new HttpInputError("Send a JSON request body.");
  const contentLength = request.headers.get("content-length");
  if (contentLength && (!/^\d+$/.test(contentLength) || Number(contentLength) > maxJsonBodyBytes)) {
    throw new HttpInputError("Request body is too large.");
  }
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new HttpInputError("Send a JSON request body.");
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxJsonBodyBytes) {
        await reader.cancel();
        throw new HttpInputError("Request body is too large.");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  } catch (error) {
    if (error instanceof HttpInputError) throw error;
    throw new HttpInputError("Send valid JSON.");
  }
}

export function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin");
  const configuredOrigin = Deno.env.get("APP_ORIGIN") || "http://localhost:5173";
  const headers: HeadersInit = {
    "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "Vary": "Origin"
  };
  if (origin === configuredOrigin) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

export function rejectUnexpectedOrigin(request: Request): Response | null {
  const origin = request.headers.get("origin");
  const configuredOrigin = Deno.env.get("APP_ORIGIN") || "http://localhost:5173";
  if (origin && origin !== configuredOrigin) {
    return new Response(JSON.stringify({ error: "Origin is not allowed." }), { status: 403, headers: corsHeaders(request) });
  }
  return null;
}

export function json(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(request) });
}
