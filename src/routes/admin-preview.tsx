import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Power, ShieldCheck } from "lucide-react";
import {
  createDemoAdminUserService,
  type AdminUser,
} from "@/lib/admin-users.demo";

export const Route = createFileRoute("/admin-preview")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Adminhantering – Preview" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPreviewPage,
});

function AdminPreviewPage() {
  const service = useMemo(() => createDemoAdminUserService(), []);
  const [admins, setAdmins] = useState<AdminUser[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setAdmins(await service.list());
  }

  if (admins === null) {
    void refresh();
    return <div className="p-8 text-sm text-muted-foreground">Laddar demo…</div>;
  }

  async function toggle(admin: AdminUser) {
    setError(null);
    try {
      await service.setActive(admin.id, !admin.active);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte uppdatera administratören.");
    }
  }

  return (
    <div className="mx-auto w-[80%] px-4 py-10">
      <div className="mb-6">
        <span className="mono text-xs uppercase tracking-widest text-accent">// preview</span>
        <h1 className="text-3xl font-extrabold">Adminpanel</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Klickbar förhandsvisning av den nya adminhanteringen. Alla personer och ändringar är demo-data och ingenting skrivs till Supabase.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-card shadow-panel">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div>
            <h2 className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="h-4 w-4" /> Administratörer
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Bjud in administratörer och aktivera eller inaktivera deras åtkomst.
            </p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground hover:brightness-105"
          >
            <Plus className="h-4 w-4" /> Lägg till administratör
          </button>
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
                <th className="px-4 py-2 text-left">Namn</th>
                <th className="px-4 py-2 text-left">E-post</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-right">Åtgärder</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 font-medium">
                    {admin.name}{admin.isCurrentUser ? " (du)" : ""}
                  </td>
                  <td className="px-4 py-2">{admin.email}</td>
                  <td className="px-4 py-2">
                    <span className={"mono inline-flex rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest " + (admin.active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
                      {admin.active ? "aktiv" : "inaktiv"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => toggle(admin)}
                      disabled={admin.isCurrentUser}
                      className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-50"
                    >
                      <Power className="h-3.5 w-3.5" />
                      {admin.isCurrentUser ? "Du själv" : admin.active ? "Inaktivera" : "Aktivera"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {creating && (
        <InviteModal
          onClose={() => setCreating(false)}
          onInvite={async (name, email) => {
            await service.invite({ name, email });
            await refresh();
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function InviteModal({
  onClose,
  onInvite,
}: {
  onClose: () => void;
  onInvite: (name: string, email: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onInvite(name, email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte lägga till administratören.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-panel" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Lägg till administratör</h3>
          <button onClick={onClose} className="mono text-xs text-muted-foreground hover:text-foreground">ESC</button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm">
            <span className="mono text-xs uppercase tracking-widest text-muted-foreground">Namn</span>
            <input required value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="mono text-xs uppercase tracking-widest text-muted-foreground">E-post</span>
            <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2" />
          </label>
          <p className="text-xs text-muted-foreground">
            I den färdiga lösningen skickas en inbjudan där administratören får välja sitt lösenord. Previewn skickar inget mejl.
          </p>
          {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary">Avbryt</button>
            <button type="submit" disabled={saving} className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50">
              {saving ? "Lägger till…" : "Skicka inbjudan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
