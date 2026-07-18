import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Trash2, Network, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Societe } from '@/services/societeService';
import { SocieteParticipation, societeParticipationService } from '@/services/societeParticipationService';

interface SocieteParticipationsDialogProps {
  societes: Societe[];
  participations: SocieteParticipation[];
  onChanged: () => void;
}

export const SocieteParticipationsDialog = ({ societes, participations, onChanged }: SocieteParticipationsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [societeMereId, setSocieteMereId] = useState<string | undefined>();
  const [societeFilleId, setSocieteFilleId] = useState<string | undefined>();
  const [pourcentage, setPourcentage] = useState('');
  const [saving, setSaving] = useState(false);

  const societesFillePossibles = useMemo(
    () => societes.filter(s => s.id !== societeMereId),
    [societes, societeMereId]
  );

  const denomination = (societeId: string) => societes.find(s => s.id === societeId)?.denomination || 'Société inconnue';

  const resetForm = () => {
    setSocieteMereId(undefined);
    setSocieteFilleId(undefined);
    setPourcentage('');
  };

  const handleCreate = async () => {
    if (!societeMereId || !societeFilleId) {
      toast.error('Sélectionnez la société mère et la société fille');
      return;
    }
    const pourcentageNum = Number(pourcentage);
    if (!pourcentage || Number.isNaN(pourcentageNum) || pourcentageNum <= 0 || pourcentageNum > 100) {
      toast.error('Le pourcentage doit être compris entre 0 (exclu) et 100');
      return;
    }

    setSaving(true);
    try {
      await societeParticipationService.create({
        societe_mere_id: societeMereId,
        societe_fille_id: societeFilleId,
        pourcentage: pourcentageNum,
      });
      toast.success('Participation enregistrée');
      resetForm();
      onChanged();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error creating participation:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la création du lien de participation');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await societeParticipationService.delete(id);
      toast.success('Participation supprimée');
      onChanged();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error deleting participation:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression du lien de participation');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Network className="h-4 w-4" />
          Gérer les participations
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gérer les participations société → société</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 items-end">
            <div>
              <Label>Société mère</Label>
              <Select value={societeMereId} onValueChange={v => { setSocieteMereId(v); if (v === societeFilleId) setSocieteFilleId(undefined); }}>
                <SelectTrigger><SelectValue placeholder="Détentrice" /></SelectTrigger>
                <SelectContent>
                  {societes.map(s => <SelectItem key={s.id} value={s.id}>{s.denomination}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Société fille</Label>
              <Select value={societeFilleId} onValueChange={setSocieteFilleId} disabled={!societeMereId}>
                <SelectTrigger><SelectValue placeholder="Détenue" /></SelectTrigger>
                <SelectContent>
                  {societesFillePossibles.map(s => <SelectItem key={s.id} value={s.id}>{s.denomination}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pourcentage (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={pourcentage}
                onChange={e => setPourcentage(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleCreate} disabled={saving} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Ajouter le lien
          </Button>

          <div className="border-t border-border/60 pt-4">
            <h4 className="text-sm font-medium mb-2">Liens existants</h4>
            {participations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun lien de participation enregistré.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {participations.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-[5px] bg-muted/40 text-sm">
                    <span>
                      <strong>{denomination(p.societe_mere_id)}</strong> détient{' '}
                      <strong>{p.pourcentage}%</strong> de <strong>{denomination(p.societe_fille_id)}</strong>
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
