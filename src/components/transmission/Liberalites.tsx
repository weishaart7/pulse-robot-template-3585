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
import { DonationForm } from './DonationForm';
import { LegsForm } from './LegsForm';
import './kairos-transmission.css';

export const Liberalites = () => {
  const { liberalites, loading, createLiberalite, updateLiberalite, deleteLiberalite } = useLiberalites();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLiberalite, setEditingLiberalite] = useState<Liberalite | null>(null);
  const [liberaliteType, setLiberaliteType] = useState<'donation' | 'legs'>('donation');
  const [isDonationFormOpen, setIsDonationFormOpen] = useState(false);
  const [isLegsFormOpen, setIsLegsFormOpen] = useState(false);

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
    return <div className="kairos-transmission text-[var(--text-secondary)]">Chargement...</div>;
  }

  return (
    <div className="kairos-transmission space-y-6">
      {/* Bloc Donations */}
      <Card className="bg-[var(--surface)] border-[var(--border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
        <CardHeader className="p-5">
          <CardTitle className="flex items-center justify-between text-[15px] font-semibold text-[var(--text-primary)]">
            Donations
            <Button onClick={() => setIsDonationFormOpen(true)} className="bg-[var(--ink-900)] text-white border border-[var(--ink-900)] rounded-[var(--radius-lg)] hover:bg-[var(--ink-800)] shadow-none">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter une donation
            </Button>
          </CardTitle>
          <CardDescription className="text-[var(--text-secondary)]">
            Gérez les donations effectuées ou prévues
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          {donations.length === 0 ? (
            <p className="text-[var(--text-secondary)] text-center py-8">
              Aucune donation enregistrée
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--border)]">
                  <TableHead className="text-[var(--text-secondary)]">Dénomination</TableHead>
                  <TableHead className="text-[var(--text-secondary)]">Bénéficiaire</TableHead>
                  <TableHead className="text-[var(--text-secondary)]">Montant</TableHead>
                  <TableHead className="text-[var(--text-secondary)]">Date</TableHead>
                  <TableHead className="text-[var(--text-secondary)]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {donations.map((donation) => (
                  <TableRow key={donation.id} className="border-[var(--border)]">
                    <TableCell className="font-medium text-[var(--text-primary)]">{donation.denomination}</TableCell>
                    <TableCell className="text-[var(--text-primary)]">{donation.beneficiaire}</TableCell>
                    <TableCell className="kairos-num text-[var(--text-primary)]">{formatCurrency(donation.montant)}</TableCell>
                    <TableCell className="text-[var(--text-primary)]">{formatDate(donation.date_acte)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog('donation', donation)}
                          className="bg-[var(--surface)] text-[var(--text-primary)] border-[var(--border-strong)] rounded-[var(--radius-lg)]"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(donation.id!)}
                          className="bg-[var(--surface)] text-[var(--text-primary)] border-[var(--border-strong)] rounded-[var(--radius-lg)]"
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
      <Card className="bg-[var(--surface)] border-[var(--border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
        <CardHeader className="p-5">
          <CardTitle className="flex items-center justify-between text-[15px] font-semibold text-[var(--text-primary)]">
            Legs (Testament)
            <Button onClick={() => setIsLegsFormOpen(true)} className="bg-[var(--ink-900)] text-white border border-[var(--ink-900)] rounded-[var(--radius-lg)] hover:bg-[var(--ink-800)] shadow-none">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un legs
            </Button>
          </CardTitle>
          <CardDescription className="text-[var(--text-secondary)]">
            Gérez les legs testamentaires prévus
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          {legs.length === 0 ? (
            <p className="text-[var(--text-secondary)] text-center py-8">
              Aucun legs enregistré
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--border)]">
                  <TableHead className="text-[var(--text-secondary)]">Dénomination</TableHead>
                  <TableHead className="text-[var(--text-secondary)]">Bénéficiaire</TableHead>
                  <TableHead className="text-[var(--text-secondary)]">Montant</TableHead>
                  <TableHead className="text-[var(--text-secondary)]">Date</TableHead>
                  <TableHead className="text-[var(--text-secondary)]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {legs.map((leg) => (
                  <TableRow key={leg.id} className="border-[var(--border)]">
                    <TableCell className="font-medium text-[var(--text-primary)]">{leg.denomination}</TableCell>
                    <TableCell className="text-[var(--text-primary)]">{leg.beneficiaire}</TableCell>
                    <TableCell className="kairos-num text-[var(--text-primary)]">{formatCurrency(leg.montant)}</TableCell>
                    <TableCell className="text-[var(--text-primary)]">{formatDate(leg.date_acte)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog('legs', leg)}
                          className="bg-[var(--surface)] text-[var(--text-primary)] border-[var(--border-strong)] rounded-[var(--radius-lg)]"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(leg.id!)}
                          className="bg-[var(--surface)] text-[var(--text-primary)] border-[var(--border-strong)] rounded-[var(--radius-lg)]"
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

      {/* Donation Form */}
      <DonationForm 
        open={isDonationFormOpen} 
        onOpenChange={setIsDonationFormOpen} 
      />

      {/* Legs Form */}
      <LegsForm 
        open={isLegsFormOpen} 
        onOpenChange={setIsLegsFormOpen} 
      />
    </div>
  );
};