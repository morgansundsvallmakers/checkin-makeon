import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/update-password")({
  head: () => ({
    meta: [
      { title: "Välj nytt lösenord — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UpdatePasswordPage,
});

function UpdatePasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setHasSession(Boolean(data.session));
      setChecking(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setHasSession(Boolean(session));
      setChecking(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Lösenordet måste vara minst 6 tecken.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Lösenorden stämmer inte överens.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte ändra lösenordet.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <div className="grid-bg absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      <div className="relative mx-auto flex max-w-md flex-col px-4 py-14">
      <div className="mb-6 flex items-center gap-2">
        <span className="mono text-xs uppercase tracking-widest text-accent">
          // admin
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="rounded-2xl border border-border bg-card p-6 shadow-panel">
        <div className="mb-4 flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-accent" />
          <h1 className="text-xl font-bold">Välj nytt lösenord</h1>
        </div>

        {checking ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Kontrollerar länken…
          </div>
        ) : success ? (
          <div className="space-y-4">
            <p className="rounded-md border border-success/40 bg-success/10 p-3 text-sm">
              Lösenordet är ändrat.
            </p>
            <button
              type="button"
              onClick={() => navigate({ to: "/admin", replace: true })}
              className="w-full rounded-md bg-accent px-4 py-2.5 font-semibold text-accent-foreground transition hover:brightness-105"
            >
              Fortsätt till admin
            </button>
          </div>
        ) : !hasSession ? (
          <div className="space-y-4">
            <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              Länken är ogiltig eller har gått ut. Begär en ny länk från inloggningssidan.
            </p>
            <button
              type="button"
              onClick={() => navigate({ to: "/auth", replace: true })}
              className="w-full rounded-md border border-border px-4 py-2.5 font-semibold transition hover:bg-muted"
            >
              Till inloggningen
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="mono text-xs uppercase tracking-widest text-muted-foreground">
                Nytt lösenord
              </label>
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
              />
            </div>
            <div>
              <label className="mono text-xs uppercase tracking-widest text-muted-foreground">
                Upprepa lösenord
              </label>
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
              />
            </div>
            {error && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 font-semibold text-accent-foreground transition hover:brightness-105 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Spara nytt lösenord
            </button>
          </form>
        )}
      </div>
      </div>
    </div>
  );
}
