import { useEffect, useRef, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

/**
 * Client-side gate for owner-only pages. Public browsing stays open; only these
 * pages require a session, and only the owner role may pass.
 */
export function OwnerGuard({ children }: { children: ReactNode }) {
  const { user, loading, isOwner, isAdmin } = useAuth();
  const navigate = useNavigate();
  const href = useRouterState({ select: (s) => s.location.href });
  // Remember where the visitor was headed the first time we render, so the
  // redirect target never picks up an /auth URL from a later render.
  const intended = useRef(href);
  const redirected = useRef(false);

  useEffect(() => {
    if (!loading && !user && !redirected.current && !intended.current.startsWith("/auth")) {
      redirected.current = true;
      void navigate({ to: "/auth", search: { redirect: intended.current }, replace: true });
    }
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isOwner && !isAdmin) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold">Owner area</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This section is for billboard owners. Your account is an advertiser account, so you can browse and save
          spaces from your advertiser dashboard.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild>
            <Link to="/account">Advertiser dashboard</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/browse" search={{}}>
              Browse billboards
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
