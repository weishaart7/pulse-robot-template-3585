import React from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { AssetDemembrement } from '@/services/assetDemembrementService';

export interface DemembrementDraft {
  type_partie: 'famille' | 'tiers';
  family_link_id?: string | null;
  nom_libre?: string | null;
  date_naissance_tiers?: string | null;
}

interface Props {
  role: 'Usufruitier' | 'Nu-propriétaire';
  familyMembers: Array<{ id?: string; nom: string; prenom?: string; date_naissance?: string }>;
  value: DemembrementDraft[];
  onChange: (next: DemembrementDraft[]) => void;
}

export const DemembrementSection: React.FC<Props> = ({ role, familyMembers, value, onChange }) => {
  const addPartie = (type: 'famille' | 'tiers') => {
    onChange([
      ...value,
      {
        type_partie: type,
        family_link_id: null,
        nom_libre: '',
        date_naissance_tiers: '',
      },
    ]);
  };

  const updateAt = (idx: number, patch: Partial<DemembrementDraft>) => {
    const next = value.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    onChange(next);
  };

  const removeAt = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const roleLabel = role === 'Usufruitier' ? 'Usufruitier(s)' : 'Nu(s)-propriétaire(s)';

  return (
    <div className="space-y-4 rounded-md border p-4 bg-muted/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-sm font-medium">{roleLabel} — contrepartie du démembrement</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => addPartie('famille')}>
            <Plus className="h-3 w-3 mr-1" /> Famille
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => addPartie('tiers')}>
            <Plus className="h-3 w-3 mr-1" /> Tiers
          </Button>
        </div>
      </div>

      {value.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          Aucune contrepartie renseignée. Ajoutez un membre de la famille ou un tiers (ex. vendeur ayant conservé l'usufruit).
        </p>
      ) : (
        <div className="space-y-2">
          {value.map((it, idx) => (
            <Card key={idx} className="p-3">
              <div className="grid grid-cols-12 gap-2 items-end">
                {it.type_partie === 'famille' ? (
                  <div className="col-span-10">
                    <Select
                      value={it.family_link_id || ''}
                      onValueChange={(v) => updateAt(idx, { family_link_id: v })}
                    >
                      <SelectTrigger className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring" size="lg">
                        <SelectValue placeholder="Sélectionner un membre" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {familyMembers.map((m) => (
                          <SelectItem key={m.id || m.nom} value={m.id || ''}>
                            {m.prenom ? `${m.prenom} ${m.nom}` : m.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <>
                    <div className="col-span-6">
                      <Input className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring"
                        placeholder="Nom du tiers"
                        value={it.nom_libre || ''}
                        onChange={(e) => updateAt(idx, { nom_libre: e.target.value })}
                      />
                    </div>
                    <div className="col-span-4">
                      <Input className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring"
                        type="date"
                        value={it.date_naissance_tiers || ''}
                        onChange={(e) => updateAt(idx, { date_naissance_tiers: e.target.value })}
                      />
                    </div>
                  </>
                )}
                <div className="col-span-2 flex justify-end">
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeAt(idx)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export const draftsFromDemembrements = (rows: AssetDemembrement[]): DemembrementDraft[] =>
  rows.map((r) => ({
    type_partie: r.type_partie,
    family_link_id: r.family_link_id || null,
    nom_libre: r.nom_libre || '',
    date_naissance_tiers: r.date_naissance_tiers || '',
  }));
