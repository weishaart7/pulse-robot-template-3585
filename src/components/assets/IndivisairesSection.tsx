import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { AssetIndivisaire } from '@/services/assetIndivisaireService';

export interface IndivisaireDraft {
  type_indivisaire: 'famille' | 'tiers';
  family_link_id?: string | null;
  nom_libre?: string | null;
  pourcentage: number;
}

interface Props {
  familyMembers: Array<{ id?: string; nom: string; prenom?: string }>;
  value: IndivisaireDraft[];
  onChange: (next: IndivisaireDraft[]) => void;
}

export const IndivisairesSection: React.FC<Props> = ({ familyMembers, value, onChange }) => {
  const total = value.reduce((acc, i) => acc + (Number(i.pourcentage) || 0), 0);

  const addIndivisaire = (type: 'famille' | 'tiers') => {
    onChange([
      ...value,
      {
        type_indivisaire: type,
        family_link_id: null,
        nom_libre: '',
        pourcentage: 0,
      },
    ]);
  };

  const updateAt = (idx: number, patch: Partial<IndivisaireDraft>) => {
    const next = value.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    onChange(next);
  };

  const removeAt = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4 rounded-md border p-4 bg-muted/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-sm font-medium">Co-indivisaires</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => addIndivisaire('famille')}>
            <Plus className="h-3 w-3 mr-1" /> Famille
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => addIndivisaire('tiers')}>
            <Plus className="h-3 w-3 mr-1" /> Tiers
          </Button>
        </div>
      </div>

      {value.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          Aucun co-indivisaire. Ajoutez un membre de la famille ou un tiers (libellé libre).
        </p>
      ) : (
        <div className="space-y-2">
          {value.map((it, idx) => (
            <Card key={idx} className="p-3">
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-7">
                  {it.type_indivisaire === 'famille' ? (
                    <Select
                      value={it.family_link_id || ''}
                      onValueChange={(v) => updateAt(idx, { family_link_id: v })}
                    >
                      <SelectTrigger size="lg">
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
                  ) : (
                    <Input
                      placeholder="Nom du tiers indivisaire"
                      value={it.nom_libre || ''}
                      onChange={(e) => updateAt(idx, { nom_libre: e.target.value })}
                    />
                  )}
                </div>
                <div className="col-span-3">
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={it.pourcentage}
                      onChange={(e) => updateAt(idx, { pourcentage: parseFloat(e.target.value) || 0 })}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  </div>
                </div>
                <div className="col-span-2 flex justify-end">
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeAt(idx)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          <p className={`text-xs ${total === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
            Total des parts : {total.toFixed(1)}% {total !== 100 && '(devrait être 100%)'}
          </p>
        </div>
      )}
    </div>
  );
};

export const draftsFromIndivisaires = (rows: AssetIndivisaire[]): IndivisaireDraft[] =>
  rows.map((r) => ({
    type_indivisaire: r.type_indivisaire,
    family_link_id: r.family_link_id || null,
    nom_libre: r.nom_libre || '',
    pourcentage: Number(r.pourcentage) || 0,
  }));
