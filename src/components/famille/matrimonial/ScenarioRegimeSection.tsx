import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus } from 'lucide-react';
import { useScenariosRegime } from '@/hooks/useScenariosRegime';
import { ScenarioRegimeType } from '@/services/scenarioRegimeService';
import { REGIMES_MATRIMONIAUX } from '@/lib/patrimoine/regimeLegal';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const TYPE_LABELS: Record<ScenarioRegimeType, string> = {
  realise: 'Changement déjà réalisé',
  envisage: 'Changement envisagé',
};

export function ScenarioRegimeSection() {
  const { scenariosRegime, loading, createScenarioRegime, deleteScenarioRegime } = useScenariosRegime();
  const [isAdding, setIsAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [type, setType] = useState<ScenarioRegimeType>('envisage');
  const [regimeCible, setRegimeCible] = useState<string>(REGIMES_MATRIMONIAUX[0]);
  const [date, setDate] = useState('');
  const [motivationCivile, setMotivationCivile] = useState('');

  const resetForm = () => {
    setType('envisage');
    setRegimeCible(REGIMES_MATRIMONIAUX[0]);
    setDate('');
    setMotivationCivile('');
    setIsAdding(false);
  };

  const handleSubmit = async () => {
    if (!date) return;

    setSubmitting(true);
    try {
      await createScenarioRegime({
        type,
        regime_cible: regimeCible,
        date,
        motivation_civile: motivationCivile || null,
      });
      resetForm();
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d: string) => {
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? d : format(parsed, 'd MMMM yyyy', { locale: fr });
  };

  return (
    <div className="rounded-md border bg-card p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Scénarios de changement de régime matrimonial</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Changement de régime réalisé ou envisagé, à documenter notamment lorsqu'une donation est prévue à proximité (risque d'abus de droit, art. L. 64 LPF).
      </p>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : scenariosRegime.length > 0 && (
        <div className="space-y-3 mb-5">
          {scenariosRegime.map(s => (
            <div key={s.id} className="rounded-md border p-4 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">{TYPE_LABELS[s.type]} — {s.regime_cible}</p>
                <p className="text-xs text-muted-foreground">
                  Date : {formatDate(s.date)}
                  {s.motivation_civile && ` · ${s.motivation_civile}`}
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon" className="shrink-0 h-7 w-7" onClick={() => deleteScenarioRegime(s.id!)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {isAdding ? (
        <div className="rounded-md border p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as ScenarioRegimeType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="envisage">{TYPE_LABELS.envisage}</SelectItem>
                  <SelectItem value="realise">{TYPE_LABELS.realise}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Régime cible</Label>
              <Select value={regimeCible} onValueChange={setRegimeCible}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REGIMES_MATRIMONIAUX.map(regime => (
                    <SelectItem key={regime} value={regime}>{regime}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">{type === 'realise' ? 'Date du changement' : 'Date envisagée'}</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="max-w-xs" />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Motivation civile du changement (à documenter en cas de contrôle — art. L. 64 LPF)</Label>
            <Textarea
              value={motivationCivile}
              onChange={(e) => setMotivationCivile(e.target.value)}
              placeholder="Ex : protection du conjoint, réorganisation patrimoniale liée à un changement de situation professionnelle..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={resetForm}>Annuler</Button>
            <Button type="button" onClick={handleSubmit} disabled={!date || submitting}>
              {submitting ? 'Enregistrement...' : 'Ajouter le scénario'}
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={() => setIsAdding(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un scénario
        </Button>
      )}
    </div>
  );
}
