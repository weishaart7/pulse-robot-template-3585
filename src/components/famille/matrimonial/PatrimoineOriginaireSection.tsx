import { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Plus, Landmark } from 'lucide-react';
import { usePatrimoineOriginaire } from '@/hooks/usePatrimoineOriginaire';
import { useAssets } from '@/hooks/useAssets';
import { PatrimoineOriginaire, EpouxConcerne } from '@/types/participationAcquets';
import { SectionHeader } from '@/components/family/SectionHeader';
import { SmartDateInput } from '@/components/family/SmartDateInput';

const FIELD_CLS = "bg-background border-border shadow-none rounded-md focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20";

export function PatrimoineOriginaireSection() {
  const { data: lignes, saving, addLigne, removeLigne } = usePatrimoineOriginaire();
  const { assets } = useAssets();
  const [isAdding, setIsAdding] = useState(false);

  const [epoux, setEpoux] = useState<EpouxConcerne>('user');
  const [bienConcerneId, setBienConcerneId] = useState<string>('');
  const [nature, setNature] = useState('');
  const [valeur, setValeur] = useState('');
  const [bienProfessionnel, setBienProfessionnel] = useState(false);
  const [signe, setSigne] = useState(false);
  const [dateSignature, setDateSignature] = useState<Date | string | undefined>(undefined);

  const resetForm = () => {
    setEpoux('user');
    setBienConcerneId('');
    setNature('');
    setValeur('');
    setBienProfessionnel(false);
    setSigne(false);
    setDateSignature(undefined);
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
      signe,
      date_signature: signe && dateSignature instanceof Date ? format(dateSignature, 'yyyy-MM-dd') : null,
    });
    resetForm();
  };

  const assetLabel = (id?: string | null) => assets?.find(a => a.id === id)?.denomination || 'Bien sans nom';

  const describe = (l: PatrimoineOriginaire) => `${l.nature} (${l.epoux === 'user' ? 'vous' : 'conjoint'})`;

  return (
    <div className="rounded-3xl border border-border bg-card p-8">
      <SectionHeader icon={Landmark} title="Patrimoine originaire" />
      <p className="text-xs text-muted-foreground -mt-4 mb-5">
        Ce que chaque époux possédait au jour du mariage, ou reçu depuis par succession/donation (art. 1570 C. civ.).
      </p>

      <div className="rounded-lg bg-secondary p-5">

      {lignes.length > 0 && (
        <div className="space-y-3 mb-5">
          {lignes.map(l => (
            <div key={l.id} className="rounded-md border border-border bg-background p-4 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">{describe(l)}</p>
                <p className="text-xs text-muted-foreground">
                  Valeur : {l.valeur.toLocaleString()}€
                  {l.bien_professionnel && ' · Bien professionnel'}
                  {l.bien_concerne_id && ` · ${assetLabel(l.bien_concerne_id)}`}
                  {l.signe ? ' · État descriptif signé' : ' · État descriptif non signé'}
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
        <div className="rounded-md border border-border bg-background p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Époux concerné</Label>
              <Select value={epoux} onValueChange={(v) => setEpoux(v as EpouxConcerne)}>
                <SelectTrigger className={FIELD_CLS}><SelectValue /></SelectTrigger>
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
                <SelectTrigger className={FIELD_CLS}><SelectValue /></SelectTrigger>
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
              <Input value={nature} onChange={(e) => setNature(e.target.value)} placeholder="Ex : Appartement, PEA..." className={FIELD_CLS} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Valeur (€)</Label>
              <Input type="number" value={valeur} onChange={(e) => setValeur(e.target.value)} placeholder="Ex : 200 000" className={FIELD_CLS} />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="bien-professionnel-originaire" checked={bienProfessionnel} onCheckedChange={(c) => setBienProfessionnel(!!c)} />
            <Label htmlFor="bien-professionnel-originaire" className="text-sm cursor-pointer">Bien professionnel</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="signe-originaire" checked={signe} onCheckedChange={(c) => setSigne(!!c)} />
            <Label htmlFor="signe-originaire" className="text-sm cursor-pointer">État descriptif signé (art. 1570)</Label>
          </div>

          {signe && (
            <div className="space-y-1 max-w-xs">
              <Label className="text-xs">Date de signature</Label>
              <SmartDateInput value={dateSignature} onChange={setDateSignature} className={FIELD_CLS} />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={resetForm}>Annuler</Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!nature || !valeur || saving}
              className="bg-foreground text-background hover:opacity-90"
              
            >
              {saving ? 'Enregistrement...' : 'Ajouter la ligne'}
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={() => setIsAdding(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un bien au patrimoine originaire
        </Button>
      )}
      </div>
    </div>
  );
}
