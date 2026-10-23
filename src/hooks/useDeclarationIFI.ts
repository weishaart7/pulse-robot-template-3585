import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { declarationIFIService } from '@/services/declarationIFIService';
import {
  calculerDonneesIFI,
  chargerDonneesIFI,
  lignesIFI,
  plafonnementRetenu,
  type DonneesIFI,
  type Plafonnement2042,
} from '@/services/declarationIFIDonnees';
import { calculerDeclarationIFI } from '@/lib/fiscalite/calculerDeclarationIFI';

type DeclarationChanges = Parameters<typeof declarationIFIService.update>[1];
type ActifChanges = Parameters<typeof declarationIFIService.updateActif>[1];
type DetteChanges = Parameters<typeof declarationIFIService.updateDette>[1];

const signalerErreur = (description: string, error: unknown) => {
  if (import.meta.env.DEV) console.error(description, error);
  toast({ title: 'Erreur', description, variant: 'destructive' });
};

/**
 * État et calcul de la 2042-IFI d'une année : ouvrir l'écran crée la déclaration et une ligne par actif
 * et dette préremplis. Chaque modification est enregistrée immédiatement (mise à jour optimiste).
 * `depuis2042` : 9PR et 9PX repris du calcul de l'impôt sur les revenus N−1, null si l'année n'est pas couverte.
 */
export const useDeclarationIFI = (annee: number, depuis2042: Plafonnement2042 | null) => {
  const { isAuthenticated } = useAuth();
  const [donnees, setDonnees] = useState<DonneesIFI | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    let annule = false;
    setLoading(true);
    chargerDonneesIFI(annee, true)
      .then((d) => { if (!annule) setDonnees(d); })
      .catch((error) => signalerErreur('Impossible de charger la déclaration IFI', error))
      .finally(() => { if (!annule) setLoading(false); });
    return () => { annule = true; };
  }, [annee, isAuthenticated]);

  const maj = (f: (d: DonneesIFI) => DonneesIFI) => setDonnees((d) => (d ? f(d) : d));

  const modifierDeclaration = useCallback(async (changes: DeclarationChanges) => {
    if (!donnees) return;
    maj((d) => ({ ...d, declaration: { ...d.declaration, ...changes } }));
    try {
      await declarationIFIService.update(donnees.declaration.id, changes);
    } catch (error) { signalerErreur("Impossible d'enregistrer la déclaration", error); }
  }, [donnees]);

  const ajouterActif = useCallback(async () => {
    if (!donnees) return;
    try {
      const cree = await declarationIFIService.createActif(donnees.declaration.id, {
        denomination: `Bien ${donnees.actifs.length + 1}`, categorie: 'autreBati', ordre: donnees.actifs.length,
      });
      maj((d) => ({ ...d, actifs: [...d.actifs, cree] }));
    } catch (error) { signalerErreur("Impossible d'ajouter le bien", error); }
  }, [donnees]);

  const modifierActif = useCallback(async (id: string, changes: ActifChanges) => {
    maj((d) => ({ ...d, actifs: d.actifs.map((a) => (a.id === id ? { ...a, ...changes } : a)) }));
    try {
      await declarationIFIService.updateActif(id, changes);
    } catch (error) { signalerErreur("Impossible d'enregistrer le bien", error); }
  }, []);

  const supprimerActif = useCallback(async (id: string) => {
    try {
      await declarationIFIService.deleteActif(id);
      maj((d) => ({ ...d, actifs: d.actifs.filter((a) => a.id !== id) }));
    } catch (error) { signalerErreur('Impossible de supprimer le bien', error); }
  }, []);

  const ajouterDette = useCallback(async () => {
    if (!donnees) return;
    try {
      const cree = await declarationIFIService.createDette(donnees.declaration.id, {
        denomination: `Dette ${donnees.dettes.length + 1}`, ligne: '9GH', ordre: donnees.dettes.length,
      });
      maj((d) => ({ ...d, dettes: [...d.dettes, cree] }));
    } catch (error) { signalerErreur("Impossible d'ajouter la dette", error); }
  }, [donnees]);

  const modifierDette = useCallback(async (id: string, changes: DetteChanges) => {
    maj((d) => ({ ...d, dettes: d.dettes.map((x) => (x.id === id ? { ...x, ...changes } : x)) }));
    try {
      await declarationIFIService.updateDette(id, changes);
    } catch (error) { signalerErreur("Impossible d'enregistrer la dette", error); }
  }, []);

  const supprimerDette = useCallback(async (id: string) => {
    try {
      await declarationIFIService.deleteDette(id);
      maj((d) => ({ ...d, dettes: d.dettes.filter((x) => x.id !== id) }));
    } catch (error) { signalerErreur('Impossible de supprimer la dette', error); }
  }, []);

  const resultat = useMemo(
    () => (donnees
      ? calculerDonneesIFI(annee, donnees, depuis2042)
      : calculerDeclarationIFI({ annee, biens: [], biensIndirects: [], dettes: [] })),
    [annee, donnees, depuis2042],
  );
  const lignes = useMemo(() => (donnees ? lignesIFI(donnees) : { actifs: [], dettes: [] }), [donnees]);

  return {
    loading,
    declaration: donnees?.declaration ?? null,
    actifs: donnees?.actifs ?? [],
    dettes: donnees?.dettes ?? [],
    prerempliActifs: donnees?.prerempliActifs ?? {},
    prerempliDettes: donnees?.prerempliDettes ?? {},
    lignes,
    depuis2042,
    plafonnement: donnees ? plafonnementRetenu(donnees, depuis2042) : null,
    resultat,
    modifierDeclaration,
    ajouterActif, modifierActif, supprimerActif,
    ajouterDette, modifierDette, supprimerDette,
  };
};
