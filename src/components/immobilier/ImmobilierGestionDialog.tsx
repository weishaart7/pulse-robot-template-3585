import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { Asset, AssetRevenu, assetService } from '@/services/assetService';
import AnimatedBackground from '@/components/ui/animated-tabs';
import { RevenuForm } from './RevenuForm';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ImmobilierGestionDialogProps {
  asset: Asset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ImmobilierGestionDialog = ({ asset, open, onOpenChange }: ImmobilierGestionDialogProps) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('revenus');
  const [revenuFormOpen, setRevenuFormOpen] = useState(false);
  const [revenus, setRevenus] = useState<AssetRevenu[]>([]);
  const [isLoadingRevenus, setIsLoadingRevenus] = useState(false);

  useEffect(() => {
    if (asset && open && activeTab === 'revenus') {
      fetchRevenus();
    }
  }, [asset, open, activeTab]);

  const fetchRevenus = async () => {
    if (!asset?.id) return;
    
    setIsLoadingRevenus(true);
    try {
      const data = await assetService.getAssetRevenus(asset.id);
      setRevenus(data);
    } catch (error) {
      console.error('Error fetching revenus:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les revenus.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingRevenus(false);
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
      console.error('Error deleting revenu:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le revenu.",
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
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une charge
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📋</div>
                <h3 className="text-lg font-semibold mb-2">Aucune charge pour le moment</h3>
                <p className="text-muted-foreground">
                  Commencez par ajouter les charges associées à ce bien immobilier.
                </p>
              </div>
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
            <DialogTitle>
              Gestion de {asset?.denomination || 'ce bien'}
            </DialogTitle>
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
        <RevenuForm
          assetId={asset.id}
          open={revenuFormOpen}
          onOpenChange={setRevenuFormOpen}
          onSuccess={fetchRevenus}
        />
      )}
    </>
  );
};
