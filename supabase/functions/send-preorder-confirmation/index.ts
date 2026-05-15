/// <reference lib="deno.ns" />

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("CONFIRMATION_FROM_EMAIL") ?? "Medalling <info@medailledesign.nl>";
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "https://medailledesign.nl,https://www.medailledesign.nl")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

type PreorderPayload = {
  fname?: string;
  lname?: string;
  email?: string;
  design?: string;
  newsletter?: boolean;
};

function jsonResponse(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(origin),
      "Content-Type": "application/json",
    },
  });
}

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function savePreorder(payload: Required<PreorderPayload>) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase environment variables are not configured.");
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/preorders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "apikey": SUPABASE_SERVICE_ROLE_KEY,
      "Prefer": "return=representation",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

async function sendConfirmationEmail(payload: Required<PreorderPayload>) {
  if (!RESEND_API_KEY) {
    return { skipped: true, reason: "RESEND_API_KEY is not configured." };
  }

  const greeting = payload.fname ? `Hoi ${escapeHtml(payload.fname)},` : "Hoi,";
  const design = escapeHtml(payload.design);
  const html = `
    <p>${greeting}</p>
    <p>Bedankt voor je pre-order bij Medalling. Je staat op de lijst voor het ${design}.</p>
    <p>We houden je op de hoogte van productie, levering en de volgende stap.</p>
    <p>Sportieve groet,<br>Team Medalling</p>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: payload.email,
      subject: "Bevestiging van je Medalling pre-order",
      html,
    }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const hasBlockedOrigin = origin && !ALLOWED_ORIGINS.includes(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(origin) });
  }

  if (hasBlockedOrigin) {
    return jsonResponse({ error: "Origin not allowed" }, 403, origin);
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, origin);
  }

  try {
    const body = await req.json() as PreorderPayload;
    const payload: Required<PreorderPayload> = {
      fname: cleanText(body.fname),
      lname: cleanText(body.lname),
      email: cleanText(body.email),
      design: cleanText(body.design || "Acryl design"),
      newsletter: Boolean(body.newsletter),
    };

    if (!payload.fname || !payload.lname || !payload.email.includes("@") || !payload.design) {
      return jsonResponse({ error: "Vul alle verplichte velden correct in." }, 400, origin);
    }

    const preorder = await savePreorder(payload);
    const email = await sendConfirmationEmail(payload);

    return jsonResponse({ preorder, email }, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Onbekende fout.";
    return jsonResponse({ error: message }, 500, origin);
  }
});
