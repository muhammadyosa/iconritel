ALTER POLICY "Users can view their own role"
  ON public.user_roles TO authenticated;

ALTER POLICY "Admins can view all roles"
  ON public.user_roles TO authenticated;

ALTER POLICY "Admins can update all profiles"
  ON public.profiles TO authenticated;

ALTER POLICY "Only admins can insert role change logs"
  ON public.role_change_logs TO authenticated;

ALTER POLICY "Only admins can view role change logs"
  ON public.role_change_logs TO authenticated;