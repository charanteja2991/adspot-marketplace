import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, ImageOff, Loader2, Trash2, Upload } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { LocationPicker } from "@/components/owner/LocationPicker";
import { BILLBOARD_TYPES, PRICE_PERIODS, typeLabel, periodShort } from "@/lib/domain";
import type { BillboardType, DimensionUnit, PricePeriod } from "@/lib/domain";
import { formatMoney } from "@/lib/format";
import {
  createBillboard,
  updateBillboard,
  uploadBillboardImage,
  ensureOwnerRole,
  type AvailabilityDraft,
  type BillboardDraftImage,
  type BillboardInput,
} from "@/lib/owner-queries";

export type WizardInitial = {
  id?: string;
  values: Partial<BillboardInput>;
  images: BillboardDraftImage[];
  availability: AvailabilityDraft[];
};

const STEPS = ["Basics", "Location", "Dimensions", "Pricing", "Photos", "Availability", "Review"];

const EMPTY: BillboardInput = {
  title: "",
  description: "",
  billboard_type: "roadside",
  address: "",
  area: "",
  city: "",
  state: "",
  country: "India",
  latitude: 0,
  longitude: 0,
  width: 0,
  height: 0,
  dimension_unit: "ft",
  is_illuminated: false,
  price: 0,
  currency: "INR",
  price_period: "monthly",
  min_booking_days: 30,
  availability: "available",
  status: "draft",
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Date-only range checks. Overlaps are rejected only between ranges of the same kind;
 * a blocked range inside an available one is the intended way to carve out dates. */
function slotsError(slots: AvailabilityDraft[]): string | null {
  for (const [i, s] of slots.entries()) {
    if (!DATE_RE.test(s.start_date) || !DATE_RE.test(s.end_date) || Number.isNaN(Date.parse(s.start_date)) || Number.isNaN(Date.parse(s.end_date)))
      return `Date range ${i + 1} needs a valid start and end date.`;
    if (s.end_date < s.start_date) return `Date range ${i + 1} ends before it starts.`;
  }
  for (let i = 0; i < slots.length; i += 1) {
    for (let j = i + 1; j < slots.length; j += 1) {
      const a = slots[i]!;
      const b = slots[j]!;
      if (a.is_available === b.is_available && a.start_date <= b.end_date && b.start_date <= a.end_date)
        return `${a.is_available ? "Available" : "Blocked"} ranges ${i + 1} and ${j + 1} overlap — merge them into one range.`;
    }
  }
  return null;
}

export function BillboardWizard({ initial }: { initial?: WizardInitial }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<BillboardInput>({ ...EMPTY, ...(initial?.values ?? {}) });
  const [hasPin, setHasPin] = useState(Boolean(initial?.values?.latitude));
  const [images, setImages] = useState<BillboardDraftImage[]>(initial?.images ?? []);
  const [slots, setSlots] = useState<AvailabilityDraft[]>(initial?.availability ?? []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof BillboardInput>(key: K, value: BillboardInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  function stepError(index: number): string | null {
    if (index === 0 && !form.title.trim()) return "Give your billboard a title.";
    if (index === 1) {
      if (!form.address.trim()) return "Add the street address.";
      if (!form.city.trim()) return "Add the city.";
      if (!hasPin && (!form.latitude || !form.longitude)) return "Set the map location or enter coordinates.";
    }
    if (index === 2 && (form.width <= 0 || form.height <= 0)) return "Width and height must be greater than zero.";
    if (index === 3 && form.price <= 0) return "Set a price greater than zero.";
    if (index === 3 && (!Number.isInteger(form.min_booking_days) || form.min_booking_days < 1 || form.min_booking_days > 3650))
      return "Minimum booking period must be a whole number of days, at least 1.";
    if (index === 5) return slotsError(slots);
    return null;
  }

  function next() {
    const error = stepError(step);
    if (error) {
      toast.error(error);
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function handleUpload(files: FileList | null) {
    if (!files?.length || !user) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const uploaded = await uploadBillboardImage(user.id, file);
        setImages((prev) => [...prev, { ...uploaded, alt_text: form.title || null }]);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function move(index: number, direction: -1 | 1) {
    setImages((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[index], copy[target]] = [copy[target]!, copy[index]!];
      return copy;
    });
  }

  async function save(status: "draft" | "published") {
    if (!user) return;
    for (const i of [0, 1, 2, 3, 5]) {
      const error = stepError(i);
      if (error) {
        toast.error(error);
        setStep(i);
        return;
      }
    }
    setSaving(true);
    try {
      await ensureOwnerRole(user.id);
      const payload: BillboardInput = { ...form, status };
      if (initial?.id) {
        await updateBillboard(initial.id, payload, images, slots);
      } else {
        await createBillboard(user.id, payload, images, slots);
      }
      toast.success(status === "published" ? "Billboard published" : "Draft saved");
      void navigate({ to: "/my-billboards" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the billboard");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6">
      <ol className="flex flex-wrap gap-2 text-xs font-medium">
        {STEPS.map((label, index) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => setStep(index)}
              className={`rounded-full border px-3 py-1.5 transition ${
                index === step
                  ? "border-brand bg-brand text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-brand/40"
              }`}
            >
              {index + 1}. {label}
            </button>
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border border-border bg-card p-6">
        {step === 0 && (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Billboard title</Label>
              <Input id="title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Highway hoarding near Andheri flyover" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={5}
                value={form.description ?? ""}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Traffic profile, visibility, nearby landmarks…"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Billboard type</Label>
              <select
                id="type"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.billboard_type}
                onChange={(e) => set("billboard_type", e.target.value as BillboardType)}
              >
                {BILLBOARD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={form.address} onChange={(e) => set("address", e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="area">Area / locality</Label>
                <Input id="area" value={form.area ?? ""} onChange={(e) => set("area", e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={form.city} onChange={(e) => set("city", e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" value={form.state ?? ""} onChange={(e) => set("state", e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="country">Country</Label>
                <Input id="country" value={form.country} onChange={(e) => set("country", e.target.value)} />
              </div>
            </div>
            <LocationPicker
              lat={hasPin ? form.latitude : null}
              lng={hasPin ? form.longitude : null}
              onChange={(lat, lng) => {
                setHasPin(true);
                setForm((prev) => ({ ...prev, latitude: lat, longitude: lng }));
              }}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="lat">Latitude</Label>
                <Input
                  id="lat"
                  type="number"
                  step="any"
                  value={form.latitude || ""}
                  onChange={(e) => {
                    setHasPin(true);
                    set("latitude", Number(e.target.value));
                  }}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lng">Longitude</Label>
                <Input
                  id="lng"
                  type="number"
                  step="any"
                  value={form.longitude || ""}
                  onChange={(e) => {
                    setHasPin(true);
                    set("longitude", Number(e.target.value));
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="width">Width</Label>
              <Input id="width" type="number" min="0" step="any" value={form.width || ""} onChange={(e) => set("width", Number(e.target.value))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="height">Height</Label>
              <Input id="height" type="number" min="0" step="any" value={form.height || ""} onChange={(e) => set("height", Number(e.target.value))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="unit">Unit</Label>
              <select
                id="unit"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.dimension_unit}
                onChange={(e) => set("dimension_unit", e.target.value as DimensionUnit)}
              >
                <option value="ft">Feet</option>
                <option value="m">Metres</option>
              </select>
            </div>
            <div className="flex items-center gap-3 sm:col-span-3">
              <Switch id="lit" checked={form.is_illuminated} onCheckedChange={(v) => set("is_illuminated", v)} />
              <Label htmlFor="lit">Illuminated at night</Label>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="price">Price ({form.currency})</Label>
              <Input id="price" type="number" min="0" step="any" value={form.price || ""} onChange={(e) => set("price", Number(e.target.value))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="period">Pricing period</Label>
              <select
                id="period"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.price_period}
                onChange={(e) => set("price_period", e.target.value as PricePeriod)}
              >
                {PRICE_PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="min-days">Minimum booking period (days)</Label>
              <Input
                id="min-days"
                type="number"
                min="1"
                step="1"
                value={Number.isNaN(form.min_booking_days) ? "" : form.min_booking_days}
                onChange={(e) => set("min_booking_days", e.target.value === "" ? NaN : Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">Advertisers can't request fewer days than this.</p>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="grid gap-4">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-8 text-sm font-medium text-muted-foreground hover:border-brand/50">
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {uploading ? "Uploading…" : "Upload billboard photos"}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  void handleUpload(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
            {images.length === 0 ? (
              <p className="text-sm text-muted-foreground">No photos yet. The first photo becomes the cover image.</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-3">
                {images.map((image, index) => (
                  <li key={image.storage_path ?? image.url} className="overflow-hidden rounded-xl border border-border">
                    <img src={image.url} alt={image.alt_text ?? "Billboard photo"} className="aspect-[4/3] w-full object-cover" />
                    <div className="flex items-center justify-between gap-1 p-2 text-xs">
                      <span className="text-muted-foreground">{index === 0 ? "Cover" : `#${index + 1}`}</span>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => move(index, -1)} className="rounded px-1.5 py-1 hover:bg-muted" aria-label="Move earlier">
                          ←
                        </button>
                        <button type="button" onClick={() => move(index, 1)} className="rounded px-1.5 py-1 hover:bg-muted" aria-label="Move later">
                          →
                        </button>
                        <button
                          type="button"
                          onClick={() => setImages((prev) => prev.filter((_, i) => i !== index))}
                          className="rounded px-1.5 py-1 text-destructive hover:bg-muted"
                          aria-label="Remove photo"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="grid gap-4">
            <p className="text-sm text-muted-foreground">
              Add one or more separate date ranges when this space is free, and block out dates inside them that
              aren't available. Blocked ranges always take priority over available ones.
            </p>
            {slots.length === 0 && (
              <p className="text-sm text-muted-foreground">No date ranges yet.</p>
            )}
            {slots.map((slot, index) => (
              <div key={index} className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-[1fr_1fr_auto_auto]">
                <Input
                  type="date"
                  value={slot.start_date}
                  onChange={(e) => setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, start_date: e.target.value } : s)))}
                />
                <Input
                  type="date"
                  value={slot.end_date}
                  onChange={(e) => setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, end_date: e.target.value } : s)))}
                />
                <div className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={slot.is_available}
                    onCheckedChange={(v) => setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, is_available: v } : s)))}
                  />
                  {slot.is_available ? "Available" : "Blocked"}
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => setSlots((prev) => prev.filter((_, i) => i !== index))}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const today = new Date().toISOString().slice(0, 10);
                setSlots((prev) => [...prev, { start_date: today, end_date: today, is_available: true, note: null }]);
              }}
            >
              + Create multiple separate available ranges
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                const today = new Date().toISOString().slice(0, 10);
                setSlots((prev) => [...prev, { start_date: today, end_date: today, is_available: false, note: null }]);
              }}
            >
              + Add blocked range
            </Button>
          </div>
        )}

        {step === 6 && (
          <div className="grid gap-4">
            <h2 className="font-display text-lg font-semibold">How your listing will look</h2>
            <div className="overflow-hidden rounded-2xl border border-border">
              {images[0] ? (
                <img src={images[0].url} alt={form.title} className="aspect-[16/9] w-full object-cover" />
              ) : (
                <div className="grid aspect-[16/9] w-full place-items-center bg-muted text-muted-foreground">
                  <ImageOff className="size-6" />
                </div>
              )}
              <div className="grid gap-2 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold">{form.title || "Untitled billboard"}</h3>
                  <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                    {typeLabel(form.billboard_type)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {[form.area, form.city, form.state, form.country].filter(Boolean).join(", ")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {form.width}
                  {form.dimension_unit} × {form.height}
                  {form.dimension_unit} · {form.is_illuminated ? "Illuminated" : "Non-lit"} · {images.length} photo
                  {images.length === 1 ? "" : "s"}
                </p>
                <p className="font-display text-lg font-semibold">
                  {formatMoney(form.price, form.currency)}
                  <span className="text-xs font-normal text-muted-foreground">{periodShort(form.price_period)}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Minimum booking period: {form.min_booking_days} day{form.min_booking_days === 1 ? "" : "s"} ·{" "}
                  {slots.filter((s) => s.is_available).length} available range(s),{" "}
                  {slots.filter((s) => !s.is_available).length} blocked range(s)
                </p>
                {form.description ? <p className="text-sm">{form.description}</p> : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="outline" disabled={saving} onClick={() => void save("draft")}>
                Save as draft
              </Button>
              <Button type="button" disabled={saving} onClick={() => void save("published")}>
                {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Publish billboard
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
          <ArrowLeft className="mr-2 size-4" /> Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={next}>
            Next <ArrowRight className="ml-2 size-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
