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

function getBlockedCorsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
    "X-Blocked-Origin": origin ?? "none",
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

async function sendEmail(to: string, subject: string, html: string, text: string) {
  if (!RESEND_API_KEY) {
    return { skipped: true, reason: "RESEND_API_KEY is not configured." };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

async function sendPreorderConfirmationEmail(payload: Required<PreorderPayload>) {
  const greeting = payload.fname ? `Hoi ${escapeHtml(payload.fname)},` : "Hoi,";
  const design = escapeHtml(payload.design);
  const logoUrl = `${SITE_URL}/images/Medalling_logo.jpeg`;
  const designUrl = `${SITE_URL}/images/Medalling_lights.png`;
  const designPageUrl = `${SITE_URL}/pages/Acryl_design.html`;
  const html = `
    <!doctype html>
    <html lang="nl">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="color-scheme" content="light dark">
        <meta name="supported-color-schemes" content="light dark">
        <title>Bevestiging van je Medalling pre-order</title>
        <style>
          :root {
            color-scheme: light dark;
            supported-color-schemes: light dark;
          }

          @media only screen and (max-width: 560px) {
            .email-shell {
              padding: 16px 10px !important;
            }

            .email-card {
              border-radius: 16px !important;
            }

            .email-section {
              padding-left: 20px !important;
              padding-right: 20px !important;
            }

            .design-card,
            .design-card-row,
            .design-card-media,
            .design-card-body {
              display: block !important;
              width: 100% !important;
            }

            .design-card-media img {
              width: 100% !important;
              max-width: 100% !important;
            }

            .design-card-body {
              padding: 18px 18px 20px !important;
              box-sizing: border-box !important;
            }

            .design-card-title {
              font-size: 21px !important;
            }

            .design-card-text {
              font-size: 15px !important;
              line-height: 1.58 !important;
            }
          }

          @media (prefers-color-scheme: dark) {
            body {
              background: #171411 !important;
              color: #e7d8c8 !important;
            }

            .email-shell {
              background: #171411 !important;
            }

            .email-card {
              background: #241f1a !important;
              border-color: rgba(255, 250, 244, 0.16) !important;
            }

            .design-card {
              background: #302820 !important;
              border-color: rgba(255, 250, 244, 0.14) !important;
            }

            .email-kicker {
              color: #d4ad55 !important;
            }

            .email-text,
            .design-card-text {
              color: #e7d8c8 !important;
            }

            .email-strong,
            .design-card-title {
              color: #fff6e8 !important;
            }

            .email-footer {
              background: #3d332b !important;
            }

            .email-footer-text {
              color: rgba(255, 250, 244, 0.86) !important;
            }
          }
        </style>
      </head>
      <body style="margin:0; padding:0; background:#f6f1e8; color:#4f3f35; font-family:Inter, Arial, sans-serif;">
        <table class="email-shell" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f1e8; padding:28px 12px;">
          <tr>
            <td align="center">
              <table class="email-card" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px; overflow:hidden; background:#fffaf4; border:1px solid rgba(79,63,53,0.14); border-radius:20px;">
                <tr>
                  <td class="email-section" style="padding:30px 30px 18px;">
                    <p class="email-kicker" style="margin:0 0 10px; color:#b8913f; font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;">Pre-order bevestigd</p>
                  </td>
                </tr>
                <tr>
                  <td class="email-section" style="padding:0 30px 24px;">
                    <p class="email-strong" style="margin:0 0 14px; color:#4f3f35; font-size:16px; line-height:1.6;">${greeting}</p>
                    <p class="email-text" style="margin:0 0 14px; color:#725f53; font-size:16px; line-height:1.6;">
                      Bedankt voor je pre-order bij Medalling. Je staat op de lijst voor het <strong class="email-strong" style="color:#4f3f35;">${design}</strong>.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td class="email-section" style="padding:0 30px 26px;">
                    <table class="design-card" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3ecdf; border:1px solid rgba(79,63,53,0.12); border-radius:18px; overflow:hidden;">
                      <tr class="design-card-row">
                        <td class="design-card-media" width="260" valign="top" style="padding:0;">
                          <a href="${designPageUrl}" style="text-decoration:none;">
                            <img src="${designUrl}" alt="Modern medaillehouder design voor een marathon medaille of andere sport medaille" width="260" style="display:block; width:100%; max-width:260px; height:auto;">
                          </a>
                        </td>
                        <td class="design-card-body" valign="top" style="padding:22px 22px 20px;">
                          <h2 class="design-card-title" style="margin:0 0 10px; color:#4f3f35; font-family:Georgia, 'Times New Roman', serif; font-size:22px; line-height:1.2;">Acryl design</h2>
                          <p class="design-card-text" style="margin:0; color:#725f53; font-size:15px; line-height:1.6;">
                            Het design is gemaakt van hoogwaardig acryl en beukenhout, met een LED-lamp die je medaille en route tot leven brengt. Het ontwerp combineert je medaille met de gelopen route met bovenaanzicht van de stad erin verwerkt.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td class="email-section" style="padding:0 30px 30px;">
                    <p class="email-text" style="margin:0; color:#725f53; font-size:16px; line-height:1.6;">
                      We houden je op de hoogte wanneer het product gereed is om de mogelijkheid te krijgen om het te bestellen. Hierin volgt dan ook de leverdatum.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td class="email-section email-footer" style="padding:24px 30px 26px; background:#4f3f35;">
                    <p class="email-footer-text" style="margin:0 0 14px; color:#fffaf4; font-size:14px; line-height:1.55;">Sportieve groet,<br><strong>Team Medalling</strong></p>
                    <img src="${logoUrl}" width="132" alt="Medalling logo" style="display:block; width:132px; max-width:132px; height:auto; margin:0 0 12px; border-radius:10px;">
                    <p class="email-footer-text" style="margin:0; color:rgba(255,250,244,0.82); font-size:13px; line-height:1.5;">Unieke medaillehouders die sportprestaties zichtbaar maken.</p>
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

Bedankt voor je pre-order bij Medalling. Je staat op de lijst voor het ${payload.design}.

Acryl design
Het design is gemaakt van hoogwaardig acryl en beukenhout, met een LED-lamp die je medaille en route tot leven brengt. Het ontwerp combineert je medaille met de gelopen route met bovenaanzicht van de stad erin verwerkt.

We houden je op de hoogte wanneer het product gereed is om de mogelijkheid te krijgen om het te bestellen. Hierin volgt dan ook de leverdatum.

Bekijk het design: ${designPageUrl}

Sportieve groet,
Team Medalling`;

  return sendEmail(payload.email, "Bevestiging van je Medalling pre-order", html, text);
}

async function sendNewsletterConfirmationEmail(payload: Required<PreorderPayload>) {
  const greeting = payload.fname ? `Hoi ${escapeHtml(payload.fname)},` : "Hoi,";
  const logoUrl = `${SITE_URL}/images/Medalling_logo.jpeg`;
  const html = `
    <!doctype html>
    <html lang="nl">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="color-scheme" content="light dark">
        <meta name="supported-color-schemes" content="light dark">
        <title>Bevestiging nieuwsbrief Medalling</title>
        <style>
          :root {
            color-scheme: light dark;
            supported-color-schemes: light dark;
          }

          @media only screen and (max-width: 560px) {
            .email-shell {
              padding: 16px 10px !important;
            }

            .email-card {
              border-radius: 16px !important;
            }

            .email-section {
              padding-left: 20px !important;
              padding-right: 20px !important;
            }
          }

          @media (prefers-color-scheme: dark) {
            body {
              background: #171411 !important;
              color: #e7d8c8 !important;
            }

            .email-shell {
              background: #171411 !important;
            }

            .email-card {
              background: #241f1a !important;
              border-color: rgba(255, 250, 244, 0.16) !important;
            }

            .email-kicker {
              color: #d4ad55 !important;
            }

            .email-text {
              color: #e7d8c8 !important;
            }

            .email-strong {
              color: #fff6e8 !important;
            }

            .email-footer {
              background: #3d332b !important;
            }

            .email-footer-text {
              color: rgba(255, 250, 244, 0.86) !important;
            }
          }
        </style>
      </head>
      <body style="margin:0; padding:0; background:#f6f1e8; color:#4f3f35; font-family:Inter, Arial, sans-serif;">
        <table class="email-shell" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f1e8; padding:28px 12px;">
          <tr>
            <td align="center">
              <table class="email-card" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px; overflow:hidden; background:#fffaf4; border:1px solid rgba(79,63,53,0.14); border-radius:20px;">
                <tr>
                  <td class="email-section" style="padding:30px;">
                    <p class="email-kicker" style="margin:0 0 10px; color:#b8913f; font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;">Nieuwsbrief</p>
                    <p class="email-strong" style="margin:0 0 14px; color:#4f3f35; font-size:16px; line-height:1.6;">${greeting}</p>
                    <p class="email-text" style="margin:0; color:#725f53; font-size:16px; line-height:1.6;">
                      Bedankt voor het aanmelden voor de nieuwsbrief. Wanneer we een speciale mededeling hebben, ben jij de eerste die het hoort.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td class="email-section email-footer" style="padding:24px 30px 26px; background:#4f3f35;">
                    <p class="email-footer-text" style="margin:0 0 14px; color:#fffaf4; font-size:14px; line-height:1.55;">Met sportieve groet,<br><strong>Team Medalling</strong></p>
                    <img src="${logoUrl}" width="132" alt="Medalling logo" style="display:block; width:132px; max-width:132px; height:auto; margin:0; border-radius:10px;">
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

Bedankt voor het aanmelden voor de nieuwsbrief. Wanneer we een speciale mededeling hebben, ben jij de eerste die het hoort.

Met sportieve groet,
Team Medalling`;

  return sendEmail(payload.email, "Je bent aangemeld voor de Medalling nieuwsbrief", html, text);
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
    if (hasBlockedOrigin) {
      return new Response("Origin not allowed", { status: 403, headers: getBlockedCorsHeaders(origin) });
    }

    return new Response("ok", { headers: getCorsHeaders(origin) });
  }

  if (hasBlockedOrigin) {
    return new Response(JSON.stringify({ error: "Origin not allowed", origin }), {
      status: 403,
      headers: {
        ...getBlockedCorsHeaders(origin),
        "Content-Type": "application/json",
      },
    });
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
    const email: {
      preorder: unknown;
      newsletter?: unknown;
    } = {
      preorder: null,
    };

    try {
      email.preorder = await sendPreorderConfirmationEmail(payload);
    } catch (emailError) {
      email.preorder = {
        skipped: true,
        reason: getErrorMessage(emailError),
      };
      console.warn("Preorder saved, but preorder confirmation email failed:", email.preorder);
    }

    if (payload.newsletter) {
      try {
        email.newsletter = await sendNewsletterConfirmationEmail(payload);
      } catch (emailError) {
        email.newsletter = {
          skipped: true,
          reason: getErrorMessage(emailError),
        };
        console.warn("Preorder saved, but newsletter confirmation email failed:", email.newsletter);
      }
    }

    return jsonResponse({ preorder, email }, 200, origin);
  } catch (error) {
    const message = getErrorMessage(error);
    return jsonResponse({ error: message, message }, 500, origin);
  }
});
