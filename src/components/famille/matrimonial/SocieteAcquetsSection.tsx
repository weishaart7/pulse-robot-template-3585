import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Chip, panelButtonClass } from '@/components/layout/workspace-panel';
import { useMaritalStatus } from '@/hooks/useFamilyData';
import type { Asset } from '@/services/assetService';
import { useToast } from '@/hooks/use-toast';
import { Landmark } from 'lucide-react';
import { SectionHeader } from '@/components/family/SectionHeader';
import {
  CATEGORIES_SOCIETE_ACQUETS,
  CategorieSocieteAcquets,
  ecrirePerimetre,
  lirePerimetre,
  PerimetreSocieteAcquets,
} from '@/lib/patrimoine/societeAcquets';
import { calculerRequalifications, compositionSocieteAcquets, Requalification } from '@/lib/patrimoine/requalification';
import { appliquerRequalifications } from '@/services/requalificationService';
import { cn } from '@/lib/utils';
import { AssetSelectionModal } from './AssetSelectionModal';
import { RequalificationDialog } from './RequalificationDialog';

interface SocieteAcquetsSectionProps {
  /** Actifs du formulaire parent (même instance que le résumé de l'onglet Général). */
  assets: Asset[];
  fetchAssets: () => Promise<void>;
  /** Régime ou date de mariage modifiés sans être enregistrés : périmètre en lecture seule. */
  regimeNonEnregistre: boolean;
}

/**
 * Périmètre de la société d'acquêts (cf. lib/patrimoine/societeAcquets.ts) :
 * tous les acquêts ou des catégories, plus des biens désignés ou exclus
 * nommément. Consommé par `qualifierBien` pour chaque bien, y compris les
 * biens saisis plus tard. Chaque changement est enregistré aussitôt dans
 * `marital_status.clauses_contrat.societe_acquets` ; s'il modifie la
 * qualification de biens existants (en qualification automatique), une
 * confirmation liste ces biens avant de tout appliquer.
 */
export const SocieteAcquetsSection: React.FC<SocieteAcquetsSectionProps> = ({
  assets,
  fetchAssets,
  regimeNonEnregistre,
}) => {
  const { data: maritalData, saveData } = useMaritalStatus();
  const { toast } = useToast();
  const [modal, setModal] = useState<'designes' | 'exclus' | null>(null);
  const [enAttente, setEnAttente] = useState<{ perimetre: PerimetreSocieteAcquets; changements: Requalification[] } | null>(null);
  const [application, setApplication] = useState(false);

  const clausesContrat = (maritalData as any)?.clauses_contrat || {};
  // Périmètre local, mis à jour immédiatement : des clics rapprochés partaient
  // sinon de l'état serveur pas encore rafraîchi et s'écrasaient entre eux.
  const [perimetre, setPerimetre] = useState<PerimetreSocieteAcquets>(() => lirePerimetre(clausesContrat.societe_acquets));
  const stockeServeur = JSON.stringify(clausesContrat.societe_acquets ?? null);
  const ecrituresEnCours = useRef(0);
  useEffect(() => {
    if (ecrituresEnCours.current > 0) return;
    setPerimetre(lirePerimetre(clausesContrat.societe_acquets));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockeServeur]);
  // Écritures sérialisées : chacune part de la précédente.
  const fileEcriture = useRef<Promise<unknown>>(Promise.resolve());

  const enregistrer = (p: PerimetreSocieteAcquets) => {
    setPerimetre(p);
    ecrituresEnCours.current += 1;
    const ecriture = fileEcriture.current
      .catch(() => undefined)
      .then(() => saveData({ clauses_contrat: { ...clausesContrat, societe_acquets: ecrirePerimetre(p) } } as any, { silent: true }))
      .catch((error) => {
        // Échec (déjà notifié par useMaritalStatus) : on revient à l'état enregistré.
        setPerimetre(lirePerimetre(clausesContrat.societe_acquets));
        throw error;
      })
      .finally(() => {
        ecrituresEnCours.current -= 1;
      });
    fileEcriture.current = ecriture;
    return ecriture;
  };

  // Toujours le régime enregistré (cf. regimeNonEnregistre).
  const contexte = { ...(maritalData as any) };
  const composition = compositionSocieteAcquets(assets, contexte, perimetre);
  const euros = (v: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

  const changer = (patch: Partial<PerimetreSocieteAcquets>) => {
    if (regimeNonEnregistre) return;
    const nouveau = { ...perimetre, ...patch };
    // Bascule vers « Certaines catégories » sans encore rien de coché : état
    // de saisie intermédiaire, affiché seulement. Enregistrer ce périmètre vide
    // proposerait de sortir tous les biens de la société avant même le choix.
    if (!nouveau.tousAcquets && nouveau.categories.length === 0 && nouveau.biensDesignes.length === 0 && perimetre.tousAcquets) {
      setPerimetre(nouveau);
      return;
    }
    const changements = calculerRequalifications(assets, contexte, nouveau);
    if (changements.length === 0) {
      enregistrer(nouveau).catch(() => undefined);
    } else {
      setEnAttente({ perimetre: nouveau, changements });
    }
  };

  const appliquer = async () => {
    if (!enAttente) return;
    setApplication(true);
    try {
      await enregistrer(enAttente.perimetre);
      await appliquerRequalifications(enAttente.changements);
      await fetchAssets();
      toast({ title: 'Biens requalifiés', description: `${enAttente.changements.length} bien(s) mis à jour.` });
      setEnAttente(null);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Requalification société d\'acquêts :', error);
      toast({ title: 'Erreur', description: 'La requalification des biens a échoué.', variant: 'destructive' });
    } finally {
      setApplication(false);
    }
  };

  const basculerCategorie = (key: CategorieSocieteAcquets, checked: boolean) =>
    changer({
      categories: checked ? [...perimetre.categories, key] : perimetre.categories.filter(c => c !== key),
    });

  const nomBien = (id: string) => {
    const a = assets.find(x => x.id === id);
    return a ? a.denomination || a.nature : null;
  };
  const etiquettes = (ids: string[]) => {
    const noms = ids.map(nomBien).filter(Boolean) as string[];
    return (
      <>
        {noms.map(n => <Chip key={n}>{n}</Chip>)}
        {ids.length > noms.length && <Chip>{ids.length - noms.length} bien(s) introuvable(s)</Chip>}
      </>
    );
  };

  return (
    <div className="divide-y divide-border">
    {regimeNonEnregistre && (
      <p className="mx-8 mt-6 rounded-[2px] bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">
        Le régime ou la date du mariage ont été modifiés sans être enregistrés. Enregistrez-les d'abord pour
        définir le périmètre : il requalifie les biens selon le régime enregistré.
      </p>
    )}
    <fieldset disabled={regimeNonEnregistre} className={cn('min-w-0 space-y-4 px-8 py-7', regimeNonEnregistre && 'opacity-60')}>
      <SectionHeader icon={Landmark} title="Périmètre" />
      <div className="-mt-4 space-y-2">
        <p className="text-xs text-muted-foreground">
          Seuls les biens acquis à titre onéreux pendant le mariage y entrent ; les biens reçus par donation ou
          succession restent propres. Les biens saisis plus tard sont classés automatiquement.
        </p>
        <div role="radiogroup" className="inline-grid grid-cols-2 gap-[3px] rounded-[5px] border border-border bg-muted/40 p-[3px]">
          {[
            { value: true, label: 'Tous les acquêts' },
            { value: false, label: 'Certaines catégories' },
          ].map(opt => (
            <button
              key={opt.label}
              type="button"
              role="radio"
              aria-checked={perimetre.tousAcquets === opt.value}
              onClick={() => perimetre.tousAcquets !== opt.value && changer({ tousAcquets: opt.value })}
              className={cn(
                'h-8 rounded-[2px] border px-4 text-[12.5px] transition-colors',
                perimetre.tousAcquets === opt.value
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {!perimetre.tousAcquets && (
          <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            {CATEGORIES_SOCIETE_ACQUETS.map(c => (
              <div key={c.key} className="flex h-9 items-center space-x-3">
                <Checkbox
                  id={`sa-${c.key}`}
                  checked={perimetre.categories.includes(c.key)}
                  onCheckedChange={checked => basculerCategorie(c.key, !!checked)}
                />
                <Label htmlFor={`sa-${c.key}`} className="cursor-pointer">{c.label}</Label>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" className={panelButtonClass} onClick={() => setModal('designes')}>
            Biens ajoutés nommément
          </Button>
          {etiquettes(perimetre.biensDesignes)}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" className={panelButtonClass} onClick={() => setModal('exclus')}>
            Biens exclus nommément
          </Button>
          {etiquettes(perimetre.biensExclus)}
        </div>
        <p className="text-xs text-muted-foreground">
          Un bien ajouté nommément entre dans la société même s'il a été acquis avant le mariage (apport).
        </p>
      </div>

    </fieldset>

    <div className="px-8 py-7">
      <SectionHeader icon={Landmark} title="Composition" />
      <p className="-mt-4 mb-4 text-xs text-muted-foreground">
        Biens communs qui résultent du périmètre, d'après les biens saisis dans Patrimoine.
      </p>
      {composition.biens.length === 0 ? (
        <p className="rounded-[2px] bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">
          Aucun bien saisi n'entre dans la société d'acquêts.
        </p>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {composition.biens.map(({ asset, raison }) => (
            <li key={asset.id} className="flex items-start justify-between gap-4 py-2.5">
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium text-foreground">{asset.denomination || asset.nature}</span>
                <span className="block text-xs text-muted-foreground">{raison.replace(/^Bien commun : /, '').replace(/^./, c => c.toUpperCase())}</span>
              </span>
              <span className="shrink-0 text-[13px] font-medium tabular-nums">{euros(asset.valeur_estimee || 0)}</span>
            </li>
          ))}
          <li className="flex items-center justify-between py-2.5 text-[13px]">
            <span className="text-muted-foreground">
              {composition.biens.length} bien{composition.biens.length > 1 ? 's' : ''} · valeur estimée
            </span>
            <span className="font-medium tabular-nums">{euros(composition.total)}</span>
          </li>
        </ul>
      )}
    </div>

      <AssetSelectionModal
        title={modal === 'exclus' ? "Biens exclus de la société d'acquêts" : "Biens ajoutés à la société d'acquêts"}
        description={
          modal === 'exclus'
            ? "Ces biens restent hors de la société, même s'ils relèvent d'une catégorie couverte."
            : 'Ces biens entrent dans la société, quelle que soit leur catégorie.'
        }
        isOpen={modal !== null}
        onClose={() => setModal(null)}
        onConfirm={ids =>
          modal === 'exclus'
            ? changer({ biensExclus: ids, biensDesignes: perimetre.biensDesignes.filter(id => !ids.includes(id)) })
            : changer({ biensDesignes: ids, biensExclus: perimetre.biensExclus.filter(id => !ids.includes(id)) })
        }
        preSelectedAssets={modal === 'exclus' ? perimetre.biensExclus : perimetre.biensDesignes}
      />

      <RequalificationDialog
        changements={enAttente?.changements ?? null}
        pending={application}
        cancelLabel="Annuler"
        onCancel={() => {
          setEnAttente(null);
          // Rien n'a été enregistré : l'affichage revient au périmètre enregistré.
          setPerimetre(lirePerimetre(clausesContrat.societe_acquets));
        }}
        onConfirm={appliquer}
      />
    </div>
  );
};
