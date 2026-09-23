# Vue d'ensemble (Dashboard)

Route `/dashboard` → [src/pages/Dashboard.tsx](../src/pages/Dashboard.tsx). Page d'accueil
authentifiée : alertes conseil, bandeau « Parlez avec un expert », puis une grille de cartes
de synthèse par module. Aucune logique métier propre : la page agrège des calculs existants.

## 1. Cartes et sources de données

| Carte | Contenu | Source |
|---|---|---|
| Patrimoine (2 colonnes) | Patrimoine net, bulle Actifs / Passifs, 4 principales catégories d'actifs (part + bande de 28 traits + valeur), compteur de catégories | `computePatrimoineBreakdown` ([PatrimoineChart.tsx](../src/components/patrimoine/PatrimoineChart.tsx)), même calcul que le module Patrimoine, démembrements inclus |
| Budget | Jauge en graduations (part des charges dans les revenus), disponible mensuel, lignes Revenus / Charges, compteur de lignes | `useRevenus` / `useCharges`, montants ramenés au mois selon la périodicité |
| Fiscalité | Imposition totale, lignes IR + PS / IFI / Autres | `useFiscalOverview`, même somme que `FiscalOverviewCard.tsx` |
| Transmission, Retraite | Orbite d'icônes + « Contenu à venir » | — |

## 2. Habillage

Cadre commun [dash-card.tsx](../src/components/ui/dash-card.tsx) (`DashCard`), croisement de
deux références Rondesignlab (Ledgerix, Creator Finance) : plaques claires en dégradé
dépoli (`mist`, ou `deep` plus soutenu pour les modules à venir), filet fin encre 8 %,
**aucune ombre**, coins 22 px. En-tête : titre, pastille de période (`tag`), compteur en
police à points Doto (`meta`). Pied : trois points décoratifs + bouton noir « Voir le détail »
vers la page du module (`to`). Police Instrument Sans (celle du titre de la landing),
encre `#0d1b1e`, accent unique lime `#a6f25c` réservé à l'élément principal.

Grille : 1 colonne mobile, 2 en `sm`, 4 en `lg` (Patrimoine sur 2).

## 3. Points ouverts

- Fiscalité : la ligne « IR et Prélèvements sociaux » affiche le total, IFI et « Autres impôts »
  sont codés en dur à 0 €.
- Pastille « Estimation » de la carte Fiscalité : année du calcul non vérifiée.
- Les trois points du pied de carte sont décoratifs.
- [budget-statistics-card.tsx](../src/components/ui/budget-statistics-card.tsx) n'est plus utilisé (code mort).
- Erreur de typage préexistante sur `demembrementCtx.familyLinks` (`FamilyLink[]`) dans `Dashboard.tsx`.
- Rendu non vérifié en session authentifiée.
