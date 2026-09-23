import { INK, EMBER } from '@/lib/palette';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PassifEmpruntForm } from './PassifEmpruntForm';
import { Plus, MoreHorizontal, Edit, Trash2, Landmark, Receipt } from 'lucide-react';
import { useEmprunts, usePassifs } from '@/hooks/usePassifs';
import { useAssets } from '@/hooks/useAssets';
import { PassifDetailsDialog } from './PassifDetailsDialog';
import { Emprunt, Passif } from '@/services/passifService';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Palette Famille (teal / lime / rose), même triptyque que PatrimoineResume.tsx
// et PatrimoineParTeteDetail.tsx — cf. docs/patrimoine.md.
const TEAL = INK;
const PINK = EMBER;

export const PatrimoinePassifs = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Emprunt | Passif | null>(null);
  const [selectedPassif, setSelectedPassif] = useState<Emprunt | Passif | null>(null);
  const [passifType, setPassifType] = useState<'emprunt' | 'passif'>('emprunt');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { emprunts, loading: empruntsLoading, createEmprunt, updateEmprunt, deleteEmprunt } = useEmprunts();
  const { passifs, loading: passifsLoading, createPassif, updatePassif, deletePassif } = usePassifs();
  const { assets } = useAssets();

  const closeForm = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  if (showForm || editingItem) {
    return (
      <div className="space-y-6">
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Gestion des passifs</h3>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-full bg-foreground hover:bg-foreground/85 text-background shadow-whisper pl-1 pr-4 py-1 text-sm font-medium transition-colors"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-background/15">
            <Plus className="h-4 w-4 text-background" />
          </span>
          Ajouter un passif/emprunt
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${TEAL}1a` }}>
                <Landmark className="h-4 w-4" style={{ color: TEAL }} />
              </span>
              Emprunts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {empruntsLoading ? (
              <div className="text-center py-4 text-muted-foreground">
                Chargement...
              </div>
            ) : emprunts.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                Aucun emprunt enregistré
              </div>
            ) : (
              <div className="space-y-2">
                {emprunts.map((emprunt) => (
                  <div
                    key={emprunt.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-border/60 bg-card cursor-pointer hover:shadow-sm hover:border-border transition-all"
                    onClick={() => {
                      setSelectedPassif(emprunt);
                      setPassifType('emprunt');
                      setDetailsOpen(true);
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${TEAL}1a` }}>
                        <Landmark className="h-4 w-4" style={{ color: TEAL }} />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{emprunt.libelle}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {emprunt.nature} •
                          {emprunt.capital_restant_du && ` Capital: ${emprunt.capital_restant_du.toLocaleString('fr-FR')}€`}
                          {emprunt.mensualite && ` • Mensualité: ${emprunt.mensualite.toLocaleString('fr-FR')}€`}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="rounded-full shadow-none"
                          aria-label="Open menu"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal size={16} strokeWidth={2} aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setEditingItem(emprunt);
                        }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteEmprunt(emprunt.id);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${PINK}1a` }}>
                <Receipt className="h-4 w-4" style={{ color: PINK }} />
              </span>
              Autres passifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {passifsLoading ? (
              <div className="text-center py-4 text-muted-foreground">
                Chargement...
              </div>
            ) : passifs.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                Aucun passif enregistré
              </div>
            ) : (
              <div className="space-y-2">
                {passifs.map((passif) => (
                  <div
                    key={passif.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-border/60 bg-card cursor-pointer hover:shadow-sm hover:border-border transition-all"
                    onClick={() => {
                      setSelectedPassif(passif);
                      setPassifType('passif');
                      setDetailsOpen(true);
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${PINK}1a` }}>
                        <Receipt className="h-4 w-4" style={{ color: PINK }} />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{passif.nature}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          Montant dû: {passif.montant_du.toLocaleString('fr-FR')}€
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="rounded-full shadow-none"
                          aria-label="Open menu"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal size={16} strokeWidth={2} aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setEditingItem(passif);
                        }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePassif(passif.id);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <PassifDetailsDialog
        passif={selectedPassif}
        type={passifType}
        assets={assets}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </div>
  );
};
