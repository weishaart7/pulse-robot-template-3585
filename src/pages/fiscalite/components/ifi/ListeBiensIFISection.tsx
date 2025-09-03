import React, { useState } from 'react';
import { FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AjouterBienForm } from './AjouterBienForm';
import { AjouterPassifForm } from './AjouterPassifForm';

const ListeBiensIFISection = () => {
  const [isAddBienDialogOpen, setIsAddBienDialogOpen] = useState(false);
  const [isAddPassifDialogOpen, setIsAddPassifDialogOpen] = useState(false);

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return '0 €';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Données fictives pour l'exemple
  const biensDirects = [
    { libelle: 'Résidence principale', categorie: 'Résidence principale', valeurTotale: 450000, valeurDeclaree: 315000 },
    { libelle: 'Appartement de rapport', categorie: 'Autres immeubles bâtis', valeurTotale: 280000, valeurDeclaree: 280000 },
  ];

  const biensIndirects = [
    { libelle: 'Parts SCI Familiale', categorie: 'Fraction de la valeur des parts', valeurTotale: 150000, valeurDeclaree: 150000 },
  ];

  const passifs = [
    { libelle: 'Emprunt résidence principale', categorie: 'Dettes afférents aux emprunt', montant: 85000 },
    { libelle: 'Emprunt appartement locatif', categorie: 'Dettes afférents aux emprunt', montant: 45000 },
  ];

  const totalActifBrut = biensDirects.reduce((sum, bien) => sum + bien.valeurTotale, 0) + 
                        biensIndirects.reduce((sum, bien) => sum + bien.valeurTotale, 0);
  
  const totalPassifs = passifs.reduce((sum, passif) => sum + passif.montant, 0);
  const baseImposable = totalActifBrut - totalPassifs;

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
            <AjouterBienForm onClose={() => setIsAddBienDialogOpen(false)} />
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
              
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell colSpan={2}>Biens détenus indirectement</TableCell>
                <TableCell className="text-right">{formatCurrency(biensIndirects.reduce((sum, bien) => sum + bien.valeurTotale, 0))}</TableCell>
                <TableCell className="text-right">{formatCurrency(biensIndirects.reduce((sum, bien) => sum + bien.valeurDeclaree, 0))}</TableCell>
              </TableRow>
              {biensIndirects.map((bien, index) => (
                <TableRow key={index}>
                  <TableCell className="pl-8">{bien.libelle}</TableCell>
                  <TableCell>{bien.categorie}</TableCell>
                  <TableCell className="text-right">{formatCurrency(bien.valeurTotale)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(bien.valeurDeclaree)}</TableCell>
                </TableRow>
              ))}

              <TableRow className="bg-primary/10 font-semibold">
                <TableCell colSpan={2}>Total de l'actif brut</TableCell>
                <TableCell className="text-right">{formatCurrency(totalActifBrut)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totalActifBrut)}</TableCell>
              </TableRow>

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
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-primary mb-2">Base imposable à l'IFI</h3>
            <p className="text-3xl font-bold text-primary">{formatCurrency(baseImposable)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ListeBiensIFISection;