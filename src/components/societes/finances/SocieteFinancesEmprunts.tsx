import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Landmark, Plus, Link2, Unlink, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Emprunt {
  id: string;
  libelle: string;
  nature: string;
  capital_restant_du: number | null;
  mensualite: number | null;
  taux_interet: number | null;
  duree_restante: number | null;
  societe_id: string | null;
}

interface SocieteFinancesEmpruntsProps {
  societeId: string | null;
}

export const SocieteFinancesEmprunts: React.FC<SocieteFinancesEmpruntsProps> = ({
  societeId,
}) => {
  const [emprunts, setEmprunts] = useState<Emprunt[]>([]);
  const [linkedEmprunts, setLinkedEmprunts] = useState<Emprunt[]>([]);
  const [availableEmprunts, setAvailableEmprunts] = useState<Emprunt[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEmpruntId, setSelectedEmpruntId] = useState<string>('');

  const formatCurrency = (value: number | null | undefined) => {
    if (value === undefined || value === null) return '-';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const fetchEmprunts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('emprunts')
        .select('id, libelle, nature, capital_restant_du, mensualite, taux_interet, duree_restante, societe_id')
        .order('libelle');

      if (error) throw error;
      
      setEmprunts(data || []);
      
      // Filter linked and available emprunts
      const linked = (data || []).filter(e => e.societe_id === societeId);
      const available = (data || []).filter(e => !e.societe_id);
      
      setLinkedEmprunts(linked);
      setAvailableEmprunts(available);
    } catch (error) {
      console.error('Erreur chargement emprunts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmprunts();
  }, [societeId]);

  const linkEmprunt = async () => {
    if (!societeId || !selectedEmpruntId) return;

    try {
      const { error } = await supabase
        .from('emprunts')
        .update({ societe_id: societeId })
        .eq('id', selectedEmpruntId);

      if (error) throw error;

      toast.success('Emprunt lié à la société');
      setSelectedEmpruntId('');
      setIsDialogOpen(false);
      fetchEmprunts();
    } catch (error) {
      console.error('Erreur liaison emprunt:', error);
      toast.error('Erreur lors de la liaison');
    }
  };

  const unlinkEmprunt = async (empruntId: string) => {
    try {
      const { error } = await supabase
        .from('emprunts')
        .update({ societe_id: null })
        .eq('id', empruntId);

      if (error) throw error;

      toast.success('Emprunt délié de la société');
      fetchEmprunts();
    } catch (error) {
      console.error('Erreur déliaison emprunt:', error);
      toast.error('Erreur lors de la déliaison');
    }
  };

  const totalCapitalRestant = linkedEmprunts.reduce((sum, e) => sum + (e.capital_restant_du || 0), 0);
  const totalMensualites = linkedEmprunts.reduce((sum, e) => sum + (e.mensualite || 0), 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            Emprunts liés
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={!societeId || availableEmprunts.length === 0}>
                <Link2 className="h-4 w-4 mr-1" />
                Lier un emprunt
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Lier un emprunt existant</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    Sélectionnez un emprunt existant de votre patrimoine pour l'associer à cette société.
                  </p>
                </div>
                <Select value={selectedEmpruntId} onValueChange={setSelectedEmpruntId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un emprunt" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEmprunts.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.libelle} - {formatCurrency(e.capital_restant_du)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={linkEmprunt} className="w-full" disabled={!selectedEmpruntId}>
                  Lier à cette société
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary KPIs */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Capital restant dû</p>
            <p className="text-sm font-semibold">{formatCurrency(totalCapitalRestant)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Mensualités totales</p>
            <p className="text-sm font-semibold">{formatCurrency(totalMensualites)}</p>
          </div>
        </div>

        {/* List of linked emprunts */}
        {linkedEmprunts.length > 0 ? (
          <div className="space-y-2">
            {linkedEmprunts.map((e) => (
              <div key={e.id} className="flex items-center justify-between py-3 px-3 bg-muted/30 rounded-lg">
                <div className="space-y-1">
                  <p className="font-medium text-sm">{e.libelle}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Capital: {formatCurrency(e.capital_restant_du)}</span>
                    <span>Mensualité: {formatCurrency(e.mensualite)}</span>
                    {e.taux_interet && <span>Taux: {e.taux_interet}%</span>}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => unlinkEmprunt(e.id)}
                >
                  <Unlink className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            {!societeId 
              ? "Enregistrez d'abord la société pour lier des emprunts"
              : "Aucun emprunt lié à cette société"
            }
          </p>
        )}
      </CardContent>
    </Card>
  );
};
