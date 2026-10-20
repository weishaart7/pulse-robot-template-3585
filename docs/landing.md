# Landing page

Route `/` → [src/pages/Index.tsx](../src/pages/Index.tsx). Page publique de présentation,
sans données utilisateur. Composants dans [src/components/landing/](../src/components/landing/).

## 1. Références graphiques

- [getuni.co](https://www.getuni.co) — hero, navbar, défilé de modules
- [fin.ai](https://fin.ai/integrations/salesforce) — toutes les sections sous le défilé de modules et le footer

## 2. Structure

Ordre des sections dans `Index.tsx` :

1. `LandingNav` (navbar fixe)
2. `HeroCommon`
3. `ModulesRollingSection`
4. `ParticuliersSection`
5. `ProfessionnelsSection`
6. `CredibiliteSection`
7. `HowItWorksSection`
8. `ConfianceSection`
9. `PricingSection`
10. `FAQSection`
11. `LandingFooter`

`EditorialChecklistSection.tsx` est le gabarit partagé des sections Particuliers, Professionnels,
Crédibilité, HowItWorks et Confiance, qui ne font que lui passer leur contenu
(`eyebrow`, `tag`, `heading` en deux lignes, `paragraph`, `items: { title, detail }[]`).
Il exporte aussi les briques réutilisées par Pricing et FAQ :

- `LandingFrame` : colonne de 1120 px bordée de filets verticaux, petits carrés aux angles hauts.
- `FrameEyebrows` : bandeau de surtitres mono (`.lp-mono`), un à gauche, un à droite.
- `SplitHeading` : titre `.lp-split-heading` (Instrument Sans 400, jusqu'à 48 px) dont la 1re
  ligne est grise et la 2e encre, calée à droite.

Variantes : `accordion` (volets dépliables, un seul ouvert, le premier par défaut — Particuliers,
Professionnels) et `points` (trois colonnes à puce carrée orange — Crédibilité, HowItWorks,
Confiance). Paragraphe d'introduction en serif (`.lp-serif`).

Couleurs alignées sur le design system de l'application ([design-system.md](design-system.md)),
via les tokens de `.landing-portal` ([src/index.css](../src/index.css)) : `--lp-ink` `#0c0a09`,
`--lp-graphite` `#44403b`, `--lp-smoke` `#777169`, `--lp-paper` `#f5f3f1` (taupe chaud, fond de toutes
ces sections et fin du dégradé de `ModulesRollingSection`), `--lp-panel` `#fdfcfc` (volets, panneau
tarif), `--lp-line` `#d8d2ca`, `--lp-line-strong` `#a59f97`, `--lp-accent` lagon `#55b4bd` (puces
carrées, trait 3 px du volet ouvert), `--lp-citron` `#d9fd86` (bouton « S'inscrire » du footer),
`--lp-night` `#1e1d19` (fond du footer, noir chaud de la barre latérale). Hero et défilé de modules
utilisent `--lp-ink` au lieu de l'ancien `#0d1b1e`.

- **Pricing** : panneau en deux cellules, prix 9,90 € / mois à gauche, inclusions et CTA à droite.
- **FAQ** : titre à gauche, liste de `<details>` séparés par des filets à droite, chevron pivotant.
- **Footer** : carte `--lp-night` arrondie (même retrait que le hero) : CTA « Comprendre avant
  de gérer. / Décider avant d'agir. », logo complet de la page de connexion passé en blanc (`filter: invert(1)` + `mix-blend-mode: screen`, le PNG ayant un fond blanc opaque), colonnes de liens, mentions, puis signature géante
  « Aurevia » translucide rognée en bas.

## 3. Navbar

`LandingNav` rend [elevate-navbar.tsx](../src/components/ui/elevate-navbar.tsx)
(`ElevateNavbar`, adapté de Hyperiux Vault « Elevate Navbar »).

- Pastille noire centrée, fixe en haut (`top-12`), coins 12 px, **aucune ombre**.
- Logo Aurevia (`AureviaLogo` → `/`) : desktop, noir 44 px sans fond, en haut à gauche du hero
  (`absolute left-12 top-12`, défile avec la page et disparaît au scroll : boîte de 40 px dans laquelle le glyphe déborde en restant centré, centré sur la hauteur de la pastille, même animation `nav-intro`) ; noir car
  tous les fonds de la landing sont clairs (hero pastel, sections blanches). Mobile : blanc 24 px
  à gauche dans la barre noire, en face du bouton menu.
- Liens : Fonctionnalités, Tarifs, À propos (ancres) ; CTA blanc « Se connecter » → `/login`.
- Survol : bascule verticale du texte animée avec GSAP.
- Mobile (< 768 px) : logo à gauche, bouton menu à droite ouvrant un panneau déroulant, avec focus trap.
- **Animation d'apparition** : la barre s'étend horizontalement depuis son centre
  (`clip-path` de `inset(0 50%)` à `inset(0 0)`), 0,8 s, délai 0,15 s, courbe
  `cubic-bezier(0.22, 1, 0.36, 1)`, fondu bref au départ. Aucun déplacement vertical.
  Classes `nav-intro-centered` (desktop) et `nav-intro` (barre mobile) dans
  [src/index.css](../src/index.css). Remplissage `backwards` uniquement, pour que le
  `clip-path` ne coupe pas les dropdowns une fois l'animation finie. Désactivée si
  `prefers-reduced-motion`.
