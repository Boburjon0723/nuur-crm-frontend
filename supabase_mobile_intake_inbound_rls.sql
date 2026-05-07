-- Allow `mobile_intake` users to create/read ERP inbound pending requests.
-- Run this in Supabase SQL Editor as project admin.

CREATE OR REPLACE FUNCTION public.has_mobile_intake_access()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'mobile_intake'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_crm_or_mobile_inbound_access()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('crm', 'admin', 'mobile_intake')
  );
$$;

ALTER TABLE public.erp_inbound_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "erp_inbound_internal_all" ON public.erp_inbound_requests;
DROP POLICY IF EXISTS "erp_inbound_authenticated_all" ON public.erp_inbound_requests;
DROP POLICY IF EXISTS "erp_inbound_select_internal_or_crm" ON public.erp_inbound_requests;
DROP POLICY IF EXISTS "erp_inbound_insert_internal_or_crm" ON public.erp_inbound_requests;
DROP POLICY IF EXISTS "erp_inbound_update_internal_only" ON public.erp_inbound_requests;
DROP POLICY IF EXISTS "erp_inbound_delete_internal_only" ON public.erp_inbound_requests;

CREATE POLICY "erp_inbound_select_internal_or_crm_or_mobile"
  ON public.erp_inbound_requests
  FOR SELECT
  TO authenticated
  USING (public.has_internal_access() OR public.has_crm_or_mobile_inbound_access());

CREATE POLICY "erp_inbound_insert_internal_or_crm_or_mobile"
  ON public.erp_inbound_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_internal_access() OR public.has_crm_or_mobile_inbound_access());

CREATE POLICY "erp_inbound_update_internal_only"
  ON public.erp_inbound_requests
  FOR UPDATE
  TO authenticated
  USING (public.has_internal_access())
  WITH CHECK (public.has_internal_access());

CREATE POLICY "erp_inbound_delete_internal_only"
  ON public.erp_inbound_requests
  FOR DELETE
  TO authenticated
  USING (public.has_internal_access());
