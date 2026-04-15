import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/lib/patrimoine/utils';

interface AVOperation {
  id: string;
  type_operation: 'versement' | 'rachat';
  montant: number;
  date_operation: string;
  commentaire: string | null;
}

interface AVOperationsTableProps {
  operations: AVOperation[];
  onAdd: (type: 'versement' | 'rachat', montant: number, date: string, commentaire: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const AVOperationsTable: React.FC<AVOperationsTableProps> = ({ operations, onAdd, onDelete }) => {
  const [showForm, setShowForm] = useState(false);
  const [newType, setNewType] = useState<'versement' | 'rachat'>('versement');
  const [newMontant, setNewMontant] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newCommentaire, setNewCommentaire] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    if (!newMontant || !newDate) return;
    setIsAdding(true);
    await onAdd(newType, Number(newMontant), newDate, newCommentaire);
    setNewMontant('');
    setNewDate('');
    setNewCommentaire('');
    setShowForm(false);
    setIsAdding(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Versements & Rachats</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(!showForm)}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add form */}
        {showForm && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 rounded-lg bg-muted/50">
              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <Select value={newType} onValueChange={(v) => setNewType(v as 'versement' | 'rachat')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="versement">Versement</SelectItem>
                    <SelectItem value="rachat">Rachat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Montant (€)</Label>
                <Input
                  type="number"
                  placeholder="10 000"
                  value={newMontant}
                  onChange={(e) => setNewMontant(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Commentaire</Label>
                <Input
                  placeholder="Optionnel"
                  value={newCommentaire}
                  onChange={(e) => setNewCommentaire(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
              <Button size="sm" onClick={handleAdd} disabled={isAdding || !newMontant || !newDate}>
                {isAdding ? 'Ajout...' : 'Valider'}
              </Button>
            </div>
            <Separator />
          </>
        )}

        {/* Operations list */}
        {operations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Aucune opération enregistrée
          </p>
        ) : (
          <div className="space-y-2">
            {operations.map((op) => (
              <div key={op.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors group">
                <div className="flex items-center gap-3">
                  {op.type_operation === 'versement' ? (
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant={op.type_operation === 'versement' ? 'default' : 'destructive'} className="text-xs">
                        {op.type_operation === 'versement' ? 'Versement' : 'Rachat'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(op.date_operation).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    {op.commentaire && (
                      <p className="text-xs text-muted-foreground mt-0.5">{op.commentaire}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-semibold ${op.type_operation === 'versement' ? 'text-emerald-600' : 'text-destructive'}`}>
                    {op.type_operation === 'versement' ? '+' : '-'}{formatCurrency(op.montant)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onDelete(op.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
