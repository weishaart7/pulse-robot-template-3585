import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { declaration2044Service } from '@/services/declaration2044Service';
import { calculerDonnees2044, chargerDonnees2044, type Donnees2044 } from '@/services/declaration2044Donnees';
import { calculerDeclaration2044 } from '@/lib/fiscalite/calculerDeclaration2044';

type ImmeubleChanges = Parameters<typeof declaration2044Service.updateImmeuble>[1];
type PartChanges = Parameters<typeof declaration2044Service.updatePart>[1];

const signalerErreur = (description: string, error: unknown) => {
  if (import.meta.env.DEV) console.error(description, error);
  toast({ title: 'Erreur', description, variant: 'destructive' });
};

/**
 * État et calcul de la 2044 d'une année : ouvrir l'écran crée la déclaration et une ligne par actif
 * éligible (préremplie). Chaque modification est enregistrée immédiatement (mise à jour optimiste).
 */
export const useDeclaration2044 = (annee: number) => {
  const { isAuthenticated } = useAuth();
  const [donnees, setDonnees] = useState<Donnees2044 | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    let annule = false;
    setLoading(true);
    chargerDonnees2044(annee, true)
      .then((d) => { if (!annule) setDonnees(d); })
      .catch((error) => signalerErreur('Impossible de charger la déclaration 2044', error))
      .finally(() => { if (!annule) setLoading(false); });
    return () => { annule = true; };
  }, [annee, isAuthenticated]);

  const maj = (f: (d: Donnees2044) => Donnees2044) => setDonnees((d) => (d ? f(d) : d));

  const ajouterImmeuble = useCallback(async () => {
    if (!donnees) return;
    try {
      const cree = await declaration2044Service.createImmeuble(donnees.declaration.id, {
        denomination: `Immeuble ${donnees.immeubles.length + 1}`,
        ordre: donnees.immeubles.length,
      });
      maj((d) => ({ ...d, immeubles: [...d.immeubles, cree] }));
    } catch (error) { signalerErreur("Impossible d'ajouter l'immeuble", error); }
  }, [donnees]);

  const modifierImmeuble = useCallback(async (id: string, changes: ImmeubleChanges) => {
    maj((d) => ({ ...d, immeubles: d.immeubles.map((i) => (i.id === id ? { ...i, ...changes } : i)) }));
    try {
      await declaration2044Service.updateImmeuble(id, changes);
    } catch (error) { signalerErreur("Impossible d'enregistrer l'immeuble", error); }
  }, []);

  const supprimerImmeuble = useCallback(async (id: string) => {
    try {
      await declaration2044Service.deleteImmeuble(id);
      maj((d) => ({ ...d, immeubles: d.immeubles.filter((i) => i.id !== id) }));
    } catch (error) { signalerErreur("Impossible de supprimer l'immeuble", error); }
  }, []);

  const ajouterPart = useCallback(async () => {
    if (!donnees) return;
    try {
      const cree = await declaration2044Service.createPart(donnees.declaration.id, {
        denomination: `Société ${donnees.parts.length + 1}`,
        ordre: donnees.parts.length,
      });
      maj((d) => ({ ...d, parts: [...d.parts, cree] }));
    } catch (error) { signalerErreur("Impossible d'ajouter la société", error); }
  }, [donnees]);

  const modifierPart = useCallback(async (id: string, changes: PartChanges) => {
    maj((d) => ({ ...d, parts: d.parts.map((p) => (p.id === id ? { ...p, ...changes } : p)) }));
    try {
      await declaration2044Service.updatePart(id, changes);
    } catch (error) { signalerErreur("Impossible d'enregistrer la société", error); }
  }, []);

  const supprimerPart = useCallback(async (id: string) => {
    try {
      await declaration2044Service.deletePart(id);
      maj((d) => ({ ...d, parts: d.parts.filter((p) => p.id !== id) }));
    } catch (error) { signalerErreur('Impossible de supprimer la société', error); }
  }, []);

  const resultat = useMemo(
    () => (donnees
      ? calculerDonnees2044(annee, donnees)
      : calculerDeclaration2044({ annee, immeubles: [], parts: [], deficitsAnterieurs: [] })),
    [annee, donnees],
  );

  return {
    loading,
    immeubles: donnees?.immeubles ?? [],
    parts: donnees?.parts ?? [],
    prerempliImmeubles: donnees?.prerempliImmeubles ?? {},
    prerempliParts: donnees?.prerempliParts ?? {},
    resultat,
    ajouterImmeuble, modifierImmeuble, supprimerImmeuble,
    ajouterPart, modifierPart, supprimerPart,
  };
};
