import { useEffect, useRef, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

/** Signed-in advertiser pages. Owners are pointed to their own dashboard. */
export function AdvertiserGuard({ children }: { children: ReactNode }) {
  const { user, loading, isOwner, isAdmin } = useAuth();
  const navigate = useNavigate();
  const href = useRouterState({ select: (s) => s.location.href });
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

  if (isOwner && !isAdmin) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold">Advertiser area</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This section is for advertiser accounts. Your account is set up as a billboard owner.
        </p>
        <Button className="mt-6" asChild>
          <Link to="/dashboard">Go to owner dashboard</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
