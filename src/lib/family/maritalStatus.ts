// Logique pure de lecture/écriture de marital_status.statut_couple, partagée par
// FamilleSection.tsx et PartnerForm.tsx (points d'écriture concurrents avant
// centralisation ; FicheClientForm.tsx en écrivait un 3e jusqu'au retrait de son
// champ "Statut matrimonial", devenu redondant avec le menu de FamilleSection.tsx)
// via useMaritalStatus().setStatutCouple().

// Statuts « en couple » (partenaire présent dans le foyer) : liste unique du
// module, importée partout. Transmission garde sa propre règle (marié ou pacsé),
// le concubin n'étant pas héritier.
export const COUPLE_STATUSES = ['Concubinage', 'Pacsé(e)', 'Marié(e)'] as const;

export const isCoupleStatus = (statut?: string | null): boolean =>
  !!statut && (COUPLE_STATUSES as readonly string[]).includes(statut);

// Un conjoint n'est retenu que si le statut est « en couple » ET que son prénom est renseigné — même règle
// que useAssetForm/usePassifEmpruntForm, pour que Budget propose et affiche les mêmes personnes.
export const hasConjoint = (
  maritalStatus?: { statut_couple?: string | null; prenom_conjoint?: string | null } | null
): boolean =>
  !!maritalStatus?.prenom_conjoint && isCoupleStatus(maritalStatus.statut_couple);

export const isSingleStatus = (statutCouple?: string | null): boolean =>
  statutCouple === 'Célibataire';

// Champs propres au mariage (régime, contrat, libéralités entre époux, séparation de corps,
// option du conjoint successible) et au PACS. Les antécédents matrimoniaux
// (mariage_precedent_*) et l'identité du partenaire ne dépendent pas du statut : jamais effacés.
// Valeur « vide » de chaque colonne : null, ou false pour les booléens NOT NULL en base.
export const CHAMPS_MARIAGE = {
  regime_matrimonial: null,
  date_mariage: null,
  lieu_mariage: null,
  pas_de_contrat_mariage: false,
  clauses_contrat: null,
  loi_applicable_regime: null,
  pays_premier_domicile_matrimonial: null,
  donation_dernier_vivant_personne: false,
  date_donation_personne: null,
  donation_dernier_vivant_conjoint: false,
  date_donation_conjoint: null,
  separation_de_corps: false,
  separation_corps_clause_renonciation: false,
  date_jugement_separation_corps: null,
  option_conjoint: null,
  duh_opte: false,
} as const;

export const CHAMPS_PACS = {
  convention_pacs: null,
  date_pacs: null,
  lieu_pacs: null,
} as const;

// Statuts dont la fiche affiche, en lecture seule, le régime de l'union dissoute (docs/famille.md) :
// les champs du mariage y décrivent une situation passée réelle, ils sont conservés.
export const STATUTS_UNION_DISSOUTE = ['Divorcé(e)', 'Veuf/Veuve'] as const;

// Champs à effacer pour un statut donné : ceux d'un autre statut n'ont plus de sens et ne
// doivent pas rester en base (un ancien PACS ou régime contredirait la situation saisie).
export const champsObsoletesPourStatut = (statutCouple: string | null): Record<string, null | false> => {
  if (statutCouple === 'Marié(e)') return { ...CHAMPS_PACS };
  if (statutCouple === 'Pacsé(e)') return { ...CHAMPS_MARIAGE };
  if ((STATUTS_UNION_DISSOUTE as readonly (string | null)[]).includes(statutCouple)) return { ...CHAMPS_PACS };
  return { ...CHAMPS_MARIAGE, ...CHAMPS_PACS };
};

// Écriture d'un changement de statut : efface les champs devenus obsolètes ; `extra` (saisie
// du formulaire partenaire) l'emporte. Statut null (formulaire enregistré avant chargement,
// décochage) : rien n'est effacé, faute de savoir quelle situation s'applique.
export const buildStatutCoupleWrite = <T extends Record<string, unknown>>(
  statutCouple: string | null,
  extra?: T
): T & { statut_couple: string | null } => ({
  ...(statutCouple ? champsObsoletesPourStatut(statutCouple) : {}),
  ...(extra ?? ({} as T)),
  statut_couple: statutCouple,
} as T & { statut_couple: string | null });
