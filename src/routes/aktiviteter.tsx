import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/aktiviteter")({
  component: UpcomingActivitiesPage,
});

type Activity = {
  id: string;
  titel: string;
  datum: string;
};

function UpcomingActivitiesPage() {
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadActivities = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error: loadError } = await supabase
        .from("events")
        .select("id, titel, datum")
        .gte("datum", today)
        .order("datum", { ascending: true });

      if (loadError) {
        setError("Aktiviteterna kunde inte hämtas. Försök igen om en stund.");
        setActivities([]);
        return;
      }

      setActivities(data ?? []);
    };

    loadActivities();
  }, []);

  return (
    <div className="relative">
      <div className="grid-bg absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      <div className="relative mx-auto max-w-3xl px-4 py-14 sm:py-20">
        <div className="mb-6 flex items-center gap-2">
          <span className="mono text-xs uppercase tracking-widest text-accent">// planerat</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <h1 className="text-3xl font-extrabold sm:text-4xl">Kommande aktiviteter</h1>
        <p className="mt-2 text-muted-foreground">
          Här ser du vad som är planerat närmast framöver på Sundsvall Makers makerspace.
        </p>

        <section className="mt-8 overflow-hidden rounded-2xl border border-border bg-card shadow-panel">
          {activities === null ? (
            <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Laddar aktiviteter…
            </div>
          ) : error ? (
            <p className="p-8 text-center text-sm text-destructive">{error}</p>
          ) : activities.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Inga kommande aktiviteter är inbokade just nu.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {activities.map((activity) => (
                <li key={activity.id} className="flex items-start gap-4 p-5 sm:p-6">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-accent/15 text-accent">
                    <CalendarDays className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="font-semibold">{activity.titel}</h2>
                    <p className="mono mt-1 text-sm text-muted-foreground">
                      {formatSwedishDate(activity.datum)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function formatSwedishDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("sv-SE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
