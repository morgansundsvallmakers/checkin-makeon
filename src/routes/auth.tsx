import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Lock } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [{ title: "Logga in — Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin", replace: true });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate({ to: "/admin", replace: true });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/admin" },
        });
        if (error) throw error;
        setInfo(
          "Konto skapat. Bekräfta din e-post om det krävs. En befintlig aktiv administratör måste sedan aktivera kontot innan adminpanelen kan användas.",
        );
        setMode("signin");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-14">
      <div className="mb-6 flex items-center gap-2">
        <span className="mono text-xs uppercase tracking-widest text-accent">
          // admin
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="rounded-2xl border border-border bg-card p-6 shadow-panel">
        <div className="mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5 text-accent" />
          <h1 className="text-xl font-bold">
            {mode === "signin" ? "Logga in" : "Skapa konto"}
          </h1>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="mono text-xs uppercase tracking-widest text-muted-foreground">
              E-post
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <div>
            <label className="mono text-xs uppercase tracking-widest text-muted-foreground">
              Lösenord
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
            />
          </div>
          {error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
              {error}
            </p>
          )}
          {info && (
            <p className="rounded-md border border-success/40 bg-success/10 p-2 text-sm">
              {info}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 font-semibold text-accent-foreground transition hover:brightness-105 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "signin" ? "Logga in" : "Skapa konto"}
          </button>
        </form>
        <button
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setInfo(null);
          }}
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === "signin"
            ? "Ny administratör? Registrera konto"
            : "Har du redan konto? Logga in"}
        </button>
        <p className="mono mt-4 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
          lägg till medlemmar och skapa event som admin
        </p>
      </div>
    </div>
  );
}
