import React, { useState } from 'react';
import { Building, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import BiensDetenusIndirectementForm from './BiensDetenusIndirectementForm';

interface BiensDetenusIndirectement {
  id: string;
  designation: string;
  categorie: string;
  valeurTotale: number;
  valeurDeclaree: number;
}

const BiensDetenusIndirectementSection = () => {
  const [biens, setBiens] = useState<BiensDetenusIndirectement[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const handleAddBien = (newBien: Omit<BiensDetenusIndirectement, 'id'>) => {
    const bien: BiensDetenusIndirectement = {
      ...newBien,
      id: Date.now().toString(),
    };
    setBiens([...biens, bien]);
    setIsDialogOpen(false);
  };

  const totalValue = biens.reduce((sum, bien) => sum + bien.valeurTotale, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Building className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-semibold">Biens détenus indirectement</h2>
      </div>

      <div className="text-sm text-muted-foreground mb-4">
        Saisissez ici les parts de SCI, SCPI, assurances-vie, comptes-titres et autres droits sociaux 
        et valeurs mobilières donnant droit à des biens immobiliers.
      </div>

      <div className="flex justify-between items-center">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un bien
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Ajouter un bien détenu indirectement</DialogTitle>
            </DialogHeader>
            <BiensDetenusIndirectementForm onSubmit={handleAddBien} />
          </DialogContent>
        </Dialog>
      </div>

      {biens.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Biens détenus indirectement déclarés</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Désignation</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Valeur totale</TableHead>
                  <TableHead>Valeur déclarée</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {biens.map((bien) => (
                  <TableRow key={bien.id}>
                    <TableCell className="font-medium">{bien.designation}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{bien.categorie}</Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(bien.valeurTotale)}</TableCell>
                    <TableCell>{formatCurrency(bien.valeurDeclaree)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Récapitulatif</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <span className="font-medium">Valeur totale des biens détenus indirectement</span>
              <span className="text-xl font-bold text-primary">{formatCurrency(totalValue)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BiensDetenusIndirectementSection;