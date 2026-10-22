-- Statut actuel de la personne : oriente la projection de carrière vers les
-- bons régimes (cf. src/lib/retraite/projectionStatut.ts). Défaut
-- `salarie_prive` = comportement antérieur (tout au régime général).
ALTER TABLE public.retraite_data
  ADD COLUMN statut_actuel TEXT NOT NULL DEFAULT 'salarie_prive'
    CHECK (statut_actuel IN (
      'salarie_prive', 'contractuel_public', 'fonctionnaire', 'liberal',
      'independant_ssi', 'avocat_cnbf', 'artiste_auteur'
    )),
  -- Caisse complémentaire d'un libéral (CARMF, CIPAV, CAVEC…), utilisée en phase 3.2.
  ADD COLUMN caisse_liberale TEXT,
  -- Primes annuelles d'un fonctionnaire : assiette de la RAFP (plafonnée à 20 % du TIB).
  ADD COLUMN primes_annuelles_fp NUMERIC;
