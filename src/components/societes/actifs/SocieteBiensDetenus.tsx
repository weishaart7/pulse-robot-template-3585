import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { getNatureDisplayLabel, ASSET_CATEGORIES } from '@/constants/assetTypes';
import { Asset, assetService } from '@/services/assetService';
import { societeService } from '@/services/societeService';
import { PanelCard, PanelCardContent, PanelCardDescription, PanelCardHeader, PanelCardTitle } from '@/components/layout/panel-section';
import { panelButtonClass, panelPrimaryButtonClass } from '@/components/layout/workspace-panel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { WizardConfirmDialog } from '@/components/assets/wizard/WizardConfirmDialog';
import { doublonsProbables, type ValeurSocieteDetail } from '@/lib/societes/valeurSociete';

interface Props {
  societeId: string;
  denomination: string;
}

const eur = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} €`;
const NATURES_IMMOBILIERES = ASSET_CATEGORIES['actifs immobiliers'] as readonly string[];

// Biens détenus par la société (assets.societe_proprietaire_id) : hors patrimoine direct du foyer,
// ils forment avec les emprunts de la société, sa trésorerie et ses comptes courants la valeur
// de la société (lib/societes/valeurSociete.ts), recopiée sur les parts du foyer.
export const SocieteBiensDetenus: React.FC<Props> = ({ societeId, denomination }) => {
  const [biens, setBiens] = useState<Asset[]>([]);
  const [biensDirects, setBiensDirects] = useState<Asset[]>([]);
  const [detail, setDetail] = useState<(ValeurSocieteDetail & { nbBiens: number }) | null>(null);
  const [valeurAuto, setValeurAuto] = useState(true);
  const [loading, setLoading] = useState(true);
  const [aRattacher, setARattacher] = useState('');
  const [confirmation, setConfirmation] = useState<'rattacher' | { retirer: Asset } | null>(null);

  const charger = useCallback(async () => {
    const [detenus, directs, valeur, societe] = await Promise.all([
      assetService.getBiensSociete(societeId),
      assetService.getAssets(),
      societeService.getValeurCalculee(societeId),
      societeService.getById(societeId),
    ]);
    setBiens(detenus);
    setBiensDirects(directs.filter((a) => NATURES_IMMOBILIERES.includes(a.nature)));
    setDetail(valeur);
    setValeurAuto(societe.valeur_auto !== false);
    setLoading(false);
  }, [societeId]);

  useEffect(() => { charger(); }, [charger]);

  const rattacher = async () => {
    setConfirmation(null);
    try {
      await societeService.rattacherBien(societeId, aRattacher);
      setARattacher('');
      toast.success(`Bien rattaché à ${denomination}`);
      await charger();
    } catch {
      toast.error("Le bien n'a pas pu être rattaché");
    }
  };

  const retirer = async (bien: Asset) => {
    setConfirmation(null);
    try {
      await societeService.detacherBien(societeId, bien.id!);
      toast.success('Bien rendu au patrimoine direct : complétez son détenteur et sa qualification');
      await charger();
    } catch {
      toast.error("Le bien n'a pas pu être retiré");
    }
  };

  const basculerValeurAuto = async () => {
    await societeService.update(societeId, { valeur_auto: !valeurAuto });
    await charger();
  };

  if (loading) return <LoadingSpinner size="sm" />;

  return (
    <div>
      <PanelCard>
        <PanelCardHeader>
          <PanelCardTitle>Biens détenus par la société</PanelCardTitle>
          <PanelCardDescription>
            Ces biens appartiennent à {denomination}, pas au foyer : ils sortent des totaux du patrimoine, où seules
            vos parts apparaissent.
          </PanelCardDescription>
        </PanelCardHeader>
        <PanelCardContent>
          {biens.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun bien rattaché pour l'instant.</p>
          ) : (
            <div className="divide-y divide-border border-y border-border">
              {biens.map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                  <span>
                    {b.denomination || b.nature} <span className="text-muted-foreground">· {getNatureDisplayLabel(b.nature)}</span>
                  </span>
                  <span className="flex items-center gap-4">
                    <span className="font-medium tabular-nums">{eur(b.valeur_estimee || 0)}</span>
                    <button type="button" className="text-[13px] text-muted-foreground hover:text-foreground" onClick={() => setConfirmation({ retirer: b })}>
                      Retirer
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}

          {doublonsProbables(biensDirects, biens).length > 0 && (
            <p className="mt-4 border-l-2 border-[#ffa451] bg-[#ffa451]/10 px-4 py-2.5 text-[13px] leading-snug">
              Possible doublon : {doublonsProbables(biensDirects, biens).map((b) => b.denomination || b.nature).join(', ')} figure
              aussi dans votre patrimoine direct, avec la même nature et une valeur proche. Si c'est le même bien, rattachez-le
              plutôt que de le saisir deux fois : il serait compté en direct et dans la valeur des parts.
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Link to={`/dashboard/patrimoine?tab=actifs&societe=${societeId}`} className={panelPrimaryButtonClass}>
              Ajouter un bien
            </Link>
            {biensDirects.length > 0 && (
              <>
                <span className="px-1 text-[13px] text-muted-foreground">ou rattacher un bien déjà saisi</span>
                <Select value={aRattacher} onValueChange={setARattacher}>
                  <SelectTrigger className="w-64"><SelectValue placeholder="Choisir un bien" /></SelectTrigger>
                  <SelectContent>
                    {biensDirects.map((a) => (
                      <SelectItem key={a.id} value={a.id!}>{a.denomination || a.nature}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button type="button" className={panelButtonClass} disabled={!aRattacher} onClick={() => setConfirmation('rattacher')}>
                  Rattacher
                </button>
              </>
            )}
          </div>
        </PanelCardContent>
      </PanelCard>

      {detail && (
        <PanelCard>
          <PanelCardHeader>
            <PanelCardTitle>Valeur de la société</PanelCardTitle>
            <PanelCardDescription>
              {valeurAuto && detail.nbBiens > 0
                ? 'Calculée depuis les biens détenus, les emprunts de la société (onglet Finances), sa trésorerie et ses comptes courants.'
                : 'Saisie à la main dans l\'onglet Informations.'}
            </PanelCardDescription>
          </PanelCardHeader>
          <PanelCardContent>
            <div className="max-w-md divide-y divide-border border-y border-border text-sm">
              {[
                ['Biens détenus', detail.biens],
                ['Trésorerie', detail.tresorerie],
                ['Emprunts de la société', -detail.emprunts],
                ["Comptes courants d'associés", -detail.compteCourantAssocies],
              ].map(([libelle, montant]) => (
                <div key={libelle as string} className="flex justify-between py-2">
                  <span className="text-muted-foreground">{libelle}</span>
                  <span className="tabular-nums">{eur(montant as number)}</span>
                </div>
              ))}
              <div className="flex justify-between py-2 font-medium">
                <span>Valeur calculée</span>
                <span className="tabular-nums">{eur(detail.valeur)}</span>
              </div>
            </div>
            {detail.nbBiens > 0 && (
              <button type="button" className="mt-3 text-[13px] font-medium text-lagon-ink hover:underline" onClick={basculerValeurAuto}>
                {valeurAuto ? 'Saisir la valeur à la main' : 'Utiliser la valeur calculée'}
              </button>
            )}
          </PanelCardContent>
        </PanelCard>
      )}

      <WizardConfirmDialog
        open={confirmation === 'rattacher'}
        title="Rattacher ce bien à la société ?"
        description={`Le bien appartiendra à ${denomination} : il quitte les totaux du patrimoine direct, perd son détenteur et sa qualification, ses revenus et charges sortent du budget, et ses emprunts deviennent ceux de la société.`}
        confirmLabel="Rattacher"
        cancelLabel="Annuler"
        onConfirm={rattacher}
        onCancel={() => setConfirmation(null)}
      />
      <WizardConfirmDialog
        open={!!confirmation && confirmation !== 'rattacher'}
        title="Retirer ce bien de la société ?"
        description="Il revient dans le patrimoine direct du foyer : son détenteur et sa qualification seront à compléter sur sa fiche."
        confirmLabel="Retirer"
        cancelLabel="Annuler"
        onConfirm={() => confirmation && confirmation !== 'rattacher' && retirer(confirmation.retirer)}
        onCancel={() => setConfirmation(null)}
      />
    </div>
  );
};
