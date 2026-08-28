import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Plus } from 'lucide-react';
import { usePatrimoineFinal } from '@/hooks/usePatrimoineFinal';
import { useAssets } from '@/hooks/useAssets';
import { PatrimoineFinal, EpouxConcerne } from '@/types/participationAcquets';

export function PatrimoineFinalSection() {
  const { data: lignes, saving, addLigne, removeLigne } = usePatrimoineFinal();
  const { assets } = useAssets();
  const [isAdding, setIsAdding] = useState(false);

  const [epoux, setEpoux] = useState<EpouxConcerne>('user');
  const [bienConcerneId, setBienConcerneId] = useState<string>('');
  const [nature, setNature] = useState('');
  const [valeur, setValeur] = useState('');
  const [bienProfessionnel, setBienProfessionnel] = useState(false);

  const resetForm = () => {
    setEpoux('user');
    setBienConcerneId('');
    setNature('');
    setValeur('');
    setBienProfessionnel(false);
    setIsAdding(false);
  };

  const handleSubmit = async () => {
    const montant = Number(valeur);
    if (!nature || !montant) return;

    await addLigne({
      epoux,
      bien_concerne_id: bienConcerneId || null,
      nature,
      valeur: montant,
      bien_professionnel: bienProfessionnel,
    });
    resetForm();
  };

  const assetLabel = (id?: string | null) => assets?.find(a => a.id === id)?.denomination || 'Bien sans nom';

  const describe = (l: PatrimoineFinal) => `${l.nature} (${l.epoux === 'user' ? 'vous' : 'conjoint'})`;

  return (
    <div className="rounded-md border bg-card p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Patrimoine final</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Ce que chaque époux possède au jour de la dissolution du régime (art. 1571 C. civ.).
      </p>

      {lignes.length > 0 && (
        <div className="space-y-3 mb-5">
          {lignes.map(l => (
            <div key={l.id} className="rounded-md border p-4 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">{describe(l)}</p>
                <p className="text-xs text-muted-foreground">
                  Valeur : {l.valeur.toLocaleString()}€
                  {l.bien_professionnel && ' · Bien professionnel'}
                  {l.bien_concerne_id && ` · ${assetLabel(l.bien_concerne_id)}`}
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon" className="shrink-0 h-7 w-7" onClick={() => removeLigne(l.id)}>
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
              <Label className="text-xs">Époux concerné</Label>
              <Select value={epoux} onValueChange={(v) => setEpoux(v as EpouxConcerne)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Vous</SelectItem>
                  <SelectItem value="spouse">Conjoint</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Bien concerné (facultatif)</Label>
              <Select
                value={bienConcerneId || '__none__'}
                onValueChange={(v) => {
                  const id = v === '__none__' ? '' : v;
                  setBienConcerneId(id);
                  if (id) {
                    const asset = assets?.find(a => a.id === id);
                    if (asset && asset.valeur_estimee != null) {
                      setValeur(String(asset.valeur_estimee));
                    }
                  }
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Aucun</SelectItem>
                  {assets?.map(a => (
                    <SelectItem key={a.id} value={a.id!}>{a.denomination || 'Bien sans nom'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Nature</Label>
              <Input value={nature} onChange={(e) => setNature(e.target.value)} placeholder="Ex : Appartement, PEA..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Valeur (€)</Label>
              <Input type="number" value={valeur} onChange={(e) => setValeur(e.target.value)} placeholder="Ex : 200 000" />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="bien-professionnel-final" checked={bienProfessionnel} onCheckedChange={(c) => setBienProfessionnel(!!c)} />
            <Label htmlFor="bien-professionnel-final" className="text-sm cursor-pointer">Bien professionnel</Label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={resetForm}>Annuler</Button>
            <Button type="button" onClick={handleSubmit} disabled={!nature || !valeur || saving}>
              {saving ? 'Enregistrement...' : 'Ajouter la ligne'}
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={() => setIsAdding(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un bien au patrimoine final
        </Button>
      )}
    </div>
  );
}
