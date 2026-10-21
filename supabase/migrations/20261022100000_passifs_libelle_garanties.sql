-- Libellé facultatif des dettes (distinguer deux dettes de même nature).
ALTER TABLE public.passifs ADD COLUMN IF NOT EXISTS libelle text;

-- Garanties d'emprunt complétées : privilège de prêteur de deniers et caution d'un organisme.
-- Vérifié avant migration : seules des valeurs conservées existent en base.
ALTER TABLE public.emprunts DROP CONSTRAINT IF EXISTS emprunts_type_garantie_check;
ALTER TABLE public.emprunts ADD CONSTRAINT emprunts_type_garantie_check CHECK (
  type_garantie IS NULL OR type_garantie = ANY (ARRAY[
    'Hypothèque', 'Privilège de prêteur de deniers', 'Caution', 'Caution d''un organisme', 'Nantissement', 'Aucune'
  ])
);
