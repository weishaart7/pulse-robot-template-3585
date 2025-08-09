import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLiberalites } from '@/hooks/useLiberalites';
import { Liberalite } from '@/services/liberaliteService';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const Liberalites = () => {
  const { liberalites, loading, createLiberalite, updateLiberalite, deleteLiberalite } = useLiberalites();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLiberalite, setEditingLiberalite] = useState<Liberalite | null>(null);
  const [liberaliteType, setLiberaliteType] = useState<'donation' | 'legs'>('donation');

  const [formData, setFormData] = useState({
    denomination: '',
    beneficiaire: '',
    montant: '',
    date_acte: '',
    notaire: '',
    description: '',
  });

  const resetForm = () => {
    setFormData({
      denomination: '',
      beneficiaire: '',
      montant: '',
      date_acte: '',
      notaire: '',
      description: '',
    });
    setEditingLiberalite(null);
  };

  const handleOpenDialog = (type: 'donation' | 'legs', liberalite?: Liberalite) => {
    setLiberaliteType(type);
    if (liberalite) {
      setEditingLiberalite(liberalite);
      setFormData({
        denomination: liberalite.denomination,
        beneficiaire: liberalite.beneficiaire,
        montant: liberalite.montant?.toString() || '',
        date_acte: liberalite.date_acte || '',
        notaire: liberalite.notaire || '',
        description: liberalite.description || '',
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const liberaliteData = {
        type: liberaliteType,
        denomination: formData.denomination,
        beneficiaire: formData.beneficiaire,
        montant: formData.montant ? parseFloat(formData.montant) : undefined,
        date_acte: formData.date_acte || undefined,
        notaire: formData.notaire || undefined,
        description: formData.description || undefined,
      };

      if (editingLiberalite) {
        await updateLiberalite(editingLiberalite.id!, liberaliteData);
      } else {
        await createLiberalite(liberaliteData);
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving liberalite:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette libéralité ?')) {
      await deleteLiberalite(id);
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return format(new Date(date), 'dd/MM/yyyy', { locale: fr });
  };

  const donations = liberalites.filter(l => l.type === 'donation');
  const legs = liberalites.filter(l => l.type === 'legs');

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Bloc Donations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Donations
            <Button onClick={() => handleOpenDialog('donation')}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter une donation
            </Button>
          </CardTitle>
          <CardDescription>
            Gérez les donations effectuées ou prévues
          </CardDescription>
        </CardHeader>
        <CardContent>
          {donations.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucune donation enregistrée
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dénomination</TableHead>
                  <TableHead>Bénéficiaire</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {donations.map((donation) => (
                  <TableRow key={donation.id}>
                    <TableCell className="font-medium">{donation.denomination}</TableCell>
                    <TableCell>{donation.beneficiaire}</TableCell>
                    <TableCell>{formatCurrency(donation.montant)}</TableCell>
                    <TableCell>{formatDate(donation.date_acte)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog('donation', donation)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(donation.id!)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Bloc Legs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Legs (Testament)
            <Button onClick={() => handleOpenDialog('legs')}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un legs
            </Button>
          </CardTitle>
          <CardDescription>
            Gérez les legs testamentaires prévus
          </CardDescription>
        </CardHeader>
        <CardContent>
          {legs.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucun legs enregistré
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dénomination</TableHead>
                  <TableHead>Bénéficiaire</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {legs.map((leg) => (
                  <TableRow key={leg.id}>
                    <TableCell className="font-medium">{leg.denomination}</TableCell>
                    <TableCell>{leg.beneficiaire}</TableCell>
                    <TableCell>{formatCurrency(leg.montant)}</TableCell>
                    <TableCell>{formatDate(leg.date_acte)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog('legs', leg)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(leg.id!)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog pour ajouter/modifier */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingLiberalite ? 'Modifier' : 'Ajouter'} une {liberaliteType === 'donation' ? 'donation' : 'legs'}
            </DialogTitle>
            <DialogDescription>
              Renseignez les informations de la {liberaliteType === 'donation' ? 'donation' : 'legs'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="denomination">Dénomination</Label>
              <Input
                id="denomination"
                value={formData.denomination}
                onChange={(e) => setFormData({ ...formData, denomination: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="beneficiaire">Bénéficiaire</Label>
              <Input
                id="beneficiaire"
                value={formData.beneficiaire}
                onChange={(e) => setFormData({ ...formData, beneficiaire: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="montant">Montant (€)</Label>
              <Input
                id="montant"
                type="number"
                step="0.01"
                value={formData.montant}
                onChange={(e) => setFormData({ ...formData, montant: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="date_acte">Date de l'acte</Label>
              <Input
                id="date_acte"
                type="date"
                value={formData.date_acte}
                onChange={(e) => setFormData({ ...formData, date_acte: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="notaire">Notaire</Label>
              <Input
                id="notaire"
                value={formData.notaire}
                onChange={(e) => setFormData({ ...formData, notaire: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">
                {editingLiberalite ? 'Modifier' : 'Ajouter'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};