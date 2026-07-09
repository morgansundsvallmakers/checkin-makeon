import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Medal } from "lucide-react";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — Makerspace" },
      {
        name: "description",
        content: "Topp 10 medlemmar efter antal närvarotillfällen.",
      },
    ],
  }),
  component: LeaderboardPage,
});

type Row = { member_id: string; namn: string; medlemsnummer: string; count: number };

function LeaderboardPage() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data: members } = await supabase
        .from("members")
        .select("id, namn, medlemsnummer");
      const { data: att } = await supabase.from("attendance").select("member_id");
      if (!alive) return;
      const counts = new Map<string, number>();
      for (const a of att ?? []) {
        counts.set(a.member_id, (counts.get(a.member_id) ?? 0) + 1);
      }
      const list: Row[] = (members ?? [])
        .map((m) => ({
          member_id: m.id,
          namn: m.namn,
          medlemsnummer: m.medlemsnummer,
          count: counts.get(m.id) ?? 0,
        }))
        .filter((r) => r.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      setRows(list);
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <div className="mb-6 flex items-center gap-2">
        <span className="mono text-xs uppercase tracking-widest text-accent">
          // topp 10
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="mb-8 flex items-center gap-3">
        <Trophy className="h-7 w-7 text-accent" />
        <h1 className="text-3xl font-extrabold sm:text-4xl">Leaderboard</h1>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-panel">
        {rows === null ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Laddar…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Inga incheckningar ännu.
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
