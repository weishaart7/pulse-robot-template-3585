import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Plus, Trash2, Calendar, TrendingUp, TrendingDown, Shield, Users, FileText, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Asset } from '@/services/assetService';
import { formatCurrency } from '@/lib/patrimoine/utils';
import { toast } from 'sonner';
import { AVFiscalInfo } from './AVFiscalInfo';
import { AVOperationsTable } from './AVOperationsTable';

interface AVContractDetailProps {
  contract: Asset;
  onBack: () => void;
  subscriberAge: number | null;
}

interface AVDetails {
  id?: string;
  part_fonds_euros: number;
  part_unites_compte: number;
  clause_beneficiaire: string;
}

interface AVOperation {
  id: string;
  type_operation: 'versement' | 'rachat';
  montant: number;
  date_operation: string;
  commentaire: string | null;
}

export const AVContractDetail: React.FC<AVContractDetailProps> = ({ contract, onBack, subscriberAge }) => {
  const [details, setDetails] = useState<AVDetails>({
    part_fonds_euros: 0,
    part_unites_compte: 0,
    clause_beneficiaire: '',
  });
  const [operations, setOperations] = useState<AVOperation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const dateSubscription = contract.date_acquisition ? new Date(contract.date_acquisition) : null;

  // Determine fiscal regime
  const fiscalRegime = useMemo(() => {
    if (!dateSubscription) return 'unknown';
    const date1 = new Date('1997-09-26');
    const date2 = new Date('2017-09-27');
    if (dateSubscription < date1) return 'avant_1997';
    if (dateSubscription <= date2) return 'entre_1997_2017';
    return 'apres_2017';
  }, [dateSubscription]);

  // Contract age in years
  const contractAge = useMemo(() => {
    if (!dateSubscription) return 0;
    const now = new Date();
    return Math.floor((now.getTime() - dateSubscription.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  }, [dateSubscription]);

  // 990I vs 757B based on subscriber age
  const transmissionRegime = useMemo(() => {
    if (subscriberAge === null) return null;
    return subscriberAge < 70 ? '990I' : '757B';
  }, [subscriberAge]);

  useEffect(() => {
    fetchData();
  }, [contract.id]);

  const fetchData = async () => {
    try {
      const [detailsRes, opsRes] = await Promise.all([
        supabase
          .from('av_contract_details')
          .select('*')
          .eq('asset_id', contract.id)
          .maybeSingle(),
        supabase
          .from('av_operations')
          .select('*')
          .eq('asset_id', contract.id)
          .order('date_operation', { ascending: false }),
      ]);

      if (detailsRes.data) {
        setDetails({
          id: detailsRes.data.id,
          part_fonds_euros: detailsRes.data.part_fonds_euros || 0,
          part_unites_compte: detailsRes.data.part_unites_compte || 0,
          clause_beneficiaire: detailsRes.data.clause_beneficiaire || '',
        });
      }
      if (opsRes.data) {
        setOperations(opsRes.data as AVOperation[]);
      }
    } catch (error) {
      console.error('Error fetching AV details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveDetails = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (details.id) {
        await supabase
          .from('av_contract_details')
          .update({
            part_fonds_euros: details.part_fonds_euros,
            part_unites_compte: details.part_unites_compte,
            clause_beneficiaire: details.clause_beneficiaire,
          })
          .eq('id', details.id);
      } else {
        const { data } = await supabase
          .from('av_contract_details')
          .insert({
            user_id: user.id,
            asset_id: contract.id,
            part_fonds_euros: details.part_fonds_euros,
            part_unites_compte: details.part_unites_compte,
            clause_beneficiaire: details.clause_beneficiaire,
          })
          .select()
          .single();
        if (data) setDetails(prev => ({ ...prev, id: data.id }));
      }
      toast.success('Détails enregistrés');
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const addOperation = async (type: 'versement' | 'rachat', montant: number, date: string, commentaire: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('av_operations')
      .insert({
        user_id: user.id,
        asset_id: contract.id,
        type_operation: type,
        montant,
        date_operation: date,
        commentaire: commentaire || null,
      })
      .select()
      .single();

    if (error) {
      toast.error('Erreur lors de l\'ajout');
      return;
    }
    if (data) {
      setOperations(prev => [data as AVOperation, ...prev]);
      toast.success(type === 'versement' ? 'Versement ajouté' : 'Rachat ajouté');
    }
  };

  const deleteOperation = async (id: string) => {
    const { error } = await supabase.from('av_operations').delete().eq('id', id);
    if (error) {
      toast.error('Erreur lors de la suppression');
      return;
    }
    setOperations(prev => prev.filter(op => op.id !== id));
    toast.success('Opération supprimée');
  };

  const totalVersements = operations
    .filter(op => op.type_operation === 'versement')
    .reduce((sum, op) => sum + op.montant, 0);
  const totalRachats = operations
    .filter(op => op.type_operation === 'rachat')
    .reduce((sum, op) => sum + op.montant, 0);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h3 className="text-xl font-semibold">
            {contract.denomination || contract.nature}
          </h3>
          <div className="flex items-center gap-3 mt-1">
            <Badge variant="secondary">{contract.nature}</Badge>
            {contract.etablissement && (
              <span className="text-sm text-muted-foreground">{contract.etablissement}</span>
            )}
            {dateSubscription && (
              <span className="text-sm text-muted-foreground">
                Souscrit le {dateSubscription.toLocaleDateString('fr-FR')}
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{formatCurrency(contract.valeur_estimee || 0)}</p>
          {contract.detenteur && (
            <p className="text-sm text-muted-foreground">{contract.detenteur}</p>
          )}
        </div>
      </div>

      {/* Info cards row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Ancienneté</span>
            </div>
            <p className="text-lg font-semibold">{contractAge} ans</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Total versements</span>
            </div>
            <p className="text-lg font-semibold">{formatCurrency(totalVersements)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Total rachats</span>
            </div>
            <p className="text-lg font-semibold">{formatCurrency(totalRachats)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Régime transmission</span>
            </div>
            {transmissionRegime ? (
              <Badge variant={transmissionRegime === '990I' ? 'default' : 'secondary'}>
                Art. {transmissionRegime}
              </Badge>
            ) : (
              <span className="text-sm text-muted-foreground">Âge non renseigné</span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fiscal regime info */}
      <AVFiscalInfo
        fiscalRegime={fiscalRegime}
        contractAge={contractAge}
        subscriberAge={subscriberAge}
      />

      {/* Two columns: Composition + Clause */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Composition */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Composition
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Part Fonds en euros (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={details.part_fonds_euros}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setDetails(prev => ({
                    ...prev,
                    part_fonds_euros: val,
                    part_unites_compte: Math.max(0, 100 - val),
                  }));
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Part Unités de compte (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={details.part_unites_compte}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setDetails(prev => ({
                    ...prev,
                    part_unites_compte: val,
                    part_fonds_euros: Math.max(0, 100 - val),
                  }));
                }}
              />
            </div>
            {/* Visual bar */}
            <div className="h-3 rounded-full bg-muted overflow-hidden flex">
              <div
                className="bg-primary transition-all"
                style={{ width: `${details.part_fonds_euros}%` }}
              />
              <div
                className="bg-accent transition-all"
                style={{ width: `${details.part_unites_compte}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Fonds euros : {details.part_fonds_euros}%</span>
              <span>UC : {details.part_unites_compte}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Clause bénéficiaire */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Clause bénéficiaire
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Ex: Mon conjoint, à défaut mes enfants nés ou à naître, vivants ou représentés, par parts égales entre eux, à défaut mes héritiers."
              value={details.clause_beneficiaire}
              onChange={(e) => setDetails(prev => ({ ...prev, clause_beneficiaire: e.target.value }))}
              rows={6}
            />
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
              <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                La clause bénéficiaire détermine qui recevra le capital en cas de décès. 
                Elle prime sur les règles successorales classiques.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save button for details */}
      <div className="flex justify-end">
        <Button onClick={saveDetails} disabled={isSaving}>
          {isSaving ? 'Enregistrement...' : 'Enregistrer les détails'}
        </Button>
      </div>

      <Separator />

      {/* Operations */}
      <AVOperationsTable
        operations={operations}
        onAdd={addOperation}
        onDelete={deleteOperation}
      />
    </div>
  );
};
