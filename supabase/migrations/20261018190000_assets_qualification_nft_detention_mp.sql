-- Objets numériques (NFT) : qualification fiscale de l'objet ; matières premières : mode de
-- détention (physique = bien meuble, financière = PFU) — 2026-10-18. Nullables, sans défaut.
alter table public.assets
  add column if not exists qualification_nft text
    check (qualification_nft in ('actif_numerique', 'titre_financier', 'oeuvre_art', 'bien_meuble')),
  add column if not exists detention_matieres_premieres text
    check (detention_matieres_premieres in ('financiere', 'physique'));
