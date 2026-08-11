# Diagnostic — méthode de calcul des trimestres de retraite pour micro-entrepreneur

**Statut : diagnostic uniquement, aucun code modifié.**

## Question posée

Deux méthodes contradictoires circulent pour convertir le CA d'un micro-entrepreneur en trimestres de retraite validés :

1. **Abattement forfaitaire** (71% vente BIC / 50% service BIC / 34% service BNC) appliqué au CA pour obtenir un « revenu retenu », comparé ensuite à la valeur du trimestre.
2. **Reconstitution via le taux de cotisation retraite** (revenu cotisé = cotisations retraite versées ÷ 17,87 %).

## Accès aux sources

- L'accès direct au simulateur `autoentrepreneur.urssaf.fr` a échoué techniquement (`ECONNRESET` en `WebFetch`) — je n'ai **pas** pu consulter le simulateur officiel lui-même ni sa FAQ en direct.
- En revanche, j'ai pu accéder directement à **Légifrance** (source légale primaire, plus autoritative que le portail URSSAF) et consulter le texte de loi qui fonde juridiquement le calcul.

## Résultat : la méthode par abattement forfaitaire est la méthode légale

**Article L613-7 du code de la sécurité sociale** (consulté directement sur Légifrance, [LEGIARTI000048683570](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000048683570)) dispose noir sur blanc :

> « Les prestations attribuées aux personnes mentionnées au présent article sont calculées sur la base de leur chiffre d'affaires ou de leurs recettes après application d'un taux d'abattement de 71 % [...] »

avec deux autres taux d'abattement (50 % et 34 %) selon la catégorie d'activité, plus un taux dérogatoire de 87 % pour la location meublée touristique. Le texte précise explicitement que cet abattement s'applique **au calcul des prestations**, ce qui inclut l'ouverture des droits à trimestres de retraite — et pas seulement l'assiette de cotisation.

C'est cohérent avec **Article D613-4 CSS** ([LEGIARTI000043656794](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043656794)), qui fixe les mêmes taux d'abattement (71 % / 50 % / 34 %, 87 % pour la location meublée touristique) pour déterminer les niveaux de revenu et le taux global de cotisation par catégorie d'activité.

**Conclusion : la méthode par abattement forfaitaire (71%/50%/34%) est la méthode fondée juridiquement.** La reconstitution via ÷17,87 % ne correspond à aucune base légale identifiée pour le calcul du revenu retenu au titre des droits — ce taux (17,87 % en 2026) est le taux de cotisation d'assurance vieillesse de base lui-même, pas un mécanisme de conversion CA→trimestres prévu par les textes. L'exemple chiffré « Urssaf » qui utilisait ÷17,87 % et ne recoupait pas la méthode par abattement doit donc être écarté ou, à défaut, sa source d'origine réexaminée — elle n'est probablement pas officielle malgré l'attribution.

## Précision importante pour 2026 : la réforme de l'assiette sociale unique NE s'applique PAS aux micro-entrepreneurs

Une réforme entrée en vigueur en 2026 instaure une assiette sociale unique avec un abattement forfaitaire de 26 % — mais elle concerne exclusivement les indépendants **au régime réel** (BIC/BNC/IS : artisans, commerçants, gérants majoritaires, professions libérales réglementées et non réglementées). Elle **exclut explicitement les micro-entrepreneurs**, qui restent soumis au régime micro-social et aux abattements 71 %/50 %/34 % de l'article L613-7 CSS. (Source secondaire concordante sur plusieurs cabinets d'expertise-comptable ; non vérifiée sur un texte réglementaire primaire faute de temps, mais cohérente avec le champ d'application du L613-7 qui reste inchangé.)

## Cas test : 12 100 € de CA en 2026

Valeur du trimestre 2026 utilisée : **1 803 €** (150 × SMIC horaire brut à 12,02 €). Cette valeur provient de sources secondaires concordantes (presse spécialisée retraite, citant la circulaire CNAV 2025-33) ; je n'ai **pas** pu la relire moi-même dans le corps de la circulaire CNAV 2025-33 (PDF mal encodé côté outil de lecture) — à confirmer si une valeur exacte et sourcée en primaire est nécessaire avant tout branchement dans le code.

| Catégorie | Abattement | Revenu retenu (CA × (1 − abattement)) | Trimestres validés (revenu retenu ÷ 1 803 €, plafond 4) |
|---|---|---|---|
| Vente / BIC | 71 % | 12 100 × 0,29 = 3 509 € | 3 509 / 1 803 = 1,95 → **1 trimestre** |
| Service BIC | 50 % | 12 100 × 0,50 = 6 050 € | 6 050 / 1 803 = 3,36 → **3 trimestres** |
| Service BNC | 34 % | 12 100 × 0,66 = 7 986 € | 7 986 / 1 803 = 4,43 → **4 trimestres** (plafonné) |

(Méthode d'arrondi — troncature à l'entier inférieur — supposée cohérente avec la pratique CNAV pour la validation de trimestres ; à vérifier séparément si elle n'est pas déjà actée dans le code existant du projet.)

## Ce qui reste à vérifier avant tout branchement dans le code

1. Confirmer la valeur exacte du trimestre 2026 (1 803 €) sur un texte primaire lisible (circulaire CNAV 2025-33 ou décret annuel de revalorisation), le PDF n'ayant pas pu être lu intégralement dans cette session.
2. Idéalement, obtenir une confirmation croisée depuis `autoentrepreneur.urssaf.fr` ou `lassuranceretraite.fr` en accédant directement au simulateur ou à une fiche pratique — l'accès a échoué techniquement cette fois-ci (`ECONNRESET`), un nouvel essai pourrait aboutir.
3. Vérifier la règle d'arrondi/troncature exacte utilisée par la CNAV pour convertir un revenu retenu en nombre de trimestres.

## Sources consultées

- [Article L613-7 - Code de la sécurité sociale - Légifrance](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000048683570) — base légale de l'abattement forfaitaire appliqué au calcul des prestations
- [Article D613-4 - Code de la sécurité sociale - Légifrance](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043656794) — taux d'abattement par catégorie d'activité
- Recherches web secondaires (cabinets d'expertise-comptable, presse spécialisée retraite) pour la valeur du trimestre 2026 et le champ d'application de la réforme 2026 de l'assiette sociale unique — non primaires, à recouper
