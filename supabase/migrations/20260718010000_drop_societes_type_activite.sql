-- Supprime la colonne societes.type_activite : jamais alimentée par aucun champ de
-- saisie (SocieteForm.tsx n'expose que "activite", pas "type_activite"), 0 ligne
-- non nulle constatée en base, aucune vue/trigger/fonction SQL n'y fait référence.
ALTER TABLE public.societes DROP COLUMN type_activite;
