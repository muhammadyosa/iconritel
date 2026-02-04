-- Update tickets RLS policies for authenticated users only
DROP POLICY IF EXISTS "Anyone can view tickets" ON public.tickets;
DROP POLICY IF EXISTS "Anyone can create tickets" ON public.tickets;
DROP POLICY IF EXISTS "Anyone can update tickets" ON public.tickets;
DROP POLICY IF EXISTS "Anyone can delete tickets" ON public.tickets;

CREATE POLICY "Authenticated users can view all tickets"
ON public.tickets FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create tickets"
ON public.tickets FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update tickets"
ON public.tickets FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete tickets"
ON public.tickets FOR DELETE
TO authenticated
USING (true);

-- Update shift_reports RLS policies for authenticated users only
DROP POLICY IF EXISTS "Anyone can view shift reports" ON public.shift_reports;
DROP POLICY IF EXISTS "Anyone can create shift reports" ON public.shift_reports;
DROP POLICY IF EXISTS "Anyone can update shift reports" ON public.shift_reports;
DROP POLICY IF EXISTS "Anyone can delete shift reports" ON public.shift_reports;

CREATE POLICY "Authenticated users can view all shift reports"
ON public.shift_reports FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create shift reports"
ON public.shift_reports FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update shift reports"
ON public.shift_reports FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete shift reports"
ON public.shift_reports FOR DELETE
TO authenticated
USING (true);