import { useEffect, useMemo, useState } from "react";
import Calendar from "react-calendar";
import { format, isSameDay, startOfDay } from "date-fns";
import { ChevronLeft, ChevronRight, Clock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Sidebar } from "./sidebar";
import {
  listMyQuotations,
  type QuotationListItem,
} from "@/lib/quotation-fns";

type CalendarEvent = {
  id: number;
  date: Date;
  title: string;
  time: string;
  detail: string;
  status: QuotationListItem["status"];
};

function formatRm(value: number) {
  return `RM ${value.toLocaleString("en-MY", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function toEvent(row: QuotationListItem): CalendarEvent {
  const date = new Date(row.createdAt);
  return {
    id: row.id,
    date,
    title: `QT-${row.id} · ${row.title}`,
    time: format(date, "h:mm a"),
    detail: `${row.status} · ${formatRm(row.amount)} · ${row.itemCount} item${row.itemCount === 1 ? "" : "s"}`,
    status: row.status,
  };
}

export function CalendarPage() {
  const [date, setDate] = useState(() => startOfDay(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    listMyQuotations()
      .then((rows) => {
        if (!active) return;
        setEvents(rows.map(toEvent));
      })
      .catch((error) => {
        if (!active) return;
        toast.error(
          error instanceof Error ? error.message : "Failed to load calendar. Please try again later.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const dayEvents = useMemo(
    () => events.filter((event) => isSameDay(event.date, date)),
    [events, date],
  );

  const recentEvents = useMemo(() => events.slice(0, 6), [events]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-ivory text-foreground md:flex-row">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-6 md:p-12">
        <div>
          <h1 className="font-display text-4xl">Department Calendar</h1>
          <p className="mt-2 text-sm text-foreground/60">
            Track quotation submissions and approval status by date made by whole department.
          </p>
        </div>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="rounded-[1.5rem] bg-background p-6 shadow-card md:p-8">
            {loading ? (
              <p className="py-16 text-center text-sm text-foreground/50">
                Loading calendar
              </p>
            ) : (
              <Calendar
                value={date}
                onChange={(value) => value instanceof Date && setDate(value)}
                prevLabel={<ChevronLeft className="mx-auto h-4 w-4" />}
                nextLabel={<ChevronRight className="mx-auto h-4 w-4" />}
                prev2Label={null}
                next2Label={null}
                minDetail="month"
                tileContent={({ date: tileDate, view }) =>
                  view === "month" &&
                  events.some((event) => isSameDay(event.date, tileDate)) ? (
                    <span className="event-dot" />
                  ) : null
                }
              />
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-[1.5rem] bg-background p-6 shadow-card md:p-8">
              <p className="text-xs font-medium tracking-widest text-foreground/40 uppercase">
                {format(date, "EEEE")}
              </p>
              <h2 className="mt-1 font-display text-3xl">
                {format(date, "d MMMM yyyy")}
              </h2>

              {loading ? (
                <p className="mt-6 text-sm text-foreground/50">Loading…</p>
              ) : dayEvents.length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed border-foreground/15 py-10 text-center">
                  <p className="text-sm text-foreground/50">
                    No quotations on this day.
                  </p>
                </div>
              ) : (
                <ul className="mt-6 space-y-3">
                  {dayEvents.map((event) => (
                    <li key={event.id} className="rounded-xl bg-ivory p-4">
                      <p className="text-sm font-medium">{event.title}</p>
                      <p className="mt-1 text-xs text-foreground/50">
                        {event.detail}
                      </p>
                      <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-lime px-2.5 py-1 text-xs font-medium text-lime-foreground">
                        <Clock className="h-3 w-3" />
                        {event.time}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-[1.5rem] bg-background p-6 shadow-card md:p-8">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-foreground/40" />
                <h3 className="text-sm font-medium text-foreground/60">
                  Recent
                </h3>
              </div>
              {loading ? (
                <p className="mt-4 text-sm text-foreground/50">Loading…</p>
              ) : recentEvents.length === 0 ? (
                <p className="mt-4 text-sm text-foreground/50">
                  No quotations yet.
                </p>
              ) : (
                <ul className="mt-4 space-y-1">
                  {recentEvents.map((event) => (
                    <li key={event.id}>
                      <button
                        type="button"
                        onClick={() => setDate(startOfDay(event.date))}
                        className="flex w-full items-center gap-4 rounded-xl px-3 py-2.5 text-left transition hover:bg-ivory"
                      >
                        <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl border border-foreground/10">
                          <span className="text-sm leading-none font-semibold">
                            {format(event.date, "d")}
                          </span>
                          <span className="mt-0.5 text-[0.6rem] tracking-wide text-foreground/50 uppercase">
                            {format(event.date, "MMM")}
                          </span>
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {event.title}
                          </span>
                          <span className="block text-xs text-foreground/50">
                            {event.time} · {event.status}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
