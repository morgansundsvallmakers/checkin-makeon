import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Power } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Field, IconBtn, Modal } from "./shared";

type Member = {
  id: string;
  medlemsnummer: string;
  namn: string;
  aktiv: boolean;
  skapad: string;
};

export function MembersPanel() {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [editing, setEditing] = useState<Member | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    const { data } = await supabase.from("members").select("*").order("medlemsnummer");
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
                  <td className="mono px-4 py-2 font-semibold">{m.medlemsnummer}</td>
                  <td className="px-4 py-2">{m.namn}</td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        "mono inline-flex rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest " +
                        (m.aktiv ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")
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
        const { error } = await supabase.from("members").insert({ medlemsnummer, namn, aktiv });
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
          <input type="checkbox" checked={aktiv} onChange={(e) => setAktiv(e.target.checked)} />
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
