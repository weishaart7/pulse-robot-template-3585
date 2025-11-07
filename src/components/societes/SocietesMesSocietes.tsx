import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, LayoutGrid, Table as TableIcon, Building2 } from 'lucide-react';
import { societeService, type Societe } from '@/services/societeService';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';

export const SocietesMesSocietes = () => {
  const navigate = useNavigate();
  const [societes, setSocietes] = useState<Societe[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');

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

  const handleAddSociete = () => {
    navigate('/societes/form');
  };

  const handleEditSociete = (societeId: string) => {
    navigate(`/societes/form?id=${societeId}`);
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
        <Button onClick={handleAddSociete} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Ajouter une société
        </Button>
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
          <Button onClick={handleAddSociete} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Ajouter une société
          </Button>
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
                        onClick={() => handleEditSociete(societe.id)}
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
                    onClick={() => handleEditSociete(societe.id)}
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