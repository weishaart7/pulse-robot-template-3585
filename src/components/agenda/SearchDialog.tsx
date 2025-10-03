import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Event {
  id: number;
  name: string;
  time: string;
  datetime: string;
}

interface CalendarData {
  day: Date;
  events: Event[];
}

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  events: CalendarData[];
  onEventClick: (event: Event) => void;
}

export function SearchDialog({
  open,
  onOpenChange,
  events,
  onEventClick,
}: SearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filtrer tous les événements selon la recherche
  const filteredEvents = events.flatMap((dayData) =>
    dayData.events
      .filter((event) =>
        event.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .map((event) => ({
        ...event,
        day: dayData.day,
      }))
  );

  const handleEventClick = (event: Event) => {
    onEventClick(event);
    onOpenChange(false);
    setSearchQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Rechercher un événement</DialogTitle>
          <DialogDescription>
            Recherchez parmi tous vos événements
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher un événement..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {searchQuery && filteredEvents.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                Aucun événement trouvé
              </p>
            )}
            {searchQuery &&
              filteredEvents.map((event) => (
                <div
                  key={event.id}
                  onClick={() => handleEventClick(event)}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                >
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border bg-muted">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">
                        {format(event.day, "MMM", { locale: fr })}
                      </div>
                      <div className="text-lg font-bold">
                        {format(event.day, "d")}
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{event.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(event.day, "EEEE d MMMM yyyy", { locale: fr })} à{" "}
                      {event.time}
                    </p>
                  </div>
                </div>
              ))}
            {!searchQuery && (
              <p className="text-center text-sm text-muted-foreground py-8">
                Commencez à taper pour rechercher
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
