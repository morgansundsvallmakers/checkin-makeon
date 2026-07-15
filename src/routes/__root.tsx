import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { Wrench } from "lucide-react";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="mono text-sm text-accent">404</p>
        <h1 className="mt-2 text-3xl font-bold">Sidan hittades inte</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Länken kanske är gammal eller så har sidan flyttats.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:brightness-105"
          >
            Till incheckning
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Något gick fel</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Försök igen om en stund.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:brightness-105"
          >
            Försök igen
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium transition hover:bg-secondary"
          >
            Startsidan
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Sundsvall Makers MakeOn — Incheckning & Topplista" },
      {
        name: "description",
        content:
          "Checka in på MakeOn, se topplistan och håll koll på din makerspace-närvaro.",
      },
      { property: "og:title", content: "Sundsvall Makers MakeOn— Incheckning & Topplista" },
      {
        property: "og:description",
        content: "Checka in på MakeOn, se topplistan och håll koll på din makerspace-närvaro.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Sundsvall Makers MakeOn — Incheckning & Topplista" },
      { name: "twitter:description", content: "Checka in på MakeOn, se topplistan och håll koll på din makerspace-närvaro." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/d978bb7f-e007-462d-85e4-b1b348c9811f" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/d978bb7f-e007-462d-85e4-b1b348c9811f" },
    ],
    links: [
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="sv">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function SiteHeader() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground shadow-sm">
            <Wrench className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-extrabold tracking-tight">Sundsvall Makers</span>
            <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
              check-in
            </span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <NavLink to="/">Incheckning</NavLink>
          <NavLink to="/leaderboard">Topplista</NavLink>
          {signedIn ? (
            <NavLink to="/admin">Admin</NavLink>
          ) : (
            <NavLink to="/auth">Admin</NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}

function NavLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: to === "/" }}
      className="rounded-md px-3 py-1.5 font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
      activeProps={{
        className:
          "rounded-md px-3 py-1.5 font-semibold text-foreground bg-secondary",
      }}
    >
      {children}
    </Link>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-dvh flex-col">
        <SiteHeader />
        <main className="flex-1">
          <Outlet />
        </main>
        <footer className="border-t border-border/70 py-6 text-center text-xs text-muted-foreground">
          <span className="mono">// byggt för makers, av makers</span>
        </footer>
      </div>
    </QueryClientProvider>
  );
}
