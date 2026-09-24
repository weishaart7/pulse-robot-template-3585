-- Contrainte CHECK sur ifi_passifs_deductions.type_passif : restreint aux 7 catégories
-- exposées par le formulaire (AjouterPassifForm.tsx / IFI_PASSIF_CATEGORIES).
-- Vérifié au préalable : seules 'emprunt-rp' et 'autres-impots' existent en base, toutes deux valides.
ALTER TABLE ifi_passifs_deductions
  ADD CONSTRAINT ifi_passifs_deductions_type_passif_check
  CHECK (type_passif IN (
    'emprunt-rp',
    'autre-emprunt',
    'dette-travaux',
    'dette-bois-forets',
    'dette-biens-ruraux',
    'dette-gfa-gaf',
    'autres-impots'
  ));
