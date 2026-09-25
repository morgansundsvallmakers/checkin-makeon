import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Field, IconBtn, Modal } from "./shared";

type Event = { id: string; titel: string; datum: string; aktiv: boolean };

export function EventsPanel() {
  const [events, setEvents] = useState<Event[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [deleting, setDeleting] = useState<Event | null>(null);

  async function load() {
    const { data } = await supabase.from("events").select("*").order("datum", { ascending: false });
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
      <header className="flex flex-col items-stretch gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">Medlemsaktiviteter</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Endast en medlemsaktivitet kan vara aktiv åt gången. Alla incheckningar registreras på
            den aktiva medlemsaktiviteten.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground hover:brightness-105 sm:w-auto sm:justify-start sm:py-1.5"
        >
          <Plus className="h-4 w-4" /> Ny medlemsaktivitet
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
                  Inga medlemsaktiviteter ännu.
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
                        (ev.aktiv ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")
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
      ? await supabase
          .from("events")
          .update({ titel, datum, aktiv, senast_andrad })
          .eq("id", event.id)
      : await supabase.from("events").insert({ titel, datum, aktiv, senast_andrad });
    setSaving(false);
    if (error) setError(error.message);
    else onSaved();
  }

  return (
    <Modal title={event ? "Redigera medlemsaktivitet" : "Ny medlemsaktivitet"} onClose={onClose}>
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
          <input type="checkbox" checked={aktiv} onChange={(e) => setAktiv(e.target.checked)} />
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
    const { error: attErr } = await supabase.from("attendance").delete().eq("event_id", event.id);
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
    <Modal title="Radera medlemsaktivitet" onClose={onClose}>
      <p className="text-sm">
        Är du säker på att du vill radera <strong>{event.titel}</strong> ({event.datum})? All
        närvaro för denna aktivitet raderas också. Detta går inte att ångra.
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
