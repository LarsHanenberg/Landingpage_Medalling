import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { order_id } = await req.json();
    if (!order_id) throw new Error('order_id ontbreekt');

    // Supabase client met service role key (server-side)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Haal order op
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (error || !order) throw new Error('Order niet gevonden');

    const shortId = order.id.slice(0, 8).toUpperCase();
    const naam = order.klant_naam || `${order.voornaam} ${order.achternaam}`;
    const totaal = Number(order.totaal).toFixed(2).replace('.', ',');
    const isTikkie = order.betaalmethode === 'tikkie';

    // Betaalinstructies per methode
    const betaalInstructies = isTikkie
      ? `
        <p>Je hebt gekozen voor betaling via <strong>Tikkie</strong>.</p>
        <p>
          <a href="https://tikkie.me/pay/TODO" style="display:inline-block;padding:12px 24px;background:#c8a44d;color:#fff;border-radius:12px;font-weight:700;text-decoration:none">
            Betaal €${totaal} via Tikkie
          </a>
        </p>
        <p style="color:#7a6355">Of stuur een WhatsApp-bericht naar <strong>+31 6 12 34 56 78</strong> met je ordernummer.</p>
      `
      : `
        <p>Je hebt gekozen voor betaling via <strong>bankoverschrijving</strong>.</p>
        <table style="border-collapse:collapse;width:100%;max-width:360px">
          <tr><td style="padding:8px 0;color:#7a6355">IBAN</td><td style="padding:8px 0;font-weight:700">NL00 INGB 0000 0000 00</td></tr>
          <tr><td style="padding:8px 0;color:#7a6355">Bedrag</td><td style="padding:8px 0;font-weight:700">€${totaal}</td></tr>
          <tr><td style="padding:8px 0;color:#7a6355">Omschrijving</td><td style="padding:8px 0;font-weight:700">Medalling-${shortId}</td></tr>
        </table>
      `;

    // E-mail via Resend
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) throw new Error('RESEND_API_KEY niet ingesteld in Supabase Secrets');

    const FROM_EMAIL = 'larshanenberg03@gmail.com';

    const emailHtml = `
<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:Inter,sans-serif;background:#f7f2ea;color:#5a463a">
  <div style="max-width:560px;margin:32px auto;background:#fffaf4;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(90,70,58,0.1)">
    <div style="background:linear-gradient(135deg,#211a16,#3a2d25);padding:32px 36px;text-align:center">
      <h1 style="color:#fff8f0;font-size:1.6rem;margin:0">Medalling</h1>
      <p style="color:rgba(255,248,240,0.7);margin:6px 0 0;font-size:0.9rem">Jouw prestatie verdient een vaste plek</p>
    </div>
    <div style="padding:32px 36px">
      <h2 style="color:#5a463a;margin:0 0 8px">Bedankt voor je bestelling, ${naam.split(' ')[0]}!</h2>
      <p style="color:#7a6355">We hebben je bestelling ontvangen en staan klaar om hem te verwerken.</p>

      <div style="background:#f7f2ea;border-radius:14px;padding:20px;margin:20px 0">
        <p style="margin:0 0 6px;font-size:0.82rem;color:#7a6355;text-transform:uppercase;letter-spacing:.06em">Ordernummer</p>
        <p style="margin:0;font-size:1.2rem;font-weight:800;color:#5a463a">Medalling-${shortId}</p>
      </div>

      <h3 style="color:#5a463a;margin:20px 0 12px">Betaalinstructies</h3>
      ${betaalInstructies}

      <div style="margin-top:24px;padding-top:20px;border-top:1px solid rgba(90,70,58,0.12)">
        <p style="font-size:0.85rem;color:#7a6355;margin:0 0 12px">Wil je de status van je bestelling bekijken?</p>
        <a href="https://medailledesign.nl/pages/order-status.html?id=${order.id}"
           style="display:inline-block;padding:12px 24px;background:#c8a44d;color:#fff;border-radius:12px;font-weight:700;text-decoration:none;font-size:0.9rem">
          Bekijk orderstatus →
        </a>
      </div>
    </div>
    <div style="padding:20px 36px;background:rgba(90,70,58,0.06);text-align:center">
      <p style="font-size:0.8rem;color:#7a6355;margin:0">
        Vragen? Mail naar <a href="mailto:info.medailledesign@gmail.com" style="color:#c8a44d">info.medailledesign@gmail.com</a>
      </p>
    </div>
  </div>
</body>
</html>
    `;

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Medalling <${FROM_EMAIL}>`,
        to: [order.email],
        subject: `Bestelling ontvangen — Medalling-${shortId}`,
        html: emailHtml,
      }),
    });

    if (!resendRes.ok) {
      const err = await resendRes.text();
      throw new Error('Resend fout: ' + err);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
