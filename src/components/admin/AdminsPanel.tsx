import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Power, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { inviteAdmin, listAdmins, setAdminActive } from "@/lib/admins.functions";
import {
  canCloseInviteModal,
  createExclusiveAdminMutation,
  getAdminStatusChangeBlockReason,
  identifyCurrentAdminUser,
} from "./admins-panel.logic";
import { Field, Modal } from "./shared";

type AdminRow = {
  id: string;
  user_id: string;
  aktiv: boolean;
  email: string | null;
  name: string | null;
  created_at: string | null;
};

export function AdminsPanel() {
  const load = useServerFn(listAdmins);
  const invite = useServerFn(inviteAdmin);
  const setActive = useServerFn(setAdminActive);
  const [admins, setAdmins] = useState<AdminRow[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mutation, setMutation] = useState<
    { type: "status"; id: string } | { type: "invite" } | null
  >(null);
  const mutationGate = useRef(createExclusiveAdminMutation()).current;
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [identifyingCurrentUser, setIdentifyingCurrentUser] = useState(true);
  const [currentUserError, setCurrentUserError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await load();
      setAdmins(data as AdminRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte hämta administratörerna.");
      setAdmins((current) => current ?? []);
    }
  }, [load]);

  const identifyCurrentUser = useCallback(async () => {
    setIdentifyingCurrentUser(true);
    setCurrentUserError(null);
    setCurrentUserId(null);

    try {
      setCurrentUserId(await identifyCurrentAdminUser(() => supabase.auth.getUser()));
    } catch (err) {
      setCurrentUserError(
        err instanceof Error ? err.message : "Kunde inte identifiera den inloggade användaren.",
      );
    } finally {
      setIdentifyingCurrentUser(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    void identifyCurrentUser();
  }, [identifyCurrentUser, refresh]);

  const activeAdminCount = useMemo(
    () => admins?.filter((admin) => admin.aktiv).length ?? 0,
    [admins],
  );

  async function toggle(admin: AdminRow) {
    setError(null);
    setSuccess(null);

    const blockReason = getAdminStatusChangeBlockReason(admin, currentUserId, activeAdminCount);
    if (blockReason) {
      setError(blockReason);
      return;
    }

    const result = await mutationGate.run(async () => {
      setMutation({ type: "status", id: admin.id });
      try {
        await setActive({ data: { id: admin.id, aktiv: !admin.aktiv } });
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Kunde inte uppdatera administratören.");
      } finally {
        setMutation(null);
      }
    });

    if (!result.started) {
      setError("En annan administratörsändring pågår. Vänta tills den är klar.");
    }
  }

  return (
    <section className="min-w-0 rounded-2xl border border-border bg-card shadow-panel">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-4 w-4" /> Administratörer
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Bjud in administratörer och aktivera eller inaktivera deras åtkomst.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          disabled={admins === null || mutation !== null}
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

      {currentUserError && (
        <div className="m-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
          <span>{currentUserError}</span>
          <button
            type="button"
            onClick={() => void identifyCurrentUser()}
            disabled={identifyingCurrentUser || mutation !== null}
            className="rounded-md border border-destructive/40 px-3 py-1 text-xs font-medium disabled:opacity-50"
          >
            {identifyingCurrentUser ? "Försöker igen…" : "Försök igen"}
          </button>
        </div>
      )}

      {success && (
        <p className="m-4 rounded-md border border-success/40 bg-success/10 p-2 text-sm text-success">
          {success}
        </p>
      )}

      <div className="hidden overflow-x-auto md:block">
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
              admins.map((admin) => (
                <tr key={admin.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 font-medium">
                    {admin.name ?? "—"}
                    {admin.user_id === currentUserId ? " (du)" : ""}
                  </td>
                  <td className="px-4 py-2">{admin.email ?? "—"}</td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        "mono inline-flex rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest " +
                        (admin.aktiv
                          ? "bg-success/15 text-success"
                          : "bg-muted text-muted-foreground")
                      }
                    >
                      {admin.aktiv ? "aktiv" : "inaktiv"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => toggle(admin)}
                      disabled={
                        mutation !== null ||
                        identifyingCurrentUser ||
                        currentUserId === null ||
                        admin.user_id === currentUserId ||
                        (admin.aktiv && activeAdminCount <= 1)
                      }
                      className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-50"
                    >
                      {mutation?.type === "status" && mutation.id === admin.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Power className="h-3.5 w-3.5" />
                      )}
                      {admin.user_id === currentUserId
                        ? "Du själv"
                        : admin.aktiv
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

      <div className="divide-y divide-border md:hidden">
        {admins === null ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Laddar…</p>
        ) : admins.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Inga administratörer.
          </p>
        ) : (
          admins.map((admin) => (
            <div key={admin.id} className="min-w-0 space-y-3 p-4 text-sm">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Namn</p>
                <p className="font-medium">
                  {admin.name ?? "—"}
                  {admin.user_id === currentUserId ? " (du)" : ""}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">E-post</p>
                <p className="break-all">{admin.email ?? "—"}</p>
              </div>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Status</p>
                  <span
                    className={
                      "mono inline-flex rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest " +
                      (admin.aktiv
                        ? "bg-success/15 text-success"
                        : "bg-muted text-muted-foreground")
                    }
                  >
                    {admin.aktiv ? "aktiv" : "inaktiv"}
                  </span>
                </div>
                <button
                  onClick={() => toggle(admin)}
                  disabled={
                    mutation !== null ||
                    identifyingCurrentUser ||
                    currentUserId === null ||
                    admin.user_id === currentUserId ||
                    (admin.aktiv && activeAdminCount <= 1)
                  }
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-50"
                >
                  {mutation?.type === "status" && mutation.id === admin.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Power className="h-3.5 w-3.5" />
                  )}
                  {admin.user_id === currentUserId
                    ? "Du själv"
                    : admin.aktiv
                      ? "Inaktivera"
                      : "Aktivera"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {creating && (
        <AdminInviteModal
          onClose={() => setCreating(false)}
          onInvite={async (name, email) => {
            const result = await mutationGate.run(async () => {
              setMutation({ type: "invite" });
              setError(null);
              setSuccess(null);
              try {
                const invited = await invite({ data: { name, email } });
                await refresh();
                setSuccess(`Inbjudan skickades till ${invited.email}.`);
                setCreating(false);
              } finally {
                setMutation(null);
              }
            });

            if (!result.started) {
              throw new Error("En annan administratörsändring pågår. Vänta tills den är klar.");
            }
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
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await onInvite(name, email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte lägga till administratören.");
      setSaving(false);
    }
  }

  function requestClose() {
    if (canCloseInviteModal(saving)) onClose();
  }

  return (
    <Modal title="Lägg till administratör" onClose={requestClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Namn">
          <input
            required
            disabled={saving}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2"
          />
        </Field>
        <Field label="E-post">
          <input
            required
            type="email"
            disabled={saving}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2"
          />
        </Field>
        <p className="text-xs text-muted-foreground">
          En inbjudan skickas via e-post där administratören får välja sitt lösenord.
        </p>
        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={requestClose}
            disabled={saving}
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
