import React, { useState, useEffect } from 'react';
import { FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AjouterBienForm } from './AjouterBienForm';
import { AjouterPassifForm } from './AjouterPassifForm';
import { useIFIImmeubleBatis } from '@/hooks/useIFI';
import { useIFIImmeublesNonBatis } from '@/hooks/useIFI';
import { useIFIBiensDetenusIndirectement } from '@/hooks/useIFI';
import { useIFIBiensProfessionnelsExoneres } from '@/hooks/useIFI';

const ListeBiensIFISection = () => {
  const [isAddBienDialogOpen, setIsAddBienDialogOpen] = useState(false);
  const [isAddPassifDialogOpen, setIsAddPassifDialogOpen] = useState(false);

  // Hooks pour récupérer les données depuis Supabase
  const { biens: immeublesBatis, loading: loadingBatis, fetchBiens: fetchBatis } = useIFIImmeubleBatis();
  const { biens: immeublesNonBatis, loading: loadingNonBatis, fetchBiens: fetchNonBatis } = useIFIImmeublesNonBatis();
  const { biens: biensIndirects, loading: loadingIndirects, fetchBiens: fetchIndirects } = useIFIBiensDetenusIndirectement();
  const { biens: biensExoneres, loading: loadingExoneres, fetchBiens: fetchExoneres } = useIFIBiensProfessionnelsExoneres();

  useEffect(() => {
    fetchBatis();
    fetchNonBatis();
    fetchIndirects();
    fetchExoneres();
  }, []);

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return '0 €';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Transformation des données pour le tableau
  const biensDirects = [
    ...immeublesBatis.map(bien => ({
      libelle: bien.designation,
      categorie: bien.categorie === 'residence-principale' ? 'Résidence principale' : 'Autres immeubles bâtis',
      valeurTotale: bien.valeur_totale || 0,
      valeurDeclaree: bien.categorie === 'residence-principale' ? (bien.valeur_totale || 0) * 0.7 : bien.valeur_totale || 0
    })),
    ...immeublesNonBatis.map(bien => ({
      libelle: bien.designation,
      categorie: bien.categorie,
      valeurTotale: bien.valeur_totale || 0,
      valeurDeclaree: bien.valeur_totale || 0
    }))
  ];

  const biensIndirectsList = biensIndirects.map(bien => ({
    libelle: bien.designation,
    categorie: 'Fraction de la valeur des parts',
    valeurTotale: bien.valeur_bien || 0,
    valeurDeclaree: bien.valeur_bien || 0
  }));

  // Pour les passifs, nous utiliserons les données IFI passifs déductions quand disponibles
  const passifs: any[] = []; // À implémenter avec les hooks passifs

  const totalActifBrut = biensDirects.reduce((sum, bien) => sum + bien.valeurTotale, 0) + 
                        biensIndirectsList.reduce((sum, bien) => sum + bien.valeurTotale, 0);
  
  const totalPassifs = passifs.reduce((sum, passif) => sum + passif.montant, 0);
  const baseImposable = totalActifBrut - totalPassifs;

  const isLoading = loadingBatis || loadingNonBatis || loadingIndirects || loadingExoneres;
  const hasAnyData = biensDirects.length > 0 || biensIndirectsList.length > 0 || passifs.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <FileText className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-semibold">Liste des biens à l'IFI</h2>
      </div>

      <div className="flex gap-4 mb-6">
        <Dialog open={isAddBienDialogOpen} onOpenChange={setIsAddBienDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Ajouter un bien
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Ajouter un bien</DialogTitle>
            </DialogHeader>
            <AjouterBienForm 
              onClose={() => setIsAddBienDialogOpen(false)}
              onBienAdded={() => {
                fetchBatis();
                fetchNonBatis();
                fetchIndirects();
                fetchExoneres();
              }}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={isAddPassifDialogOpen} onOpenChange={setIsAddPassifDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Ajouter un passif
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Ajouter un passif</DialogTitle>
            </DialogHeader>
            <AjouterPassifForm onClose={() => setIsAddPassifDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Biens imposables à l'IFI</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          ) : !hasAnyData ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Aucun bien ajouté pour le moment.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Utilisez les boutons ci-dessus pour ajouter vos biens et passifs.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/3">Libellé</TableHead>
                  <TableHead className="w-1/3">Catégorie</TableHead>
                  <TableHead className="w-1/6 text-right">Valeur totale</TableHead>
                  <TableHead className="w-1/6 text-right">Valeur déclarée</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {biensDirects.length > 0 && (
                  <>
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell colSpan={2}>Biens détenus directement</TableCell>
                      <TableCell className="text-right">{formatCurrency(biensDirects.reduce((sum, bien) => sum + bien.valeurTotale, 0))}</TableCell>
                      <TableCell className="text-right">{formatCurrency(biensDirects.reduce((sum, bien) => sum + bien.valeurDeclaree, 0))}</TableCell>
                    </TableRow>
                    {biensDirects.map((bien, index) => (
                      <TableRow key={index} className="pl-4">
                        <TableCell className="pl-8">{bien.libelle}</TableCell>
                        <TableCell>{bien.categorie}</TableCell>
                        <TableCell className="text-right">{formatCurrency(bien.valeurTotale)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(bien.valeurDeclaree)}</TableCell>
                      </TableRow>
                    ))}
                  </>
                )}
                
                {biensIndirectsList.length > 0 && (
                  <>
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell colSpan={2}>Biens détenus indirectement</TableCell>
                      <TableCell className="text-right">{formatCurrency(biensIndirectsList.reduce((sum, bien) => sum + bien.valeurTotale, 0))}</TableCell>
                      <TableCell className="text-right">{formatCurrency(biensIndirectsList.reduce((sum, bien) => sum + bien.valeurDeclaree, 0))}</TableCell>
                    </TableRow>
                    {biensIndirectsList.map((bien, index) => (
                      <TableRow key={index}>
                        <TableCell className="pl-8">{bien.libelle}</TableCell>
                        <TableCell>{bien.categorie}</TableCell>
                        <TableCell className="text-right">{formatCurrency(bien.valeurTotale)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(bien.valeurDeclaree)}</TableCell>
                      </TableRow>
                    ))}
                  </>
                )}

                {(biensDirects.length > 0 || biensIndirectsList.length > 0) && (
                  <TableRow className="bg-primary/10 font-semibold">
                    <TableCell colSpan={2}>Total de l'actif brut</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalActifBrut)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalActifBrut)}</TableCell>
                  </TableRow>
                )}

                {passifs.length > 0 && (
                  <>
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell colSpan={4}>Passifs & Déductions</TableCell>
                    </TableRow>
                    {passifs.map((passif, index) => (
                      <TableRow key={index}>
                        <TableCell className="pl-8">{passif.libelle}</TableCell>
                        <TableCell>{passif.categorie}</TableCell>
                        <TableCell className="text-right">{formatCurrency(passif.montant)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(passif.montant)}</TableCell>
                      </TableRow>
                    ))}
                  </>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {hasAnyData && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-primary mb-2">Base imposable à l'IFI</h3>
              <p className="text-3xl font-bold text-primary">{formatCurrency(baseImposable)}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ListeBiensIFISection;