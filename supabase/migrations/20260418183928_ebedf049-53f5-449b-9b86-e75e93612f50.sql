CREATE POLICY "Users can delete their own tickets"
ON public.tickets
FOR DELETE
TO authenticated
USING (auth.uid() = created_by_user_id);