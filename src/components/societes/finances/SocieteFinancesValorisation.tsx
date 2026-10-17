import React, { useState } from 'react';
import { PanelCard, PanelCardContent, PanelCardHeader, PanelCardTitle } from '@/components/layout/panel-section';
import { panelButtonClass, panelPrimaryButtonClass } from '@/components/layout/workspace-panel';
import { LAGON_INK } from '@/components/budget/budgetColors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, Trash2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useSocieteValorisations } from '@/hooks/useSocieteValorisations';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SocieteFinancesValorisationProps {
  societeId: string | null;
  valeurEstimee?: number;
  nombreTitres?: number;
}

const METHODES_VALORISATION = [
  { value: 'patrimoine_net', label: 'Patrimoine net' },
  { value: 'multiples', label: 'Multiples (CA/EBITDA)' },
  { value: 'dcf', label: 'DCF (Flux actualisés)' },
  { value: 'expert', label: 'Expertise externe' },
  { value: 'autre', label: 'Autre' },
];

export const SocieteFinancesValorisation: React.FC<SocieteFinancesValorisationProps> = ({
  societeId,
  valeurEstimee,
  nombreTitres,
}) => {
  const { valorisations, loading, addValorisation, deleteValorisation, stats, chartData } = useSocieteValorisations(societeId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newValorisation, setNewValorisation] = useState({
    date_valorisation: format(new Date(), 'yyyy-MM-dd'),
    valeur: '',
    methode_valorisation: '',
    commentaire: '',
  });

  const formatCurrency = (value: number | null | undefined) => {
    if (value === undefined || value === null) return '-';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const valeurParTitre = valeurEstimee && nombreTitres && nombreTitres > 0 
    ? valeurEstimee / nombreTitres 
    : null;

  const handleSubmit = async () => {
    if (!societeId || !newValorisation.valeur) return;

    await addValorisation({
      societe_id: societeId,
      date_valorisation: newValorisation.date_valorisation,
      valeur: parseFloat(newValorisation.valeur.replace(',', '.')),
      methode_valorisation: newValorisation.methode_valorisation || undefined,
      commentaire: newValorisation.commentaire || undefined,
    });

    setNewValorisation({
      date_valorisation: format(new Date(), 'yyyy-MM-dd'),
      valeur: '',
      methode_valorisation: '',
      commentaire: '',
    });
    setIsDialogOpen(false);
  };

  return (
    <PanelCard>
      <PanelCardHeader>
        <div className="flex items-center justify-between">
          <PanelCardTitle>Valorisation
          </PanelCardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className={`gap-1.5 ${panelButtonClass}`} disabled={!societeId}>
                <Plus className="h-3.5 w-3.5" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent overlayClassName="bg-black/30 backdrop-blur-[6px]" className="workspace-panel rounded-[4px] sm:rounded-[4px]">
              <DialogHeader className="-mx-6 border-b border-border px-6 pb-4">
                <DialogTitle className="text-[16px] font-medium leading-tight tracking-[-0.01em]">Nouvelle valorisation</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Date de valorisation</Label>
                  <Input
                    type="date"
                    value={newValorisation.date_valorisation}
                    onChange={(e) => setNewValorisation({ ...newValorisation, date_valorisation: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valeur (€)</Label>
                  <Input
                    type="text"
                    placeholder="0"
                    value={newValorisation.valeur}
                    onChange={(e) => setNewValorisation({ ...newValorisation, valeur: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Méthode de valorisation</Label>
                  <Select
                    value={newValorisation.methode_valorisation}
                    onValueChange={(value) => setNewValorisation({ ...newValorisation, methode_valorisation: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une méthode" />
                    </SelectTrigger>
                    <SelectContent>
                      {METHODES_VALORISATION.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Commentaire</Label>
                  <Textarea
                    placeholder="Notes sur cette valorisation..."
                    value={newValorisation.commentaire}
                    onChange={(e) => setNewValorisation({ ...newValorisation, commentaire: e.target.value })}
                  />
                </div>
                <Button onClick={handleSubmit} className={`w-full ${panelPrimaryButtonClass}`}>
                  Enregistrer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </PanelCardHeader>
      <PanelCardContent>
        {/* KPIs */}
        <div className="grid grid-cols-1 divide-y divide-border border-y border-border sm:grid-cols-4 sm:divide-x sm:divide-y-0 mb-6">
          <div className="px-4 py-2.5 first:pl-0">
            <p className="text-xs text-muted-foreground">Valeur actuelle</p>
            <p className="text-[13px] font-medium tabular-nums">{formatCurrency(valeurEstimee)}</p>
          </div>
          <div className="px-4 py-2.5 first:pl-0">
            <p className="text-xs text-muted-foreground">Valeur / titre</p>
            <p className="text-[13px] font-medium tabular-nums">{formatCurrency(valeurParTitre)}</p>
          </div>
          <div className="px-4 py-2.5 first:pl-0">
            <p className="text-xs text-muted-foreground">Nb. titres</p>
            <p className="text-[13px] font-medium tabular-nums">{nombreTitres || '-'}</p>
          </div>
          <div className="px-4 py-2.5 first:pl-0">
            <p className="text-xs text-muted-foreground">Évolution</p>
            <p className={`text-[13px] font-medium tabular-nums flex items-center gap-1 ${
              stats.evolutionPourcent !== null 
                ? stats.evolutionPourcent >= 0 ? 'text-positive' : 'text-destructive'
                : ''
            }`}>
              {stats.evolutionPourcent !== null ? (
                <>
                  {stats.evolutionPourcent >= 0 ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {stats.evolutionPourcent.toFixed(1)}%
                </>
              ) : '-'}
            </p>
          </div>
        </div>

        {/* Chart */}
        {chartData.length > 1 && (
          <div className="h-48 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => format(new Date(value), 'MMM yyyy', { locale: fr })}
                  className="text-xs"
                />
                <YAxis 
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`}
                  className="text-xs"
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Valeur']}
                  labelFormatter={(label) => format(new Date(label), 'dd MMMM yyyy', { locale: fr })}
                />
                <Line 
                  type="monotone" 
                  dataKey="valeur" 
                  stroke={LAGON_INK} 
                  strokeWidth={2}
                  dot={{ fill: LAGON_INK }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* History list */}
        {valorisations.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Historique</p>
            <div className="space-y-1">
              {valorisations.slice(0, 5).map((v) => (
                <div key={v.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">
                      {format(new Date(v.date_valorisation), 'dd/MM/yyyy')}
                    </span>
                    <span className="font-medium">{formatCurrency(v.valeur)}</span>
                    {v.methode_valorisation && (
                      <span className="rounded-[2px] bg-[#e9e5e0] px-2 py-0.5 text-xs">
                        {METHODES_VALORISATION.find(m => m.value === v.methode_valorisation)?.label || v.methode_valorisation}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteValorisation(v.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!societeId && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Enregistrez d'abord la société pour ajouter des valorisations
          </p>
        )}
      </PanelCardContent>
    </PanelCard>
  );
};
