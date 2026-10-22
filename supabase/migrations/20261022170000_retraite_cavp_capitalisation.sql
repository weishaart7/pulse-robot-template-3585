-- Pharmaciens (CAVP) : capital acquis dans le volet par capitalisation du
-- régime complémentaire, lu sur l'extrait de compte CAVP
-- (cf. src/lib/retraite/calculCAVPCapitalisation.ts).
ALTER TABLE public.retraite_data
  ADD COLUMN cavp_capital_capitalisation NUMERIC CHECK (cavp_capital_capitalisation IS NULL OR cavp_capital_capitalisation >= 0);
