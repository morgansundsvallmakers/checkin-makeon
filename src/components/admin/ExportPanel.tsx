import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Event = { id: string; titel: string; datum: string; aktiv: boolean };

export function ExportPanel() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selected, setSelected] = useState<string>("all");
  const [exporting, setExporting] = useState(false);

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
    setExporting(true);
    try {
      let query = supabase
        .from("attendance")
        .select("incheckad, member_id, event_id")
        .order("incheckad", { ascending: true });
      if (selected !== "all") query = query.eq("event_id", selected);

      const [{ data: att }, { data: members }, { data: allEvents }] = await Promise.all([
        query,
        supabase.from("members").select("id, medlemsnummer, namn"),
        supabase.from("events").select("id, titel, datum"),
      ]);

      const mMap = new Map((members ?? []).map((m) => [m.id, m]));
      const eMap = new Map((allEvents ?? []).map((e) => [e.id, e]));

      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "CheckIn MakeOn";
      const worksheet = workbook.addWorksheet("Närvaro", {
        views: [{ state: "frozen", ySplit: 1 }],
      });

      worksheet.columns = [
        { header: "Medlemsnummer", key: "memberNumber", width: 18 },
        { header: "Namn", key: "name", width: 28 },
        { header: "Aktivitet", key: "event", width: 32 },
        { header: "Datum", key: "eventDate", width: 14 },
        { header: "Incheckad", key: "checkedIn", width: 22 },
      ];

      for (const attendance of att ?? []) {
        const member = mMap.get(attendance.member_id);
        const event = eMap.get(attendance.event_id);
        worksheet.addRow({
          memberNumber: member?.medlemsnummer ?? "",
          name: member?.namn ?? "",
          event: event?.titel ?? "",
          eventDate: event?.datum ? localDate(event.datum) : "",
          checkedIn: attendance.incheckad ? new Date(attendance.incheckad) : "",
        });
      }

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).alignment = { vertical: "middle" };
      worksheet.autoFilter = {
        from: "A1",
        to: "E1",
      };
      worksheet.getColumn("eventDate").numFmt = "yyyy-mm-dd";
      worksheet.getColumn("checkedIn").numFmt = "yyyy-mm-dd hh:mm";

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `narvaro_${selectedLabel}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-panel">
      <h2 className="font-semibold">Exportera närvarolista</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Ladda ner närvaro som Excel-fil. Välj en specifik medlemsaktivitet eller alla.
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
          disabled={exporting}
          className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-105 disabled:cursor-wait disabled:opacity-60"
        >
          <Download className="h-4 w-4" /> {exporting ? "Skapar Excel-fil…" : "Ladda ner Excel"}
        </button>
      </div>
    </section>
  );
}

function localDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function slug(s: string) {
  return s
    .toLowerCase()
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
