import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AdvertiserGuard } from "@/components/advertiser/AdvertiserGuard";
import { useAuth } from "@/lib/auth";
import { fetchAdvertiserProfile, updateAdvertiserProfile, type AdvertiserProfile } from "@/lib/advertiser-queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — Panorama" },
      { name: "description", content: "Edit your business and contact details on Panorama." },
      { property: "og:title", content: "Your profile — Panorama" },
      { property: "og:description", content: "Edit your business and contact details." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AdvertiserGuard>
      <ProfilePage />
    </AdvertiserGuard>
  ),
});

const EMPTY: AdvertiserProfile = { display_name: "", company_name: "", city: "", bio: "", phone: "", contact_email: "" };

function ProfilePage() {
  const { user, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["advertiser-profile", user?.id],
    queryFn: () => fetchAdvertiserProfile(user!.id),
    enabled: Boolean(user?.id),
  });
  const [form, setForm] = useState<AdvertiserProfile>(EMPTY);
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = useMutation({
    mutationFn: () => updateAdvertiserProfile(user!.id, form),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["advertiser-profile"] });
      await refreshProfile();
      toast.success("Profile saved");
    },
    onError: () => toast.error("Could not save your profile. Please try again."),
  });

  const set = (key: keyof AdvertiserProfile) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error) return <p className="mx-auto max-w-2xl px-4 py-16 text-sm text-destructive">Could not load your profile.</p>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold">Your profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">Owners see these details when you contact them about a space.</p>
      <form
        className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.display_name.trim()) {
            toast.error("Contact name is required");
            return;
          }
          save.mutate();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="p-company" label="Business / company name">
            <Input id="p-company" value={form.company_name} onChange={set("company_name")} maxLength={120} />
          </Field>
          <Field id="p-name" label="Contact name">
            <Input id="p-name" value={form.display_name} onChange={set("display_name")} maxLength={80} required />
          </Field>
          <Field id="p-email" label="Contact email">
            <Input id="p-email" type="email" value={form.contact_email} onChange={set("contact_email")} maxLength={160} />
          </Field>
          <Field id="p-phone" label="Phone">
            <Input id="p-phone" type="tel" value={form.phone} onChange={set("phone")} maxLength={20} />
          </Field>
          <Field id="p-city" label="City / location">
            <Input id="p-city" value={form.city} onChange={set("city")} maxLength={80} />
          </Field>
        </div>
        <Field id="p-bio" label="About your business (optional)">
          <Textarea id="p-bio" value={form.bio} onChange={set("bio")} maxLength={600} rows={4} />
        </Field>
        <p className="text-xs text-muted-foreground">Sign-in email: {user?.email}</p>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Save profile
        </Button>
      </form>
    </div>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
