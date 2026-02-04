-- Drop existing policies on tickets table
DROP POLICY IF EXISTS "Authenticated users can view all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Authenticated users can create tickets" ON public.tickets;
DROP POLICY IF EXISTS "Authenticated users can update tickets" ON public.tickets;
DROP POLICY IF EXISTS "Authenticated users can delete tickets" ON public.tickets;

-- Drop existing policies on profiles table
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Drop existing policies on shift_reports table
DROP POLICY IF EXISTS "Authenticated users can view all shift reports" ON public.shift_reports;
DROP POLICY IF EXISTS "Authenticated users can create shift reports" ON public.shift_reports;
DROP POLICY IF EXISTS "Authenticated users can update shift reports" ON public.shift_reports;
DROP POLICY IF EXISTS "Authenticated users can delete shift reports" ON public.shift_reports;

-- =====================
-- TICKETS TABLE POLICIES
-- =====================
-- NOC officers share all ticket data for collaborative incident management

CREATE POLICY "Authenticated users can view all tickets"
ON public.tickets FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create tickets"
ON public.tickets FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update tickets"
ON public.tickets FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete tickets"
ON public.tickets FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);

-- =====================
-- PROFILES TABLE POLICIES
-- =====================
-- Users can view all team profiles but only edit their own

CREATE POLICY "Team members can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- =====================
-- SHIFT_REPORTS TABLE POLICIES
-- =====================
-- NOC officers share all shift report data for collaborative monitoring

CREATE POLICY "Authenticated users can view all shift reports"
ON public.shift_reports FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create shift reports"
ON public.shift_reports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update shift reports"
ON public.shift_reports FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete shift reports"
ON public.shift_reports FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);