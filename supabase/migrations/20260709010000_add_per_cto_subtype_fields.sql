-- Sous-type descriptif pour les actifs PER (Bancaire / Assurantiel) et
-- champs CTO multi-actifs (sous-jacent réel pour les CTO ne détenant pas
-- que des actions/obligations classiques). Champs purement descriptifs
-- pour sous_type_per (aucun impact calculatoire) ; cto_multi_actifs /
-- cto_nature_sous_jacent influencent le régime fiscal appliqué côté client.
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS sous_type_per text,
  ADD COLUMN IF NOT EXISTS cto_multi_actifs boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cto_nature_sous_jacent text;

ALTER TABLE public.assets
  ADD CONSTRAINT assets_sous_type_per_check
  CHECK (sous_type_per IS NULL OR sous_type_per IN ('Bancaire', 'Assurantiel'));

ALTER TABLE public.assets
  ADD CONSTRAINT assets_cto_nature_sous_jacent_check
  CHECK (cto_nature_sous_jacent IS NULL OR cto_nature_sous_jacent IN (
    'SCPI', 'Cryptomonnaies', 'Or / métaux précieux', 'Private equity (FCPR/FPCI)'
  ));
