import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Asset } from '@/services/assetService';
import { RevenusChargesSection } from './RevenusChargesSection';

interface ImmobilierGestionDialogProps {
  asset: Asset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Fenêtre des revenus et charges, gardée pour les biens sans fiche détaillée (parts foncières) ;
// les autres biens les gèrent dans leur fiche (RevenusChargesSection).
export const ImmobilierGestionDialog = ({ asset, open, onOpenChange }: ImmobilierGestionDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent
      overlayClassName="bg-black/30 backdrop-blur-[6px]"
      className="workspace-panel no-scrollbar max-w-2xl max-h-[90vh] overflow-y-auto rounded-[4px] sm:rounded-[4px]"
    >
      <DialogHeader className="-mx-6 border-b border-border px-6 pb-4">
        <DialogTitle className="text-[16px] font-medium leading-tight tracking-[-0.01em]">
          Revenus et charges · {asset?.denomination || 'ce bien'}
        </DialogTitle>
        <DialogDescription className="text-[12.5px]">
          Lignes de ce bien, reprises dans les indicateurs Immobilier et, si le transfert est activé, dans le Budget.
        </DialogDescription>
      </DialogHeader>
      <RevenusChargesSection asset={asset} active={open} />
    </DialogContent>
  </Dialog>
);
