import { DatePickerPanel } from "@/components/ui/date-picker-panel";

// Calendrier de l'app : délègue au panneau à trois vues (jours / mois / années),
// commun avec SmartDateInput. Seul le mode « single » est utilisé dans l'app.
export interface CalendarProps {
  mode?: "single";
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  /** Date maximale sélectionnable (aucune borne haute par défaut). */
  maxDate?: Date;
  minYear?: number;
  /** Acceptés pour compatibilité des appels existants (anciens réglages du DayPicker shadcn), sans effet. */
  className?: string;
  initialFocus?: boolean;
  locale?: unknown;
}

function Calendar({ selected, onSelect, maxDate, minYear }: CalendarProps) {
  return (
    <DatePickerPanel
      selected={selected}
      onSelect={(date) => onSelect?.(date)}
      maxDate={maxDate}
      minYear={minYear}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
