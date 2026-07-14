import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listAdmins, setAdminActive } from "@/lib/admins.functions";
import { createAdminFn } from "@/lib/admins.functions";
import {
  Loader2,
  Plus,
  Download,
  LogOut,
  Pencil,
  Power,
  Trash2,
  Calendar,
  Users,
  ShieldCheck,
} from "lucide-react";


export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Admin — Makerspace" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminPage,
});

type Member = {
  id: string;
  medlemsnummer: string;
  namn: string;
  aktiv: boolean;
  skapad: string;
};
type Event = { id: string; titel: string; datum: string; aktiv: boolean };
type Attendance = {
  id: string;
  member_id: string;
  event_id: string;
  incheckad: string;
};

// test rebuild
function AdminPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<"members" | "events" | "admins" | "export">("members");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate({ to: "/auth", replace: true });
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.session.user.id);
      const admin = (roles ?? []).some((r) => r.role === "admin");
      setIsAdmin(admin);
      setReady(true);
    })();
  }, [navigate]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-14 text-center">
        <h1 className="text-xl font-bold">Ingen adminbehörighet</h1>
        <p className="mt-2 text-muted-foreground">
          Ditt konto saknar adminroll. Kontakta en befintlig admin.
        </p>
        <button
          onClick={signOut}
          className="mt-6 inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary"
        >
          <LogOut className="h-4 w-4" /> Logga ut
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-[80%] px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="mono text-xs uppercase tracking-widest text-accent">
            // admin
          </span>
          <h1 className="text-3xl font-extrabold">Adminpanel</h1>
        </div>
        <button
          onClick={signOut}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-secondary"
        >
          <LogOut className="h-4 w-4" /> Logga ut
        </button>
      </div>

      <div className="mb-6 inline-flex rounded-lg border border-border bg-card p-1 shadow-sm">
        <TabButton active={tab === "members"} onClick={() => setTab("members")}>
          <Users className="h-4 w-4" /> Medlemmar
        </TabButton>
        <TabButton active={tab === "events"} onClick={() => setTab("events")}>
          <Calendar className="h-4 w-4" /> Medlemskvällar
        </TabButton>
        <TabButton active={tab === "admins"} onClick={() => setTab("admins")}>
          <ShieldCheck className="h-4 w-4" /> Administratörer
        </TabButton>
        <TabButton active={tab === "export"} onClick={() => setTab("export")}>
          <Download className="h-4 w-4" /> Export
        </TabButton>
      </div>

      {tab === "members" && <MembersPanel />}
      {tab === "events" && <EventsPanel />}
      {tab === "admins" && <AdminsPanel />}
      {tab === "export" && <ExportPanel />}
    </div>
  );
}


function TabButton({
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
        "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition " +
        (active
          ? "bg-accent text-accent-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}

/* --------------------- MEMBERS --------------------- */

function MembersPanel() {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [editing, setEditing] = useState<Member | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("members")
      .select("*")
      .order("medlemsnummer");
    setMembers((data as Member[]) ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  async function toggleActive(m: Member) {
    await supabase.from("members").update({ aktiv: !m.aktiv }).eq("id", m.id);
    load();
  }

  return (
    <section className="rounded-2xl border border-border bg-card shadow-panel">
      <header className="flex items-center justify-between border-b border-border p-4">
        <h2 className="font-semibold">Medlemmar</h2>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground hover:brightness-105"
        >
          <Plus className="h-4 w-4" /> Ny medlem
        </button>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="mono text-xs uppercase tracking-widest text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-4 py-2 text-left">Nr</th>
              <th className="px-4 py-2 text-left">Namn</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Skapad</th>
              <th className="px-4 py-2 text-right">Åtgärder</th>
            </tr>
          </thead>
          <tbody>
            {members === null ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  Laddar…
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  Inga medlemmar ännu.
                </td>
              </tr>
            ) : (
              members.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0">
                  <td className="mono px-4 py-2 font-semibold">
                    {m.medlemsnummer}
                  </td>
                  <td className="px-4 py-2">{m.namn}</td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        "mono inline-flex rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest " +
                        (m.aktiv
                          ? "bg-success/15 text-success"
                          : "bg-muted text-muted-foreground")
                      }
                    >
                      {m.aktiv ? "aktiv" : "inaktiv"}
                    </span>
                  </td>
                  <td className="mono px-4 py-2 text-xs text-muted-foreground">
                    {m.skapad.slice(0, 10)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <IconBtn onClick={() => setEditing(m)} label="Redigera">
                        <Pencil className="h-4 w-4" />
                      </IconBtn>
                      <IconBtn
                        onClick={() => toggleActive(m)}
                        label={m.aktiv ? "Inaktivera" : "Aktivera"}
                      >
                        <Power className="h-4 w-4" />
                      </IconBtn>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {(creating || editing) && (
        <MemberModal
          member={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            load();
          }}
        />
      )}
    </section>
  );
}

function MemberModal({
  member,
  onClose,
  onSaved,
}: {
  member: Member | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [medlemsnummer, setMedlemsnummer] = useState(member?.medlemsnummer ?? "");
  const [namn, setNamn] = useState(member?.namn ?? "");
  const [aktiv, setAktiv] = useState(member?.aktiv ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (member) {
        const { error } = await supabase
          .from("members")
          .update({ medlemsnummer, namn, aktiv })
          .eq("id", member.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("members")
          .insert({ medlemsnummer, namn, aktiv });
        if (error) throw error;
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte spara.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={member ? "Redigera medlem" : "Ny medlem"} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <Field label="Medlemsnummer">
          <input
            required
            value={medlemsnummer}
            onChange={(e) => setMedlemsnummer(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
          />
        </Field>
        <Field label="Namn">
          <input
            required
            value={namn}
            onChange={(e) => setNamn(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={aktiv}
            onChange={(e) => setAktiv(e.target.checked)}
          />
          Aktiv medlem
        </label>
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
            className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-105 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Spara
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* --------------------- EVENTS --------------------- */

function EventsPanel() {
  const [events, setEvents] = useState<Event[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [deleting, setDeleting] = useState<Event | null>(null);

  async function load() {
    const { data } = await supabase
      .from("events")
      .select("*")
      .order("datum", { ascending: false });
    setEvents((data as Event[]) ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  async function toggleActive(ev: Event) {
    await supabase
      .from("events")
      .update({ aktiv: !ev.aktiv, senast_andrad: new Date().toISOString() })
      .eq("id", ev.id);
    load();
  }

  return (
    <section className="rounded-2xl border border-border bg-card shadow-panel">
      <header className="flex items-center justify-between border-b border-border p-4">
        <div>
          <h2 className="font-semibold">Medlemskvällar</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Endast en medlemskväll kan vara aktiv åt gången. Alla incheckningar registreras på den aktiva kvällen.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground hover:brightness-105"
        >
          <Plus className="h-4 w-4" /> Ny medlemskväll
        </button>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="mono text-xs uppercase tracking-widest text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-4 py-2 text-left">Datum</th>
              <th className="px-4 py-2 text-left">Titel</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-right">Åtgärder</th>
            </tr>
          </thead>
          <tbody>
            {events === null ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-muted-foreground">
                  Laddar…
                </td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-muted-foreground">
                  Inga medlemskvällar ännu.
                </td>
              </tr>
            ) : (
              events.map((ev) => (
                <tr key={ev.id} className="border-b border-border last:border-0">
                  <td className="mono px-4 py-2">{ev.datum}</td>
                  <td className="px-4 py-2 font-medium">{ev.titel}</td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        "mono inline-flex rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest " +
                        (ev.aktiv
                          ? "bg-success/15 text-success"
                          : "bg-muted text-muted-foreground")
                      }
                    >
                      {ev.aktiv ? "aktiv" : "inaktiv"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <IconBtn onClick={() => setEditing(ev)} label="Redigera">
                        <Pencil className="h-4 w-4" />
                      </IconBtn>
                      <IconBtn
                        onClick={() => toggleActive(ev)}
                        label={ev.aktiv ? "Inaktivera" : "Aktivera"}
                      >
                        <Power className="h-4 w-4" />
                      </IconBtn>
                      <IconBtn onClick={() => setDeleting(ev)} label="Radera">
                        <Trash2 className="h-4 w-4" />
                      </IconBtn>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {creating && (
        <EventModal
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            load();
          }}
        />
      )}
      {editing && (
        <EventModal
          event={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
      {deleting && (
        <DeleteEventModal
          event={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setDeleting(null);
            load();
          }}
        />
      )}
    </section>
  );
}

function EventModal({
  event,
  onClose,
  onSaved,
}: {
  event?: Event;
  onClose: () => void;
  onSaved: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [titel, setTitel] = useState(event?.titel ?? "");
  const [datum, setDatum] = useState(event?.datum ?? today);
  const [aktiv, setAktiv] = useState(event?.aktiv ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const senast_andrad = new Date().toISOString();
    const { error } = event
      ? await supabase.from("events").update({ titel, datum, aktiv, senast_andrad }).eq("id", event.id)
      : await supabase.from("events").insert({ titel, datum, aktiv, senast_andrad });
    setSaving(false);
    if (error) setError(error.message);
    else onSaved();
  }

  return (
    <Modal title={event ? "Redigera medlemskväll" : "Ny medlemskväll"} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <Field label="Titel">
          <input
            required
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
          />
        </Field>
        <Field label="Datum">
          <input
            required
            type="date"
            value={datum}
            onChange={(e) => setDatum(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={aktiv}
            onChange={(e) => setAktiv(e.target.checked)}
          />
          Aktiv
        </label>
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
            className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-105 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Spara
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteEventModal({
  event,
  onClose,
  onDeleted,
}: {
  event: Event;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setDeleting(true);
    setError(null);
    const { error: attErr } = await supabase
      .from("attendance")
      .delete()
      .eq("event_id", event.id);
    if (attErr) {
      setError(attErr.message);
      setDeleting(false);
      return;
    }
    const { error: evErr } = await supabase.from("events").delete().eq("id", event.id);
    setDeleting(false);
    if (evErr) setError(evErr.message);
    else onDeleted();
  }

  return (
    <Modal title="Radera medlemskväll" onClose={onClose}>
      <p className="text-sm">
        Är du säker på att du vill radera <strong>{event.titel}</strong> ({event.datum})?
        All närvaro för denna kväll raderas också. Detta går inte att ångra.
      </p>
      {error && (
        <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary"
        >
          Avbryt
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={deleting}
          className="inline-flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:brightness-105 disabled:opacity-50"
        >
          {deleting && <Loader2 className="h-4 w-4 animate-spin" />} Radera
        </button>
      </div>
    </Modal>
  );
}


/* --------------------- ADMINS --------------------- */

type AdminRow = {
  id: string;
  user_id: string;
  aktiv: boolean;
  email: string | null;
  created_at: string | null;
};

function AdminsPanel() {
  const load = useServerFn(listAdmins);
  const setActive = useServerFn(setAdminActive);
  const [admins, setAdmins] = useState<AdminRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const createAdmin = useServerFn(createAdminFn);
  const [newEmail, setNewEmail] = useState("");
  const [creating, setCreating] = useState(false);

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
  
  async function addAdmin() {
    if (!newEmail) return;

    setCreating(true);
    setError(null);

    try {
      await createAdmin({ data: { email: newEmail } });
      setNewEmail("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunde inte skapa administratör.");
    } finally {
      setCreating(false);
    }
  }
  
  return (
    <section className="rounded-2xl border border-border bg-card shadow-panel">
      <header className="border-b border-border p-4">
        <h2 className="font-semibold">Administratörer</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Endast aktiva administratörer har åtkomst till adminpanelen. Inaktivera för att tillfälligt återkalla åtkomst.
        </p>
      </header>
      {error && (
        <p className="m-4 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="border-b border-border p-4 flex items-center gap-3">
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="E-postadress"
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          onClick={addAdmin}
          disabled={creating || !newEmail}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-secondary disabled:opacity-50"
        >
          {creating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Lägg till admin
        </button>
      </div>

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
                        (a.aktiv
                          ? "bg-success/15 text-success"
                          : "bg-muted text-muted-foreground")
                      }
                    >
                      {a.aktiv ? "aktiv" : "inaktiv"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => toggle(a)}
                      disabled={busyId === a.id}
                      className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium transition hover:bg-secondary disabled:opacity-50"
                    >
                      {busyId === a.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Power className="h-3.5 w-3.5" />
                      )}
                      {a.aktiv ? "Inaktivera" : "Aktivera"}
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

/* --------------------- EXPORT --------------------- */

function ExportPanel() {



  const [events, setEvents] = useState<Event[]>([]);
  const [selected, setSelected] = useState<string>("all");

  useEffect(() => {
    supabase
      .from("events")
      .select("*")
      .order("datum", { ascending: false })
      .then(({ data }) => setEvents((data as Event[]) ?? []));
  }, []);

  const selectedLabel = useMemo(() => {
    if (selected === "all") return "alla_medlemskvallar";
    const ev = events.find((e) => e.id === selected);
    return ev ? `${ev.datum}_${slug(ev.titel)}` : "export";
  }, [selected, events]);

  async function download() {
    let query = supabase
      .from("attendance")
      .select("incheckad, member_id, event_id")
      .order("incheckad", { ascending: true });
    if (selected !== "all") query = query.eq("event_id", selected);
    const { data: att } = await query;
    const { data: members } = await supabase
      .from("members")
      .select("id, medlemsnummer, namn");
    const { data: allEvents } = await supabase
      .from("events")
      .select("id, titel, datum");

    const mMap = new Map((members ?? []).map((m) => [m.id, m]));
    const eMap = new Map((allEvents ?? []).map((e) => [e.id, e]));

    const header = [
      "medlemsnummer",
      "namn",
      "medlemskvall_titel",
      "medlemskvall_datum",
      "incheckad",
    ];
    const rows = (att ?? []).map((a) => {
      const m = mMap.get(a.member_id);
      const e = eMap.get(a.event_id);
      return [
        m?.medlemsnummer ?? "",
        m?.namn ?? "",
        e?.titel ?? "",
        e?.datum ?? "",
        a.incheckad,
      ];
    });
    const csv =
      [header, ...rows]
        .map((r) => r.map(csvCell).join(","))
        .join("\n") + "\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `narvaro_${selectedLabel}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-panel">
      <h2 className="font-semibold">Exportera närvarolista</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Ladda ner närvaro som CSV. Välj en specifik medlemskväll eller alla.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
        >
          <option value="all">Alla medlemskvällar</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.datum} — {ev.titel}
            </option>
          ))}
        </select>
        <button
          onClick={download}
          className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-105"
        >
          <Download className="h-4 w-4" /> Ladda ner CSV
        </button>
      </div>
    </section>
  );
}

function csvCell(v: unknown) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function slug(s: string) {
  return s
    .toLowerCase()
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/* --------------------- SHARED --------------------- */

function IconBtn({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="inline-grid h-8 w-8 place-items-center rounded-md border border-border bg-background transition hover:bg-secondary"
    >
      {children}
    </button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mono text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="mono text-xs text-muted-foreground hover:text-foreground"
          >
            ESC
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
