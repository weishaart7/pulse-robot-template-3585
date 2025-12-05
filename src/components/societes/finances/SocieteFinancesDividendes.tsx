import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Banknote, Plus, Trash2, Percent } from 'lucide-react';
import { useSocieteDividendes } from '@/hooks/useSocieteDividendes';
import { format } from 'date-fns';

interface SocieteFinancesDividendesProps {
  societeId: string | null;
  valeurEstimee?: number;
}

const BENEFICIAIRES = [
  { value: 'utilisateur', label: 'Moi' },
  { value: 'conjoint', label: 'Conjoint' },
  { value: 'couple', label: 'Le couple' },
];

export const SocieteFinancesDividendes: React.FC<SocieteFinancesDividendesProps> = ({
  societeId,
  valeurEstimee,
}) => {
  const { dividendes, loading, addDividende, deleteDividende, stats } = useSocieteDividendes(societeId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newDividende, setNewDividende] = useState({
    exercice_annee: new Date().getFullYear() - 1,
    montant_brut: '',
    montant_net: '',
    date_distribution: '',
    beneficiaire: 'utilisateur',
  });

  const formatCurrency = (value: number | null | undefined) => {
    if (value === undefined || value === null) return '-';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
  };

  // Calculate yield
  const rendementMoyen = valeurEstimee && valeurEstimee > 0 && stats.moyenneBrut > 0
    ? (stats.moyenneBrut / valeurEstimee) * 100
    : null;

  // Prepare chart data
  const chartData = dividendes
    .slice()
    .sort((a, b) => a.exercice_annee - b.exercice_annee)
    .map((d) => ({
      annee: d.exercice_annee.toString(),
      montant: d.montant_brut,
    }));

  const handleSubmit = async () => {
    if (!societeId || !newDividende.montant_brut) return;

    await addDividende({
      societe_id: societeId,
      exercice_annee: newDividende.exercice_annee,
      montant_brut: parseFloat(newDividende.montant_brut.replace(',', '.')),
      montant_net: newDividende.montant_net ? parseFloat(newDividende.montant_net.replace(',', '.')) : undefined,
      date_distribution: newDividende.date_distribution || undefined,
      beneficiaire: newDividende.beneficiaire,
    });

    setNewDividende({
      exercice_annee: new Date().getFullYear() - 1,
      montant_brut: '',
      montant_net: '',
      date_distribution: '',
      beneficiaire: 'utilisateur',
    });
    setIsDialogOpen(false);
  };

  // Generate year options (last 10 years)
  const yearOptions = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary" />
            Dividendes
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={!societeId}>
                <Plus className="h-4 w-4 mr-1" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouveau dividende</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Exercice</Label>
                  <Select
                    value={newDividende.exercice_annee.toString()}
                    onValueChange={(value) => setNewDividende({ ...newDividende, exercice_annee: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((year) => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Montant brut (€)</Label>
                  <Input
                    type="text"
                    placeholder="0"
                    value={newDividende.montant_brut}
                    onChange={(e) => setNewDividende({ ...newDividende, montant_brut: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Montant net après PFU (€)</Label>
                  <Input
                    type="text"
                    placeholder="0"
                    value={newDividende.montant_net}
                    onChange={(e) => setNewDividende({ ...newDividende, montant_net: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date de distribution</Label>
                  <Input
                    type="date"
                    value={newDividende.date_distribution}
                    onChange={(e) => setNewDividende({ ...newDividende, date_distribution: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bénéficiaire</Label>
                  <Select
                    value={newDividende.beneficiaire}
                    onValueChange={(value) => setNewDividende({ ...newDividende, beneficiaire: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BENEFICIAIRES.map((b) => (
                        <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSubmit} className="w-full">
                  Enregistrer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Total distribué</p>
            <p className="text-sm font-semibold">{formatCurrency(stats.totalBrut)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Moyenne / an</p>
            <p className="text-sm font-semibold">{formatCurrency(stats.moyenneBrut)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Nb. distributions</p>
            <p className="text-sm font-semibold">{stats.nombreDistributions}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Percent className="h-3 w-3" />
              Rendement moy.
            </p>
            <p className="text-sm font-semibold">
              {rendementMoyen !== null ? `${rendementMoyen.toFixed(1)}%` : '-'}
            </p>
          </div>
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="h-40 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="annee" className="text-xs" />
                <YAxis 
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`}
                  className="text-xs"
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Dividende']}
                />
                <Bar 
                  dataKey="montant" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* History list */}
        {dividendes.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Historique</p>
            <div className="space-y-1">
              {dividendes.slice(0, 5).map((d) => (
                <div key={d.id} className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg text-sm">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{d.exercice_annee}</span>
                    <span>{formatCurrency(d.montant_brut)}</span>
                    {d.beneficiaire && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded">
                        {BENEFICIAIRES.find(b => b.value === d.beneficiaire)?.label || d.beneficiaire}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteDividende(d.id)}
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
            Enregistrez d'abord la société pour ajouter des dividendes
          </p>
        )}
      </CardContent>
    </Card>
  );
};
