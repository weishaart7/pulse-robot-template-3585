import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { SocieteForm } from './SocieteForm';

interface Societe {
  id: string;
  denomination: string;
  typeSociete: string;
  dateCreation: string;
  valeurEstimee: number;
  pourcentageIFI: number;
  capitalSocial: number;
  nombreTitres: number;
  nombreSalaries: number;
  jourCloture: string;
  moisCloture: string;
  siret: string;
  rueAdresse: string;
  codePostal: string;
  commune: string;
  pays: string;
  typeActivite: string;
  regimeFiscal: string;
  valeurIFI: number;
  activite?: string;
  holding?: string;
  formeSocieteCivile?: string;
}

export const SocietesSynthese = () => {
  const [societes, setSocietes] = useState<Societe[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingSociete, setEditingSociete] = useState<Societe | null>(null);

  const handleAddSociete = () => {
    setEditingSociete(null);
    setShowForm(true);
  };

  const handleEditSociete = (societe: Societe) => {
    setEditingSociete(societe);
    setShowForm(true);
  };

  const handleDeleteSociete = (id: string) => {
    setSocietes(prev => prev.filter(s => s.id !== id));
  };

  const handleSubmitSociete = (data: Omit<Societe, 'id'>) => {
    if (editingSociete) {
      setSocietes(prev => prev.map(s => 
        s.id === editingSociete.id 
          ? { ...data, id: editingSociete.id }
          : s
      ));
    } else {
      setSocietes(prev => [...prev, { ...data, id: Date.now().toString() }]);
    }
    setShowForm(false);
    setEditingSociete(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (societes.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold mb-2">Aucune société enregistrée</h3>
        <p className="text-muted-foreground mb-6">
          Commencez par ajouter votre première société pour suivre vos participations.
        </p>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button onClick={handleAddSociete} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Ajouter une société
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Ajouter une société</DialogTitle>
            </DialogHeader>
            <SocieteForm
              onSubmit={handleSubmitSociete}
              onCancel={() => setShowForm(false)}
              initialData={editingSociete}
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Tableau récapitulatif</h3>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button onClick={handleAddSociete} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Ajouter une société
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSociete ? 'Modifier la société' : 'Ajouter une société'}
              </DialogTitle>
            </DialogHeader>
            <SocieteForm
              onSubmit={handleSubmitSociete}
              onCancel={() => setShowForm(false)}
              initialData={editingSociete}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-background rounded-lg p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dénomination</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date création</TableHead>
              <TableHead>Valeur estimée</TableHead>
              <TableHead>Capital social</TableHead>
              <TableHead>Régime fiscal</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {societes.map((societe) => (
              <TableRow key={societe.id}>
                <TableCell className="font-medium">{societe.denomination}</TableCell>
                <TableCell>{societe.typeSociete}</TableCell>
                <TableCell>{new Date(societe.dateCreation).toLocaleDateString('fr-FR')}</TableCell>
                <TableCell>{formatCurrency(societe.valeurEstimee)}</TableCell>
                <TableCell>{formatCurrency(societe.capitalSocial)}</TableCell>
                <TableCell>{societe.regimeFiscal}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditSociete(societe)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSociete(societe.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};