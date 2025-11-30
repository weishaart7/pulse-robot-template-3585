import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FamilyOnboardingWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete: (data: OnboardingData) => void;
}

interface OnboardingData {
  statut: string;
  enfants: Array<{ prenom: string; nom: string }>;
  parents: Array<{ prenom: string; nom: string }>;
  fratrie: Array<{ prenom: string; nom: string }>;
}

export function FamilyOnboardingWizard({ open, onClose, onComplete }: FamilyOnboardingWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    statut: '',
    enfants: [],
    parents: [],
    fratrie: [],
  });

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      onComplete(data);
      toast({
        title: 'Famille configurée',
        description: 'Votre arbre familial de base a été créé avec succès',
      });
      onClose();
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const addMember = (category: 'enfants' | 'parents' | 'fratrie') => {
    setData({
      ...data,
      [category]: [...data[category], { prenom: '', nom: '' }],
    });
  };

  const updateMember = (category: 'enfants' | 'parents' | 'fratrie', index: number, field: 'prenom' | 'nom', value: string) => {
    const updated = [...data[category]];
    updated[index] = { ...updated[index], [field]: value };
    setData({ ...data, [category]: updated });
  };

  const removeMember = (category: 'enfants' | 'parents' | 'fratrie', index: number) => {
    setData({
      ...data,
      [category]: data[category].filter((_, i) => i !== index),
    });
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return data.statut !== '';
      case 2:
      case 3:
      case 4:
        return true;
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Configuration de votre famille</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Étape {step} sur {totalSteps} - Créez rapidement votre arbre familial de base
          </p>
        </DialogHeader>

        <Progress value={progress} className="mb-6" />

        <div className="space-y-6">
          {/* Étape 1: Statut matrimonial */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Quelle est votre situation familiale ?</h3>
              <RadioGroup value={data.statut} onValueChange={(value) => setData({ ...data, statut: value })}>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="celibataire" id="celibataire" />
                  <Label htmlFor="celibataire" className="cursor-pointer flex-1">
                    Célibataire
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="marie" id="marie" />
                  <Label htmlFor="marie" className="cursor-pointer flex-1">
                    Marié(e)
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="pacs" id="pacs" />
                  <Label htmlFor="pacs" className="cursor-pointer flex-1">
                    Pacsé(e)
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="concubinage" id="concubinage" />
                  <Label htmlFor="concubinage" className="cursor-pointer flex-1">
                    En concubinage
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Étape 2: Enfants */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Avez-vous des enfants ?</h3>
              <p className="text-sm text-muted-foreground">
                Ajoutez vos enfants (vous pourrez compléter les détails plus tard)
              </p>
              
              {data.enfants.map((enfant, index) => (
                <div key={index} className="flex gap-2 p-3 border rounded-lg">
                  <Input
                    placeholder="Prénom"
                    value={enfant.prenom}
                    onChange={(e) => updateMember('enfants', index, 'prenom', e.target.value)}
                  />
                  <Input
                    placeholder="Nom"
                    value={enfant.nom}
                    onChange={(e) => updateMember('enfants', index, 'nom', e.target.value)}
                  />
                  <Button variant="ghost" size="sm" onClick={() => removeMember('enfants', index)}>
                    ×
                  </Button>
                </div>
              ))}
              
              <Button variant="outline" onClick={() => addMember('enfants')} className="w-full">
                + Ajouter un enfant
              </Button>
            </div>
          )}

          {/* Étape 3: Parents */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Vos parents</h3>
              <p className="text-sm text-muted-foreground">
                Ajoutez vos parents (facultatif)
              </p>
              
              {data.parents.map((parent, index) => (
                <div key={index} className="flex gap-2 p-3 border rounded-lg">
                  <Input
                    placeholder="Prénom"
                    value={parent.prenom}
                    onChange={(e) => updateMember('parents', index, 'prenom', e.target.value)}
                  />
                  <Input
                    placeholder="Nom"
                    value={parent.nom}
                    onChange={(e) => updateMember('parents', index, 'nom', e.target.value)}
                  />
                  <Button variant="ghost" size="sm" onClick={() => removeMember('parents', index)}>
                    ×
                  </Button>
                </div>
              ))}
              
              <Button variant="outline" onClick={() => addMember('parents')} className="w-full">
                + Ajouter un parent
              </Button>
            </div>
          )}

          {/* Étape 4: Fratrie */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Vos frères et sœurs</h3>
              <p className="text-sm text-muted-foreground">
                Ajoutez votre fratrie (facultatif)
              </p>
              
              {data.fratrie.map((sibling, index) => (
                <div key={index} className="flex gap-2 p-3 border rounded-lg">
                  <Input
                    placeholder="Prénom"
                    value={sibling.prenom}
                    onChange={(e) => updateMember('fratrie', index, 'prenom', e.target.value)}
                  />
                  <Input
                    placeholder="Nom"
                    value={sibling.nom}
                    onChange={(e) => updateMember('fratrie', index, 'nom', e.target.value)}
                  />
                  <Button variant="ghost" size="sm" onClick={() => removeMember('fratrie', index)}>
                    ×
                  </Button>
                </div>
              ))}
              
              <Button variant="outline" onClick={() => addMember('fratrie')} className="w-full">
                + Ajouter un frère/sœur
              </Button>
            </div>
          )}
        </div>

        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={handleBack} disabled={step === 1}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Précédent
          </Button>
          <Button onClick={handleNext} disabled={!canProceed()}>
            {step === totalSteps ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Terminer
              </>
            ) : (
              <>
                Suivant
                <ChevronRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
