import { User, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type PartnerInfoCardProps = {
  hasPartner: boolean;
  partnerName?: string;
  relationStatus?: string;
  partnerAge?: number;
  isSingle?: boolean;
  onToggleSingle?: (checked: boolean) => void;
  onAddPartner?: () => void;
  onEditPartner?: () => void;
};

export function PartnerInfoCard({
  hasPartner,
  partnerName,
  relationStatus,
  partnerAge,
  isSingle,
  onToggleSingle,
  onAddPartner,
  onEditPartner,
}: PartnerInfoCardProps) {
  if (!hasPartner) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <Checkbox
            id="single"
            checked={isSingle}
            onCheckedChange={onToggleSingle}
          />
          <Label htmlFor="single" className="text-base font-medium cursor-pointer">
            Célibataire (sans partenaire)
          </Label>
        </div>
        
        {!isSingle && (
          <Button onClick={onAddPartner} className="w-full" size="lg">
            <Plus className="w-5 h-5 mr-2" />
            Ajouter un partenaire
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={onEditPartner}
      className="group relative overflow-hidden rounded-md bg-card p-6 w-80 shadow-[12px_12px_24px_rgba(0,0,0,0.15),-12px_-12px_24px_rgba(255,255,255,0.9)] dark:shadow-[12px_12px_24px_rgba(0,0,0,0.3),-12px_-12px_24px_rgba(255,255,255,0.1)] transition-all duration-500 hover:shadow-[20px_20px_40px_rgba(0,0,0,0.2),-20px_-20px_40px_rgba(255,255,255,1)] dark:hover:shadow-[20px_20px_40px_rgba(0,0,0,0.4),-20px_-20px_40px_rgba(255,255,255,0.15)] hover:scale-105 hover:-translate-y-2 cursor-pointer"
    >
      {/* Profile Photo */}
      <div className="mb-4 flex justify-center relative z-10">
        <div className="relative group-hover:animate-pulse">
          <div className="h-28 w-28 overflow-hidden rounded-full bg-muted p-1 shadow-[inset_6px_6px_12px_rgba(0,0,0,0.1),inset_-6px_-6px_12px_rgba(255,255,255,0.9)] dark:shadow-[inset_6px_6px_12px_rgba(0,0,0,0.3),inset_-6px_-6px_12px_rgba(255,255,255,0.1)] transition-all duration-500 group-hover:shadow-[inset_8px_8px_16px_rgba(0,0,0,0.15),inset_-8px_-8px_16px_rgba(255,255,255,1)] dark:group-hover:shadow-[inset_8px_8px_16px_rgba(0,0,0,0.4),inset_-8px_-8px_16px_rgba(255,255,255,0.15)] group-hover:scale-110">
            <div className="h-full w-full rounded-full bg-secondary/10 flex items-center justify-center">
              <User className="h-12 w-12 text-secondary" />
            </div>
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-secondary opacity-0 group-hover:opacity-100 transition-all duration-500 animate-pulse"></div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="text-center relative z-10 transition-transform duration-300 group-hover:-translate-y-1">
        <h3 className="text-lg font-semibold text-foreground transition-colors duration-300 group-hover:text-secondary">
          {partnerName || "Partenaire"}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground transition-colors duration-300 group-hover:text-foreground">
          {relationStatus || "Non renseigné"}
        </p>

        {partnerAge !== undefined && (
          <p className="mt-2 text-xs text-muted-foreground transition-all duration-300 group-hover:text-secondary group-hover:font-medium">
            {partnerAge} ans
          </p>
        )}
      </div>

      {/* Animated border on hover */}
      <div className="absolute inset-0 rounded-md border-2 border-secondary opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
    </div>
  );
}
