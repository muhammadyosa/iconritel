-- Fix: Restrict user_roles SELECT to own role or admins only
-- Drop the existing broad SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view roles" ON public.user_roles;

-- Create new policy: Users can only view their own role
CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Create policy: Admins can view all roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));