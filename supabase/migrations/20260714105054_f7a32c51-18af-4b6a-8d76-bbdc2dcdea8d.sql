-- Add aktiv column to user_roles
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS aktiv boolean NOT NULL DEFAULT true;

-- Update has_role to only return true for active roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role AND aktiv = true
  )
$$;

-- Allow admins to view and update all user_roles
CREATE POLICY "Admins can view all user_roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update user_roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

GRANT UPDATE ON public.user_roles TO authenticated;