DROP POLICY IF EXISTS billboards_owner_insert ON public.billboards;
CREATE POLICY billboards_owner_insert ON public.billboards FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND (public.has_role(auth.uid(),'owner') OR public.is_admin()));
DROP POLICY IF EXISTS billboard_images_insert ON storage.objects;
CREATE POLICY billboard_images_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'billboard-images' AND (storage.foldername(name))[1] = auth.uid()::text
    AND (public.has_role(auth.uid(),'owner') OR public.is_admin()));
DROP POLICY IF EXISTS billboard_images_update ON storage.objects;
CREATE POLICY billboard_images_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'billboard-images' AND (storage.foldername(name))[1] = auth.uid()::text
    AND (public.has_role(auth.uid(),'owner') OR public.is_admin()));
DELETE FROM public.billboards WHERE id = '31d961c3-655d-457f-80e2-bec329ac92ab' AND owner_id = '57654431-34fc-4c79-b78b-9bb7af0842e2';