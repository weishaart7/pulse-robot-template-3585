-- Case 9RS de la 2042-IFI (annexe 6, art. 980 CGI) : impôt de même nature que l'IFI payé à l'étranger
-- sur des biens situés hors de France, imputable dans la limite de l'IFI français afférent à ces biens.
ALTER TABLE public.declarations_ifi
  ADD COLUMN impot_etranger NUMERIC CHECK (impot_etranger >= 0),                -- 9RS : impôt payé
  ADD COLUMN valeur_biens_etranger NUMERIC CHECK (valeur_biens_etranger >= 0);  -- valeur nette imposable des biens concernés
