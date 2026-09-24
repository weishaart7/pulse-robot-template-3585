-- Distingue une libéralité actée d'une libéralité en projet/simulée,
-- nécessaire pour l'alerte #15 (une donation en projet ne doit pas être
-- traitée comme un acte réalisé par les calculs de réserve/DMTG existants).
-- DEFAULT 'acte' backfille les lignes existantes sans rien casser.
ALTER TABLE public.liberalites
  ADD COLUMN statut TEXT NOT NULL DEFAULT 'acte' CHECK (statut IN ('acte', 'projet'));
