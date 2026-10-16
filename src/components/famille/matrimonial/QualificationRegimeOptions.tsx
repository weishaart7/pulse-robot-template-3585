import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Chip, panelButtonClass } from '@/components/layout/workspace-panel';
import { useMaritalStatus } from '@/hooks/useFamilyData';
import { useAssets } from '@/hooks/useAssets';
import { useToast } from '@/hooks/use-toast';
import { RegimeType } from '@/types/matrimonial';
import {
  CATEGORIES_SOCIETE_ACQUETS,
  CategorieSocieteAcquets,
  ecrirePerimetre,
  lirePerimetre,
  PerimetreSocieteAcquets,
} from '@/lib/patrimoine/societeAcquets';
import { calculerRequalifications, Requalification } from '@/lib/patrimoine/requalification';
import { appliquerRequalifications } from '@/services/requalificationService';
import { cn } from '@/lib/utils';
import { AssetSelectionModal } from './AssetSelectionModal';
import { RequalificationDialog } from './RequalificationDialog';

interface QualificationRegimeOptionsProps {
  regimeType: RegimeType;
  /** Valeurs courantes du formulaire (peut-être pas encore enregistrées) : servent à requalifier les biens. */
  regimeMatrimonial?: string;
  dateMariage?: string;
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
export const QualificationRegimeOptions: React.FC<QualificationRegimeOptionsProps> = ({
  regimeType,
  regimeMatrimonial,
  dateMariage,
}) => {
  const { data: maritalData, saveData } = useMaritalStatus();
  const { assets, fetchAssets } = useAssets();
  const { toast } = useToast();
  const [modal, setModal] = useState<'designes' | 'exclus' | null>(null);
  const [enAttente, setEnAttente] = useState<{ perimetre: PerimetreSocieteAcquets; changements: Requalification[] } | null>(null);
  const [application, setApplication] = useState(false);

  if (regimeType !== 'separation_societe_acquets') return null;

  const clausesContrat = (maritalData as any)?.clauses_contrat || {};
  const perimetre = lirePerimetre(clausesContrat.societe_acquets);

  const enregistrer = (p: PerimetreSocieteAcquets) =>
    saveData({ clauses_contrat: { ...clausesContrat, societe_acquets: ecrirePerimetre(p) } } as any);

  const changer = (patch: Partial<PerimetreSocieteAcquets>) => {
    const nouveau = { ...perimetre, ...patch };
    const changements = calculerRequalifications(
      assets || [],
      {
        ...(maritalData as any),
        regime_matrimonial: regimeMatrimonial ?? maritalData?.regime_matrimonial,
        date_mariage: dateMariage ?? maritalData?.date_mariage,
      },
      nouveau
    );
    if (changements.length === 0) {
      enregistrer(nouveau);
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
    const a = (assets || []).find(x => x.id === id);
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
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-[13px] font-medium text-foreground">Périmètre de la société d'acquêts</p>
        <p className="text-sm text-muted-foreground">
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
        onCancel={() => setEnAttente(null)}
        onConfirm={appliquer}
      />
    </div>
  );
};
