import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, LogIn, Loader2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/")({
  component: CheckInPage,
});

type Result =
  | { kind: "ok"; namn: string; count: number; eventTitel: string; rank: number; totalMembers: number }
  | { kind: "already"; namn: string; count: number; eventTitel: string; rank: number; totalMembers: number }
  | { kind: "error"; message: string };

function CheckInPage() {
  const [medlemsnummer, setMedlemsnummer] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nummer = medlemsnummer.trim();
    if (!nummer) return;
    setLoading(true);
    setResult(null);
    try {
      // Hämta medlem
      const { data: member, error: mErr } = await supabase
        .from("members")
        .select("id, namn, aktiv")
        .eq("medlemsnummer", nummer)
        .maybeSingle();
      if (mErr) throw mErr;
      if (!member) {
        setResult({ kind: "error", message: "Inget medlemsnummer hittades." });
        return;
      }
      if (!member.aktiv) {
        setResult({
          kind: "error",
          message: "Medlemskapet är inte aktivt. Kontakta admin.",
        });
        return;
      }

      // Hämta senaste aktiva medlemskväll
      const { data: event, error: eErr } = await supabase
        .from("events")
        .select("id, titel, datum")
        .eq("aktiv", true)
        .order("datum", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (eErr) throw eErr;
      if (!event) {
        setResult({
          kind: "error",
          message: "Ingen aktiv medlemskväll just nu.",
        });
        return;
      }

      // Försök checka in
      const { error: aErr } = await supabase
        .from("attendance")
        .insert({ member_id: member.id, event_id: event.id });

      const already = aErr?.code === "23505"; // unique violation
      if (aErr && !already) throw aErr;

      // Räkna totalt antal besök för medlemmen
      const { count, error: cErr } = await supabase
        .from("attendance")
        .select("*", { count: "exact", head: true })
        .eq("member_id", member.id);
      if (cErr) throw cErr;
      const myCount = count ?? 0;

      // Beräkna placering på leaderboard
      const { data: allAtt, error: laErr } = await supabase
        .from("attendance")
        .select("member_id");
      if (laErr) throw laErr;
      const counts = new Map<string, number>();
      for (const a of allAtt ?? []) {
        counts.set(a.member_id, (counts.get(a.member_id) ?? 0) + 1);
      }
      const totalMembers = counts.size;
      let rank = 1;
      for (const [mid, c] of counts) {
        if (mid !== member.id && c > myCount) rank++;
      }

      setResult({
        kind: already ? "already" : "ok",
        namn: member.namn,
        count: myCount,
        eventTitel: event.titel,
        rank,
        totalMembers,
      });
      setMedlemsnummer("");
    } catch (err) {
      setResult({
        kind: "error",
        message: err instanceof Error ? err.message : "Något gick fel.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <div className="grid-bg absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      <div className="relative mx-auto max-w-xl px-4 py-14 sm:py-20">
        <div className="mb-6 flex items-center gap-2">
          <span className="mono text-xs uppercase tracking-widest text-accent">
            // check-in
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <h1 className="text-3xl font-extrabold sm:text-4xl">
          Välkommen till medlemskvällen
        </h1>
        <p className="mt-2 text-muted-foreground">
          Skriv in ditt medlemsnummer så registrerar vi din närvaro.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-panel sm:p-6"
        >
          <label
            htmlFor="medlemsnummer"
            className="mono text-xs uppercase tracking-widest text-muted-foreground"
          >
            Medlemsnummer
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="medlemsnummer"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              value={medlemsnummer}
              onChange={(e) => setMedlemsnummer(e.target.value)}
              placeholder="t.ex. 15"
              className="mono flex-1 rounded-md border border-input bg-background px-4 py-3 text-lg outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40"
            />
            <button
              type="submit"
              disabled={loading || !medlemsnummer.trim()}
              className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-3 font-semibold text-accent-foreground shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <LogIn className="h-5 w-5" />
              )}
              Checka in
            </button>
          </div>
        </form>

        {result && (
          <div className="mt-6">
            {result.kind === "ok" || result.kind === "already" ? (
              <div className="rounded-2xl border-2 border-green-500/60 bg-green-500/15 p-6 shadow-panel">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-1 h-7 w-7 shrink-0 text-green-500" />
                  <div className="min-w-0 space-y-3">
                    <p className="text-2xl font-extrabold text-green-500">
                      Välkommen {result.namn}!
                    </p>
                    <p className="text-base text-foreground">
                      Du har nu deltagit vid{" "}
                      <span className="mono font-bold">{result.count}</span>{" "}
                      medlemskvällar.
                    </p>
                    <p className="text-base text-foreground">
                      Du ligger på plats{" "}
                      <span className="mono font-bold">{result.rank}</span> av{" "}
                      <span className="mono font-bold">{result.totalMembers}</span>{" "}
                      medlemmar.
                    </p>
                    <p className="mono pt-1 text-xs uppercase tracking-widest text-muted-foreground">
                      {result.eventTitel}
                      {result.kind === "already" && " — redan incheckad"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-5">
                <AlertCircle className="mt-1 h-5 w-5 shrink-0 text-destructive" />
                <p className="text-sm">{result.message}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function formatOrdinal(n: number) {
  return `${n}:e`;
}
