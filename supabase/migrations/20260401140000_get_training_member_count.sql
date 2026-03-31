-- Returns the count of regular members for a training.
-- SECURITY DEFINER so any authenticated user can see the count (RLS blocks cross-user reads on training_members).

CREATE OR REPLACE FUNCTION public.get_training_member_count(p_training_id UUID)
RETURNS INTEGER
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT count(*)::integer
  FROM training_members
  WHERE training_id = p_training_id AND role = 'regular';
$$;
