ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city text;

-- Signup may only choose owner or advertiser; never admin.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _role public.app_role;
BEGIN
  _role := CASE WHEN NEW.raw_user_meta_data->>'role' = 'owner' THEN 'owner'::public.app_role ELSE 'advertiser'::public.app_role END;

  INSERT INTO public.profiles (id, display_name, company_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'Member'),
    NEW.raw_user_meta_data->>'company_name'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profile_contacts (id, contact_email)
  VALUES (NEW.id, NEW.email) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END; $function$;

-- Users can no longer grant themselves roles from the browser.
DROP POLICY IF EXISTS roles_self_insert ON public.user_roles;

-- Only published billboards can be saved.
DROP POLICY IF EXISTS saved_insert ON public.saved_billboards;
CREATE POLICY saved_insert ON public.saved_billboards FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.billboard_is_public(billboard_id));

CREATE INDEX IF NOT EXISTS saved_billboards_billboard_idx ON public.saved_billboards (billboard_id);