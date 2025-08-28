import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { SocieteForm } from './SocieteForm';
import { societeService, type Societe } from '@/services/societeService';
import { toast } from 'sonner';

// Form data interface that matches the form structure
interface SocieteFormData {
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
  const [editingSociete, setEditingSociete] = useState<SocieteFormData | null>(null);
  const [editingSocieteId, setEditingSocieteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load societes on mount
  useEffect(() => {
    loadSocietes();
  }, []);

  const loadSocietes = async () => {
    try {
      setLoading(true);
      const data = await societeService.getAll();
      setSocietes(data);
    } catch (error) {
      console.error('Error loading societes:', error);
      toast.error('Erreur lors du chargement des sociétés');
    } finally {
      setLoading(false);
    }
  };

  // Convert database format to form format
  const societeToFormData = (societe: Societe): SocieteFormData => ({
    denomination: societe.denomination,
    typeSociete: societe.type_societe,
    dateCreation: societe.date_creation || '',
    valeurEstimee: societe.valeur_estimee || 0,
    pourcentageIFI: societe.pourcentage_ifi || 0,
    capitalSocial: societe.capital_social || 0,
    nombreTitres: societe.nombre_titres || 0,
    nombreSalaries: societe.nombre_salaries || 0,
    jourCloture: societe.jour_cloture || '',
    moisCloture: societe.mois_cloture || '',
    siret: societe.siret || '',
    rueAdresse: societe.rue_adresse || '',
    codePostal: societe.code_postal || '',
    commune: societe.commune || '',
    pays: societe.pays || '',
    typeActivite: societe.type_activite || '',
    regimeFiscal: societe.regime_fiscal || '',
    valeurIFI: societe.valeur_ifi || 0,
    activite: societe.activite,
    holding: societe.holding,
    formeSocieteCivile: societe.forme_societe_civile
  });

  // Convert form format to database format
  const formDataToSociete = (formData: SocieteFormData) => ({
    denomination: formData.denomination,
    type_societe: formData.typeSociete,
    date_creation: formData.dateCreation || undefined,
    valeur_estimee: formData.valeurEstimee || undefined,
    pourcentage_ifi: formData.pourcentageIFI || undefined,
    capital_social: formData.capitalSocial || undefined,
    nombre_titres: formData.nombreTitres || undefined,
    nombre_salaries: formData.nombreSalaries || undefined,
    jour_cloture: formData.jourCloture || undefined,
    mois_cloture: formData.moisCloture || undefined,
    siret: formData.siret || undefined,
    rue_adresse: formData.rueAdresse || undefined,
    code_postal: formData.codePostal || undefined,
    commune: formData.commune || undefined,
    pays: formData.pays || undefined,
    type_activite: formData.typeActivite || undefined,
    regime_fiscal: formData.regimeFiscal || undefined,
    valeur_ifi: formData.valeurIFI || undefined,
    activite: formData.activite || undefined,
    holding: formData.holding || undefined,
    forme_societe_civile: formData.formeSocieteCivile || undefined
  });

  const handleAddSociete = () => {
    setEditingSociete(null);
    setEditingSocieteId(null);
    setShowForm(true);
  };

  const handleEditSociete = (societe: Societe) => {
    setEditingSociete(societeToFormData(societe));
    setEditingSocieteId(societe.id);
    setShowForm(true);
  };

  const handleDeleteSociete = async (id: string) => {
    try {
      await societeService.delete(id);
      setSocietes(prev => prev.filter(s => s.id !== id));
      toast.success('Société supprimée avec succès');
    } catch (error) {
      console.error('Error deleting societe:', error);
      toast.error('Erreur lors de la suppression de la société');
    }
  };

  const handleSubmitSociete = async (data: SocieteFormData) => {
    try {
      const societeData = formDataToSociete(data);
      
      if (editingSocieteId) {
        const updatedSociete = await societeService.update(editingSocieteId, societeData);
        setSocietes(prev => prev.map(s => 
          s.id === editingSocieteId ? updatedSociete : s
        ));
        toast.success('Société modifiée avec succès');
      } else {
        const newSociete = await societeService.create(societeData);
        setSocietes(prev => [...prev, newSociete]);
        toast.success('Société ajoutée avec succès');
      }
      
      setShowForm(false);
      setEditingSociete(null);
      setEditingSocieteId(null);
    } catch (error) {
      console.error('Error saving societe:', error);
      toast.error('Erreur lors de la sauvegarde de la société');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Chargement des sociétés...</p>
      </div>
    );
  }

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
                <TableCell>{societe.type_societe?.toUpperCase()}</TableCell>
                <TableCell>{societe.date_creation ? new Date(societe.date_creation).toLocaleDateString('fr-FR') : '-'}</TableCell>
                <TableCell>{societe.valeur_estimee ? formatCurrency(societe.valeur_estimee) : '-'}</TableCell>
                <TableCell>{societe.capital_social ? formatCurrency(societe.capital_social) : '-'}</TableCell>
                <TableCell>{societe.regime_fiscal || '-'}</TableCell>
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