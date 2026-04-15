import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, ChevronDown, Users, Eye, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/patrimoine/utils';

export interface BeneficiaireEntry {
  familyLinkId: string;
  nom: string;
  prenom: string;
  lien: string;
  pourcentage: number;
  typeDetention: 'pleine-propriete' | 'usufruit';
  nuProprietaireId?: string;
  nuProprietaireNom?: string;
}

export interface ClauseNiveau {
  beneficiaires: BeneficiaireEntry[];
}

export interface ClauseStructuree {
  niveaux: ClauseNiveau[];
}

interface FamilyMember {
  id: string;
  nom: string;
  prenom: string | null;
  lien: string;
}

interface ClauseBeneficiaireBuilderProps {
  clause: ClauseStructuree;
  onChange: (clause: ClauseStructuree) => void;
  familyMembers: FamilyMember[];
  conjointName?: string | null;
  contractValue: number;
}

const EMPTY_BENEFICIAIRE: BeneficiaireEntry = {
  familyLinkId: '',
  nom: '',
  prenom: '',
  lien: '',
  pourcentage: 100,
  typeDetention: 'pleine-propriete',
};

export const ClauseBeneficiaireBuilder: React.FC<ClauseBeneficiaireBuilderProps> = ({
  clause,
  onChange,
  familyMembers,
  conjointName,
  contractValue,
}) => {
  // Build list of selectable people (family members + conjoint)
  const selectablePersons = useMemo(() => {
    const persons: FamilyMember[] = [];
    if (conjointName) {
      persons.push({
        id: 'conjoint',
        nom: conjointName.split(' ').slice(1).join(' ') || conjointName,
        prenom: conjointName.split(' ')[0] || null,
        lien: 'Conjoint',
      });
    }
    familyMembers.forEach(m => {
      persons.push({
        id: m.id,
        nom: m.nom,
        prenom: m.prenom,
        lien: m.lien,
      });
    });
    return persons;
  }, [familyMembers, conjointName]);

  const updateNiveau = (niveauIdx: number, niveau: ClauseNiveau) => {
    const newNiveaux = [...clause.niveaux];
    newNiveaux[niveauIdx] = niveau;
    onChange({ ...clause, niveaux: newNiveaux });
  };

  const addNiveau = () => {
    onChange({
      ...clause,
      niveaux: [...clause.niveaux, { beneficiaires: [{ ...EMPTY_BENEFICIAIRE }] }],
    });
  };

  const removeNiveau = (idx: number) => {
    const newNiveaux = clause.niveaux.filter((_, i) => i !== idx);
    onChange({ ...clause, niveaux: newNiveaux });
  };

  const addBeneficiaire = (niveauIdx: number) => {
    const niveau = clause.niveaux[niveauIdx];
    const existingCount = niveau.beneficiaires.length;
    const newPct = Math.floor(100 / (existingCount + 1));
    const updatedBenefs = niveau.beneficiaires.map(b => ({
      ...b,
      pourcentage: newPct,
    }));
    updatedBenefs.push({ ...EMPTY_BENEFICIAIRE, pourcentage: 100 - newPct * existingCount });
    updateNiveau(niveauIdx, { beneficiaires: updatedBenefs });
  };

  const removeBeneficiaire = (niveauIdx: number, benefIdx: number) => {
    const niveau = clause.niveaux[niveauIdx];
    const newBenefs = niveau.beneficiaires.filter((_, i) => i !== benefIdx);
    if (newBenefs.length === 1) {
      newBenefs[0].pourcentage = 100;
    } else if (newBenefs.length > 1) {
      // Redistribute
      const pct = Math.floor(100 / newBenefs.length);
      newBenefs.forEach((b, i) => {
        b.pourcentage = i === newBenefs.length - 1 ? 100 - pct * (newBenefs.length - 1) : pct;
      });
    }
    updateNiveau(niveauIdx, { beneficiaires: newBenefs });
  };

  const updateBeneficiaire = (niveauIdx: number, benefIdx: number, updates: Partial<BeneficiaireEntry>) => {
    const niveau = clause.niveaux[niveauIdx];
    const newBenefs = [...niveau.beneficiaires];
    newBenefs[benefIdx] = { ...newBenefs[benefIdx], ...updates };
    updateNiveau(niveauIdx, { beneficiaires: newBenefs });
  };

  const selectPerson = (niveauIdx: number, benefIdx: number, personId: string) => {
    const person = selectablePersons.find(p => p.id === personId);
    if (!person) return;
    updateBeneficiaire(niveauIdx, benefIdx, {
      familyLinkId: person.id,
      nom: person.nom,
      prenom: person.prenom || '',
      lien: person.lien,
    });
  };

  const getUsedPersonIds = (niveauIdx: number, excludeBenefIdx?: number) => {
    return clause.niveaux[niveauIdx].beneficiaires
      .filter((_, i) => i !== excludeBenefIdx)
      .map(b => b.familyLinkId)
      .filter(Boolean);
  };

  // Real-time preview computation
  const preview = useMemo(() => {
    return clause.niveaux.map((niveau, idx) => {
      const total = niveau.beneficiaires.reduce((s, b) => s + b.pourcentage, 0);
      const isValid = total === 100;
      return {
        label: idx === 0 ? 'Bénéficiaire(s) principal(aux)' : `À défaut (niveau ${idx + 1})`,
        beneficiaires: niveau.beneficiaires.map(b => {
          const amount = isValid ? (contractValue * b.pourcentage) / 100 : 0;
          return {
            ...b,
            montantEstime: amount,
          };
        }),
        totalPct: total,
        isValid,
      };
    });
  }, [clause, contractValue]);

  // Generate clause text
  const generatedClauseText = useMemo(() => {
    const parts: string[] = [];
    clause.niveaux.forEach((niveau, idx) => {
      const benefParts = niveau.beneficiaires.map(b => {
        if (!b.nom) return '';
        const name = `${b.prenom} ${b.nom}`.trim();
        const pctStr = niveau.beneficiaires.length > 1 ? ` pour ${b.pourcentage}%` : '';
        const detentionStr = b.typeDetention === 'usufruit'
          ? ` en usufruit${b.nuProprietaireNom ? `, la nue-propriété revenant à ${b.nuProprietaireNom}` : ''}`
          : ' en pleine propriété';
        return `${name}${pctStr}${detentionStr}`;
      }).filter(Boolean);

      if (benefParts.length === 0) return;

      const prefix = idx === 0 ? '' : 'à défaut, ';
      parts.push(`${prefix}${benefParts.join(', ')}`);
    });
    parts.push('à défaut, mes héritiers');
    return parts.join(' ; ') + '.';
  }, [clause]);

  return (
    <div className="space-y-6">
      {/* Niveaux */}
      {clause.niveaux.map((niveau, niveauIdx) => {
        const totalPct = niveau.beneficiaires.reduce((s, b) => s + b.pourcentage, 0);
        const isValidPct = totalPct === 100;
        const usedIds = getUsedPersonIds(niveauIdx);

        return (
          <div key={niveauIdx} className="space-y-4">
            {niveauIdx > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <ArrowDown className="h-4 w-4" />
                  <span>À défaut</span>
                </div>
                <Separator className="flex-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeNiveau(niveauIdx)}
                  className="text-destructive hover:text-destructive h-7 px-2"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            <div className="rounded-lg border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {niveauIdx === 0 ? 'Bénéficiaire(s) principal(aux)' : `Bénéficiaire(s) subsidiaire(s) — niveau ${niveauIdx + 1}`}
                </span>
                {niveau.beneficiaires.length > 1 && (
                  <div className={cn(
                    "text-xs px-2 py-0.5 rounded",
                    isValidPct ? "bg-muted text-muted-foreground" : "bg-destructive/10 text-destructive"
                  )}>
                    Total : {totalPct}%
                    {!isValidPct && ' (doit être 100%)'}
                  </div>
                )}
              </div>

              {niveau.beneficiaires.map((benef, benefIdx) => (
                <div key={benefIdx} className="space-y-3 p-3 rounded-md bg-muted/30">
                  <div className="flex items-start gap-3">
                    {/* Person select */}
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-xs">Membre de la famille</Label>
                      <Select
                        value={benef.familyLinkId || ''}
                        onValueChange={(val) => selectPerson(niveauIdx, benefIdx, val)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Sélectionner un bénéficiaire" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectablePersons
                            .filter(p => !usedIds.includes(p.id) || p.id === benef.familyLinkId)
                            .map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.prenom} {p.nom} ({p.lien})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Percentage */}
                    {niveau.beneficiaires.length > 1 && (
                      <div className="w-20 space-y-1.5">
                        <Label className="text-xs">Part (%)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          className="h-9"
                          value={benef.pourcentage}
                          onChange={(e) => updateBeneficiaire(niveauIdx, benefIdx, {
                            pourcentage: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)),
                          })}
                        />
                      </div>
                    )}

                    {/* Remove */}
                    {niveau.beneficiaires.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 mt-5 text-muted-foreground hover:text-destructive"
                        onClick={() => removeBeneficiaire(niveauIdx, benefIdx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  {/* Detention type */}
                  <div className="flex items-center gap-4">
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-xs">Type de détention</Label>
                      <Select
                        value={benef.typeDetention}
                        onValueChange={(val: 'pleine-propriete' | 'usufruit') => {
                          updateBeneficiaire(niveauIdx, benefIdx, {
                            typeDetention: val,
                            ...(val === 'pleine-propriete' && { nuProprietaireId: undefined, nuProprietaireNom: undefined }),
                          });
                        }}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pleine-propriete">Pleine propriété</SelectItem>
                          <SelectItem value="usufruit">Usufruit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Nu-propriétaire if usufruit */}
                    {benef.typeDetention === 'usufruit' && (
                      <div className="flex-1 space-y-1.5">
                        <Label className="text-xs">Nu-propriétaire</Label>
                        <Select
                          value={benef.nuProprietaireId || ''}
                          onValueChange={(val) => {
                            const person = selectablePersons.find(p => p.id === val);
                            updateBeneficiaire(niveauIdx, benefIdx, {
                              nuProprietaireId: val,
                              nuProprietaireNom: person ? `${person.prenom || ''} ${person.nom}`.trim() : '',
                            });
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent>
                            {selectablePersons
                              .filter(p => p.id !== benef.familyLinkId)
                              .map(p => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.prenom} {p.nom} ({p.lien})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => addBeneficiaire(niveauIdx)}
                className="text-xs gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter un bénéficiaire
              </Button>
            </div>
          </div>
        );
      })}

      {/* Add "à défaut" level */}
      <Button
        variant="outline"
        size="sm"
        onClick={addNiveau}
        className="gap-2 w-full"
      >
        <ArrowDown className="h-4 w-4" />
        Ajouter un niveau « à défaut »
      </Button>

      {/* Final fallback */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
        <Users className="h-4 w-4 shrink-0" />
        <span>À défaut de tous les bénéficiaires désignés : <strong>mes héritiers</strong></span>
      </div>

      <Separator />

      {/* Real-time preview */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Eye className="h-4 w-4" />
          Aperçu en temps réel
        </div>

        {/* Amount breakdown */}
        {preview.map((niveau, idx) => (
          <div key={idx} className="space-y-2">
            {idx > 0 && (
              <p className="text-xs text-muted-foreground italic">↳ À défaut :</p>
            )}
            {niveau.beneficiaires.map((b, bIdx) => {
              if (!b.nom) return null;
              return (
                <div key={bIdx} className="flex items-center justify-between px-3 py-2 rounded-md bg-muted/30">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                      {(b.prenom?.[0] || '').toUpperCase()}{b.nom[0]?.toUpperCase()}
                    </div>
                    <div>
                      <span className="text-sm font-medium">{b.prenom} {b.nom}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {b.pourcentage}% · {b.typeDetention === 'usufruit' ? 'Usufruit' : 'PP'}
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-semibold">
                    {niveau.isValid ? formatCurrency(b.montantEstime) : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        ))}

        {/* Generated clause text */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Clause générée</Label>
          <div className="p-3 rounded-lg bg-muted/50 text-sm italic text-muted-foreground leading-relaxed">
            {generatedClauseText}
          </div>
        </div>
      </div>
    </div>
  );
};
