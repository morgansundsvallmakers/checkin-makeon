import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, CalendarDays, CheckCircle2, Loader2, LogIn } from "lucide-react";
import {
  getHomeActivityState,
  getSwedishCalendarDate,
  type HomeActivityState,
} from "@/lib/current-activity";

export const Route = createFileRoute("/")({
  component: CheckInPage,
});

type Result =
  | { kind: "ok"; namn: string; count: number; eventTitel: string; todayNumber: number }
  | { kind: "already"; namn: string; count: number; eventTitel: string; todayNumber: number }
  | { kind: "member-unavailable" }
  | { kind: "error"; message: string };

type HomeState = HomeActivityState | { kind: "loading" } | { kind: "error" };

type CheckInResponse = {
  status: string;
  display_name: string;
  visit_count: number;
  event_title: string;
  today_number: number;
  message: string | null;
};

function CheckInPage() {
  const [medlemsnummer, setMedlemsnummer] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [homeState, setHomeState] = useState<HomeState>({ kind: "loading" });
  const [privacyMemberNumber, setPrivacyMemberNumber] = useState<string | null>(null);
  const [privacyName, setPrivacyName] = useState("");
  const [privacyError, setPrivacyError] = useState<string | null>(null);
  const [privacyLoading, setPrivacyLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const today = getSwedishCalendarDate();
      const { data: activities, error } = await supabase
        .from("events")
        .select("titel, datum, aktiv")
        .gte("datum", today)
        .order("datum", { ascending: true });

      if (error) {
        console.error("Kunde inte hämta aktiviteter", error);
        setHomeState({ kind: "error" });
        return;
      }

      setHomeState(getHomeActivityState(activities, today));
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nummer = medlemsnummer.trim();
    if (!nummer) return;
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.rpc("check_in_member", {
        p_medlemsnummer: nummer,
      });
      if (error) throw error;

      handleCheckInResponse(data?.[0], nummer);
    } catch (err) {
      setResult({
        kind: "error",
        message: err instanceof Error ? err.message : "Något gick fel.",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleCheckInResponse(response: CheckInResponse | undefined, nummer: string) {
    if (!response) {
      setResult({ kind: "error", message: "Något gick fel." });
      return;
    }

    if (response.status === "privacy_required") {
      setPrivacyMemberNumber(nummer);
      setPrivacyName("");
      setPrivacyError(null);
      return;
    }

    if (response.status === "error") {
      setPrivacyMemberNumber(null);
      setPrivacyName("");
      setPrivacyError(null);
      if (isMemberUnavailableMessage(response.message)) {
        setResult({ kind: "member-unavailable" });
      } else {
        setResult({
          kind: "error",
          message: response.message ?? "Något gick fel.",
        });
      }
      return;
    }

    if (response.status !== "ok" && response.status !== "already") {
      setResult({ kind: "error", message: "Något gick fel." });
      return;
    }

    setResult({
      kind: response.status,
      namn: response.display_name,
      count: response.visit_count,
      eventTitel: response.event_title,
      todayNumber: response.today_number,
    });
    setPrivacyMemberNumber(null);
    setPrivacyName("");
    setPrivacyError(null);
    setMedlemsnummer("");
  }

  async function handlePrivacyConfirmation(e: React.FormEvent) {
    e.preventDefault();
    if (!privacyMemberNumber || !privacyName.trim()) return;

    setPrivacyLoading(true);
    setPrivacyError(null);
    try {
      const { data, error } = await supabase.rpc("check_in_member", {
        p_medlemsnummer: privacyMemberNumber,
        p_namn: privacyName,
      });
      if (error) throw error;

      const response = data?.[0];
      if (response?.status === "privacy_name_mismatch") {
        setPrivacyError(
          response.message ?? "Namnet stämmer inte. Kontrollera uppgifterna och försök igen.",
        );
        return;
      }

      handleCheckInResponse(response, privacyMemberNumber);
    } catch (err) {
      setPrivacyError(err instanceof Error ? err.message : "Något gick fel.");
    } finally {
      setPrivacyLoading(false);
    }
  }

  function cancelPrivacyConfirmation() {
    setPrivacyMemberNumber(null);
    setPrivacyName("");
    setPrivacyError(null);
  }

  return (
    <div className="relative">
      <div className="relative mx-auto max-w-3xl px-4 py-14 sm:py-20">
        <div className="mb-6 flex items-center gap-2">
          <span className="mono text-xs uppercase tracking-widest text-accent">
            // check-in
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>

        {homeState.kind === "loading" && <div className="h-20" aria-busy="true" />}

        {homeState.kind === "today" && (
          <>
            <h1 className="text-3xl font-extrabold sm:text-4xl">
              Välkommen till {homeState.titel ?? "MakeOn"}
            </h1>
            <p className="mt-2 text-muted-foreground">
              Skriv in ditt medlemsnummer så registrerar vi din närvaro.
            </p>
          </>
        )}

        {homeState.kind === "upcoming" && (
          <>
            <h1 className="text-3xl font-extrabold sm:text-4xl">
              Nästa aktivitet: {homeState.titel}
            </h1>
            <p className="mt-2 flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="h-4 w-4 shrink-0" />
              <span className="mono">{formatSwedishDate(homeState.datum)}</span>
            </p>
          </>
        )}

        {homeState.kind === "none" && (
          <>
            <h1 className="text-3xl font-extrabold sm:text-4xl">
              Inga aktiviteter är inbokade
            </h1>
            <p className="mt-2 text-muted-foreground">
              Håll utkik — nya aktiviteter publiceras här.
            </p>
          </>
        )}

        {homeState.kind === "error" && (
          <>
            <h1 className="text-3xl font-extrabold sm:text-4xl">
              Aktiviteterna kunde inte hämtas
            </h1>
            <p className="mt-2 text-muted-foreground">Försök igen om en stund.</p>
          </>
        )}

        {homeState.kind === "today" && (
          <form
            onSubmit={handleSubmit}
            className="mt-8 rounded-2xl border border-border bg-card p-4 shadow-panel sm:p-6"
          >
            <label
              htmlFor="medlemsnummer"
              className="mono text-xs uppercase tracking-widest text-muted-foreground"
            >
              Medlemsnummer
            </label>
            <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <input
                id="medlemsnummer"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                autoFocus
                value={medlemsnummer}
                onChange={(e) => setMedlemsnummer(e.target.value)}
                placeholder="t.ex. 15"
                className="mono w-full min-w-0 rounded-md border border-input bg-background px-3 py-3 text-lg outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40"
              />
              <button
                type="submit"
                disabled={loading || !medlemsnummer.trim()}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-md bg-accent px-4 py-3 font-semibold text-accent-foreground shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
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
        )}

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
                      Du är nummer{" "}
                      <span className="mono font-bold">{result.todayNumber}</span>{" "}
                      att checka in idag.
                    </p>
                    <p className="mono pt-1 text-xs uppercase tracking-widest text-muted-foreground">
                      {result.eventTitel}
                      {result.kind === "already" && " — redan incheckad"}
                    </p>
                  </div>
                </div>
              </div>
            ) : result.kind === "member-unavailable" ? (
              <div className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-5">
                <AlertCircle className="mt-1 h-5 w-5 shrink-0 text-destructive" />
                <div className="space-y-2 text-sm">
                  <p className="font-semibold">Ditt medlemsnummer finns inte aktivt i CheckIn MakeOn.</p>
                  <p>Vill du delta, kontakta en administratör så hjälper vi dig att komma igång.</p>
                  <Link
                    to="/integritet"
                    className="inline-block font-semibold text-accent underline underline-offset-4 hover:brightness-110"
                  >
                    Läs om integritet och personuppgifter
                  </Link>
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

      {privacyMemberNumber && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="privacy-dialog-title"
        >
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-panel sm:p-6">
            <h2 id="privacy-dialog-title" className="text-2xl font-extrabold">
              Bekräfta integritetsinformationen
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                CheckIn MakeOn sparar ditt namn, medlemsnummer och dina incheckningar för att kunna
                visa deltagande och topplista. Deltagandet är frivilligt och påverkar inte ditt
                medlemskap i Sundsvall Makers.
              </p>
              <p>
                Skriv ditt namn för att bekräfta att du har tagit del av informationen och vill
                använda CheckIn MakeOn.
              </p>
              <Link
                to="/integritet"
                target="_blank"
                rel="noreferrer"
                className="inline-block font-semibold text-accent underline underline-offset-4 hover:brightness-110"
              >
                Läs hela integritetsinformationen
              </Link>
            </div>

            <form onSubmit={handlePrivacyConfirmation} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="privacy-name"
                  className="mono text-xs uppercase tracking-widest text-muted-foreground"
                >
                  Ditt namn
                </label>
                <input
                  id="privacy-name"
                  type="text"
                  autoComplete="name"
                  autoFocus
                  value={privacyName}
                  onChange={(e) => setPrivacyName(e.target.value)}
                  className="mt-2 w-full rounded-md border border-input bg-background px-3 py-3 outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40"
                />
              </div>

              {privacyError && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{privacyError}</p>
                </div>
              )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={privacyLoading}
                  onClick={cancelPrivacyConfirmation}
                  className="rounded-md border border-border px-4 py-3 font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={privacyLoading || !privacyName.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-3 font-semibold text-accent-foreground shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {privacyLoading && <Loader2 className="h-5 w-5 animate-spin" />}
                  Bekräfta och fortsätt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function isMemberUnavailableMessage(message: string | null) {
  return (
    message === "Ingen medlem med det medlemsnumret hittades." ||
    message === "Medlemskapet är inte aktivt. Kontakta admin." ||
    message === "Medlemsnumret finns inte aktivt i CheckIn MakeOn."
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
