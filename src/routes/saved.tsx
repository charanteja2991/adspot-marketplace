import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EyeOff, Heart, ImageOff, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdvertiserGuard } from "@/components/advertiser/AdvertiserGuard";
import { coverImage } from "@/components/marketplace/BillboardCard";
import { useAuth } from "@/lib/auth";
import { fetchSavedEntries, removeSavedEntry } from "@/lib/advertiser-queries";
import { availabilityLabel, dimensions, locationLine, periodShort } from "@/lib/domain";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/saved")({
  head: () => ({
    meta: [
      { title: "Saved billboards — Panorama" },
      { name: "description", content: "Your shortlist of billboards and advertising spaces on Panorama." },
      { property: "og:title", content: "Saved billboards — Panorama" },
      { property: "og:description", content: "Your shortlist of billboards and advertising spaces." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AdvertiserGuard>
      <SavedPage />
    </AdvertiserGuard>
  ),
});

function SavedPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["saved-billboards", user?.id],
    queryFn: () => fetchSavedEntries(user!.id),
    enabled: Boolean(user?.id),
  });

  const remove = useMutation({
    mutationFn: (entryId: string) => removeSavedEntry(user!.id, entryId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["saved-billboards"] });
      void queryClient.invalidateQueries({ queryKey: ["saved-ids"] });
      void queryClient.invalidateQueries({ queryKey: ["advertiser-stats"] });
      toast.success("Removed from saved");
    },
    onError: () => toast.error("Could not remove this billboard"),
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold">Saved billboards</h1>
      <p className="mt-1 text-sm text-muted-foreground">Spaces you've shortlisted.</p>

      {isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="mt-6 text-sm text-destructive">Could not load your saved billboards. Please refresh.</p>
      ) : !data?.length ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Heart className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 font-semibold">No saved billboards yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Tap the heart on any listing to add it here.</p>
          <Button className="mt-5" asChild>
            <Link to="/browse" search={{}}>Browse billboards</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((entry) => {
            const b = entry.billboard;
            if (!b) {
              return (
                <div key={entry.id} className="flex flex-col rounded-2xl border border-dashed border-border bg-card p-5">
                  <EyeOff className="size-5 text-muted-foreground" />
                  <p className="mt-3 font-semibold">No longer available</p>
                  <p className="mt-1 flex-1 text-sm text-muted-foreground">
                    The owner has unpublished this listing, so its details are hidden.
                  </p>
                  <Button variant="outline" size="sm" className="mt-4" disabled={remove.isPending} onClick={() => remove.mutate(entry.id)}>
                    <Trash2 className="mr-1.5 size-4" /> Remove
                  </Button>
                </div>
              );
            }
            const img = coverImage(b);
            return (
              <div key={entry.id} className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
                <div className="aspect-[16/10] bg-muted">
                  {img ? (
                    <img src={img.url} alt={img.alt_text ?? b.title} className="size-full object-cover" loading="lazy" />
                  ) : (
                    <div className="grid size-full place-items-center text-muted-foreground"><ImageOff className="size-6" /></div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <p className="font-semibold">{b.title}</p>
                  <p className="text-sm text-muted-foreground">{locationLine(b)}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-y-1 text-sm">
                    <dt className="text-muted-foreground">Price</dt>
                    <dd className="text-right font-medium">{formatMoney(b.price, b.currency)}{periodShort(b.price_period)}</dd>
                    <dt className="text-muted-foreground">Size</dt>
                    <dd className="text-right">{dimensions(b)}</dd>
                    <dt className="text-muted-foreground">Availability</dt>
                    <dd className="text-right">{availabilityLabel(b.availability)}</dd>
                    <dt className="text-muted-foreground">Status</dt>
                    <dd className="text-right">Published</dd>
                  </dl>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" className="flex-1" asChild>
                      <Link to="/billboards/$id" params={{ id: b.id }}>Open</Link>
                    </Button>
                    <Button size="sm" variant="outline" disabled={remove.isPending} onClick={() => remove.mutate(entry.id)} aria-label="Remove from saved">
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
