# Idées de côté — Pulse

Ce fichier recense les fonctionnalités **volontairement non construites** pour l'instant : rien n'est cassé, on choisit juste de ne pas les développer maintenant. À distinguer de la dette technique (documentée séparément dans les audits Transmission), qui elle correspond à du code existant mais imparfait.

Format par entrée : quoi / pourquoi pas maintenant / condition de réactivation.

---

## Pays du premier domicile matrimonial / Loi applicable au régime matrimonial

- **Quoi** : deux champs dans Famille → Régime matrimonial, retirés de l'affichage (voir aussi vérification d'impact demandée à Claude Code — suppression complète du champ envisagée si aucun calcul ne les lit).
- **Pourquoi pas maintenant** : n'ont d'utilité que pour les couples mariés à l'étranger ou avec patrimoine dans plusieurs pays. Clientèle actuelle quasiment sans dimension internationale.
- **Condition de réactivation** : un dossier client concret avec une dimension internationale (mariage à l'étranger, conjoint étranger, patrimoine à l'étranger) le justifie.

---

## Scénarios de changement de régime matrimonial

- **Quoi** : carte masquée dans l'écran Régime matrimonial (code conservé, condition d'affichage réversible). Masquage géré par le flag `SHOW_SCENARIOS_REGIME = false` — pour réactiver, repasser ce flag à `true`.
- **Pourquoi pas maintenant** : simuler un changement de régime dans le dossier de référence n'a pas de sens tant qu'il n'existe pas de dossier "sandbox" séparé pour poser des hypothèses sans toucher au dossier réel du client.
- **Condition de réactivation** : construction du dossier sandbox (comparaison dossier initial / dossier hypothèses).

---

<!-- Nouvelle entrée : copier le format ci-dessus -->
