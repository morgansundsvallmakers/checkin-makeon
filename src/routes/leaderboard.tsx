import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Medal } from "lucide-react";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — Makerspace" },
      {
        name: "description",
        content: "Topplistor för medlemmarnas närvaro — månad, år och totalt.",
      },
    ],
  }),
  component: LeaderboardPage,
});

type Member = { id: string; namn: string; medlemsnummer: string };
type Att = { member_id: string; incheckad: string };
type Row = { member_id: string; namn: string; medlemsnummer: string; count: number };
type Range = "month" | "year" | "total";

function LeaderboardPage() {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [att, setAtt] = useState<Att[] | null>(null);
  const [range, setRange] = useState<Range>("month");

  useEffect(() => {
    let alive = true;
    (async () => {
      const [{ data: m }, { data: a }] = await Promise.all([
        supabase.from("members").select("id, namn, medlemsnummer"),
        supabase.from("attendance").select("member_id, incheckad"),
      ]);
      if (!alive) return;
      setMembers((m as Member[]) ?? []);
      setAtt((a as Att[]) ?? []);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const rows: Row[] | null = useMemo(() => {
    if (!members || !att) return null;
    const now = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startYear = new Date(now.getFullYear(), 0, 1);
    const filtered = att.filter((a) => {
      if (range === "total") return true;
      const d = new Date(a.incheckad);
      return d >= (range === "month" ? startMonth : startYear);
    });
    const counts = new Map<string, number>();
    for (const a of filtered) {
      counts.set(a.member_id, (counts.get(a.member_id) ?? 0) + 1);
    }
    return members
      .map((m) => ({
        member_id: m.id,
        namn: m.namn,
        medlemsnummer: m.medlemsnummer,
        count: counts.get(m.id) ?? 0,
      }))
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [members, att, range]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <div className="mb-6 flex items-center gap-2">
        <span className="mono text-xs uppercase tracking-widest text-accent">
          // topp 10
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="mb-6 flex items-center gap-3">
        <Trophy className="h-7 w-7 text-accent" />
        <h1 className="text-3xl font-extrabold sm:text-4xl">Leaderboard</h1>
      </div>

      <div className="mb-6 inline-flex flex-wrap rounded-lg border border-border bg-card p-1 shadow-sm">
        <RangeButton active={range === "month"} onClick={() => setRange("month")}>
          Denna månaden
        </RangeButton>
        <RangeButton active={range === "year"} onClick={() => setRange("year")}>
          I år
        </RangeButton>
        <RangeButton active={range === "total"} onClick={() => setRange("total")}>
          Totalt
        </RangeButton>
      </div>

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
            {rows.map((r, i) => {
              const rank = i + 1;
              return (
                <li
                  key={r.member_id}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 py-4 sm:px-6"
                >
                  <div className="flex items-center justify-center">
                    <RankBadge rank={rank} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{r.namn}</p>
                    <p className="mono text-xs text-muted-foreground">
                      #{r.medlemsnummer}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="mono text-2xl font-bold tabular-nums">
                      {r.count}
                    </div>
                    <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      besök
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
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
