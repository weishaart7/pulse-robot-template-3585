import React, { useState } from 'react';
import AnimatedBackground from '@/components/ui/animated-tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2 } from 'lucide-react';
import { useImmobilierAssets } from '@/hooks/useImmobilierAssets';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ImmobilierPropertyDialog } from '@/components/immobilier/ImmobilierPropertyDialog';
import { Asset } from '@/services/assetService';

export const ImmobilierSection = () => {
  const [activeTab, setActiveTab] = useState('biens');
  const { assets, isLoading, refetch } = useImmobilierAssets();
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleManageInfo = (asset: Asset) => {
    setSelectedAsset(asset);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedAsset(null);
  };

  const handleUpdate = () => {
    refetch();
  };

  const TABS = [
    { id: 'biens', label: 'Vue d\'ensemble' },
    { id: 'valorisation', label: 'Mes biens' },
    { id: 'revenus', label: 'Gestion des biens' }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'biens':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Mes biens immobiliers</CardTitle>
              <CardDescription>
                Gérez votre portefeuille immobilier
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🏠</div>
                <h3 className="text-lg font-semibold mb-2">Section à venir</h3>
                <p className="text-muted-foreground">
                  Cette section permettra de gérer vos biens immobiliers, 
                  leur valorisation et leurs revenus.
                </p>
              </div>
            </CardContent>
          </Card>
        );
      case 'valorisation':
        return (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Mes biens</CardTitle>
                  <CardDescription>
                    Biens immobiliers transférés depuis la section Patrimoine
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Chargement...</p>
                </div>
              ) : assets.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Aucun bien pour le moment</h3>
                  <p className="text-muted-foreground mb-4">
                    Pour ajouter un bien ici, allez dans Patrimoine → Actifs et cochez "Transfert dans Immobilier" lors de l'ajout d'un actif immobilier.
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dénomination</TableHead>
                        <TableHead>Catégorie</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assets.map((asset) => (
                        <TableRow key={asset.id}>
                          <TableCell className="font-medium">
                            {asset.denomination || 'Sans dénomination'}
                          </TableCell>
                          <TableCell>{asset.nature}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleManageInfo(asset)}
                              >
                                Informations
                              </Button>
                              {['Immeubles locatifs (loués nus)', 'Immeubles locatifs (LMNP)', 'Immeubles locatifs (LMP)', 'Immeubles professionnels (hors LMP)'].includes(asset.nature || '') && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    // TODO: Implement management functionality
                                    console.log('Gérer clicked for', asset.id);
                                  }}
                                >
                                  Gérer
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        );
      case 'revenus':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Revenus locatifs</CardTitle>
              <CardDescription>
                Gestion des revenus de votre patrimoine immobilier
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <div className="text-4xl mb-4">💰</div>
                <h3 className="text-lg font-semibold mb-2">Section à venir</h3>
                <p className="text-muted-foreground">
                  Suivi et optimisation de vos revenus locatifs.
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
    <div className="p-6">
      <div className="mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Immobilier</h2>
          <p className="text-muted-foreground">
            Gérez et optimisez votre patrimoine immobilier
          </p>
        </div>
      </div>

      <div className="mb-6 flex justify-start">
        <div className="rounded-[8px] bg-muted p-[2px]">
          <AnimatedBackground
            defaultValue="biens"
            onValueChange={(value) => setActiveTab(value || 'biens')}
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

      <div className="mt-6">
        {renderContent()}
      </div>

      <ImmobilierPropertyDialog
        asset={selectedAsset}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onUpdate={handleUpdate}
      />
    </div>
  );
};