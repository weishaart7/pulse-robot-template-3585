-- Date d'échéance facultative d'une dette (« À payer avant le »). Informative, hors calculs.
-- Les prêts (familial ou entre particuliers, patronal, participatif) passent dans emprunts :
-- vérifié avant migration, aucune ligne de passifs ne portait ces natures.
ALTER TABLE public.passifs ADD COLUMN IF NOT EXISTS date_echeance date;
