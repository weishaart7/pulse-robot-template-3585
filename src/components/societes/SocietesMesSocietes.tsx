import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, LayoutGrid, Table as TableIcon, Building2 } from 'lucide-react';
import { SocieteForm } from './SocieteForm';
import { societeService, type Societe } from '@/services/societeService';
import { useAssets } from '@/hooks/useAssets';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';

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
  transfertVersActifs?: boolean;
  natureActif?: string;
}

export const SocietesMesSocietes = () => {
  const [societes, setSocietes] = useState<Societe[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingSociete, setEditingSociete] = useState<SocieteFormData | null>(null);
  const [editingSocieteId, setEditingSocieteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  
  const { createAsset } = useAssets();

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
    formeSocieteCivile: societe.forme_societe_civile,
    transfertVersActifs: true
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
      
      let savedSociete: Societe;
      
      if (editingSocieteId) {
        savedSociete = await societeService.update(editingSocieteId, societeData);
        setSocietes(prev => prev.map(s => 
          s.id === editingSocieteId ? savedSociete : s
        ));
        toast.success('Société modifiée avec succès');
      } else {
        savedSociete = await societeService.create(societeData);
        setSocietes(prev => [...prev, savedSociete]);
        toast.success('Société ajoutée avec succès');
      }
      
      // Create asset if transfertVersActifs is checked
      if (data.transfertVersActifs && data.natureActif) {
        try {
          await createAsset({
            nature: data.natureActif,
            denomination: data.denomination,
            valeur_estimee: data.valeurEstimee || 0,
            date_estimation: new Date().toISOString().split('T')[0],
            detenteur: 'user',
            mode_detention: 'Pleine propriété'
          });
          toast.success('Actif créé avec succès');
        } catch (assetError) {
          console.error('Error creating asset:', assetError);
          toast.error('Société créée mais erreur lors de la création de l\'actif');
        }
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
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
        <h3 className="text-lg font-semibold">Mes sociétés</h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
            <Button
              variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="h-8"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="h-8"
            >
              <TableIcon className="h-4 w-4" />
            </Button>
          </div>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button onClick={handleAddSociete} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Ajouter une société
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
      </div>

      {viewMode === 'table' ? (
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {societes.map((societe) => (
            <Card key={societe.id} className="group hover:shadow-lg transition-all duration-300 border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors duration-300 truncate">
                        {societe.denomination}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {societe.type_societe?.toUpperCase()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  {societe.date_creation && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Date création</span>
                      <span className="font-medium">
                        {new Date(societe.date_creation).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  )}
                  {societe.valeur_estimee && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Valeur estimée</span>
                      <span className="font-semibold text-primary">
                        {formatCurrency(societe.valeur_estimee)}
                      </span>
                    </div>
                  )}
                  {societe.capital_social && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Capital social</span>
                      <span className="font-medium">
                        {formatCurrency(societe.capital_social)}
                      </span>
                    </div>
                  )}
                  {societe.regime_fiscal && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Régime fiscal</span>
                      <span className="font-medium text-xs">
                        {societe.regime_fiscal}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-border/50">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEditSociete(societe)}
                  >
                    <Edit className="h-3.5 w-3.5 mr-1.5" />
                    Modifier
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteSociete(societe.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};