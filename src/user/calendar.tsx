import { useState } from "react";
import Calendar from "react-calendar";
import { addDays, format, isSameDay, startOfDay } from "date-fns";
import { ChevronLeft, ChevronRight, Clock, Sparkles } from "lucide-react";
import { Sidebar } from "./sidebar";

const today = startOfDay(new Date());

const events = [
  {
    date: today,
    title: "PRF submission deadline",
    time: "5:00 PM",
    detail: "Supporting documents for REQ-1042",
  },
  {
    date: addDays(today, 2),
    title: "Q3 budget review",
    time: "10:00 AM",
    detail: "Finance & Operations alignment",
  },
  {
    date: addDays(today, 6),
    title: "Department sync",
    time: "9:30 AM",
    detail: "Monthly requisition planning",
  },
  {
    date: addDays(today, 13),
    title: "Vendor evaluation",
    time: "2:00 PM",
    detail: "Office equipment shortlist",
  },
];

export function CalendarPage() {
  const [date, setDate] = useState(today);
  const dayEvents = events.filter((event) => isSameDay(event.date, date));

  return (
    <div className="flex h-screen overflow-hidden bg-ivory text-foreground">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8 md:p-12">
        <div>
          <h1 className="font-display text-4xl">Calendar</h1>
          <p className="mt-2 text-sm text-foreground/60">
            Keep track of deadlines, reviews, and approval milestones.
          </p>
        </div>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="rounded-[1.5rem] bg-background p-6 shadow-card md:p-8">
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
          </div>

          <div className="space-y-6">
            <div className="rounded-[1.5rem] bg-background p-6 shadow-card md:p-8">
              <p className="text-xs font-medium tracking-widest text-foreground/40 uppercase">
                {format(date, "EEEE")}
              </p>
              <h2 className="mt-1 font-display text-3xl">
                {format(date, "d MMMM yyyy")}
              </h2>

              {dayEvents.length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed border-foreground/15 py-10 text-center">
                  <p className="text-sm text-foreground/50">
                    Nothing scheduled for this day.
                  </p>
                </div>
              ) : (
                <ul className="mt-6 space-y-3">
                  {dayEvents.map((event) => (
                    <li key={event.title} className="rounded-xl bg-ivory p-4">
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
                  Upcoming
                </h3>
              </div>
              <ul className="mt-4 space-y-1">
                {events.map((event) => (
                  <li key={event.title}>
                    <button
                      type="button"
                      onClick={() => setDate(event.date)}
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
                          {event.time}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
