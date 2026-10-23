-- Suppression des tables du simulateur IFI historique, remplacé par la déclaration 2042-IFI
-- (declarations_ifi, declaration_ifi_actifs, declaration_ifi_dettes). Vérifié en base juste avant :
-- les 7 tables sont vides, aucune FK, vue ni fonction ne les référence (seuls leurs triggers
-- updated_at, supprimés avec elles). Sans CASCADE : échoue si une dépendance est apparue entre-temps.

DROP TABLE public.ifi_immeubles_batis;
DROP TABLE public.ifi_immeubles_non_batis;
DROP TABLE public.ifi_biens_detenus_indirectement;
DROP TABLE public.ifi_biens_professionnels_exoneres;
DROP TABLE public.ifi_passifs_deductions;
DROP TABLE public.ifi_hypotheses;
DROP TABLE public.ifi_hors_france;
