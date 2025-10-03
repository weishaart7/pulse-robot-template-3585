import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FullScreenCalendar } from "@/components/ui/fullscreen-calendar";
import { format, isSameMonth, compareAsc, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { EventDialog } from "@/components/agenda/EventDialog";
import { AddEventDialog } from "@/components/agenda/AddEventDialog";
import { SearchDialog } from "@/components/agenda/SearchDialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Données d'exemple
const dummyEvents = [
  {
    day: new Date("2025-01-02"),
    events: [
      {
        id: 1,
        name: "Réunion trimestre Q1",
        time: "10:00",
        datetime: "2025-01-02T10:00",
      },
      {
        id: 2,
        name: "Point d'équipe",
        time: "14:00",
        datetime: "2025-01-02T14:00",
      },
    ],
  },
  {
    day: new Date("2025-01-07"),
    events: [
      {
        id: 3,
        name: "Revue produit",
        time: "14:00",
        datetime: "2025-01-07T14:00",
      },
      {
        id: 4,
        name: "Sync marketing",
        time: "11:00",
        datetime: "2025-01-07T11:00",
      },
      {
        id: 5,
        name: "Rendez-vous client",
        time: "16:30",
        datetime: "2025-01-07T16:30",
      },
    ],
  },
  {
    day: new Date("2025-01-10"),
    events: [
      {
        id: 6,
        name: "Team building",
        time: "11:00",
        datetime: "2025-01-10T11:00",
      },
    ],
  },
  {
    day: new Date("2025-01-13"),
    events: [
      {
        id: 7,
        name: "Analyse budget",
        time: "15:30",
        datetime: "2025-01-13T15:30",
      },
      {
        id: 8,
        name: "Sprint planning",
        time: "09:00",
        datetime: "2025-01-13T09:00",
      },
      {
        id: 9,
        name: "Revue design",
        time: "13:00",
        datetime: "2025-01-13T13:00",
      },
    ],
  },
  {
    day: new Date("2025-01-16"),
    events: [
      {
        id: 10,
        name: "Présentation client",
        time: "10:00",
        datetime: "2025-01-16T10:00",
      },
      {
        id: 11,
        name: "Déjeuner équipe",
        time: "12:30",
        datetime: "2025-01-16T12:30",
      },
      {
        id: 12,
        name: "Point projet",
        time: "14:00",
        datetime: "2025-01-16T14:00",
      },
    ],
  },
  {
    day: new Date("2025-02-03"),
    events: [
      {
        id: 13,
        name: "Réunion stratégique",
        time: "09:30",
        datetime: "2025-02-03T09:30",
      },
    ],
  },
  {
    day: new Date("2025-02-14"),
    events: [
      {
        id: 14,
        name: "Présentation investisseurs",
        time: "15:00",
        datetime: "2025-02-14T15:00",
      },
    ],
  },
];

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

export function AgendaSection() {
  const [events, setEvents] = useState<CalendarData[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  // Charger les événements depuis Supabase
  useEffect(() => {
    if (user) {
      loadEvents();
    }
  }, [user]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("agenda_events")
        .select("*")
        .order("event_date", { ascending: true });

      if (error) throw error;

      if (data) {
        // Transformer les données pour correspondre au format CalendarData
        const groupedEvents = data.reduce((acc, event) => {
          const date = parseISO(event.event_date);
          const dateKey = format(date, "yyyy-MM-dd");
          
          if (!acc[dateKey]) {
            acc[dateKey] = {
              day: date,
              events: [],
            };
          }
          
          acc[dateKey].events.push({
            id: parseInt(event.id.split("-")[0], 16), // Générer un ID numérique à partir de l'UUID
            name: event.name,
            time: event.event_time,
            datetime: event.datetime,
            dbId: event.id, // Garder l'UUID pour les opérations DB
          } as Event & { dbId: string });
          
          return acc;
        }, {} as Record<string, CalendarData>);

        setEvents(Object.values(groupedEvents));
      }
    } catch (error) {
      console.error("Error loading events:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les événements",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  const handleUpdateEvent = async (eventId: number, updatedEvent: Partial<Event>) => {
    try {
      // Trouver l'UUID de l'événement
      const event = events
        .flatMap((d) => d.events)
        .find((e) => e.id === eventId) as Event & { dbId?: string };
      
      if (!event?.dbId) {
        throw new Error("Event ID not found");
      }

      const { error } = await supabase
        .from("agenda_events")
        .update({
          name: updatedEvent.name,
          event_time: updatedEvent.time,
        })
        .eq("id", event.dbId);

      if (error) throw error;

      // Mettre à jour l'état local
      setEvents((prevEvents) =>
        prevEvents.map((dayData) => ({
          ...dayData,
          events: dayData.events.map((evt) =>
            evt.id === eventId ? { ...evt, ...updatedEvent } : evt
          ),
        }))
      );

      toast({
        title: "Événement modifié",
        description: "L'événement a été mis à jour avec succès.",
      });
    } catch (error) {
      console.error("Error updating event:", error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier l'événement",
        variant: "destructive",
      });
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    try {
      // Trouver l'UUID de l'événement
      const event = events
        .flatMap((d) => d.events)
        .find((e) => e.id === eventId) as Event & { dbId?: string };
      
      if (!event?.dbId) {
        throw new Error("Event ID not found");
      }

      const { error } = await supabase
        .from("agenda_events")
        .delete()
        .eq("id", event.dbId);

      if (error) throw error;

      // Mettre à jour l'état local
      setEvents((prevEvents) =>
        prevEvents
          .map((dayData) => ({
            ...dayData,
            events: dayData.events.filter((evt) => evt.id !== eventId),
          }))
          .filter((dayData) => dayData.events.length > 0)
      );

      toast({
        title: "Événement supprimé",
        description: "L'événement a été supprimé avec succès.",
        variant: "destructive",
      });
    } catch (error) {
      console.error("Error deleting event:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'événement",
        variant: "destructive",
      });
    }
  };

  const handleAddEvent = async ({
    name,
    time,
    date,
  }: {
    name: string;
    time: string;
    date: Date;
  }) => {
    try {
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from("agenda_events")
        .insert({
          user_id: user.id,
          name,
          event_date: format(date, "yyyy-MM-dd"),
          event_time: time,
          datetime: `${format(date, "yyyy-MM-dd")}T${time}`,
        })
        .select()
        .single();

      if (error) throw error;

      // Recharger les événements
      await loadEvents();

      toast({
        title: "Événement ajouté",
        description: "Le nouvel événement a été créé avec succès.",
      });
    } catch (error) {
      console.error("Error adding event:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter l'événement",
        variant: "destructive",
      });
    }
  };

  // Organiser les événements par mois
  const eventsByMonth = events.reduce((acc, dayData) => {
    const monthKey = format(dayData.day, "MMMM yyyy", { locale: fr });
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(dayData);
    return acc;
  }, {} as Record<string, typeof dummyEvents>);

  // Trier les mois
  const sortedMonths = Object.keys(eventsByMonth).sort((a, b) => {
    const dateA = new Date(a);
    const dateB = new Date(b);
    return compareAsc(dateA, dateB);
  });

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full gap-4 p-6">
        {/* Calendrier principal - Gauche */}
        <div className="flex-1">
          <Card className="h-full">
            <CardContent className="p-0 h-full">
              <FullScreenCalendar
                data={events}
                onEventClick={handleEventClick}
                onSearchClick={() => setSearchDialogOpen(true)}
                onAddClick={() => setAddDialogOpen(true)}
              />
            </CardContent>
          </Card>
        </div>

      {/* Séparateur */}
      <Separator orientation="vertical" className="h-auto" />

      {/* Résumé des événements - Droite */}
      <div className="w-80 min-w-0">
        <Card className="h-full overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">Événements à venir</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 overflow-y-auto max-h-[calc(100vh-12rem)]">
            {sortedMonths.map((monthKey) => (
              <div key={monthKey} className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                  {monthKey}
                </h3>
                <div className="space-y-3">
                  {eventsByMonth[monthKey]
                    .sort((a, b) => compareAsc(a.day, b.day))
                    .map((dayData) => (
                      <div key={dayData.day.toString()} className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted flex-shrink-0">
                            <span className="text-base font-bold">
                              {format(dayData.day, "d")}
                            </span>
                          </div>
                          {dayData.events.length === 1 ? (
                            <span className="text-foreground truncate">
                              {dayData.events[0].name}
                            </span>
                          ) : (
                            <span className="text-foreground">
                              {dayData.events.length} événements
                            </span>
                          )}
                        </div>
                        {dayData.events.length > 1 && (
                          <div className="ml-12 space-y-2">
                            {dayData.events
                              .sort((a, b) => {
                                // Trier par horaire d'abord
                                const timeCompare = a.time.localeCompare(b.time);
                                if (timeCompare !== 0) return timeCompare;
                                // Si même horaire, trier alphabétiquement par nom
                                return a.name.localeCompare(b.name);
                              })
                              .map((event) => (
                                <div
                                  key={event.id}
                                  onClick={() => handleEventClick(event)}
                                  className="flex items-start gap-2 p-2 rounded-md hover:bg-accent cursor-pointer transition-colors"
                                >
                                  <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                                    {event.time}
                                  </span>
                                  <span className="text-sm break-words overflow-hidden">{event.name}</span>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      </div>

      <EventDialog
        event={selectedEvent}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onUpdate={handleUpdateEvent}
        onDelete={handleDeleteEvent}
      />

      <AddEventDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdd={handleAddEvent}
      />

      <SearchDialog
        open={searchDialogOpen}
        onOpenChange={setSearchDialogOpen}
        events={events}
        onEventClick={handleEventClick}
      />
    </>
  );
}
