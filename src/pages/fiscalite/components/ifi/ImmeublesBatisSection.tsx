import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Home, Plus, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import ImmeublesBatisForm from './ImmeublesBatisForm';

interface ImmeublesBatis {
  id: string;
  designation: string;
  categorie: string;
  valeurTotale: number;
  valeurDeclaree: number;
}

const ImmeublesBatisSection = () => {
  const [biens, setBiens] = useState<ImmeublesBatis[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const residencePrincipaleValue = biens
    .filter(bien => bien.categorie === 'Résidence principale')
    .reduce((sum, bien) => sum + bien.valeurDeclaree, 0);

  const autresImmeublesValue = biens
    .filter(bien => bien.categorie !== 'Résidence principale')
    .reduce((sum, bien) => sum + bien.valeurDeclaree, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Home className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-semibold">Immeubles bâtis détenus directement</h2>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        Saisissez ici les biens bâtis de toute nature : locaux d'habitation (loués ou non, résidence 
        principale ou secondaire, appartement dans un immeuble collectif avec dépendances dont cave 
        et/ou parking, maison individuelle, etc.), monuments historiques ou immeubles de caractère 
        exceptionnel (hôtels particuliers, châteaux, manoirs, moulins...), mais aussi locaux 
        professionnels ou commerciaux non déclarés au titre des biens professionnels exonérés 
        (boutique, bureau, atelier, hangar...).
      </p>

      {/* Tableau des biens */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">Liste des biens</CardTitle>
          <div className="flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un bien
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Ajouter un immeuble bâti</DialogTitle>
                </DialogHeader>
                <ImmeublesBatisForm
                  onSubmit={(data) => {
                    const newBien: ImmeublesBatis = {
                      id: Date.now().toString(),
                      designation: data.designation,
                      categorie: data.categorie,
                      valeurTotale: data.valeurTotale,
                      valeurDeclaree: data.categorie === 'Résidence principale' ? data.valeurTotale * 0.7 : data.valeurTotale,
                    };
                    setBiens(prev => [...prev, newBien]);
                    setIsDialogOpen(false);
                  }}
                />
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Importer une propriété 2024
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {biens.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Aucun élément dans la liste.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Désignation</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead className="text-right">Valeur totale</TableHead>
                  <TableHead className="text-right">Valeur déclarée</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {biens.map((bien) => (
                  <TableRow key={bien.id}>
                    <TableCell className="font-medium">{bien.designation}</TableCell>
                    <TableCell>{bien.categorie}</TableCell>
                    <TableCell className="text-right">{formatCurrency(bien.valeurTotale)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(bien.valeurDeclaree)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Cartes de récapitulatif */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Résidence principale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(residencePrincipaleValue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Autres immeubles bâtis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(autresImmeublesValue)}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ImmeublesBatisSection;