import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Power } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listAdmins, setAdminActive } from "@/lib/admins.functions";

type AdminRow = {
  id: string;
  user_id: string;
  aktiv: boolean;
  email: string | null;
  created_at: string | null;
};

export function AdminsPanel() {
  const load = useServerFn(listAdmins);
  const setActive = useServerFn(setAdminActive);
  const [admins, setAdmins] = useState<AdminRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  async function refresh() {
    try {
      const data = await load();
      setAdmins(data as AdminRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunde inte hämta administratörer.");
    }
  }
  useEffect(() => {
    refresh();
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  async function toggle(a: AdminRow) {
    setBusyId(a.id);
    try {
      await setActive({ data: { id: a.id, aktiv: !a.aktiv } });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunde inte uppdatera.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card shadow-panel">
      <header className="border-b border-border p-4">
        <h2 className="font-semibold">Administratörer</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Nya konton registreras på inloggningssidan och visas här som inaktiva tills en aktiv
          administratör godkänner dem. Du kan inte inaktivera ditt eget konto eller den sista aktiva
          administratören.
        </p>
      </header>
      {error && (
        <p className="m-4 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="mono text-xs uppercase tracking-widest text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-4 py-2 text-left">E-post</th>
              <th className="px-4 py-2 text-left">User ID</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-right">Åtgärder</th>
            </tr>
          </thead>
          <tbody>
            {admins === null ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-muted-foreground">
                  Laddar…
                </td>
              </tr>
            ) : admins.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-muted-foreground">
                  Inga administratörer.
                </td>
              </tr>
            ) : (
              admins.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 font-medium">{a.email ?? "—"}</td>
                  <td className="mono px-4 py-2 text-xs text-muted-foreground">
                    {a.user_id.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        "mono inline-flex rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest " +
                        (a.aktiv ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")
                      }
                    >
                      {a.aktiv ? "aktiv" : "inaktiv"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => toggle(a)}
                      disabled={busyId === a.id || a.user_id === currentUserId}
                      className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium transition hover:bg-secondary disabled:opacity-50"
                    >
                      {busyId === a.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Power className="h-3.5 w-3.5" />
                      )}
                      {a.user_id === currentUserId
                        ? "Du själv"
                        : a.aktiv
                          ? "Inaktivera"
                          : "Aktivera"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
