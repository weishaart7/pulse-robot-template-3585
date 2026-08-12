import { useEffect, useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { PeriodeCarriere, TypeActivite, LIBELLE_TYPE_ACTIVITE } from '@/lib/retraite/parseRIS';

interface PeriodeCarriereEditDialogProps {
  open: boolean;
  periode: PeriodeCarriere | null;
  onSave: (periode: PeriodeCarriere) => void;
  onCancel: () => void;
}

/**
 * Dialogue de modification d'une seule période de carrière déjà enregistrée
 * (bouton "Modifier" à côté de "Supprimer" dans Carriere.tsx, section
 * "Détail de carrière"). Édite une copie locale (`brouillon`) et ne remonte
 * la modification au parent qu'au clic sur "Enregistrer" — même principe
 * que RISImportDialog.tsx (rien n'est appliqué tant que l'utilisateur ne
 * valide pas), sauf que la persistance effective en base reste ensuite
 * soumise au même bouton "Enregistrer les modifications" global de
 * Carriere.tsx (`handleSave`) : ce dialogue met seulement à jour l'état
 * React local `detailCarriere`, pas Supabase directement.
 */
export function PeriodeCarriereEditDialog({ open, periode, onSave, onCancel }: PeriodeCarriereEditDialogProps) {
  const [brouillon, setBrouillon] = useState<PeriodeCarriere | null>(periode);

  // Réinitialise le brouillon à chaque ouverture sur une période différente
  // (même pattern que RISImportDialog.tsx : l'état éditable suit `open`).
  useEffect(() => {
    if (open) {
      setBrouillon(periode);
    }
  }, [open, periode]);

  if (!brouillon) return null;

  const regimesTexte = brouillon.regimes.join(', ');

  const handleRegimesChange = (valeur: string) => {
    const regimes = valeur
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);
    setBrouillon({ ...brouillon, regimes });
  };

  const peutEnregistrer =
    brouillon.employeur.trim() !== '' && brouillon.dateDebut !== '' && brouillon.dateFin !== '';

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier la période</DialogTitle>
          <DialogDescription>
            Rien n'est enregistré tant que vous n'avez pas cliqué sur "Enregistrer" ici, puis sur "Enregistrer les
            modifications" en haut de page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="periode-employeur">Employeur / activité</Label>
            <Input
              id="periode-employeur"
              value={brouillon.employeur}
              onChange={(e) => setBrouillon({ ...brouillon, employeur: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="periode-type-activite">Type d'activité</Label>
            <Select
              value={brouillon.typeActivite}
              onValueChange={(v) => setBrouillon({ ...brouillon, typeActivite: v as TypeActivite })}
            >
              <SelectTrigger id="periode-type-activite"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(LIBELLE_TYPE_ACTIVITE) as TypeActivite[]).map((type) => (
                  <SelectItem key={type} value={type}>
                    {LIBELLE_TYPE_ACTIVITE[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="periode-date-debut">Date de début</Label>
              <Input
                id="periode-date-debut"
                type="date"
                value={brouillon.dateDebut}
                onChange={(e) => setBrouillon({ ...brouillon, dateDebut: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="periode-date-fin">Date de fin</Label>
              <Input
                id="periode-date-fin"
                type="date"
                value={brouillon.dateFin}
                onChange={(e) => setBrouillon({ ...brouillon, dateFin: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="periode-revenu">Revenu (€)</Label>
            <Input
              id="periode-revenu"
              type="number"
              placeholder="Non renseigné"
              value={brouillon.revenu ?? ''}
              onChange={(e) =>
                setBrouillon({ ...brouillon, revenu: e.target.value === '' ? null : parseFloat(e.target.value) })
              }
            />
          </div>

          {brouillon.typeActivite === 'micro_entrepreneur' && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="periode-est-ca"
                checked={brouillon.estChiffreAffaires}
                onCheckedChange={(v) => setBrouillon({ ...brouillon, estChiffreAffaires: v === true })}
              />
              <Label htmlFor="periode-est-ca" className="font-normal">
                Le revenu ci-dessus est un chiffre d'affaires (pas un salaire)
              </Label>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="periode-regimes">Régimes (séparés par une virgule)</Label>
            <Input
              id="periode-regimes"
              value={regimesTexte}
              placeholder="Ex : L'Assurance retraite, Agirc-Arrco"
              onChange={(e) => handleRegimesChange(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button onClick={() => onSave(brouillon)} disabled={!peutEnregistrer}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
