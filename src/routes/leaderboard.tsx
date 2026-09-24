import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Trophy, Medal } from "lucide-react";
import { formatFixItStars } from "@/lib/fixit-stars";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Topplista — Sundsvall Makers" },
      {
        name: "description",
        content: "Topplistor för medlemmarnas närvaro — månad, år och totalt.",
      },
    ],
  }),
  component: LeaderboardPage,
});

type Row = {
  rank: number;
  display_name: string;
  visit_count: number;
  fixit_stars: number;
};
type Range = "month" | "year" | "total";

function stockholmCurrentMonth() {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return `${year}-${month}-01`;
}

function shiftMonth(month: string, offset: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function formatMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, monthNumber - 1, 15, 12)));
}

function LeaderboardPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [range, setRange] = useState<Range>("month");
  const [month, setMonth] = useState(stockholmCurrentMonth);
  const currentMonth = stockholmCurrentMonth();

  useEffect(() => {
    let alive = true;
    setRows(null);
    (async () => {
      const { data, error } =
        range === "month"
          ? await supabase.rpc("get_public_leaderboard", {
              p_range: range,
              p_month: month,
            })
          : await supabase.rpc("get_public_leaderboard", {
              p_range: range,
            });
      if (!alive) return;
      if (error) {
        console.error("Kunde inte hämta topplistan", error);
        setRows([]);
        return;
      }
      setRows(data ?? []);
    })();
    return () => {
      alive = false;
    };
  }, [range, month]);

  return (
    <div className="relative">
      <div className="grid-bg absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      <div className="relative mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <div className="mb-6 flex items-center gap-2">
        <span className="mono text-xs uppercase tracking-widest text-accent">
          // topp 50
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="mb-6 flex items-center gap-3">
        <Trophy className="h-7 w-7 text-accent" />
        <h1 className="text-3xl font-extrabold sm:text-4xl">Topplista</h1>
      </div>

      <div className="mb-6 inline-flex flex-wrap rounded-lg border border-border bg-card p-1 shadow-sm">
        <RangeButton active={range === "month"} onClick={() => setRange("month")}>
          Denna månad
        </RangeButton>
        <RangeButton active={range === "year"} onClick={() => setRange("year")}>
          I år
        </RangeButton>
        <RangeButton active={range === "total"} onClick={() => setRange("total")}>
          Totalt
        </RangeButton>
      </div>

      {range === "month" && (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-border bg-card px-2 py-1 shadow-sm">
          <button
            type="button"
            onClick={() => setMonth((value) => shiftMonth(value, -1))}
            className="rounded-md p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            aria-label="Föregående månad"
            title="Föregående månad"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold capitalize">{formatMonth(month)}</span>
          <button
            type="button"
            onClick={() => setMonth((value) => shiftMonth(value, 1))}
            disabled={month >= currentMonth}
            className="rounded-md p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
            aria-label="Nästa månad"
            title="Nästa månad"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-panel">
        {rows === null ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Laddar…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Inga incheckningar i vald period.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li
                key={`${r.rank}-${r.display_name}`}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 py-4 sm:px-6"
              >
                <div className="flex items-center justify-center">
                  <RankBadge rank={r.rank} />
                </div>
                <div className="min-w-0">
                  <p className="flex min-w-0 items-center gap-1 font-semibold">
                    <span className="truncate">{r.display_name}</span>
                    {r.fixit_stars > 0 && (
                      <span
                        className="shrink-0"
                        aria-label={`${r.fixit_stars} FixIt-stjärnor`}
                        title={`${r.fixit_stars} FixIt-stjärnor`}
                      >
                        {formatFixItStars(r.fixit_stars)}
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <div className="mono text-2xl font-bold tabular-nums">
                    {r.visit_count}
                  </div>
                  <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    besök
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      </div>
    </div>
  );
}

function RangeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-md px-3 py-1.5 text-sm font-medium transition " +
        (active
          ? "bg-accent text-accent-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="grid h-10 w-10 place-items-center rounded-full bg-accent text-accent-foreground">
        <Medal className="h-5 w-5" />
      </span>
    );
  if (rank <= 3)
    return (
      <span className="mono grid h-10 w-10 place-items-center rounded-full bg-accent/20 font-bold text-accent">
        {rank}
      </span>
    );
  return (
    <span className="mono grid h-10 w-10 place-items-center rounded-full bg-secondary font-semibold text-muted-foreground">
      {rank}
    </span>
  );
}
