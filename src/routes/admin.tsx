import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar, Download, Loader2, LogOut, ShieldCheck, Users } from "lucide-react";
import { AdminsPanel } from "@/components/admin/AdminsPanel";
import { EventsPanel } from "@/components/admin/EventsPanel";
import { ExportPanel } from "@/components/admin/ExportPanel";
import { MembersPanel } from "@/components/admin/MembersPanel";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Admin — Makerspace" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminPage,
});

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
        .select("role,aktiv")
        .eq("user_id", data.session.user.id);
      const admin = (roles ?? []).some((r) => r.role === "admin" && r.aktiv === true);
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
          Ditt konto är inte aktiverat som administratör. Kontakta en befintlig aktiv admin.
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
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="mono text-xs uppercase tracking-widest text-accent">// admin</span>
          <h1 className="text-3xl font-extrabold">Adminpanel</h1>
        </div>
        <button
          onClick={signOut}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-secondary"
        >
          <LogOut className="h-4 w-4" /> Logga ut
        </button>
      </div>

      <div className="mb-6 flex w-full flex-wrap gap-1 rounded-lg border border-border bg-card p-1 shadow-sm sm:w-auto">
        <TabButton active={tab === "members"} onClick={() => setTab("members")}>
          <Users className="h-4 w-4" /> Medlemmar
        </TabButton>
        <TabButton active={tab === "events"} onClick={() => setTab("events")}>
          <Calendar className="h-4 w-4" /> Medlemsaktiviteter
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
        "inline-flex min-w-0 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-center text-xs font-medium leading-tight transition sm:gap-2 sm:px-3 sm:text-sm " +
        (active
          ? "bg-accent text-accent-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}
