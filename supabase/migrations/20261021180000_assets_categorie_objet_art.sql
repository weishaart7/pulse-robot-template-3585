-- Nature unique « Objets d'art et de collection » : catégorie de l'art. 98 A, annexe III CGI
-- (objet d'art, antiquité, objet de collection), informative.
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS categorie_objet_art text
  CHECK (categorie_objet_art IS NULL OR categorie_objet_art IN ('objet_art', 'antiquite', 'objet_collection'));
