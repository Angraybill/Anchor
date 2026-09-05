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

export function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin");
  const configuredOrigin = Deno.env.get("APP_ORIGIN") || "http://localhost:5173";
  const headers: HeadersInit = {
    "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
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
