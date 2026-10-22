import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { panelInsetClass } from '@/components/layout/panel-section';
import { useToast } from '@/hooks/use-toast';
import { retraiteMdaService, MiseAJourAttributionMDA } from '@/services/retraiteMdaService';
import { PersonneRetraite, RegimeMDA, TrimestresEnfantsParRegime } from '@/lib/retraite/trimestresEnfants';

const LIBELLES_REGIME: Record<RegimeMDA, string> = {
  rg: 'Régime général',
  fp: 'Fonction publique',
  cnavpl: 'CNAVPL',
};

interface TrimestresEnfantsPanelProps {
  personne: PersonneRetraite;
  trimestresEnfants: TrimestresEnfantsParRegime;
  mdaDejaAuRis: boolean;
  onMdaDejaAuRisChange: (valeur: boolean) => void;
  /** Recharge les attributions après une modification. */
  onAttributionsChange: () => Promise<void>;
}

/**
 * Trimestres de majoration pour enfant (MDA) d'une personne : un enfant par
 * ligne, attribution par défaut à la mère, corrigeable (table
 * `retraite_mda_enfants`, commune au client et au conjoint).
 */
export const TrimestresEnfantsPanel = ({
  personne,
  trimestresEnfants,
  mdaDejaAuRis,
  onMdaDejaAuRisChange,
  onAttributionsChange,
}: TrimestresEnfantsPanelProps) => {
  const { toast } = useToast();
  const [enCours, setEnCours] = useState<string | null>(null);

  const enregistrer = async (familyLinkId: string, miseAJour: MiseAJourAttributionMDA | null) => {
    setEnCours(familyLinkId);
    try {
      if (miseAJour === null) await retraiteMdaService.reinitialiser(familyLinkId);
      else await retraiteMdaService.enregistrer(familyLinkId, miseAJour);
      await onAttributionsChange();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Erreur lors de l’enregistrement des trimestres enfants:', error);
      }
      toast({ title: 'Enregistrement impossible', description: 'Réessayez dans un instant.', variant: 'destructive' });
    } finally {
      setEnCours(null);
    }
  };

  const partSaisie = (valeur: string) => Math.min(4, Math.max(0, parseInt(valeur, 10) || 0));
  const libelleAutre = personne === 'utilisateur' ? 'conjoint' : 'client';
  const { detail } = trimestresEnfants;
  const totalPersonne = detail.reduce(
    (t, d) => t + d.materniteAdoption + d.education + d.fpMajorationDuree + d.fpBonification,
    0
  );

  return (
    <div className={`${panelInsetClass} space-y-2`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium">Trimestres enfants</span>
        <span className="text-xs text-muted-foreground">
          {totalPersonne} trimestre{totalPersonne > 1 ? 's' : ''} retenu{totalPersonne > 1 ? 's' : ''}
          {mdaDejaAuRis ? ' (déjà au RIS, non ajoutés)' : ''}
        </span>
      </div>

      <div className="divide-y divide-border/60">
        {detail.map((enfant) => {
          const nePourFP = new Date(enfant.dateNaissance) < new Date(2004, 0, 1);
          return (
            <div key={enfant.familyLinkId} className="py-2 space-y-1.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span className="font-medium min-w-[7rem]">
                  {enfant.prenom}{' '}
                  <span className="text-muted-foreground font-normal">
                    ({new Date(enfant.dateNaissance).getFullYear()}
                    {enfant.estAdopte ? ', adopté' : ''})
                  </span>
                </span>
                <select
                  aria-label={`Régime d'attribution pour ${enfant.prenom}`}
                  className="h-7 rounded-[2px] border border-input bg-background px-1.5 text-xs"
                  value={enfant.regime}
                  disabled={enCours === enfant.familyLinkId}
                  onChange={(e) => enregistrer(enfant.familyLinkId, { regime_attribution: e.target.value })}
                >
                  {(Object.keys(LIBELLES_REGIME) as RegimeMDA[]).map((regime) => (
                    <option key={regime} value={regime}>
                      {LIBELLES_REGIME[regime]}
                    </option>
                  ))}
                </select>
                {enfant.regime !== 'fp' && (
                  <>
                    <label className="flex items-center gap-1">
                      {enfant.estAdopte ? 'Adoption' : 'Maternité'} au client
                      <Input
                        type="number"
                        min={0}
                        max={4}
                        className="h-7 w-12 px-1.5 text-xs"
                        value={enfant.partMaterniteUtilisateur}
                        disabled={enCours === enfant.familyLinkId}
                        onChange={(e) =>
                          enregistrer(enfant.familyLinkId, { maternite_adoption_client: partSaisie(e.target.value) })
                        }
                      />
                      /4
                    </label>
                    <label className="flex items-center gap-1">
                      Éducation au client
                      <Input
                        type="number"
                        min={0}
                        max={4}
                        className="h-7 w-12 px-1.5 text-xs"
                        value={enfant.partEducationUtilisateur}
                        disabled={enCours === enfant.familyLinkId}
                        onChange={(e) =>
                          enregistrer(enfant.familyLinkId, { education_client: partSaisie(e.target.value) })
                        }
                      />
                      /4
                    </label>
                  </>
                )}
                {enfant.regime === 'fp' && nePourFP && (
                  <label className="flex items-center gap-1.5">
                    <Checkbox
                      checked={enfant.fpBonification > 0}
                      disabled={enCours === enfant.familyLinkId}
                      onCheckedChange={(checked) =>
                        enregistrer(enfant.familyLinkId, { bonification_fp: checked === true })
                      }
                    />
                    Bonification d'1 an (interruption d'activité d'au moins 2 mois)
                  </label>
                )}
                <span className="ml-auto text-muted-foreground">
                  {enfant.regime === 'fp'
                    ? `${enfant.fpMajorationDuree + enfant.fpBonification} trim.`
                    : `${enfant.materniteAdoption} + ${enfant.education} trim.`}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  disabled={enCours === enfant.familyLinkId}
                  onClick={() => enregistrer(enfant.familyLinkId, null)}
                >
                  Défaut
                </Button>
              </div>
              {enfant.avertissements.map((message) => (
                <p key={message} className="text-xs text-spark">
                  {message}
                </p>
              ))}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        8 trimestres par enfant au régime général et à la CNAVPL (4 maternité ou adoption, 4 éducation acquis
        un par année jusqu'aux 4 ans), attribués à la mère par défaut ; le {libelleAutre} reçoit le complément à
        4. Fonction publique : 2 trimestres de durée à la mère pour un enfant né depuis 2004, bonification d'1
        an avant 2004. Comptent dans la durée et le taux, pas dans la surcote, le minimum contributif majoré ni
        la carrière longue ; ouvrent la surcote parentale.
      </p>

      <label className="flex items-start gap-2 text-xs">
        <Checkbox checked={mdaDejaAuRis} onCheckedChange={(checked) => onMdaDejaAuRisChange(checked === true)} />
        <span>Le relevé de carrière affiche déjà ces trimestres (ne pas les ajouter une seconde fois)</span>
      </label>
    </div>
  );
};
