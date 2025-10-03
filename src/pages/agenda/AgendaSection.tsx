import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FullScreenCalendar } from "@/components/ui/fullscreen-calendar";
import { format, isSameMonth, compareAsc } from "date-fns";
import { fr } from "date-fns/locale";

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

export function AgendaSection() {
  // Organiser les événements par mois
  const eventsByMonth = dummyEvents.reduce((acc, dayData) => {
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

  return (
    <div className="flex h-full gap-4 p-6">
      {/* Calendrier principal - Gauche */}
      <div className="flex-1">
        <Card className="h-full">
          <CardContent className="p-0 h-full">
            <FullScreenCalendar data={dummyEvents} />
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
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted">
                            <span className="text-base font-bold">
                              {format(dayData.day, "d")}
                            </span>
                          </div>
                          <span className="text-foreground truncate">
                            {format(dayData.day, "EEEE", { locale: fr })}
                          </span>
                        </div>
                        <div className="ml-12 space-y-2">
                          {dayData.events.map((event) => (
                            <div
                              key={event.id}
                              className="flex items-start gap-2 p-2 rounded-md hover:bg-accent cursor-pointer transition-colors"
                            >
                              <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                                {event.time}
                              </span>
                              <span className="text-sm break-words overflow-hidden">{event.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
