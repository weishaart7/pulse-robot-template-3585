-- Chantier 3, Vague 1 (récompenses/créances entre époux) : distingue le
-- caractère "nécessaire" (art. 1469 al. 2) du caractère "qualifiant"
-- (nature_depense ∈ acquisition/conservation/amelioration, al. 3) — les deux
-- conditions sont indépendantes et leurs planchers respectifs se cumulent.
--
-- Uniquement sur `recompenses` : l'art. 1479 al. 2 (créances entre époux) ne
-- renvoie qu'au profit subsistant, sans ce mécanisme de plancher cumulé —
-- `creances_entre_epoux` n'est pas concernée.
--
-- Défaut `false` : les lignes existantes conservent leur comportement de
-- calcul actuel (vérifié par tests de non-régression, cf.
-- recompensesCreances.test.ts).

ALTER TABLE public.recompenses
ADD COLUMN depense_necessaire BOOLEAN NOT NULL DEFAULT false;
