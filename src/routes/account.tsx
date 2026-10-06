import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart, Inbox, Search, UserRound } from "lucide-react";
import { AdvertiserGuard } from "@/components/advertiser/AdvertiserGuard";
import { useAuth } from "@/lib/auth";
import { fetchAdvertiserStats } from "@/lib/advertiser-queries";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Advertiser dashboard — Panorama" },
      { name: "description", content: "Your saved billboards, profile and booking activity on Panorama." },
      { property: "og:title", content: "Advertiser dashboard — Panorama" },
      { property: "og:description", content: "Your saved billboards, profile and booking activity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AdvertiserGuard>
      <AccountPage />
    </AdvertiserGuard>
  ),
});

function AccountPage() {
  const { user, profile } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["advertiser-stats", user?.id],
    queryFn: () => fetchAdvertiserStats(user!.id),
    enabled: Boolean(user?.id),
  });
  const value = (n?: number) => (isLoading ? "…" : error ? "—" : (n ?? 0));

  const cards = [
    { to: "/saved", icon: <Heart className="size-5" />, title: "Saved billboards", text: "Your shortlist of spaces.", stat: value(data?.saved) },
    { to: "/profile", icon: <UserRound className="size-5" />, title: "Profile", text: "Business and contact details.", stat: null },
    { to: "/browse", icon: <Search className="size-5" />, title: "Browse billboards", text: "Find new advertising spaces.", stat: null },
  ] as const;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold">Welcome{profile?.display_name ? `, ${profile.display_name}` : ""}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Manage your shortlist and business profile.</p>
      {error ? <p className="mt-4 text-sm text-destructive">Could not load your activity. Please refresh.</p> : null}

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            search={c.to === "/browse" ? {} : undefined}
            className="rounded-2xl border border-border bg-card p-5 transition hover:border-brand/40"
          >
            <div className="flex items-center justify-between text-brand">
              {c.icon}
              {c.stat !== null ? <span className="font-display text-2xl font-semibold text-foreground">{c.stat}</span> : null}
            </div>
            <p className="mt-3 font-semibold">{c.title}</p>
            <p className="text-sm text-muted-foreground">{c.text}</p>
          </Link>
        ))}
      </div>

      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Inbox className="size-5" />
          <h2 className="font-display text-lg font-semibold text-foreground">Booking requests</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {isLoading
            ? "Loading…"
            : (data?.requests ?? 0) === 0
              ? "You haven't sent any booking requests yet. Booking requests will appear here once that feature is available."
              : `You have ${data?.requests} booking request${data?.requests === 1 ? "" : "s"}.`}
        </p>
      </section>
    </div>
  );
}
