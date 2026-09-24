# Vue d'ensemble (Dashboard)

Route `/dashboard` → [src/pages/Dashboard.tsx](../src/pages/Dashboard.tsx). Page d'accueil
authentifiée : alertes conseil, bandeau « Parlez avec un expert », puis une grille de cartes
de synthèse par module. Aucune logique métier propre : la page agrège des calculs existants.

## 1. Cartes et sources de données

| Carte | Contenu | Source |
|---|---|---|
| Patrimoine (2 colonnes) | Patrimoine net, bulle Actifs / Passifs, 4 principales catégories d'actifs (part + bande de 28 traits + valeur), compteur de catégories | `computePatrimoineBreakdown` ([PatrimoineChart.tsx](../src/components/patrimoine/PatrimoineChart.tsx)), même calcul que le module Patrimoine : démembrements, part du foyer (hors tiers indivisaires) et exclusion des éléments non qualifiés, net égal à la carte « Patrimoine net » |
| Budget | Jauge en graduations (part des charges dans les revenus), disponible mensuel, lignes Revenus / Charges, compteur de lignes | `useRevenus` / `useCharges`, montants ramenés au mois selon la périodicité |
| Fiscalité | Imposition totale, lignes IR + PS / IFI / Autres | `useFiscalOverview`, même somme que `FiscalOverviewCard.tsx` |
| Transmission, Retraite | Orbite d'icônes + « Contenu à venir » | — |

## 2. Habillage

Suit [design-system.md](design-system.md). Cadre commun [dash-card.tsx](../src/components/ui/dash-card.tsx)
(`DashCard`) : plaque taupe à plat (`bg-secondary`, ou `bg-border` pour les modules à venir,
`variant="soon"`), coins 20 px, ni ombre ni bordure. En-tête : titre, pastille de période (`tag`),
compteur (`meta`). Pied : bouton pilule encre « Voir le détail » vers la page du module (`to`).
Chiffres en Inter 300 ; graphiques achromatiques — encre pour l'élément principal, cendre
`#a59f97` pour le secondaire, piste `#ddd8d2`.

Bandeau « Parlez avec un expert » : carte sombre (encre, coins 24 px) avec une sphère en dégradé
orange / rose / violet à gauche — seul visuel coloré de l'app. Bouton pilule eggshell.

Grille : 1 colonne mobile, 2 en `sm`, 4 en `lg` (Patrimoine sur 2).

## 3. Points ouverts

- Fiscalité : la ligne « IR et Prélèvements sociaux » affiche le total, IFI et « Autres impôts »
  sont codés en dur à 0 €.
- Pastille « Estimation » de la carte Fiscalité : année du calcul non vérifiée.
- [budget-statistics-card.tsx](../src/components/ui/budget-statistics-card.tsx) n'est plus utilisé (code mort).
- Erreur de typage préexistante sur `demembrementCtx.familyLinks` (`FamilyLink[]`) dans `Dashboard.tsx`.
- Rendu non vérifié en session authentifiée.
