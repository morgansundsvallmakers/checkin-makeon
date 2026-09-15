import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Event = { id: string; titel: string; datum: string; aktiv: boolean };

export function ExportPanel() {
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
    const { data: members } = await supabase.from("members").select("id, medlemsnummer, namn");
    const { data: allEvents } = await supabase.from("events").select("id, titel, datum");

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
      return [m?.medlemsnummer ?? "", m?.namn ?? "", e?.titel ?? "", e?.datum ?? "", a.incheckad];
    });
    const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
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
        Ladda ner närvaro som CSV. Välj en specifik medlemsaktivitet eller alla.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
        >
          <option value="all">Alla medlemsaktiviteter</option>
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
