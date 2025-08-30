import React, { useState } from 'react';
import { Briefcase, Plus } from 'lucide-react';
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
import BiensProfessionnelsExoneresForm from './BiensProfessionnelsExoneresForm';

interface BiensProfessionnelsExoneres {
  id: string;
  designation: string;
  categorie: string;
  valeurTotale: number;
  valeurDeclaree: number;
}

const BiensProfessionnelsExoneresSection = () => {
  const [biens, setBiens] = useState<BiensProfessionnelsExoneres[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const handleAddBien = (newBien: Omit<BiensProfessionnelsExoneres, 'id'>) => {
    const bien: BiensProfessionnelsExoneres = {
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
        <Briefcase className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-semibold">Biens professionnels exonérés</h2>
      </div>

      <div className="text-sm text-muted-foreground mb-4">
        Saisissez ici les biens professionnels exonérés d'IFI en raison de l'exercice d'une activité 
        professionnelle ou de fonctions dirigeantes avec possession de droits sociaux.
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
              <DialogTitle>Ajouter un bien professionnel exonéré</DialogTitle>
            </DialogHeader>
            <BiensProfessionnelsExoneresForm onSubmit={handleAddBien} />
          </DialogContent>
        </Dialog>
      </div>

      {biens.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Biens professionnels exonérés déclarés</CardTitle>
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
              <span className="font-medium">Valeur totale des biens professionnels exonérés</span>
              <span className="text-xl font-bold text-primary">{formatCurrency(totalValue)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BiensProfessionnelsExoneresSection;