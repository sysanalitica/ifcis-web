import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.2";

const cors = (origin: string) => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
});

const json = (origin: string, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors(origin) });

const clean = (value: unknown, max: number) =>
  String(value ?? "").trim().slice(0, max);

Deno.serve(async (request) => {
  const origin = request.headers.get("origin") || "";
  const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);

  if (!allowedOrigins.includes(origin)) {
    return json(origin || "null", { error: "Origen no autorizado." }, 403);
  }
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors(origin) });
  }
  if (request.method !== "POST") {
    return json(origin, { error: "Método no permitido." }, 405);
  }

  try {
    const contentLength = Number(request.headers.get("content-length") || "0");
    if (contentLength > 12_000) return json(origin, { error: "Solicitud demasiado grande." }, 413);

    const body = await request.json();

    // Honeypot: bots commonly fill hidden fields.
    if (clean(body.website, 100)) return json(origin, { success: true }, 200);

    const kind = clean(body.kind, 20);
    const fullName = clean(body.fullName || body.name, 120);
    const email = clean(body.email, 200).toLowerCase();
    const phone = clean(body.phone, 40);
    const course = clean(body.course, 150);
    const message = clean(body.notes || body.message, 2000);
    const source = clean(body.source, 300);

    if (!["registration", "contact"].includes(kind)) return json(origin, { error: "Tipo inválido." }, 400);
    if (fullName.length < 2) return json(origin, { error: "Nombre inválido." }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(origin, { error: "Email inválido." }, 400);
    if (kind === "registration" && !course) return json(origin, { error: "Seleccioná un curso." }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const salt = Deno.env.get("RATE_LIMIT_SALT") || "configure-a-long-random-salt";
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`${salt}:${ip}`)
    );
    const ipHash = Array.from(new Uint8Array(digest))
      .map(byte => byte.toString(16).padStart(2, "0"))
      .join("");

    const { data: allowed, error: rateError } = await db.rpc("consume_lead_rate_limit", {
      p_ip_hash: ipHash
    });
    if (rateError) throw rateError;
    if (!allowed) return json(origin, { error: "Demasiados intentos. Probá nuevamente más tarde." }, 429);

    const { error } = await db.from("leads").insert({
      kind,
      full_name: fullName,
      email,
      phone,
      course,
      message,
      source
    });
    if (error) throw error;

    return json(origin, { success: true }, 201);
  } catch (error) {
    console.error(error);
    return json(origin, { error: "No se pudo registrar la consulta." }, 500);
  }
});
