-- Fusion des natures « Or (physique) » et « Métaux précieux (argent, platine) » en « Or et métaux
-- précieux » ; le métal d'origine est reporté dans assets.metal. Vérifié avant application : seule
-- table concernée = assets (1 ligne « Or (physique) », 0 « Métaux précieux »).
UPDATE public.assets SET nature = 'Or et métaux précieux', metal = 'or' WHERE nature = 'Or (physique)';
UPDATE public.assets SET nature = 'Or et métaux précieux' WHERE nature = 'Métaux précieux (argent, platine)';
