-- Create shift_reports table for storing shift reports
CREATE TABLE public.shift_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  date DATE NOT NULL,
  shift TEXT NOT NULL CHECK (shift IN ('pagi', 'siang', 'malam')),
  officer TEXT NOT NULL,
  olt_down TEXT DEFAULT '',
  port_down TEXT DEFAULT '',
  fat_loss TEXT DEFAULT '',
  issues TEXT DEFAULT '',
  notes TEXT DEFAULT ''
);

-- Enable Row Level Security
ALTER TABLE public.shift_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (anyone can view/create/update/delete)
CREATE POLICY "Anyone can view shift reports" 
ON public.shift_reports 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create shift reports" 
ON public.shift_reports 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update shift reports" 
ON public.shift_reports 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete shift reports" 
ON public.shift_reports 
FOR DELETE 
USING (true);

-- Enable realtime for shift_reports
ALTER PUBLICATION supabase_realtime ADD TABLE public.shift_reports;