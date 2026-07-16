import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useLiberalites } from '@/hooks/useLiberalites';
import { useAssets } from '@/hooks/useAssets';
import { useToast } from '@/hooks/use-toast';
import { liberaliteService, Liberalite } from '@/services/liberaliteService';
import { buildTransmissionLiberalites } from '@/utils/transmissionHelpers';
import { Plus, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DonationForm } from './DonationForm';
import { LegsForm } from './LegsForm';
import './kairos-transmission.css';

interface LiberaliteGroup {
  groupKey: string;
  rows: Liberalite[];
  denomination: string;
  montantTotal: number;
  dateActe?: string;
  beneficiairesLabel: string;
  hasBeneficiaireInconnu: boolean;
}

export const Liberalites = () => {
  const { liberalites, loading, fetchLiberalites } = useLiberalites();
  const { assets } = useAssets();
  const { toast } = useToast();

  const [isDonationFormOpen, setIsDonationFormOpen] = useState(false);
  const [isLegsFormOpen, setIsLegsFormOpen] = useState(false);
  const [donationGroupToEdit, setDonationGroupToEdit] = useState<Liberalite[] | undefined>(undefined);
  const [legsGroupToEdit, setLegsGroupToEdit] = useState<Liberalite[] | undefined>(undefined);
  const [groupToDelete, setGroupToDelete] = useState<LiberaliteGroup | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Valeur des legs relue en live depuis les biens actuels (jamais figée en
  // base) : même fonction que Synthese.tsx/ProcessusCalcul.tsx, pour que le
  // tableau affiche un montant cohérent avec le calcul de transmission et
  // signale les legs caducs de la même façon (garde-fou (b) du chantier).
  const { liberalites: resolvedLiberalites } = useMemo(
    () => buildTransmissionLiberalites(liberalites, assets),
    [liberalites, assets]
  );
  const valeurLegsById = useMemo(
    () => new Map(resolvedLiberalites.map(l => [l.id, l.valeur])),
    [resolvedLiberalites]
  );

  const groupLiberalites = (rows: Liberalite[]): LiberaliteGroup[] => {
    const map = new Map<string, Liberalite[]>();
    for (const row of rows) {
      const key = row.groupe_id || row.id!;
      const existing = map.get(key);
      if (existing) existing.push(row);
      else map.set(key, [row]);
    }
    return Array.from(map.entries()).map(([groupKey, groupRows]) => {
      const first = groupRows[0];
      const montantTotal = groupRows.reduce((sum, r) => {
        const montant = r.type === 'legs' ? (valeurLegsById.get(r.id!) ?? 0) : (r.montant || 0);
        return sum + montant;
      }, 0);
      return {
        groupKey,
        rows: groupRows,
        denomination: first.denomination,
        montantTotal,
        dateActe: first.date_acte,
        beneficiairesLabel: groupRows.map(r => r.beneficiaire_nom).join(', '),
        hasBeneficiaireInconnu: groupRows.some(r => !r.beneficiaire_id),
      };
    });
  };

  const donationGroups = groupLiberalites(liberalites.filter(l => l.type === 'donation'));
  const legsGroups = groupLiberalites(liberalites.filter(l => l.type === 'legs'));

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

  const handleOpenDonationCreate = () => {
    setDonationGroupToEdit(undefined);
    setIsDonationFormOpen(true);
  };

  const handleOpenDonationEdit = (group: LiberaliteGroup) => {
    setDonationGroupToEdit(group.rows);
    setIsDonationFormOpen(true);
  };

  const handleOpenLegsCreate = () => {
    setLegsGroupToEdit(undefined);
    setIsLegsFormOpen(true);
  };

  const handleOpenLegsEdit = (group: LiberaliteGroup) => {
    setLegsGroupToEdit(group.rows);
    setIsLegsFormOpen(true);
  };

  const handleConfirmDeleteGroup = async () => {
    if (!groupToDelete) return;
    setIsDeleting(true);
    try {
      for (const row of groupToDelete.rows) {
        await liberaliteService.deleteLiberalite(row.id!);
      }
      toast({
        title: "Succès",
        description: "Libéralité supprimée avec succès",
      });
      await fetchLiberalites();
    } catch (error) {
      console.error('Error deleting liberalite group:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la libéralité. Certaines lignes du groupe ont peut-être déjà été retirées — vérifiez le tableau.",
        variant: "destructive",
      });
      await fetchLiberalites();
    } finally {
      setIsDeleting(false);
      setGroupToDelete(null);
    }
  };

  const renderGroupRows = (groups: LiberaliteGroup[], onEdit: (group: LiberaliteGroup) => void) =>
    groups.map((group) => (
      <TableRow key={group.groupKey} className="border-[var(--border)]">
        <TableCell className="font-medium text-[var(--text-primary)]">{group.denomination}</TableCell>
        <TableCell className="text-[var(--text-primary)]">
          <div className="flex items-center gap-2">
            {group.hasBeneficiaireInconnu && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertTriangle className="h-4 w-4 text-[var(--warning)] shrink-0" />
                </TooltipTrigger>
                <TooltipContent>
                  Bénéficiaire non identifié : le lien familial correspondant a été supprimé depuis. Le nom affiché est conservé pour l'historique.
                </TooltipContent>
              </Tooltip>
            )}
            <span>{group.beneficiairesLabel}</span>
            {group.rows.length > 1 && (
              <Badge variant="secondary" className="shrink-0">{group.rows.length} bénéficiaires</Badge>
            )}
          </div>
        </TableCell>
        <TableCell className="kairos-num text-[var(--text-primary)]">{formatCurrency(group.montantTotal)}</TableCell>
        <TableCell className="text-[var(--text-primary)]">{formatDate(group.dateActe)}</TableCell>
        <TableCell>
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(group)}
                    disabled={group.hasBeneficiaireInconnu}
                    className="bg-[var(--surface)] text-[var(--text-primary)] border-[var(--border-strong)] rounded-[var(--radius-lg)]"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {group.hasBeneficiaireInconnu
                  ? "Modification indisponible : au moins un bénéficiaire de ce groupe n'est plus identifiable (lien familial supprimé)."
                  : group.rows.length > 1
                    ? `Ce groupe compte ${group.rows.length} bénéficiaires — la modification recrée l'ensemble du groupe.`
                    : "Modifier cette libéralité."}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGroupToDelete(group)}
                  className="bg-[var(--surface)] text-[var(--text-primary)] border-[var(--border-strong)] rounded-[var(--radius-lg)]"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {group.rows.length > 1
                  ? `Ce groupe compte ${group.rows.length} bénéficiaires — la suppression retire l'ensemble du groupe.`
                  : "Supprimer cette libéralité."}
              </TooltipContent>
            </Tooltip>
          </div>
        </TableCell>
      </TableRow>
    ));

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
            <Button onClick={handleOpenDonationCreate} className="bg-[var(--ink-900)] text-white border border-[var(--ink-900)] rounded-[var(--radius-lg)] hover:bg-[var(--ink-800)] shadow-none">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter une donation
            </Button>
          </CardTitle>
          <CardDescription className="text-[var(--text-secondary)]">
            Gérez les donations effectuées ou prévues
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          {donationGroups.length === 0 ? (
            <p className="text-[var(--text-secondary)] text-center py-8">
              Aucune donation enregistrée
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--border)]">
                  <TableHead className="text-[var(--text-secondary)]">Dénomination</TableHead>
                  <TableHead className="text-[var(--text-secondary)]">Bénéficiaire(s)</TableHead>
                  <TableHead className="text-[var(--text-secondary)]">Montant</TableHead>
                  <TableHead className="text-[var(--text-secondary)]">Date</TableHead>
                  <TableHead className="text-[var(--text-secondary)]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderGroupRows(donationGroups, handleOpenDonationEdit)}
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
            <Button onClick={handleOpenLegsCreate} className="bg-[var(--ink-900)] text-white border border-[var(--ink-900)] rounded-[var(--radius-lg)] hover:bg-[var(--ink-800)] shadow-none">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un legs
            </Button>
          </CardTitle>
          <CardDescription className="text-[var(--text-secondary)]">
            Gérez les legs testamentaires prévus
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          {legsGroups.length === 0 ? (
            <p className="text-[var(--text-secondary)] text-center py-8">
              Aucun legs enregistré
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--border)]">
                  <TableHead className="text-[var(--text-secondary)]">Dénomination</TableHead>
                  <TableHead className="text-[var(--text-secondary)]">Bénéficiaire(s)</TableHead>
                  <TableHead className="text-[var(--text-secondary)]">Montant</TableHead>
                  <TableHead className="text-[var(--text-secondary)]">Date</TableHead>
                  <TableHead className="text-[var(--text-secondary)]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderGroupRows(legsGroups, handleOpenLegsEdit)}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Confirmation de suppression */}
      <AlertDialog open={!!groupToDelete} onOpenChange={(open) => !open && setGroupToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette libéralité ?</AlertDialogTitle>
            <AlertDialogDescription>
              {groupToDelete && groupToDelete.rows.length > 1
                ? `Ce groupe comprend ${groupToDelete.rows.length} bénéficiaires (${groupToDelete.beneficiairesLabel}). La suppression retirera l'ensemble des lignes du groupe, pas seulement une part. Cette action est irréversible.`
                : "Cette action est irréversible."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteGroup} disabled={isDeleting}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Donation Form */}
      <DonationForm
        open={isDonationFormOpen}
        onOpenChange={setIsDonationFormOpen}
        editingGroup={donationGroupToEdit}
        onSaved={fetchLiberalites}
      />

      {/* Legs Form */}
      <LegsForm
        open={isLegsFormOpen}
        onOpenChange={setIsLegsFormOpen}
        editingGroup={legsGroupToEdit}
        onSaved={fetchLiberalites}
      />
    </div>
  );
};
