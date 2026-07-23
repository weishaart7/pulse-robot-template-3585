import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PeriodeCarriere, RegimeDetecte } from '@/lib/retraite/parseRIS';
import { calculerSAM } from '@/lib/retraite/calculSAM';

const formatEuro = (valeur: number) =>
  valeur.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });

interface RISImportDialogProps {
  open: boolean;
  regimes: RegimeDetecte[];
  detailCarriere: PeriodeCarriere[];
  anneeNaissance: number | null;
  onValidate: (regimes: RegimeDetecte[], detailCarriere: PeriodeCarriere[], samPropose: number | null) => void;
  onCancel: () => void;
}

export function RISImportDialog({
  open,
  regimes,
  detailCarriere,
  anneeNaissance,
  onValidate,
  onCancel,
}: RISImportDialogProps) {
  const [regimesEdites, setRegimesEdites] = useState<RegimeDetecte[]>(regimes);
  const [samValeur, setSamValeur] = useState<string>('');

  const resultatSAM = useMemo(() => {
    if (anneeNaissance === null || detailCarriere.length === 0) return null;
    return calculerSAM(detailCarriere, anneeNaissance);
  }, [detailCarriere, anneeNaissance]);

  // Réinitialise l'état éditable à chaque nouvel import (nouvelle ouverture du dialogue).
  useEffect(() => {
    if (open) {
      setRegimesEdites(regimes);
      setSamValeur(resultatSAM ? resultatSAM.sam.toFixed(2) : '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, regimes]);

  const updateRegime = (index: number, updates: Partial<RegimeDetecte>) => {
    setRegimesEdites(prev => prev.map((r, i) => (i === index ? { ...r, ...updates } : r)));
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Vérifier les régimes détectés</DialogTitle>
          <DialogDescription>
            Vérifiez et corrigez si besoin les valeurs extraites du relevé avant de les appliquer. Rien n'est enregistré tant que vous n'avez pas cliqué sur "Valider".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {regimesEdites.map((regime, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="space-y-1">
                <Label htmlFor={`regime-nom-${index}`}>Nom du régime</Label>
                <Input
                  id={`regime-nom-${index}`}
                  value={regime.nom}
                  onChange={(e) => updateRegime(index, { nom: e.target.value })}
                  placeholder="non détecté, à saisir manuellement"
                />
              </div>

              {regime.type === 'trimestres' ? (
                <div className="space-y-1">
                  <Label htmlFor={`regime-trimestres-${index}`}>Total des trimestres</Label>
                  <Input
                    id={`regime-trimestres-${index}`}
                    type="number"
                    value={regime.trimestres ?? ''}
                    placeholder="non détecté, à saisir manuellement"
                    onChange={(e) => updateRegime(index, {
                      trimestres: e.target.value === '' ? undefined : parseInt(e.target.value, 10),
                    })}
                  />
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label htmlFor={`regime-points-${index}`}>Total des points</Label>
                    <Input
                      id={`regime-points-${index}`}
                      type="number"
                      value={regime.points ?? ''}
                      placeholder="non détecté, à saisir manuellement"
                      onChange={(e) => updateRegime(index, {
                        points: e.target.value === '' ? undefined : parseInt(e.target.value, 10),
                      })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`regime-valeur-point-${index}`}>Valeur du point (€)</Label>
                    <Input
                      id={`regime-valeur-point-${index}`}
                      type="number"
                      step="0.0001"
                      value={regime.valeurPoint ?? ''}
                      placeholder="non détecté, à saisir manuellement"
                      onChange={(e) => updateRegime(index, {
                        valeurPoint: e.target.value === '' ? undefined : parseFloat(e.target.value),
                      })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`regime-date-valeur-point-${index}`}>Date de la valeur du point</Label>
                    <Input
                      id={`regime-date-valeur-point-${index}`}
                      value={regime.dateValeurPoint ?? ''}
                      placeholder="non détecté, à saisir manuellement"
                      onChange={(e) => updateRegime(index, { dateValeurPoint: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}

          {detailCarriere.length > 0 && (
            <div className="border rounded-lg p-4 space-y-3">
              <div className="space-y-1">
                <Label className="text-base font-semibold">
                  Détail de carrière ({detailCarriere.length} période{detailCarriere.length > 1 ? 's' : ''} détectée{detailCarriere.length > 1 ? 's' : ''})
                </Label>
                <p className="text-sm text-muted-foreground">
                  Le détail complet est éditable après validation, dans la sous-section "Détail de carrière".
                </p>
              </div>

              {anneeNaissance === null ? (
                <p className="text-sm text-orange-600">
                  Date de naissance non renseignée dans la fiche famille : le salaire annuel moyen ne peut pas être
                  estimé automatiquement. Renseignez-la, puis réimportez le relevé pour obtenir une estimation.
                </p>
              ) : (
                resultatSAM && (
                  <div className="space-y-2">
                    <p className="text-sm">
                      SAM estimé à {formatEuro(resultatSAM.sam)}
                      {resultatSAM.nombreAnneesProjetees > 0 && (
                        <>
                          , dont {resultatSAM.nombreAnneesProjetees} année{resultatSAM.nombreAnneesProjetees > 1 ? 's' : ''}{' '}
                          sur {resultatSAM.nombreAnneesRequis} projetée{resultatSAM.nombreAnneesProjetees > 1 ? 's' : ''} à
                          revenu constant ({formatEuro(resultatSAM.anneesRetenues.find((a) => a.projete)?.revenuPlafonne ?? 0)}/an)
                        </>
                      )}
                      , en supposant un départ à {resultatSAM.ageDepartHypothese} ans (année{' '}
                      {anneeNaissance + resultatSAM.ageDepartHypothese}).
                    </p>
                    <div className="space-y-1">
                      <Label htmlFor="sam-propose">Salaire annuel moyen à appliquer (€)</Label>
                      <Input
                        id="sam-propose"
                        type="number"
                        value={samValeur}
                        onChange={(e) => setSamValeur(e.target.value)}
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button
            onClick={() =>
              onValidate(regimesEdites, detailCarriere, samValeur === '' ? null : parseFloat(samValeur))
            }
          >
            Valider
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
