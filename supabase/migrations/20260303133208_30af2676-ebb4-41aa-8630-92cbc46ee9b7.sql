
-- Security definer function to check group membership without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid, _player_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = _group_id
      AND player_id = _player_id
  );
$$;

-- Drop the recursive policy and replace with the security definer function
DROP POLICY IF EXISTS "Members can view their groups" ON public.groups;

CREATE POLICY "Members can view their groups"
ON public.groups
FOR SELECT
USING (public.is_group_member(id, auth.uid()));
