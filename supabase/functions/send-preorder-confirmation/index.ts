/// <reference lib="deno.ns" />

const PROJECT_URL = Deno.env.get("PROJECT_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("CONFIRMATION_FROM_EMAIL") ?? "Medalling <info@medailledesign.nl>";
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://medailledesign.nl";
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "https://medailledesign.nl,https://www.medailledesign.nl,http://localhost:5500,http://127.0.0.1:5500,http://localhost:5173,http://127.0.0.1:5173")
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
  if (!PROJECT_URL || !SERVICE_ROLE_KEY) {
    throw new Error("Supabase environment variables are not configured.");
  }

  const response = await fetch(`${PROJECT_URL}/rest/v1/preorders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      "apikey": SERVICE_ROLE_KEY,
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
  const logoUrl = `${SITE_URL}/images/Medalling-removebg.png`;
  const designUrl = `${SITE_URL}/images/Medalling_lights.png`;
  const designPageUrl = `${SITE_URL}/pages/Acryl_design.html`;
  const contactUrl = `${SITE_URL}/#contact`;
  const html = `
    <!doctype html>
    <html lang="nl">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Bevestiging van je Medalling pre-order</title>
      </head>
      <body style="margin:0; padding:0; background:#f7f2ea; color:#5a463a; font-family:Inter, Arial, sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f2ea; padding:28px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px; overflow:hidden; background:#fffaf4; border:1px solid rgba(90,70,58,0.14); border-radius:22px;">
                <tr>
                  <td style="padding:28px 28px 18px;">
                    <img src="${logoUrl}" width="88" alt="Medalling" style="display:block; width:88px; max-width:88px; height:auto; margin:0 0 18px;">
                    <p style="margin:0 0 8px; color:#c8a44d; font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;">Pre-order bevestigd</p>
                    <h1 style="margin:0; color:#5a463a; font-family:Georgia, 'Times New Roman', serif; font-size:32px; line-height:1.12;">Je staat op de lijst</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 28px 22px;">
                    <p style="margin:0 0 14px; color:#5a463a; font-size:16px; line-height:1.6;">${greeting}</p>
                    <p style="margin:0 0 14px; color:#7a6355; font-size:16px; line-height:1.6;">
                      Bedankt voor je pre-order bij Medalling. We hebben je aanvraag voor het <strong style="color:#5a463a;">${design}</strong> ontvangen.
                    </p>
                    <p style="margin:0; color:#7a6355; font-size:16px; line-height:1.6;">
                      Zodra er meer informatie is over productie, levering en de volgende stap, nemen we contact met je op.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 28px 24px;">
                    <img src="${designUrl}" alt="Acryl design van Medalling" width="584" style="display:block; width:100%; max-width:584px; height:auto; border-radius:18px; border:1px solid rgba(90,70,58,0.12);">
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 28px 24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f2ea; border:1px solid rgba(90,70,58,0.12); border-radius:16px;">
                      <tr>
                        <td style="padding:18px;">
                          <p style="margin:0 0 6px; color:#5a463a; font-size:14px; font-weight:700;">Jouw pre-order</p>
                          <p style="margin:0; color:#7a6355; font-size:14px; line-height:1.55;">
                            Product: ${design}<br>
                            Status: ontvangen<br>
                            Betaling: nog niet nodig
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 28px 30px;">
                    <a href="${designPageUrl}" style="display:inline-block; padding:13px 20px; background:#c8a44d; color:#ffffff; border-radius:14px; font-size:15px; font-weight:700; text-decoration:none;">Bekijk het design</a>
                    <a href="${contactUrl}" style="display:inline-block; margin-left:10px; padding:13px 20px; color:#5a463a; border:1px solid rgba(90,70,58,0.22); border-radius:14px; font-size:15px; font-weight:700; text-decoration:none;">Contact</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 28px; background:#5a463a;">
                    <p style="margin:0 0 6px; color:#fffaf4; font-size:14px; font-weight:700;">Medalling</p>
                    <p style="margin:0; color:rgba(255,250,244,0.82); font-size:13px; line-height:1.5;">Unieke medaillehouders die sportprestaties zichtbaar maken.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
  const text = `${greeting}

Bedankt voor je pre-order bij Medalling. We hebben je aanvraag voor het ${payload.design} ontvangen.

Jouw pre-order:
Product: ${payload.design}
Status: ontvangen
Betaling: nog niet nodig

We nemen contact met je op zodra er meer informatie is over productie, levering en de volgende stap.

Bekijk het design: ${designPageUrl}

Sportieve groet,
Team Medalling`;

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
      text,
    }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

function getErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Onbekende fout.";
  }

  try {
    const parsed = JSON.parse(error.message);

    if (parsed && typeof parsed === "object") {
      if ("message" in parsed && typeof parsed.message === "string") {
        return parsed.message;
      }

      if ("error" in parsed && typeof parsed.error === "string") {
        return parsed.error;
      }
    }
  } catch (_) {
    // Keep the original message when it is not JSON.
  }

  return error.message;
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
    let email: unknown = null;

    try {
      email = await sendConfirmationEmail(payload);
    } catch (emailError) {
      email = {
        skipped: true,
        reason: getErrorMessage(emailError),
      };
      console.warn("Preorder saved, but confirmation email failed:", email);
    }

    return jsonResponse({ preorder, email }, 200, origin);
  } catch (error) {
    const message = getErrorMessage(error);
    return jsonResponse({ error: message, message }, 500, origin);
  }
});
