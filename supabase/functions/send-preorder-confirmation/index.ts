const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("CONFIRMATION_FROM_EMAIL") ?? "Medalling <info@medailledesign.nl>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  if (!RESEND_API_KEY) {
    return new Response("RESEND_API_KEY is not configured", { status: 500, headers: corsHeaders });
  }

  const payload = await req.json();
  const to = String(payload.to ?? "").trim();
  const fname = String(payload.fname ?? "").trim();
  const design = String(payload.design ?? "Medalling design").trim();

  if (!to || !to.includes("@")) {
    return new Response("Valid recipient email is required", { status: 400, headers: corsHeaders });
  }

  const greeting = fname ? `Hoi ${fname},` : "Hoi,";
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
      to,
      subject: "Bevestiging van je Medalling pre-order",
      html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return new Response(errorText, { status: response.status, headers: corsHeaders });
  }

  return new Response(await response.text(), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
});
