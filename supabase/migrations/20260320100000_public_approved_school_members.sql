-- Allow anyone to view approved school members (needed for school public profiles and search)
CREATE POLICY "Approved school members viewable by anyone"
  ON public.school_members FOR SELECT
  USING (status = 'approved');
