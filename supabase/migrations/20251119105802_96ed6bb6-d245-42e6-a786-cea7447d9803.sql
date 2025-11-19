-- Ajouter les champs de coordonnées pour le conjoint dans la table marital_status
ALTER TABLE marital_status
ADD COLUMN telephone_conjoint TEXT,
ADD COLUMN email_conjoint TEXT,
ADD COLUMN adresse_conjoint TEXT,
ADD COLUMN code_postal_conjoint TEXT,
ADD COLUMN ville_conjoint TEXT,
ADD COLUMN pays_conjoint TEXT;