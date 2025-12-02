import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { Asset, AssetRevenu, AssetCharge, assetService } from '@/services/assetService';
import AnimatedBackground from '@/components/ui/animated-tabs';
import { RevenuForm } from './RevenuForm';
import { ChargeForm } from './ChargeForm';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';

interface ImmobilierGestionDialogProps {
  asset: Asset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ImmobilierGestionDialog = ({ asset, open, onOpenChange }: ImmobilierGestionDialogProps) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('revenus');
  const [revenuFormOpen, setRevenuFormOpen] = useState(false);
  const [chargeFormOpen, setChargeFormOpen] = useState(false);
  const [revenus, setRevenus] = useState<AssetRevenu[]>([]);
  const [charges, setCharges] = useState<AssetCharge[]>([]);
  const [isLoadingRevenus, setIsLoadingRevenus] = useState(false);
  const [isLoadingCharges, setIsLoadingCharges] = useState(false);
  const [impactBudget, setImpactBudget] = useState(false);
  const [isUpdatingBudget, setIsUpdatingBudget] = useState(false);

  const fetchRevenus = useCallback(async () => {
    if (!asset?.id) return;
    
    setIsLoadingRevenus(true);
    try {
      const data = await assetService.getAssetRevenus(asset.id);
      setRevenus(data);
      // Check if any revenue has impact_budget = true
      const hasImpact = data.some((r: any) => r.impact_budget === true);
      setImpactBudget(hasImpact);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les revenus.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingRevenus(false);
    }
  }, [asset?.id, toast]);

  const fetchCharges = useCallback(async () => {
    if (!asset?.id) return;
    
    setIsLoadingCharges(true);
    try {
      const data = await assetService.getAssetCharges(asset.id);
      setCharges(data);
      // Check if any charge has impact_budget = true
      const hasImpact = data.some((c: any) => c.impact_budget === true);
      if (hasImpact) setImpactBudget(true);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les charges.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCharges(false);
    }
  }, [asset?.id, toast]);

  useEffect(() => {
    if (asset && open) {
      fetchRevenus();
      fetchCharges();
    }
  }, [asset, open, fetchRevenus, fetchCharges]);

  const handleToggleImpactBudget = async (checked: boolean) => {
    if (!asset?.id) return;
    
    setIsUpdatingBudget(true);
    try {
      // Update all revenus for this asset
      const { error: revenusError } = await supabase
        .from('asset_revenus')
        .update({ impact_budget: checked })
        .eq('asset_id', asset.id);

      if (revenusError) throw revenusError;

      // Update all charges for this asset
      const { error: chargesError } = await supabase
        .from('asset_charges')
        .update({ impact_budget: checked })
        .eq('asset_id', asset.id);

      if (chargesError) throw chargesError;

      setImpactBudget(checked);
      
      toast({
        title: checked ? "Transfert activé" : "Transfert désactivé",
        description: checked 
          ? "Les revenus et charges seront visibles dans la section Budget."
          : "Les revenus et charges ne seront plus visibles dans le Budget.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le transfert budget.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingBudget(false);
    }
  };

  const handleDeleteRevenu = async (id: string) => {
    try {
      await assetService.deleteAssetRevenu(id);
      toast({
        title: "Revenu supprimé",
        description: "Le revenu a été supprimé avec succès.",
      });
      fetchRevenus();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le revenu.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCharge = async (id: string) => {
    try {
      await assetService.deleteAssetCharge(id);
      toast({
        title: "Charge supprimée",
        description: "La charge a été supprimée avec succès.",
      });
      fetchCharges();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la charge.",
        variant: "destructive",
      });
    }
  };

  const TABS = [
    { id: 'revenus', label: 'Revenus' },
    { id: 'charges', label: 'Charges' }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'revenus':
        return (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Revenus locatifs</CardTitle>
                  <CardDescription>
                    Gérez les revenus générés par ce bien
                  </CardDescription>
                </div>
                <Button size="sm" onClick={() => setRevenuFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un revenu
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingRevenus ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Chargement...</p>
                </div>
              ) : revenus.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">💰</div>
                  <h3 className="text-lg font-semibold mb-2">Aucun revenu pour le moment</h3>
                  <p className="text-muted-foreground">
                    Commencez par ajouter les revenus générés par ce bien immobilier.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nature</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Périodicité</TableHead>
                      <TableHead>Date début</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {revenus.map((revenu) => (
                      <TableRow key={revenu.id}>
                        <TableCell>{revenu.nature}</TableCell>
                        <TableCell>{revenu.montant.toLocaleString('fr-FR')} €</TableCell>
                        <TableCell>{revenu.periodicite}</TableCell>
                        <TableCell>
                          {new Date(revenu.date_debut).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => revenu.id && handleDeleteRevenu(revenu.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        );
      case 'charges':
        return (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Charges</CardTitle>
                  <CardDescription>
                    Gérez les charges liées à ce bien
                  </CardDescription>
                </div>
                <Button size="sm" onClick={() => setChargeFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une charge
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingCharges ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Chargement...</p>
                </div>
              ) : charges.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">📋</div>
                  <h3 className="text-lg font-semibold mb-2">Aucune charge pour le moment</h3>
                  <p className="text-muted-foreground">
                    Commencez par ajouter les charges associées à ce bien immobilier.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nature</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Périodicité</TableHead>
                      <TableHead>Date début</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {charges.map((charge) => (
                      <TableRow key={charge.id}>
                        <TableCell>{charge.denomination || charge.type_charge}</TableCell>
                        <TableCell>{charge.montant.toLocaleString('fr-FR')} {charge.unite}</TableCell>
                        <TableCell className="capitalize">{charge.periodicite}</TableCell>
                        <TableCell>
                          {new Date(charge.date_debut).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => charge.id && handleDeleteCharge(charge.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>
                Gestion de {asset?.denomination || 'ce bien'}
              </DialogTitle>
              <div className="flex items-center gap-2 mr-6">
                <Checkbox
                  id="impact-budget"
                  checked={impactBudget}
                  onCheckedChange={handleToggleImpactBudget}
                  disabled={isUpdatingBudget || (revenus.length === 0 && charges.length === 0)}
                />
                <Label 
                  htmlFor="impact-budget" 
                  className="text-sm font-medium cursor-pointer"
                >
                  Transfert dans budget
                </Label>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            <div className="flex justify-start">
              <div className="rounded-[8px] bg-muted p-[2px]">
                <AnimatedBackground
                  defaultValue="revenus"
                  onValueChange={(value) => setActiveTab(value || 'revenus')}
                  className="rounded-lg bg-background shadow-sm"
                  transition={{
                    ease: "easeInOut",
                    duration: 0.2,
                  }}
                >
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      data-id={tab.id}
                      type="button"
                      className="inline-flex min-w-24 items-center justify-center px-3 py-2 text-sm font-medium text-foreground transition-transform active:scale-[0.98]"
                    >
                      {tab.label}
                    </button>
                  ))}
                </AnimatedBackground>
              </div>
            </div>

            {renderContent()}
          </div>
        </DialogContent>
      </Dialog>

      {asset && (
        <>
          <RevenuForm
            assetId={asset.id}
            open={revenuFormOpen}
            onOpenChange={setRevenuFormOpen}
            onSuccess={() => {
              fetchRevenus();
              // If impact_budget is enabled, new revenues should inherit it
              if (impactBudget) {
                handleToggleImpactBudget(true);
              }
            }}
          />
          <ChargeForm
            assetId={asset.id}
            open={chargeFormOpen}
            onOpenChange={setChargeFormOpen}
            onSuccess={() => {
              fetchCharges();
              // If impact_budget is enabled, new charges should inherit it
              if (impactBudget) {
                handleToggleImpactBudget(true);
              }
            }}
          />
        </>
      )}
    </>
  );
};
