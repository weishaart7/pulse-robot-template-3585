import { PatrimoinePanel } from './PatrimoinePanel';
import { AddButton } from '@/components/layout/workspace-panel';
import { Chip } from '@/components/layout/workspace-panel';
import { SectionHeader } from '@/components/family/SectionHeader';
import { cn } from '@/lib/utils';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PassifEmpruntForm } from './PassifEmpruntForm';
import { MoreHorizontal, Pencil, Trash2, Landmark, Receipt } from 'lucide-react';
import { useEmprunts, usePassifs } from '@/hooks/usePassifs';
import { useAssets } from '@/hooks/useAssets';
import { PassifDetailView } from './PassifDetailView';
import { WizardConfirmDialog } from '@/components/assets/wizard/WizardConfirmDialog';
import { Emprunt, Passif } from '@/services/passifService';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const euros = (n: number) => `${n.toLocaleString('fr-FR')} €`;

export const PatrimoinePassifs = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Emprunt | Passif | null>(null);
  const [selectedPassif, setSelectedPassif] = useState<Emprunt | Passif | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; type: 'emprunt' | 'passif'; label: string } | null>(null);
  const { emprunts, loading: empruntsLoading, createEmprunt, updateEmprunt, deleteEmprunt } = useEmprunts();
  const { passifs, loading: passifsLoading, createPassif, updatePassif, deletePassif } = usePassifs();
  const { assets } = useAssets();

  const closeForm = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  if (showForm || editingItem) {
    return (
      <div>
        <PassifEmpruntForm
          item={editingItem || undefined}
          onCancel={closeForm}
          onSubmit={closeForm}
          createEmprunt={createEmprunt}
          updateEmprunt={updateEmprunt}
          createPassif={createPassif}
          updatePassif={updatePassif}
        />
      </div>
    );
  }

  // Fiche relue dans les listes rechargées : après une modification, elle affiche la version à jour.
  const selection = selectedPassif
    ? [...emprunts, ...passifs].find((p) => p.id === selectedPassif.id) ?? selectedPassif
    : null;
  if (selection) {
    return (
      <PassifDetailView
        item={selection}
        assets={assets}
        onBack={() => setSelectedPassif(null)}
        onEdit={() => { setEditingItem(selection); }}
      />
    );
  }

  const nbEmprunts = emprunts.length;
  const empruntsPerso = emprunts.filter((e) => !e.societe_id);
  const totalEmprunts = Math.round(empruntsPerso.reduce((sum, e) => sum + (e.capital_restant_du || 0), 0));
  const totalDettes = Math.round(passifs.reduce((sum, p) => sum + (p.montant_du || 0), 0));
  const totalPassifs = totalEmprunts + totalDettes;
  const totalMensualites = Math.round(empruntsPerso.reduce((sum, e) => sum + (e.mensualite || 0), 0));
  const nbDettes = passifs.length;

  return (
    <PatrimoinePanel
      trail="Passifs"
      title="Passifs"
      summary={nbEmprunts + nbDettes === 0
        ? 'Aucun passif renseigné'
        : `${nbEmprunts} emprunt${nbEmprunts > 1 ? 's' : ''} · ${nbDettes} dette${nbDettes > 1 ? 's' : ''}`}
      actions={
        <AddButton onClick={() => setShowForm(true)}>Ajouter un passif/emprunt</AddButton>
      }
    >
      <div className="space-y-6">

      {nbEmprunts + nbDettes > 0 && (
        // Totaux hors emprunts de société (déjà reflétés dans la valorisation des parts), comme le Résumé.
        <dl className="grid grid-cols-2 gap-x-10 gap-y-4 border-b border-border pb-6 md:grid-cols-3">
          <div>
            <dt className="text-[12px] text-muted-foreground">Total des passifs</dt>
            <dd className="mt-1 text-[22px] font-medium leading-none tracking-[-0.02em] tabular-nums">{euros(totalPassifs)}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-muted-foreground">Mensualités</dt>
            <dd className="mt-1 text-[22px] font-medium leading-none tracking-[-0.02em] tabular-nums">{euros(totalMensualites)}<span className="ml-1 text-[13px] font-normal text-muted-foreground">/ mois</span></dd>
          </div>
          <div>
            <dt className="text-[12px] text-muted-foreground">Répartition</dt>
            <dd className="mt-1 text-[13px] tabular-nums text-foreground">
              {euros(totalEmprunts)} d'emprunts · {euros(totalDettes)} de dettes
            </dd>
          </div>
        </dl>
      )}

      <div className="grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-2">
        <section>
          <div className="flex items-baseline justify-between">
            <SectionHeader title="Emprunts" markClassName="bg-[#a8473d]" />
            <span className="text-[12px] tabular-nums text-muted-foreground">{emprunts.length}</span>
          </div>
          {empruntsLoading ? (
            <p className="py-3 text-[13px] text-muted-foreground">Chargement...</p>
          ) : emprunts.length === 0 ? (
            <p className="border-t border-border py-3 text-[13px] text-muted-foreground">Aucun emprunt enregistré</p>
          ) : (
            <ul className="-mx-2 border-b border-border">
              {emprunts.map((emprunt) => (
                <PassifRow
                  key={emprunt.id}
                  icon={<Landmark className="h-3.5 w-3.5" />}
                  tone="bg-[#f3dfdb] text-[#8a3a31]"
                  title={emprunt.libelle || emprunt.nature}
                  // Emprunt lié à une société (module Sociétés) : déjà reflété dans la
                  // valorisation des parts, donc exclu des totaux.
                  tag={emprunt.societe_id ? 'Société · hors totaux' : undefined}
                  subtitle={[
                    emprunt.libelle ? emprunt.nature : null,
                    emprunt.mensualite != null ? `${euros(emprunt.mensualite)} / mois` : null,
                  ].filter(Boolean).join(' · ')}
                  amount={emprunt.capital_restant_du != null ? euros(emprunt.capital_restant_du) : undefined}
                  amountLabel="Capital restant dû"
                  onOpen={() => setSelectedPassif(emprunt)}
                  onEdit={() => setEditingItem(emprunt)}
                  onDelete={() => setPendingDelete({ id: emprunt.id, type: 'emprunt', label: emprunt.libelle || emprunt.nature })}
                />
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="flex items-baseline justify-between">
            <SectionHeader title="Autres passifs" markClassName="bg-[#dc9488]" />
            <span className="text-[12px] tabular-nums text-muted-foreground">{passifs.length}</span>
          </div>
          {passifsLoading ? (
            <p className="py-3 text-[13px] text-muted-foreground">Chargement...</p>
          ) : passifs.length === 0 ? (
            <p className="border-t border-border py-3 text-[13px] text-muted-foreground">Aucun passif enregistré</p>
          ) : (
            <ul className="-mx-2 border-b border-border">
              {passifs.map((passif) => (
                <PassifRow
                  key={passif.id}
                  icon={<Receipt className="h-3.5 w-3.5" />}
                  tone="bg-[#f8e9e6] text-[#a8473d]"
                  title={passif.libelle || passif.nature}
                  subtitle={[
                    passif.libelle ? passif.nature : null,
                    passif.date_echeance ? `à payer avant le ${new Date(passif.date_echeance).toLocaleDateString('fr-FR')}` : null,
                  ].filter(Boolean).join(' · ') || undefined}
                  amount={euros(passif.montant_du)}
                  amountLabel="Montant dû"
                  onOpen={() => setSelectedPassif(passif)}
                  onEdit={() => setEditingItem(passif)}
                  onDelete={() => setPendingDelete({ id: passif.id, type: 'passif', label: passif.libelle || passif.nature })}
                />
              ))}
            </ul>
          )}
        </section>
      </div>

      <WizardConfirmDialog
        open={pendingDelete !== null}
        title="Supprimer ce passif ?"
        description={pendingDelete ? `« ${pendingDelete.label} » sera définitivement supprimé.` : ''}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onConfirm={() => {
          if (pendingDelete?.type === 'emprunt') deleteEmprunt(pendingDelete.id);
          else if (pendingDelete) deletePassif(pendingDelete.id);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
      </div>
    </PatrimoinePanel>
  );
};

// Ligne d'un emprunt ou d'une dette : pastille, libellé, détail, montant aligné à droite
// et menu d'actions (même gabarit que la liste des membres de la famille).
function PassifRow({ icon, tone, title, tag, subtitle, amount, amountLabel, onOpen, onEdit, onDelete }: {
  icon: React.ReactNode;
  tone: string;
  title: string;
  tag?: string;
  subtitle?: string;
  amount?: string;
  amountLabel: string;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      className="flex cursor-pointer items-center gap-3 border-t border-border px-2 py-2 transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
    >
      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px]', tone)}>{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate text-[13px] font-medium text-foreground">{title}</p>
          {tag && <Chip>{tag}</Chip>}
        </div>
        {subtitle && <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{subtitle}</p>}
      </div>
      {amount && (
        <div className="shrink-0 text-right">
          <p className="text-[13px] tabular-nums text-foreground">{amount}</p>
          <p className="text-[12px] text-muted-foreground">{amountLabel}</p>
        </div>
      )}
      <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-[2px] shadow-none" aria-label="Ouvrir le menu">
              <MoreHorizontal size={16} strokeWidth={2} aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil />
              Modifier
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}
