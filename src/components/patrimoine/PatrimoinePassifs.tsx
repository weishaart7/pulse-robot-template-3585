import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmpruntForm } from './EmpruntForm';
import { PassifForm } from './PassifForm';
import { Plus } from 'lucide-react';

export const PatrimoinePassifs = () => {
  const [showEmpruntForm, setShowEmpruntForm] = useState(false);
  const [showPassifForm, setShowPassifForm] = useState(false);

  if (showEmpruntForm) {
    return (
      <div className="space-y-6">
        <EmpruntForm
          onCancel={() => setShowEmpruntForm(false)}
          onSubmit={() => setShowEmpruntForm(false)}
        />
      </div>
    );
  }

  if (showPassifForm) {
    return (
      <div className="space-y-6">
        <PassifForm
          onCancel={() => setShowPassifForm(false)}
          onSubmit={() => setShowPassifForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Gestion des passifs</h3>
        <div className="flex gap-2">
          <Button onClick={() => setShowEmpruntForm(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Ajouter un emprunt
          </Button>
          <Button variant="outline" onClick={() => setShowPassifForm(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Ajouter un passif
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Tableau récapitulatif des passifs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Aucun passif enregistré pour le moment
          </div>
        </CardContent>
      </Card>
    </div>
  );
};