import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, X } from 'lucide-react';
import { useCustomMatrimonialClauses } from '@/hooks/useCustomMatrimonialClauses';
import { useAssets } from '@/hooks/useAssets';
import { CUSTOM_CLAUSE_TAGS, CustomClauseTag } from '@/types/customClause';
import { AssetSelectionModal } from './AssetSelectionModal';

export function ClausesPersonnaliseesSection() {
  const { clauses, isSaving, addClause, removeClause } = useCustomMatrimonialClauses();
  const { assets } = useAssets();
  const [isAdding, setIsAdding] = useState(false);
  const [texte, setTexte] = useState('');
  const [tags, setTags] = useState<CustomClauseTag[]>([]);
  const [biensVises, setBiensVises] = useState<string[]>([]);
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [beneficiaire, setBeneficiaire] = useState('');
  const [parametres, setParametres] = useState<string[]>(['']);

  const resetForm = () => {
    setTexte('');
    setTags([]);
    setBiensVises([]);
    setBeneficiaire('');
    setParametres(['']);
    setIsAdding(false);
  };

  const toggleTag = (tag: CustomClauseTag) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleParametreChange = (index: number, value: string) => {
    setParametres(prev => prev.map((p, i) => i === index ? value : p));
  };

  const handleAddParametre = () => setParametres(prev => [...prev, '']);
  const handleRemoveParametre = (index: number) => setParametres(prev => prev.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    if (!texte.trim()) return;
    await addClause({
      texte: texte.trim(),
      tags,
      biensVises,
      beneficiaire: beneficiaire.trim() || undefined,
      parametres: parametres.map(p => p.trim()).filter(Boolean),
    });
    resetForm();
  };

  const assetLabel = (assetId: string) => assets?.find(a => a.id === assetId)?.denomination || 'Bien sans nom';

  return (
    <div className="rounded-md border bg-card p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Clauses personnalisées</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Clauses spécifiques à l'acte notarié, distinctes du catalogue ci-dessus. Aucun calcul automatique n'y est associé : à vérifier manuellement.
      </p>

      {clauses.length > 0 && (
        <div className="space-y-3 mb-5">
          {clauses.map(clause => (
            <div key={clause.id} className="rounded-md border p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm whitespace-pre-wrap">{clause.texte}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-7 w-7"
                  onClick={() => removeClause(clause.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {clause.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {clause.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs font-normal">{tag}</Badge>
                  ))}
                </div>
              )}
              {clause.biensVises.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {clause.biensVises.map(assetId => (
                    <Badge key={assetId} variant="outline" className="text-xs font-normal">{assetLabel(assetId)}</Badge>
                  ))}
                </div>
              )}
              {(clause.beneficiaire || clause.parametres.length > 0) && (
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                  {clause.beneficiaire && <span>Bénéficiaire : {clause.beneficiaire}</span>}
                  {clause.parametres.length > 0 && <span>Paramètres : {clause.parametres.join(' · ')}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isAdding ? (
        <div className="rounded-md border p-4 space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">Texte de la clause (fidèle à l'acte notarié)</Label>
            <Textarea value={texte} onChange={(e) => setTexte(e.target.value)} rows={3} placeholder="Texte de la clause" />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Tags d'impact (facultatif)</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CUSTOM_CLAUSE_TAGS.map(tag => (
                <label key={tag} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={tags.includes(tag)} onCheckedChange={() => toggleTag(tag)} />
                  {tag}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Bien(s) visé(s)</Label>
              <div>
                <Button type="button" variant="outline" size="sm" onClick={() => setAssetModalOpen(true)}>
                  Sélectionner les biens
                  {biensVises.length > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 bg-primary/10 text-primary rounded-full text-[10px]">
                      {biensVises.length}
                    </span>
                  )}
                </Button>
              </div>
              {biensVises.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {biensVises.map(assetId => (
                    <Badge key={assetId} variant="outline" className="text-xs font-normal">{assetLabel(assetId)}</Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Bénéficiaire de la clause</Label>
              <Input value={beneficiaire} onChange={(e) => setBeneficiaire(e.target.value)} placeholder="Ex : conjoint survivant" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Paramètre(s) chiffré(s)</Label>
            {parametres.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input value={p} onChange={(e) => handleParametreChange(i, e.target.value)} placeholder="Ex : décote 15%" />
                {parametres.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => handleRemoveParametre(i)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={handleAddParametre}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Ajouter un paramètre
            </Button>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={resetForm}>Annuler</Button>
            <Button type="button" onClick={handleSubmit} disabled={!texte.trim() || isSaving}>
              {isSaving ? 'Enregistrement...' : 'Ajouter la clause'}
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={() => setIsAdding(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une clause personnalisée
        </Button>
      )}

      <AssetSelectionModal
        title="Sélectionner les biens visés"
        isOpen={assetModalOpen}
        onClose={() => setAssetModalOpen(false)}
        onConfirm={setBiensVises}
        preSelectedAssets={biensVises}
      />
    </div>
  );
}
