import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Asset } from '@/services/assetService';
import AnimatedBackground from '@/components/ui/animated-tabs';

interface ImmobilierGestionDialogProps {
  asset: Asset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ImmobilierGestionDialog = ({ asset, open, onOpenChange }: ImmobilierGestionDialogProps) => {
  const [activeTab, setActiveTab] = useState('revenus');

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
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un revenu
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <div className="text-4xl mb-4">💰</div>
                <h3 className="text-lg font-semibold mb-2">Aucun revenu pour le moment</h3>
                <p className="text-muted-foreground">
                  Commencez par ajouter les revenus générés par ce bien immobilier.
                </p>
              </div>
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
  );
};
