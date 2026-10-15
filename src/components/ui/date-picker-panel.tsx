import { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DatePickerPanelProps {
  selected?: Date;
  onSelect: (date: Date) => void;
  minYear?: number;
  /** Date maximale sélectionnable ; sans valeur, pas de borne haute (agenda, échéances). */
  maxDate?: Date;
  className?: string;
}

type View = 'days' | 'months' | 'years';

const MONTHS = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];
const MONTHS_LONG = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const YEARS_PER_PAGE = 20;

const navBtn =
  'flex h-7 w-7 items-center justify-center rounded-[2px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-30';
const headerBtn =
  'h-7 rounded-[2px] px-2 text-[13px] font-medium text-foreground transition-colors hover:bg-secondary';
const cellBtn = (selected: boolean, current: boolean) =>
  cn(
    'h-9 rounded-[2px] text-[12.5px] tabular-nums transition-colors disabled:pointer-events-none disabled:opacity-30',
    selected
      ? 'bg-foreground text-background'
      : cn('text-foreground hover:bg-secondary', current && 'shadow-[inset_0_0_0_1px_hsl(var(--border))]')
  );

// Panneau de sélection de date à trois vues : jours, mois, années. Un clic sur le
// mois ou l'année de l'en-tête permet d'y sauter directement (ex. naissance en 1950)
// au lieu de reculer mois par mois.
// Sans borne haute, la pagination des années s'arrête 50 ans après l'année en cours.
const OPEN_MAX_YEARS_AHEAD = 50;

export function DatePickerPanel({ selected, onSelect, minYear = 1900, maxDate, className }: DatePickerPanelProps) {
  const today = new Date();
  const [view, setView] = useState<View>('days');
  const [month, setMonth] = useState<Date>(selected ?? (maxDate && maxDate < today ? maxDate : today));
  const year = month.getFullYear();
  const maxYear = maxDate ? maxDate.getFullYear() : today.getFullYear() + OPEN_MAX_YEARS_AHEAD;
  const maxMonth = maxDate ? maxDate.getMonth() : 11;
  const [pageStart, setPageStart] = useState(() => Math.max(minYear, year - (year % YEARS_PER_PAGE)));

  const shift = (months: number) => setMonth(new Date(year, month.getMonth() + months, 1));
  const canPrev = year > minYear || month.getMonth() > 0;
  const canNext = year < maxYear || month.getMonth() < maxMonth;

  const openYears = () => {
    setPageStart(Math.max(minYear, year - (year % YEARS_PER_PAGE)));
    setView('years');
  };

  let prev: (() => void) | null = null;
  let next: (() => void) | null = null;
  let prevDisabled = false;
  let nextDisabled = false;
  if (view === 'days') {
    prev = () => shift(-1); next = () => shift(1);
    prevDisabled = !canPrev; nextDisabled = !canNext;
  } else if (view === 'months') {
    prev = () => setMonth(new Date(year - 1, month.getMonth(), 1));
    next = () => setMonth(new Date(year + 1, month.getMonth(), 1));
    prevDisabled = year <= minYear; nextDisabled = year >= maxYear;
  } else {
    prev = () => setPageStart(p => Math.max(minYear, p - YEARS_PER_PAGE));
    next = () => setPageStart(p => p + YEARS_PER_PAGE);
    prevDisabled = pageStart <= minYear; nextDisabled = pageStart + YEARS_PER_PAGE > maxYear;
  }

  return (
    <div className={cn('w-[284px] p-3', className)}>
      <div className="mb-2 flex items-center justify-between">
        <button type="button" aria-label="Précédent" className={navBtn} onClick={prev} disabled={prevDisabled}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-0.5">
          {view === 'days' && (
            <button type="button" className={headerBtn} onClick={() => setView('months')}>
              {MONTHS_LONG[month.getMonth()]}
            </button>
          )}
          {view === 'years' ? (
            <span className="px-2 text-[13px] font-medium tabular-nums text-foreground">
              {pageStart} – {Math.min(pageStart + YEARS_PER_PAGE - 1, maxYear)}
            </span>
          ) : (
            <button type="button" className={cn(headerBtn, 'tabular-nums')} onClick={openYears}>
              {year}
            </button>
          )}
        </div>
        <button type="button" aria-label="Suivant" className={navBtn} onClick={next} disabled={nextDisabled}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {view === 'days' && (
        <DayPicker
          mode="single"
          locale={fr}
          weekStartsOn={1}
          month={month}
          onMonthChange={setMonth}
          selected={selected}
          onSelect={(d) => d && onSelect(d)}
          disabled={(d) => (maxDate ? d > maxDate : d.getFullYear() > maxYear) || d.getFullYear() < minYear}
          showOutsideDays
          fixedWeeks
          initialFocus
          classNames={{
            months: '',
            month: '',
            caption: 'hidden',
            table: 'w-full border-collapse',
            head_row: 'flex',
            head_cell: 'w-9 flex-1 pb-1 text-[11px] font-normal capitalize text-muted-foreground',
            row: 'flex w-full mt-0.5',
            cell: 'flex-1 p-0 text-center',
            day: 'h-9 w-full rounded-[2px] text-[12.5px] tabular-nums text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground',
            day_selected: '!bg-foreground !text-background hover:!bg-foreground',
            day_today: 'shadow-[inset_0_0_0_1px_hsl(var(--border))] font-medium',
            day_outside: '!text-muted-foreground/40',
            day_disabled: '!text-muted-foreground/30 pointer-events-none',
          }}
        />
      )}

      {view === 'months' && (
        <div className="grid grid-cols-3 gap-1">
          {MONTHS.map((label, i) => (
            <button
              key={label}
              type="button"
              disabled={year === maxYear && i > maxMonth}
              onClick={() => { setMonth(new Date(year, i, 1)); setView('days'); }}
              className={cellBtn(i === month.getMonth(), false)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {view === 'years' && (
        <div className="grid grid-cols-4 gap-1">
          {Array.from({ length: YEARS_PER_PAGE }, (_, i) => pageStart + i).map(y => (
            <button
              key={y}
              type="button"
              disabled={y > maxYear || y < minYear}
              onClick={() => { setMonth(new Date(y, month.getMonth(), 1)); setView('months'); }}
              className={cellBtn(y === year, y === today.getFullYear())}
            >
              {y}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
