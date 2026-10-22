import { useCallback, useEffect, useState } from 'react';
import { Personne } from '@/hooks/useRetraiteData';
import { familyService, FamilyLink } from '@/services/familyService';
import { DateNaissance, dateNaissanceDepuisISO } from '@/lib/retraite/calcul';
import { AttributionMDA } from '@/lib/retraite/trimestresEnfants';
import { retraiteMdaService } from '@/services/retraiteMdaService';

export interface ProfilFamilialRetraite {
  dateNaissanceDetail: DateNaissance | null;
  dateNaissanceISO: string | null;
  familyLinks: FamilyLink[];
  /** Civilité (fiche famille ou conjoint), sert à l'espérance de vie par sexe. */
  civilite: string | null;
  /** Civilités des deux parents : identification de la mère pour les trimestres enfants. */
  civiliteUtilisateur: string | null;
  civiliteConjoint: string | null;
  /** Écarts saisis à l'attribution par défaut des trimestres enfants. */
  attributionsMDA: AttributionMDA[];
  rechargerAttributionsMDA: () => Promise<void>;
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
 * family_links est commun aux deux personnes : le rattachement d'un enfant
 * (`parent_de` : user, spouse, both_parents) est filtré par les calculs
 * (cf. `estEnfantDeLaPersonne`).
 */
export const useProfilFamilialRetraite = (personne: Personne = 'utilisateur'): ProfilFamilialRetraite => {
  const [dateNaissanceDetail, setDateNaissanceDetail] = useState<DateNaissance | null>(null);
  const [dateNaissanceISO, setDateNaissanceISO] = useState<string | null>(null);
  const [familyLinks, setFamilyLinks] = useState<FamilyLink[]>([]);
  const [civiliteUtilisateur, setCiviliteUtilisateur] = useState<string | null>(null);
  const [civiliteConjoint, setCiviliteConjoint] = useState<string | null>(null);
  const [attributionsMDA, setAttributionsMDA] = useState<AttributionMDA[]>([]);
  const [loading, setLoading] = useState(true);

  const rechargerAttributionsMDA = useCallback(async () => {
    try {
      setAttributionsMDA(await retraiteMdaService.lister());
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Erreur lors du chargement des trimestres enfants:', error);
      }
    }
  }, []);

  useEffect(() => {
    Promise.all([
      familyService.getFamilyProfile(),
      familyService.getMaritalStatus(),
      familyService.getFamilyLinks(),
      retraiteMdaService.lister(),
    ])
      .then(([profil, statut, liens, attributions]) => {
        setCiviliteUtilisateur(profil?.civility ?? null);
        setCiviliteConjoint(statut?.civilite_conjoint ?? null);
        setAttributionsMDA(attributions);
        const dateNaissance =
          personne === 'conjoint' ? statut?.date_naissance_conjoint ?? null : profil?.date_naissance ?? null;
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

  const civilite = personne === 'conjoint' ? civiliteConjoint : civiliteUtilisateur;
  return {
    dateNaissanceDetail,
    dateNaissanceISO,
    familyLinks,
    civilite,
    civiliteUtilisateur,
    civiliteConjoint,
    attributionsMDA,
    rechargerAttributionsMDA,
    loading,
  };
};
