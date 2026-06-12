-- Voer dit uit in Supabase → SQL Editor

-- Maak de orders tabel aan (los van de bestaande preorders tabel)
CREATE TABLE IF NOT EXISTS public.orders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  klant_naam    text,
  voornaam      text NOT NULL,
  achternaam    text NOT NULL,
  email         text NOT NULL,
  adres         text NOT NULL,
  postcode      text NOT NULL,
  plaats        text NOT NULL,
  totaal        numeric(10,2) NOT NULL,
  betaalmethode text NOT NULL CHECK (betaalmethode IN ('tikkie','overboeking')),
  status        text NOT NULL DEFAULT 'nieuw' CHECK (status IN ('nieuw','betaling_afwachting','betaald','verzonden')),
  created_at    timestamptz DEFAULT now()
);

-- RLS inschakelen
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Iedereen mag een order aanmaken (anon en authenticated)
DROP POLICY IF EXISTS "orders_insert_anon" ON public.orders;
CREATE POLICY "orders_insert_anon" ON public.orders
  FOR INSERT TO anon WITH CHECK (true);

-- Iedereen mag orders lezen (klant bekijkt eigen order via ID)
DROP POLICY IF EXISTS "orders_select_anon" ON public.orders;
CREATE POLICY "orders_select_anon" ON public.orders
  FOR SELECT TO anon USING (true);

-- Iedereen mag status updaten (klant klikt "ik heb betaald")
DROP POLICY IF EXISTS "orders_update_anon" ON public.orders;
CREATE POLICY "orders_update_anon" ON public.orders
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Zorg dat producten tabel bestaat (voor de shop pagina)
CREATE TABLE IF NOT EXISTS public.producten (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  naam         text NOT NULL,
  prijs        numeric(10,2) NOT NULL,
  beschrijving text,
  actief       boolean DEFAULT true
);

ALTER TABLE public.producten ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "producten_select_anon" ON public.producten;
CREATE POLICY "producten_select_anon" ON public.producten
  FOR SELECT TO anon USING (actief = true);

-- Voeg het product in als de tabel leeg is
INSERT INTO public.producten (naam, prijs, beschrijving)
SELECT 'Medalling acryl medaillehouder', 34.98,
  'Vrijstaand design van acryl en beukenhout met warme LED-verlichting. De route van jouw marathon wordt verwerkt in het acryl.'
WHERE NOT EXISTS (SELECT 1 FROM public.producten);
