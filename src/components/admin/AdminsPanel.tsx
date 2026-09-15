import { useEffect, useMemo, useState } from "react";
import { Plus, Power, ShieldCheck } from "lucide-react";
import {
  createDemoAdminUserService,
  type AdminUser,
} from "@/lib/admin-users.demo";
import { Field, Modal } from "./shared";

export function AdminsPanel() {
  const service = useMemo(() => createDemoAdminUserService(), []);
  const [admins, setAdmins] = useState<AdminUser[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setAdmins(await service.list());
  }

  useEffect(() => {
    void refresh();
  }, [service]);

  async function toggle(admin: AdminUser) {
    setError(null);
    try {
      await service.setActive(admin.id, !admin.active);
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Kunde inte uppdatera administratören.",
      );
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card shadow-panel">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-4 w-4" /> Administratörer
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Bjud in administratörer och aktivera eller inaktivera deras åtkomst.
          </p>
          <p className="mt-2 text-xs font-medium text-accent">
            Förhandsvisning – ändringar av administratörer sparas inte.
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
            {admins === null ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-muted-foreground">
                  Laddar demo…
                </td>
              </tr>
            ) : (
              admins.map((admin) => (
                <tr key={admin.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 font-medium">
                    {admin.name}
                    {admin.isCurrentUser ? " (du)" : ""}
                  </td>
                  <td className="px-4 py-2">{admin.email}</td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        "mono inline-flex rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest " +
                        (admin.active
                          ? "bg-success/15 text-success"
                          : "bg-muted text-muted-foreground")
                      }
                    >
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
                      {admin.isCurrentUser
                        ? "Du själv"
                        : admin.active
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

      {creating && (
        <AdminInviteModal
          onClose={() => setCreating(false)}
          onInvite={async (name, email) => {
            await service.invite({ name, email });
            await refresh();
            setCreating(false);
          }}
        />
      )}
    </section>
  );
}

function AdminInviteModal({
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
      setError(
        err instanceof Error
          ? err.message
          : "Kunde inte lägga till administratören.",
      );
      setSaving(false);
    }
  }

  return (
    <Modal title="Lägg till administratör" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Namn">
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2"
          />
        </Field>
        <Field label="E-post">
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2"
          />
        </Field>
        <p className="text-xs text-muted-foreground">
          I den färdiga lösningen skickas en inbjudan där administratören får välja sitt lösenord. Förhandsvisningen skickar inget mejl.
        </p>
        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary"
          >
            Avbryt
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
          >
            {saving ? "Lägger till…" : "Skicka inbjudan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
