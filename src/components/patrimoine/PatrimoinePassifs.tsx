import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PassifEmpruntForm } from './PassifEmpruntForm';
import { Plus, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
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

export const PatrimoinePassifs = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Emprunt | Passif | null>(null);
  const [selectedPassif, setSelectedPassif] = useState<Emprunt | Passif | null>(null);
  const [passifType, setPassifType] = useState<'emprunt' | 'passif'>('emprunt');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { emprunts, loading: empruntsLoading, deleteEmprunt } = useEmprunts();
  const { passifs, loading: passifsLoading, deletePassif } = usePassifs();
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
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Gestion des passifs</h3>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Ajouter un passif/emprunt
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Emprunts</CardTitle>
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
                    className="flex items-center justify-between p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => {
                      setSelectedPassif(emprunt);
                      setPassifType('emprunt');
                      setDetailsOpen(true);
                    }}
                  >
                    <div>
                      <p className="font-medium">{emprunt.libelle}</p>
                      <p className="text-sm text-muted-foreground">
                        {emprunt.nature} •
                        {emprunt.capital_restant_du && ` Capital: ${emprunt.capital_restant_du.toLocaleString('fr-FR')}€`}
                        {emprunt.mensualite && ` • Mensualité: ${emprunt.mensualite.toLocaleString('fr-FR')}€`}
                      </p>
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

        <Card>
          <CardHeader>
            <CardTitle>Autres passifs</CardTitle>
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
                    className="flex items-center justify-between p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => {
                      setSelectedPassif(passif);
                      setPassifType('passif');
                      setDetailsOpen(true);
                    }}
                  >
                    <div>
                      <p className="font-medium">{passif.nature}</p>
                      <p className="text-sm text-muted-foreground">
                        Montant dû: {passif.montant_du.toLocaleString('fr-FR')}€
                      </p>
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
