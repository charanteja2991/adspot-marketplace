ALTER TABLE public.billboards ADD COLUMN IF NOT EXISTS min_booking_days integer NOT NULL DEFAULT 30;
ALTER TABLE public.billboards ADD CONSTRAINT billboards_min_booking_days_positive CHECK (min_booking_days >= 1 AND min_booking_days <= 3650);
ALTER TABLE public.billboard_availability ADD CONSTRAINT billboard_availability_range_valid CHECK (end_date >= start_date);