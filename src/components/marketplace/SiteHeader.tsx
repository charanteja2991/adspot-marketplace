import { Link } from "@tanstack/react-router";
import { Megaphone } from "lucide-react";
import { useAuth } from "@/lib/auth";

export function SiteHeader() {
  const { user, signOut, requireAuth, isOwner, isAdmin } = useAuth();
  const showOwnerNav = Boolean(user) && (isOwner || isAdmin);

  const navLink = "rounded-lg px-3 py-2 text-muted-foreground transition hover:text-foreground";
  const navActive = { className: "rounded-lg px-3 py-2 text-foreground" };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-brand text-primary-foreground">
            <Megaphone className="size-4" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">Panorama</span>
        </Link>

        <nav className="flex items-center gap-1 text-sm font-medium">
          <Link
            to="/browse"
            search={{}}
            className="rounded-lg px-3 py-2 text-muted-foreground transition hover:text-foreground"
            activeProps={{ className: "rounded-lg px-3 py-2 text-foreground" }}
          >
            Browse billboards
          </Link>
          {user ? (
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-lg border border-border px-3 py-2 transition hover:border-brand/40"
            >
              Sign out
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                requireAuth(
                  {
                    title: "Sign in to Panorama",
                    description: "Save billboards, send booking requests and manage your listings.",
                  },
                  () => {},
                )
              }
              className="rounded-lg bg-accent px-4 py-2 font-semibold text-accent-foreground transition hover:brightness-95"
            >
              Sign in
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Panorama — outdoor advertising marketplace.</p>
        <Link to="/browse" search={{}} className="font-medium text-brand hover:text-brand-dark">
          Browse available billboards
        </Link>
      </div>
    </footer>
  );
}
