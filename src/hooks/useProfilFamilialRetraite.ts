import { useEffect, useState } from 'react';
import { Personne } from '@/hooks/useRetraiteData';
import { familyService, FamilyLink } from '@/services/familyService';
import { DateNaissance, dateNaissanceDepuisISO } from '@/lib/retraite/calcul';

export interface ProfilFamilialRetraite {
  dateNaissanceDetail: DateNaissance | null;
  dateNaissanceISO: string | null;
  familyLinks: FamilyLink[];
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const chargerDateNaissance = personne === 'conjoint'
      ? familyService.getMaritalStatus().then((statut) => statut?.date_naissance_conjoint ?? null)
      : familyService.getFamilyProfile().then((profil) => profil?.date_naissance ?? null);

    Promise.all([chargerDateNaissance, familyService.getFamilyLinks()])
      .then(([dateNaissance, liens]) => {
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

  return { dateNaissanceDetail, dateNaissanceISO, familyLinks, loading };
};
