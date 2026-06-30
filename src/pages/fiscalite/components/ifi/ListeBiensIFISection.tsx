import React, { useState, useEffect } from 'react';
import { FileText, Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AjouterBienForm } from './AjouterBienForm';
import { AjouterPassifForm } from './AjouterPassifForm';
import { useToast } from '@/hooks/use-toast';
import {
  useIFIImmeubleBatis,
  useIFIImmeublesNonBatis,
  useIFIBiensDetenusIndirectement,
  useIFIBiensProfessionnelsExoneres,
  useIFIPassifsDeductions,
} from '@/hooks/useIFI';
import { computeIFI } from '@/lib/ifi';

const ListeBiensIFISection = () => {
  const [isAddBienDialogOpen, setIsAddBienDialogOpen] = useState(false);
  const [isAddPassifDialogOpen, setIsAddPassifDialogOpen] = useState(false);
  const { toast } = useToast();

  // Hooks pour récupérer les données depuis Supabase
  const { biens: immeublesBatis, loading: loadingBatis, fetchBiens: fetchBatis, deleteBien: deleteBatis } = useIFIImmeubleBatis();
  const { biens: immeublesNonBatis, loading: loadingNonBatis, fetchBiens: fetchNonBatis, deleteBien: deleteNonBatis } = useIFIImmeublesNonBatis();
  const { biens: biensIndirects, loading: loadingIndirects, fetchBiens: fetchIndirects, deleteBien: deleteIndirects } = useIFIBiensDetenusIndirectement();
  const { biens: biensExoneres, loading: loadingExoneres, fetchBiens: fetchExoneres, deleteBien: deleteExoneres } = useIFIBiensProfessionnelsExoneres();
  const { passifs, loading: loadingPassifs, fetchPassifs, deletePassif } = useIFIPassifsDeductions();

  useEffect(() => {
    fetchBatis();
    fetchNonBatis();
    fetchIndirects();
    fetchExoneres();
    fetchPassifs();
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

  const refreshAll = () => {
    fetchBatis();
    fetchNonBatis();
    fetchIndirects();
    fetchExoneres();
    fetchPassifs();
  };

  const handleDeleteBien = async (bienId: string, type: 'batis' | 'non-batis' | 'indirects' | 'exoneres') => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce bien ?')) {
      return;
    }

    try {
      switch (type) {
        case 'batis':
          await deleteBatis(bienId);
          break;
        case 'non-batis':
          await deleteNonBatis(bienId);
          break;
        case 'indirects':
          await deleteIndirects(bienId);
          break;
        case 'exoneres':
          await deleteExoneres(bienId);
          break;
      }

      toast({
        title: "Succès",
        description: "Le bien a été supprimé avec succès",
      });

      refreshAll();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le bien",
        variant: "destructive",
      });
    }
  };

  const handleDeletePassif = async (passifId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce passif ?')) {
      return;
    }

    try {
      await deletePassif(passifId);
      toast({
        title: "Succès",
        description: "Le passif a été supprimé avec succès",
      });
      refreshAll();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le passif",
        variant: "destructive",
      });
    }
  };

  const handleEditBien = (bienId: string, type: 'batis' | 'non-batis' | 'indirects' | 'exoneres') => {
    // TODO: Implement edit functionality
    toast({
      title: "Information",
      description: "La fonctionnalité de modification sera bientôt disponible",
    });
  };

  // Transformation des données pour le tableau des biens détenus directement
  const biensDirects = [
    ...immeublesBatis.map(bien => ({
      id: bien.id,
      type: 'batis' as const,
      libelle: bien.designation,
      categorie: bien.categorie === 'residence-principale' ? 'Résidence principale' : bien.categorie,
      valeurTotale: bien.valeur_totale || 0,
      valeurDeclaree: computeIFI({
        immeublesBatis: [{
          valeurTotale: bien.valeur_totale || 0,
          bienMixte: bien.bien_mixte,
          fractionTaxable: bien.fraction_taxable,
          abattementResidencePrincipale: bien.categorie === 'residence-principale',
        }],
        immeublesNonBatis: [],
        biensIndirects: [],
        passifs: [],
      }).totalActifBrut,
    })),
    ...immeublesNonBatis.map(bien => ({
      id: bien.id,
      type: 'non-batis' as const,
      libelle: bien.designation,
      categorie: bien.categorie,
      valeurTotale: bien.valeur_totale || 0,
      valeurDeclaree: computeIFI({
        immeublesBatis: [],
        immeublesNonBatis: [{
          valeurTotale: bien.valeur_totale || 0,
          bienMixte: bien.bien_mixte,
          fractionTaxable: bien.fraction_taxable,
          abattementBoisForets: bien.abattement_bois_forets,
        }],
        biensIndirects: [],
        passifs: [],
      }).totalActifBrut,
    })),
  ];

  const biensIndirectsList = biensIndirects.map(bien => ({
    id: bien.id,
    type: 'indirects' as const,
    libelle: bien.designation,
    categorie: bien.categorie || 'Fraction de la valeur des parts',
    valeurTotale: bien.valeur_bien || 0,
    valeurDeclaree: bien.valeur_bien || 0,
  }));

  const biensExoneresList = biensExoneres.map(bien => ({
    id: bien.id,
    libelle: bien.designation,
    motif: bien.exoneration_activite_principale
      ? "Exercice d'une activité professionnelle à titre principal"
      : bien.exoneration_fonction_droits
      ? 'Fonction de direction et possession de droits sociaux'
      : 'Bien professionnel exonéré',
    valeur: bien.valeur || 0,
  }));

  // Calcul centralisé : assiette taxable, en excluant les biens professionnels exonérés
  const ifiResult = computeIFI({
    immeublesBatis: immeublesBatis.map(bien => ({
      valeurTotale: bien.valeur_totale || 0,
      bienMixte: bien.bien_mixte,
      fractionTaxable: bien.fraction_taxable,
      abattementResidencePrincipale: bien.categorie === 'residence-principale',
    })),
    immeublesNonBatis: immeublesNonBatis.map(bien => ({
      valeurTotale: bien.valeur_totale || 0,
      bienMixte: bien.bien_mixte,
      fractionTaxable: bien.fraction_taxable,
      abattementBoisForets: bien.abattement_bois_forets,
    })),
    biensIndirects: biensIndirects.map(bien => ({ valeurBien: bien.valeur_bien || 0 })),
    passifs: passifs.map(passif => ({ montant: passif.montant || 0 })),
  });

  const totalActifBrut = ifiResult.totalActifBrut;
  const totalValeurDeclaree = biensDirects.reduce((sum, bien) => sum + bien.valeurDeclaree, 0) +
                             biensIndirectsList.reduce((sum, bien) => sum + bien.valeurDeclaree, 0);
  const totalPassifs = ifiResult.totalPassifs;
  const baseImposable = ifiResult.assietteTaxable;
  const totalExonere = biensExoneresList.reduce((sum, bien) => sum + bien.valeur, 0);

  const isLoading = loadingBatis || loadingNonBatis || loadingIndirects || loadingExoneres || loadingPassifs;
  const hasAnyData = biensDirects.length > 0 || biensIndirectsList.length > 0 || passifs.length > 0 || biensExoneresList.length > 0;

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
              onBienAdded={refreshAll}
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
            <AjouterPassifForm
              onClose={() => setIsAddPassifDialogOpen(false)}
              onPassifAdded={refreshAll}
            />
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
                  <TableHead className="w-1/4">Libellé</TableHead>
                  <TableHead className="w-1/4">Catégorie</TableHead>
                  <TableHead className="w-1/6 text-right">Valeur totale</TableHead>
                  <TableHead className="w-1/6 text-right">Valeur déclarée</TableHead>
                  <TableHead className="w-1/6 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {biensDirects.length > 0 && (
                  <>
                     <TableRow className="bg-muted/50 font-semibold">
                      <TableCell colSpan={2}>Biens détenus directement</TableCell>
                      <TableCell className="text-right">{formatCurrency(biensDirects.reduce((sum, bien) => sum + bien.valeurTotale, 0))}</TableCell>
                      <TableCell className="text-right">{formatCurrency(biensDirects.reduce((sum, bien) => sum + bien.valeurDeclaree, 0))}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                    {biensDirects.map((bien, index) => (
                      <TableRow key={index} className="pl-4">
                        <TableCell className="pl-8">{bien.libelle}</TableCell>
                        <TableCell>{bien.categorie}</TableCell>
                        <TableCell className="text-right">{formatCurrency(bien.valeurTotale)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(bien.valeurDeclaree)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditBien(bien.id, bien.type)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteBien(bien.id, bien.type)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
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
                      <TableCell></TableCell>
                    </TableRow>
                    {biensIndirectsList.map((bien, index) => (
                      <TableRow key={index}>
                        <TableCell className="pl-8">{bien.libelle}</TableCell>
                        <TableCell>{bien.categorie}</TableCell>
                        <TableCell className="text-right">{formatCurrency(bien.valeurTotale)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(bien.valeurDeclaree)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditBien(bien.id, bien.type)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteBien(bien.id, bien.type)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )}

                {(biensDirects.length > 0 || biensIndirectsList.length > 0) && (
                  <TableRow className="bg-primary/10 font-semibold">
                    <TableCell colSpan={2}>Total de l'actif brut</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalActifBrut)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalValeurDeclaree)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                )}

                {passifs.length > 0 && (
                  <>
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell colSpan={5}>Passifs & Déductions</TableCell>
                    </TableRow>
                     {passifs.map((passif) => (
                       <TableRow key={passif.id}>
                         <TableCell className="pl-8">{passif.designation}</TableCell>
                         <TableCell>{passif.type_passif}</TableCell>
                         <TableCell className="text-right">-{formatCurrency(passif.montant)}</TableCell>
                         <TableCell className="text-right">-{formatCurrency(passif.montant)}</TableCell>
                         <TableCell className="text-center">
                           <div className="flex justify-center gap-2">
                             <Button
                               variant="ghost"
                               size="sm"
                               onClick={() => handleDeletePassif(passif.id)}
                               className="text-destructive hover:text-destructive"
                             >
                               <Trash2 className="h-4 w-4" />
                             </Button>
                           </div>
                         </TableCell>
                       </TableRow>
                     ))}
                     <TableRow className="bg-muted/50 font-semibold">
                       <TableCell colSpan={2}>Total des passifs déductibles</TableCell>
                       <TableCell className="text-right">-{formatCurrency(totalPassifs)}</TableCell>
                       <TableCell className="text-right">-{formatCurrency(totalPassifs)}</TableCell>
                       <TableCell></TableCell>
                     </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {biensExoneresList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Biens exonérés</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Ces biens sont exclus de l'assiette taxable à l'IFI au titre de l'exonération des biens professionnels.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/3">Libellé</TableHead>
                  <TableHead className="w-1/3">Motif d'exonération</TableHead>
                  <TableHead className="w-1/6 text-right">Valeur</TableHead>
                  <TableHead className="w-1/6 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {biensExoneresList.map((bien, index) => (
                  <TableRow key={index}>
                    <TableCell>{bien.libelle}</TableCell>
                    <TableCell>{bien.motif}</TableCell>
                    <TableCell className="text-right">{formatCurrency(bien.valeur)}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditBien(bien.id, 'exoneres')}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteBien(bien.id, 'exoneres')}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={2}>Total exonéré (hors assiette IFI)</TableCell>
                  <TableCell className="text-right">{formatCurrency(totalExonere)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

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
