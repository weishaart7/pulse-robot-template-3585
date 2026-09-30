import { useEffect, useState } from 'react';
import { Personne } from '@/hooks/useRetraiteData';
import { familyService, FamilyLink } from '@/services/familyService';
import { DateNaissance, dateNaissanceDepuisISO } from '@/lib/retraite/calcul';

export interface ProfilFamilialRetraite {
  dateNaissanceDetail: DateNaissance | null;
  dateNaissanceISO: string | null;
  familyLinks: FamilyLink[];
  /** Civilité (fiche famille ou conjoint), sert à l'espérance de vie par sexe. */
  civilite: string | null;
  loading: boolean;
}

/**
 * Date de naissance et liens familiaux d'une personne (utilisateur ou
 * conjoint) — entrées communes du calcul de pension (décote/surcote sur
 * âge, majoration pour 3 enfants ou plus), consommées à l'identique par
 * Carriere.tsx et usePensionConsolidee.ts. Extrait ici pour n'être chargé
 * qu'à un seul endroit par écran (cf.
 * docs/audit/audit-pension-consolidation.md, étape 3 de la fusion :
 * auparavant, ces deux fichiers dupliquaient chacun le même `useEffect`
 * d'appel à familyService).
 *
 * Conjoint : pas de fiche famille séparée (pas de compte Supabase propre) —
 * sa date de naissance vit dans marital_status.date_naissance_conjoint,
 * même source que Famille (buildFamilyGraph.ts) et Transmission.
 * family_links n'est pas réparti par personne (pas de champ de filiation
 * par parent en base) : même liste d'enfants pour l'utilisateur et le
 * conjoint — approximation assumée, cf. docs/retraite-base-referentiel.md,
 * dette technique "conjoint".
 */
export const useProfilFamilialRetraite = (personne: Personne = 'utilisateur'): ProfilFamilialRetraite => {
  const [dateNaissanceDetail, setDateNaissanceDetail] = useState<DateNaissance | null>(null);
  const [dateNaissanceISO, setDateNaissanceISO] = useState<string | null>(null);
  const [familyLinks, setFamilyLinks] = useState<FamilyLink[]>([]);
  const [civilite, setCivilite] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const chargerIdentite = personne === 'conjoint'
      ? familyService.getMaritalStatus().then((statut) => ({
          dateNaissance: statut?.date_naissance_conjoint ?? null,
          civilite: statut?.civilite_conjoint ?? null,
        }))
      : familyService.getFamilyProfile().then((profil) => ({
          dateNaissance: profil?.date_naissance ?? null,
          civilite: profil?.civility ?? null,
        }));

    Promise.all([chargerIdentite, familyService.getFamilyLinks()])
      .then(([{ dateNaissance, civilite: civiliteChargee }, liens]) => {
        setCivilite(civiliteChargee);
        if (dateNaissance) {
          setDateNaissanceDetail(dateNaissanceDepuisISO(dateNaissance));
          setDateNaissanceISO(dateNaissance);
        }
        setFamilyLinks(liens);
      })
      .catch((error) => {
        if (import.meta.env.DEV) {
          console.error('Erreur lors du chargement du profil familial retraite:', error);
        }
      })
      .finally(() => setLoading(false));
  }, [personne]);

  return { dateNaissanceDetail, dateNaissanceISO, familyLinks, civilite, loading };
};
