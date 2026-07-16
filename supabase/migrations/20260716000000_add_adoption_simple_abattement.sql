-- Adoption simple : abattement fiscal plein (100 000 €) par exception, art. 786 CGI.
-- Par défaut, un enfant adopté simple ne bénéficie que de l'abattement "tiers" (1 594 €).
-- Deux exceptions légales permettent l'abattement plein : adoption par le conjoint du
-- parent, ou soins et secours ininterrompus pendant au moins 5 ans durant la minorité
-- (10 ans si soins durant minorité ET majorité). L'application ne peut pas déduire
-- automatiquement qu'une exception s'applique (nécessite une décision du conseiller) :
-- ce champ n'est donc jamais calculé, seulement déclaré.
ALTER TABLE public.family_links
  ADD COLUMN IF NOT EXISTS adoption_simple_abattement_plein boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS adoption_simple_motif text;

COMMENT ON COLUMN public.family_links.adoption_simple_abattement_plein IS
  'Déclaration du conseiller : abattement enfant plein (100 000 €) malgré une adoption simple, art. 786 CGI. Jamais déduit automatiquement.';
COMMENT ON COLUMN public.family_links.adoption_simple_motif IS
  'Motif de l''exception déclarée, ex. ''enfant_du_conjoint'' ou ''soins_secours_5ans'' (texte libre, non contraint).';
