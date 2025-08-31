import React, { useState } from 'react';
import { Briefcase, Plus, Edit, Trash2 } from 'lucide-react';
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
import { useIFIBiensProfessionnelsExoneres } from '@/hooks/useIFI';
import { IFIBienProfessionnelExonere } from '@/types/ifi';

const BiensProfessionnelsExoneresSection = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBien, setEditingBien] = useState<IFIBienProfessionnelExonere | null>(null);
  
  const { biens, loading, createBien, updateBien, deleteBien } = useIFIBiensProfessionnelsExoneres();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const handleAddBien = async (newBien: Omit<IFIBienProfessionnelExonere, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      if (editingBien?.id) {
        await updateBien(editingBien.id, newBien);
      } else {
        await createBien(newBien);
      }
      setIsDialogOpen(false);
      setEditingBien(null);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
  };

  const handleEdit = (bien: IFIBienProfessionnelExonere) => {
    setEditingBien(bien);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce bien ?')) {
      await deleteBien(id);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingBien(null);
  };

  const totalValue = biens.reduce((sum, bien) => sum + (bien.valeur || 0), 0);

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
              <DialogTitle>
                {editingBien ? 'Modifier le bien professionnel exonéré' : 'Ajouter un bien professionnel exonéré'}
              </DialogTitle>
            </DialogHeader>
            <BiensProfessionnelsExoneresForm 
              onSubmit={handleAddBien} 
            />
          </DialogContent>
        </Dialog>
      </div>

      {(loading || biens.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Biens professionnels exonérés déclarés</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Chargement des données...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Désignation</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Valeur totale</TableHead>
                    <TableHead>Valeur déclarée</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {biens.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Aucun bien professionnel exonéré enregistré
                      </TableCell>
                    </TableRow>
                  ) : (
                    biens.map((bien) => {
                      // Les biens professionnels exonérés peuvent avoir un abattement
                      const valeurDeclaree = (bien.valeur || 0) * 0.7; // Exemple d'abattement de 30%
                      
                      return (
                        <TableRow key={bien.id}>
                          <TableCell className="font-medium">{bien.designation}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">Bien professionnel</Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(bien.valeur || 0)}</TableCell>
                          <TableCell>{formatCurrency(valeurDeclaree)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(bien)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(bien.id!)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
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